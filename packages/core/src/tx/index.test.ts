import { describe, test } from '@jest/globals'
import { BatchStrategy, TxManager } from './TxManager'
import { createApi } from '../chain'
import { KeyManager, knownAddresses } from '../keys'
import { QueryNodeApi } from '../query/queryNode'
import { joyToHapi } from '../assets'
import { EventsSource, getEvent } from './events'
import { v7 as uuid } from 'uuid'
import { TraceableTx } from './TraceableTx'
import { BlockProcessorApi } from '../query/interfaces'
import assert from 'node:assert'
import {
  TxBalanceError,
  TxMetaprotocolStatusError,
  TxRuntimeError,
  TxStatusError,
} from './errors'
import { endpoints } from '../utils/endpoints'
import { BuyMembershipParams, UpdateProfileParams } from './metaTransactions'
import _ from 'lodash'

const TEST_NODE_ENDPOINT = endpoints.sdkTesting.wsRpc
const TEST_QN_ENDPOINT = endpoints.sdkTesting.queryNode

const { alice, bob, charlie, dave } = knownAddresses

const tools = createApi(TEST_NODE_ENDPOINT).then((api) => {
  const keys = new KeyManager({ keyringOptions: { isDev: true } })
  const tx = new TxManager(api, keys)
  const qnApi = new QueryNodeApi(TEST_QN_ENDPOINT)
  return {
    api,
    keys,
    tx,
    qnApi,
  }
})

async function expectStatusInBlock(trackedTx: TraceableTx) {
  expect(trackedTx.status).toEqual('InBlock')
  expect(trackedTx.lastResult.status.isInBlock).toEqual(true)
  expect(trackedTx.blockHash).toEqual(
    trackedTx.lastResult.status.asInBlock.toHex()
  )
  expect(await trackedTx.blockNumber()).toBeTruthy()
}

async function expectStatusFinalized(trackedTx: TraceableTx) {
  expect(trackedTx.status).toEqual('Finalized')
  expect(trackedTx.lastResult.status.isFinalized).toEqual(true)
  expect(trackedTx.blockHash).toEqual(
    trackedTx.lastResult.status.asFinalized.toHex()
  )
  expect(await trackedTx.blockNumber()).toBeTruthy()
}

async function expectStatusProcessedBy(
  trackedTx: TraceableTx,
  by: BlockProcessorApi
) {
  expect(trackedTx.status).toEqual('Finalized')
  expect(trackedTx.lastResult.status.isFinalized).toEqual(true)
  expect(trackedTx.blockHash).toEqual(
    trackedTx.lastResult.status.asFinalized.toHex()
  )
  expect(await by.lastProcessedBlock()).toBeGreaterThanOrEqual(
    await trackedTx.blockNumber()
  )
}

function expectBalancesTransferEvent(
  source: EventsSource,
  keys: KeyManager,
  expected: { from: string; to: string; amount: bigint }
) {
  const [from, to, amount] = getEvent(source, 'balances', 'Transfer').data
  expect(keys.normalizeKey(from)).toEqual(expected.from)
  expect(keys.normalizeKey(to)).toEqual(expected.to)
  expect(amount.toBigInt()).toEqual(expected.amount)
}

async function expectError(
  func: () => unknown | Promise<unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errorClass?: { new (...args: any[]): Error },
  matchExpr?: RegExp
) {
  let caught = false
  try {
    await func()
  } catch (e) {
    caught = true
    if (errorClass) {
      expect(e).toBeInstanceOf(errorClass)
    }
    if (matchExpr) {
      expect(e).toBeInstanceOf(Error)
      assert(e instanceof Error)
      expect(e.message).toMatch(matchExpr)
    }
  }
  if (!caught) {
    expect(() => null).toThrow()
  }
}

jest.setTimeout(60_000)

let aliceMemberId = 0

beforeAll(async () => {
  const { tx, qnApi } = await tools
  const aliceAddr = alice
  // The tests expect ALICE to a have a membership...
  const existing = await qnApi.query.Membership.first({
    where: { controllerAccount_eq: aliceAddr },
  })
  if (existing) {
    aliceMemberId = Number(existing.id)
  } else {
    // Buy membership for alice
    const { lastResult } = await tx
      .run(
        tx.meta.members.buyMembership({
          handle: 'alice',
          controllerAccount: alice,
          rootAccount: alice,
          metadata: { name: 'Alice' },
        }),
        alice
      )
      .finalized()
    const [memberId] = getEvent(lastResult, 'members', 'MembershipBought').data
    aliceMemberId = memberId.toNumber()
  }
})

afterAll(async () => {
  const { api } = await tools
  return new Promise<void>((resolve, reject) => {
    api.once('disconnected', resolve)
    api.disconnect().catch(reject)
  })
})

describe('TxManager', () => {
  describe('errors', () => {
    test.concurrent('InsufficientBalance (fees)', async () => {
      const { api, tx, keys } = await tools
      const key = keys.addKey({ suri: `//InsufficientBalanceTest` })
      const tracked = tx.run(
        api.tx.balances.transfer(alice, joyToHapi(1)),
        key.address
      )
      await expectError(
        () => tracked.inBlock(true),
        TxBalanceError,
        /Insufficient balance to cover tx fees/
      )
      expect(tracked.status).toBe('Rejected')
      expect(() => tracked.lastResult).toThrow()
    })

    test.concurrent('Nonce override', async () => {
      const { api, tx, keys } = await tools
      const overridenTx = new TraceableTx(
        api.tx.balances.transfer(bob, joyToHapi(1)),
        alice,
        tx.blockUtils,
        keys
      )
      const overridingTx = new TraceableTx(
        api.tx.balances.transfer(charlie, joyToHapi(2)),
        alice,
        tx.blockUtils,
        keys
      )

      await tx.withNonce(alice, async (nonce) => {
        await Promise.all([
          overridenTx.sign({ nonce }),
          overridingTx.sign({ nonce, tip: joyToHapi(1) }),
        ])
        await Promise.all([overridenTx.send(), overridingTx.send()])
      })

      await expectError(() => overridenTx.inBlock(true), TxStatusError)

      expect(overridenTx.status).toBe('Usurped')

      await overridingTx.finalized()
    })

    test.concurrent('Dispatch error', async () => {
      const { api, tx } = await tools
      const tracked = tx.run(
        api.tx.members.memberRemark(999, 'Test', null),
        alice
      )
      await expectError(
        () => tracked.inBlock(true),
        TxRuntimeError,
        /MemberProfileNotFound/
      )
      await expectStatusInBlock(tracked)
    })

    test.concurrent('Metaprotocol error (qn)', async () => {
      const { api, tx, qnApi } = await tools
      const tracked = tx.run(
        api.tx.members.memberRemark(aliceMemberId, 'Test', null),
        alice
      )
      await expectError(
        () => tracked.metaProcessedBy(qnApi),
        TxMetaprotocolStatusError,
        /InvalidMetadata/
      )
      await expectStatusFinalized(tracked)
    })
  })

  describe('await status', () => {
    // await status: inBlock
    test.concurrent('inBlock', async () => {
      const { api, tx } = await tools
      const tracked = await tx
        .run(api.tx.balances.transfer(bob, joyToHapi(1)), alice)
        .inBlock(true)
      await expectStatusInBlock(tracked)
    })
    // await status: finalized
    test.concurrent('finalized', async () => {
      const { api, tx } = await tools
      const tracked = await tx
        .run(api.tx.balances.transfer(bob, joyToHapi(1)), alice)
        .finalized()
      await expectStatusFinalized(tracked)
    })
    // await status: processedBy(qn)
    test.concurrent('processedBy(qn)', async () => {
      const { tx, qnApi } = await tools
      const tracked = await tx
        .run(
          tx.meta.members.buyMembership({
            handle: uuid(),
            controllerAccount: alice,
            rootAccount: alice,
            metadata: {},
          }),
          alice
        )
        .processedBy(qnApi)
      await expectStatusProcessedBy(tracked, qnApi)
    })
  })

  describe('listen to status', () => {
    // listen to status: inBlock
    test.concurrent('inBlock', async () => {
      const { api, tx } = await tools
      const tracked = tx.run(api.tx.balances.transfer(bob, joyToHapi(1)), alice)
      return new Promise<void>((resolve) => {
        tracked.once('in_block', async ({ blockHash }) => {
          await expectStatusInBlock(tracked)
          expect(blockHash).toEqual(tracked.blockHash)
          resolve()
        })
      })
    })
    // listen to status: finalized
    test.concurrent('finalized', async () => {
      const { api, tx } = await tools
      const tracked = tx.run(api.tx.balances.transfer(bob, joyToHapi(1)), alice)
      return new Promise<void>((resolve) => {
        tracked.once('finalized', async ({ blockHash }) => {
          await expectStatusFinalized(tracked)
          expect(blockHash).toEqual(tracked.blockHash)
          resolve()
        })
      })
    })
    // listen to status: processedBy(qn)
    test.concurrent('processedBy(qn)', async () => {
      const { tx, qnApi } = await tools
      const tracked = tx
        .run(
          tx.meta.members.buyMembership({
            handle: uuid(),
            controllerAccount: alice,
            rootAccount: alice,
            metadata: {},
          }),
          alice
        )
        .trackIn(qnApi)
      return new Promise<void>((resolve) => {
        tracked.once('processed', async ({ by }) => {
          expect(by).toBe(qnApi)
          await expectStatusProcessedBy(tracked, qnApi)
          resolve()
        })
      })
    })
  })

  describe('batch', () => {
    // batch: ContinueOnFailure
    test.concurrent('ContinueOnFailure', async () => {
      const { tx, keys, api } = await tools
      const tracked = tx.batch(
        [
          api.tx.balances.transfer(bob, joyToHapi(1)),
          // Should fail because member does not exist
          api.tx.members.memberRemark(999, 'Test', null),
          api.tx.balances.transfer(charlie, joyToHapi(2)),
        ],
        alice,
        { strategy: BatchStrategy.ContinueOnFailure }
      )
      await tracked.inBlock(true)
      const [r1, r2, r3] = tracked.lastResult.callResults

      // Call 1 result
      expect(r1.isSuccess).toBe(true)
      assert(r1.isSuccess)
      expectBalancesTransferEvent(r1.events, keys, {
        from: alice,
        to: bob,
        amount: joyToHapi(1),
      })

      // Call 2 result
      expect(r2.isSuccess).toBe(false)
      assert(!r2.isSuccess)
      expect(r2.error).toMatch(/MemberProfileNotFound/)

      // Call 3 result
      expect(r3.isSuccess).toBe(true)
      assert(r3.isSuccess)
      expectBalancesTransferEvent(r3.events, keys, {
        from: alice,
        to: charlie,
        amount: joyToHapi(2),
      })
    })

    // batch: InterruptOnFailure
    test.concurrent('InterruptOnFailure', async () => {
      const { tx, keys, api } = await tools
      const tracked = tx.batch(
        [
          api.tx.balances.transfer(bob, joyToHapi(1)),
          // Should fail because member does not exist
          api.tx.members.memberRemark(999, 'Test', null),
          api.tx.balances.transfer(charlie, joyToHapi(2)),
        ],
        alice,
        { strategy: BatchStrategy.InterruptOnFailure }
      )
      await tracked.inBlock(true)
      const [r1, r2, r3] = tracked.lastResult.callResults

      // Call 1 result
      expect(r1.isSuccess).toBe(true)
      assert(r1.isSuccess)
      expectBalancesTransferEvent(r1.events, keys, {
        from: alice,
        to: bob,
        amount: joyToHapi(1),
      })

      // Call 2 result
      expect(r2.isSuccess).toBe(false)
      assert(!r2.isSuccess)
      expect(r2.error).toMatch(/MemberProfileNotFound/)

      // Call 3 result
      expect(r3.isSuccess).toBe(false)
      assert(!r3.isSuccess)
      expect(r3.error).toMatch(/Interrupted/)
    })

    // batch: RollbackOnFailure
    describe('RollbackOnFailure', () => {
      test.concurrent('fail case', async () => {
        const { tx, api } = await tools
        const tracked = tx.batch(
          [
            api.tx.balances.transfer(bob, joyToHapi(1)),
            // Should fail because member does not exist
            api.tx.members.memberRemark(999, 'Test', null),
            api.tx.balances.transfer(charlie, joyToHapi(2)),
          ],
          alice,
          { strategy: BatchStrategy.RollbackOnFailue }
        )
        await expectError(
          () => tracked.inBlock(true),
          TxRuntimeError,
          /MemberProfileNotFound/
        )
        const { lastResult } = tracked
        expect(() => getEvent(lastResult.raw, 'balances', 'Transfer')).toThrow()
      })
      test.concurrent('success case', async () => {
        const { tx, keys, api } = await tools
        const transfers = [
          { to: bob, amount: joyToHapi(1) },
          { to: charlie, amount: joyToHapi(2) },
          { to: dave, amount: joyToHapi(3) },
        ]
        const tracked = tx.batch(
          transfers.map(({ to, amount }) =>
            api.tx.balances.transfer(to, amount)
          ),
          alice,
          { strategy: BatchStrategy.RollbackOnFailue }
        )
        await tracked.inBlock(true)
        expect(tracked.lastResult.callResults.length).toEqual(transfers.length)
        for (const [i, result] of tracked.lastResult.callResults.entries()) {
          expect(result.isSuccess).toBe(true)
          assert(result.isSuccess)
          expectBalancesTransferEvent(result.events, keys, {
            ...transfers[i],
            from: alice,
          })
        }
      })
    })
  })

  describe('meta transactions', () => {
    test.concurrent('buy membership', async () => {
      const { tx, qnApi } = await tools
      const params = {
        rootAccount: alice,
        controllerAccount: alice,
        handle: uuid(),
        metadata: {
          name: 'Alice',
          about: 'About Alcie',
        },
      } satisfies BuyMembershipParams
      const { lastResult } = await tx
        .run(tx.meta.members.buyMembership(params), alice)
        .processedBy(qnApi)
      const [memberId] = getEvent(
        lastResult,
        'members',
        'MembershipBought'
      ).data
      const member = await qnApi.query.Membership.byId(memberId.toString(), {
        ..._.mapValues(params, () => true),
        metadata: _.mapValues(params.metadata, () => true),
      })
      expect(member).toEqual(params)
    })

    test.concurrent('update profile', async () => {
      const { tx, qnApi } = await tools
      const params = {
        memberId: aliceMemberId,
        metadata: {
          name: 'Alice',
          about: 'About Alice',
        },
      } satisfies UpdateProfileParams
      await tx
        .run(tx.meta.members.updateProfile(params), alice)
        .processedBy(qnApi)
      const updatedMeta = await qnApi.query.MemberMetadata.first({
        where: { member: { id_eq: aliceMemberId.toString() } },
        select: _.mapValues(params.metadata, () => true),
      })
      expect(updatedMeta).toEqual(params.metadata)
    })
  })

  // nonce
  test.concurrent('nonce', async () => {
    const { api, tx } = await tools
    await Promise.all(
      Array.from({ length: 10 }).map(async (_, i) => {
        return tx
          .run(api.tx.balances.transfer(bob, joyToHapi(i)), alice)
          .inBlock(true)
      })
    )
  })
})

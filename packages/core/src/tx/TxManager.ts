import '@joystream/types'
import AsyncLock from 'async-lock'
import { ApiPromise } from '@polkadot/api'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { ISubmittableResult } from '@polkadot/types/types/'
import { AccountId, Event } from '@polkadot/types/interfaces'
import { KeyManager } from '../keys'
import { dispatchErrorMsg } from './errors'
import { isEvent } from './events'
import { TraceableTx } from './TraceableTx'
import { BlockUtils } from '../chain/blocks'
import { metaTransactions, MetaTransactions } from './metaTransactions'
import { txDebug } from './debug'

export type ParsedBatchCallResult =
  | { isSuccess: true; events: Event[] }
  | { isSuccess: false; error: string }

export type BatchTxResult = {
  raw: ISubmittableResult
  callResults: ParsedBatchCallResult[]
}

export function processBatchCalls(
  api: ApiPromise,
  result: ISubmittableResult,
  callsNum: number
): ParsedBatchCallResult[] {
  let results: ParsedBatchCallResult[] = []
  let currentEvents: Event[] = []
  for (const [index, { event }] of result.events.entries()) {
    if (index === 0 && isEvent(event, 'balances', 'Withdraw')) {
      // If first event is balances.Withdraw, it's for the purpose of transaction fee payment,
      // so we skip it in the results
    } else if (isEvent(event, 'utility', 'ItemFailed')) {
      const [dispatchError] = event.data
      results.push({
        isSuccess: false,
        error: dispatchErrorMsg(api.registry, dispatchError),
      } as const)
      currentEvents = []
    } else if (isEvent(event, 'utility', 'ItemCompleted')) {
      results.push({ isSuccess: true, events: currentEvents })
      currentEvents = []
    } else if (isEvent(event, 'utility', 'BatchInterrupted')) {
      const [, dispatchError] = event.data
      results.push({
        isSuccess: false,
        error: dispatchErrorMsg(api.registry, dispatchError),
      })
      // break, since the batch was interrupted
      break
    } else {
      currentEvents.push(event)
    }
  }
  if (results.length < callsNum) {
    results = [
      ...results,
      ...Array.from(
        { length: callsNum - results.length },
        () =>
          ({
            isSuccess: false,
            error: 'Interrupted',
          }) as const
      ),
    ]
  }

  return results
}

export enum BatchStrategy {
  // Execute calls one-by-one and interrupt in case one of them fails.
  // In case an interruption occurs, all subsequent calls will be skipped,
  // but the state will remain affected by all of the previous calls.
  InterruptOnFailure = 'batch',
  // Execute calls one-by-one, but fail and rollback the entire batch extrinsic
  // in case one of the calls fail. It's an all-or-nothing scenario.
  RollbackOnFailure = 'batchAll',
  // Execute calls one-by-one and continue until the end even if some of them fail.
  ContinueOnFailure = 'forceBatch',
}

export class TxManager {
  readonly api: ApiPromise
  readonly blockUtils: BlockUtils
  readonly keyManager: KeyManager
  readonly nonceLock: AsyncLock = new AsyncLock({
    domainReentrant: false,
  })
  readonly meta: MetaTransactions
  private nonceByAccount = new Map<string, number>()

  constructor(
    api: ApiPromise,
    keyManager: KeyManager,
    blockUtils?: BlockUtils
  ) {
    this.api = api
    this.blockUtils = blockUtils || new BlockUtils(this.api)
    this.keyManager = keyManager
    this.meta = metaTransactions(api)
  }

  async withNonce(addr: string, cb: (nonce: number) => Promise<void>) {
    return this.nonceLock.acquire(addr, async () => {
      const nonce = Math.max(
        (await this.api.rpc.system.accountNextIndex(addr)).toNumber(),
        this.nonceByAccount.get(addr) || 0
      )
      txDebug(`Acquired and locked nonce ${nonce} for address ${addr}`)
      await cb(nonce)
    })
  }

  public batch(
    calls: SubmittableExtrinsic<'promise'>[],
    sender: AccountId | string,
    options?: {
      strategy?: BatchStrategy
      tip?: bigint | number
    }
  ): TraceableTx<BatchTxResult> {
    const batchTx =
      this.api.tx.utility[options?.strategy || BatchStrategy.RollbackOnFailure](
        calls
      )
    return this.run<BatchTxResult>(batchTx, sender, {
      ...options,
      resultProcessor: (result) => ({
        raw: result,
        callResults: processBatchCalls(this.api, result, calls.length),
      }),
    })
  }

  public run<ResultType = ISubmittableResult>(
    tx: SubmittableExtrinsic<'promise'>,
    sender: AccountId | string,
    options?: {
      tip?: bigint | number
      resultProcessor?: (result: ISubmittableResult) => ResultType
    }
  ): TraceableTx<ResultType> {
    const { tip, resultProcessor } = options || {}
    const senderAddr = this.keyManager.normalizeKey(sender)
    const traceableTx = new TraceableTx<ResultType>(
      tx,
      sender,
      this.blockUtils,
      this.keyManager,
      resultProcessor
    )
    this.withNonce(senderAddr, async (nonce) => {
      await traceableTx.sign({ nonce, tip })
      await traceableTx.send()
      this.nonceByAccount.set(senderAddr, nonce + 1)
    }).catch((e) => {
      // Pass any errors from sign&send phase back to traceableTx error event listeners
      traceableTx.emit('error', e)
    })
    return traceableTx
  }
}

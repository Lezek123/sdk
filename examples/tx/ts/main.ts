import { ApiPromise } from '@polkadot/api'
import { TxManager, BatchStrategy } from '@joystream/sdk-core/tx'
import { KeyManager } from '@joystream/sdk-core/keys'
import { createApi } from '@joystream/sdk-core/chain'
import { QueryNodeApi } from '@joystream/sdk-core/query/queryNode'
import { hapiToJoy, joyToHapi } from '@joystream/sdk-core/assets'
import { getEvent } from '@joystream/sdk-core/tx/events'

type Context = {
  tx: TxManager
  keys: KeyManager
  api: ApiPromise
  qnApi: QueryNodeApi
}

async function batchExample({ tx, keys, api }: Context) {
  console.log(`Sending utility.forceBatch transaction...`)
  const multiTransfer = tx.batch(
    [
      api.tx.balances.transfer(keys.byName('Bob').address, joyToHapi(1)),
      api.tx.balances.transfer(keys.byName('Charlie').address, joyToHapi(2)),
      api.tx.balances.transfer(keys.byName('Dave').address, joyToHapi(3)),
    ],
    keys.byName('Alice').address,
    { strategy: BatchStrategy.ContinueOnFailure }
  )

  await multiTransfer.inBlock()

  const { callResults } = multiTransfer.lastResult

  for (const [i, result] of callResults.entries()) {
    if (result.isSuccess) {
      const [from, to, amount] = getEvent(
        result.events,
        'balances',
        'Transfer'
      ).data
      console.log(
        `Call ${i} successful: Transferred ${hapiToJoy(amount)} JOY from ${from.toHuman()} to ${to.toHuman()}`
      )
    } else {
      console.log(`Call ${i} failed: ${result.error}`)
    }
  }
}

async function eventsExample({ tx, keys, qnApi }: Context) {
  const buyMembershipTx = tx.meta.members.buyMembership({
    handle: 'alice',
    controllerAccount: keys.byName('Alice').address,
    rootAccount: keys.byName('Alice').address,
    metadata: {
      name: 'Alice',
      about: "I'm Alice!",
    },
  })

  await tx
    .run(buyMembershipTx, keys.byName('Alice').address)
    .trackIn(qnApi)
    .once('signed', () => console.log('Signed'))
    .once('sent', () => console.log('Sent'))
    .once('in_block', () => console.log('In block'))
    .once('finalized', () => console.log('Finalized'))
    .once('processed', ({ by }) => console.log(`Processed by ${by}`))
    .processedBy(qnApi)
}

async function main() {
  const keys = new KeyManager({ keyringOptions: { isDev: true } })
  const api = await createApi(`ws://localhost:9944`)
  const tx = new TxManager(api, keys)
  const qnApi = new QueryNodeApi(`http://localhost:8081/graphql`)

  const context = { keys, api, tx, qnApi }

  await batchExample(context)
  await eventsExample(context)

  console.log('Done')
}

main()
  .then(() => process.exit())
  .catch(console.error)

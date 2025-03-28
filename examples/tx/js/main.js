import { TxManager } from '@joystream/sdk-core/tx'
import { KeyManager } from '@joystream/sdk-core/keys'
import { createApi } from '@joystream/sdk-core/chain'
import { QueryNodeApi } from '@joystream/sdk-core/query/queryNode'
async function main() {
  const keys = new KeyManager({ keyringOptions: { isDev: true } })
  const api = await createApi(`ws://localhost:9944`)
  const tx = new TxManager(api, keys)
  const qnApi = new QueryNodeApi(`http://localhost:8081/graphql`)
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
    .once('processed', () => console.log('Processed by Query node'))
    .processedBy(qnApi)
  console.log('Done')
}
main()
  .then(() => process.exit())
  .catch(console.error)

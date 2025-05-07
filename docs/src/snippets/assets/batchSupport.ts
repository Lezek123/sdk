import { SnippetParams } from '../snippet'
// @snippet-begin
import { knownAddresses } from '@joystream/sdk-core/keys'

// ...
// @snippet-end
export default async function ({ log, joystreamToolbox }: SnippetParams) {
  // @snippet-begin
  const { api, txm, assets } = joystreamToolbox
  const { alice } = knownAddresses

  // Prepare a batch transaction to buy 5 memberships
  const batchTx = api.tx.utility.batch(
    Array.from({ length: 5 }, (_, i) =>
      txm.meta.members.buyMembership({
        handle: `Member ${i}`,
        controllerAccount: alice,
        rootAccount: alice,
      })
    )
  )

  // Estimate total costs associated with the batchTx
  const costs = await assets.costsOf(batchTx, alice)

  log(costs)
  // @snippet-end
}

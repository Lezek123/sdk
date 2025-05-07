import { SnippetParams } from '../snippet'
// @snippet-begin
import { knownAddresses } from '@joystream/sdk-core/keys'

// ...
// @snippet-end
export default async function ({ log, joystreamToolbox }: SnippetParams) {
  // @snippet-begin
  const { txm, assets } = joystreamToolbox
  const { alice } = knownAddresses

  // Prepare the transaction
  const tx = txm.meta.members.buyMembership({
    handle: 'Example',
    controllerAccount: alice,
    rootAccount: alice,
    metadata: {
      name: 'Alice',
    },
  })

  // Estimate extrinsic costs
  const costs = await assets.costsOf(tx, alice)

  // Check current balances
  const currentBalances = await assets.getBalances(alice)
  // Check the minimum amount of each balance required to cover given costs
  const requiredBalances = assets.requiredBalances(costs)
  // Estimate the new values of balances after paying given costs
  const balancesAfter = await assets.estimateBalancesAfter(alice, costs)

  log('Current:', currentBalances)
  log('Required: ', requiredBalances)
  log('After: ', balancesAfter)
  // @snippet-end
}

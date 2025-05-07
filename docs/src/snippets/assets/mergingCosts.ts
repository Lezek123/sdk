import { SnippetParams } from '../snippet'
// @snippet-begin
import { channelRewardAccount } from '@joystream/sdk-core/utils'
import { joyToHapi } from '@joystream/sdk-core/assets'
import { knownAddresses } from '@joystream/sdk-core/keys'

// ...
// @snippet-end
export default async function ({ log, joystreamToolbox }: SnippetParams) {
  // @snippet-begin
  const { txm, assets } = joystreamToolbox
  const { alice } = knownAddresses

  const payout1 = txm.meta.content.makeChannelPayment({
    memberId: 1,
    channelRewardAccount: channelRewardAccount(1),
    amount: joyToHapi(10),
  })
  const payout2 = txm.meta.content.makeChannelPayment({
    memberId: 1,
    channelRewardAccount: channelRewardAccount(2),
    amount: joyToHapi(5),
  })

  // Estimate total costs
  const costs = (
    await Promise.all([payout1, payout2].map((tx) => assets.costsOf(tx, alice)))
  ).flat()

  log(costs)
  // @snippet-end
}

import { SnippetParams } from '../snippet'
// @snippet-begin
import { knownAddresses } from '@joystream/sdk-core/keys'

// ...
// @snippet-end
export default async function ({ log, joystreamToolbox }: SnippetParams) {
  // @snippet-begin
  const { txm, data, assets } = joystreamToolbox
  const { contentFees } = data
  const { alice } = knownAddresses

  // Prepare the transaction
  const tx = txm.meta.content.createVideo({
    actor: { Member: 1 },
    channelId: 1,
    assets: {
      expectedDataSizeFee: contentFees.dataObjectPerMegabyteFee,
      objectCreationList: [
        { ipfsContentId: '0x01', size_: 12_345_678 },
        { ipfsContentId: '0x02', size_: 34_567_890 },
        // ...
      ],
    },
    storageBucketsNumWitness: 1,
    expectedDataObjectStateBloatBond: contentFees.dataObjectStateBloatBondValue,
    expectedVideoStateBloatBond: contentFees.videoStateBloatBondValue,
    meta: {
      title: 'Example video',
      thumbnailPhoto: 0,
      video: 1,
      // ...
    },
  })

  // Establish and log all costs
  const costs = await assets.costsOf(tx, alice)
  log(costs)
  // @snippet-end
}

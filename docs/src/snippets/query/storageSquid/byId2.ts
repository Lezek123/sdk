import { SnippetParams } from '../../snippet'

export default async function ({ storageSquidApi, log }: SnippetParams) {
  // @snippet-begin
  // Get storage bag of channel 1, along with some information about its data objects
  const storageBag = await storageSquidApi.query.StorageBag.byId(
    'dynamic:channel:1',
    {
      __scalar: true,
      objects: {
        id: true,
        ipfsHash: true,
        size: true,
      },
    }
  )
  log(storageBag)
  // @snippet-end
}

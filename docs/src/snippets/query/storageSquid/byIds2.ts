import { SnippetParams } from '../../snippet'

export default async function ({ storageSquidApi, log }: SnippetParams) {
  // @snippet-begin
  // Get storage bags of a few channels, along with some information about their data objects
  const storageBags = await storageSquidApi.query.StorageBag.byIds(
    ['dynamic:channel:1', 'dynamic:channel:7692', 'dynamic:channel:7698'],
    {
      __scalar: true,
      objects: {
        id: true,
        ipfsHash: true,
        size: true,
      },
    }
  )
  log(storageBags)
  // @snippet-end
}

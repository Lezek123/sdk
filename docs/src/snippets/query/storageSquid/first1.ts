import { SnippetParams } from '../../snippet'

export default async function ({ storageSquidApi, log }: SnippetParams) {
  // @snippet-begin
  // Get all scalar fields of a bucket by the node endpoint
  const storageBucket = await storageSquidApi.query.StorageBucket.first({
    where: {
      operatorMetadata: {
        nodeEndpoint_eq: 'https://storage.freakstatic.com/storage/',
      },
    },
  })
  log(storageBucket)
  // @snippet-end
}

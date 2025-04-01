import { SnippetParams } from '../../snippet'

export default async function ({ storageSquidApi, log }: SnippetParams) {
  // @snippet-begin
  // Query scalar fields of storage buckets by their node endpoints
  const endpoints = [
    'https://storage.js.8k.pm/storage/',
    'https://storage.freakstatic.com/storage/',
    'https://storage.0x2bc.com/storage/',
  ]
  const buckets = await storageSquidApi.query.StorageBucket.byMany({
    input: endpoints,
    where: (endpoints) => ({
      operatorMetadata: { nodeEndpoint_in: endpoints },
    }),
  })
  log(buckets)
  // @snippet-end
}

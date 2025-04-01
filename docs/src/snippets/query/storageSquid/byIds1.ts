import { SnippetParams } from '../../snippet'

export default async function ({ storageSquidApi, log }: SnippetParams) {
  // @snippet-begin
  // Get all scalar fields of a few storage buckets
  const storageBuckets = await storageSquidApi.query.StorageBucket.byIds([
    '0',
    '1',
    '2',
  ])
  log(storageBuckets)
  // @snippet-end
}

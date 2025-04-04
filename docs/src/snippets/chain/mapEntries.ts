import { SnippetParams } from '../snippet'
// @snippet-begin
import { sortedEntries } from '@joystream/sdk-core/chain'

// @snippet-end
export default async function ({ api, log }: SnippetParams) {
  // @snippet-begin
  const storageBuckets = await sortedEntries(
    api.query.storage.storageBucketById
  )
  for (const [id, bucket] of storageBuckets) {
    log(id.toNumber())
    log(bucket.toHuman())
    log('\n')
  }
  // @snippet-end
}

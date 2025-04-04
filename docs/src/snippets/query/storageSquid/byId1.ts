import { SnippetParams } from '../../snippet'

export default async function ({ storageSquidApi, log }: SnippetParams) {
  // @snippet-begin
  // Get all scalar fields of storage bucket by id=0
  const storageBucket = await storageSquidApi.query.StorageBucket.byId('0')
  log(storageBucket)
  // @snippet-end
}

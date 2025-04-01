import { SnippetParams } from '../../snippet'

export default async function ({ storageSquidApi, log }: SnippetParams) {
  // @snippet-begin
  // Get id of storage data object by hash
  const { id } = await storageSquidApi.query.StorageDataObject.first({
    select: { id: true },
    where: { ipfsHash_eq: 'gW9Z69CKtJvkvDxNY5BNoe2Wb4KXJneDSjm1iZD9Um8ich' },
  })
  log(id)
  // @snippet-end
}

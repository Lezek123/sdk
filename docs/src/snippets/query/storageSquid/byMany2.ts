import { SnippetParams } from '../../snippet'

export default async function ({ storageSquidApi, log }: SnippetParams) {
  // @snippet-begin
  // Query ids and sizes of data objects by a list of bagIds
  const objects = await storageSquidApi.query.StorageDataObject.byMany({
    input: [
      'dynamic:channel:1',
      'dynamic:channel:7692',
      'dynamic:channel:7698',
    ],
    where: (bagIds) => ({ storageBag: { id_in: bagIds } }),
    select: { id: true, size: true },
  })
  log(objects)
  // @snippet-end
}

import { SnippetParams } from '../../snippet'

export default async function ({ storageSquidApi, log }: SnippetParams) {
  // @snippet-begin
  // Fetch information about the largest data objects
  // and log each page of 100 results separately
  // (limit the number of pages to 10)
  const objectsPagination = storageSquidApi.query.StorageDataObject.paginate({
    orderBy: ['size_DESC'],
    select: {
      id: true,
      size: true,
      type: {
        __typename: true,
      },
    },
    pageSize: 100,
  })
  let i = 1
  while (i <= 10 && objectsPagination.hasNextPage) {
    const page = await objectsPagination.nextPage()
    log(`Page ${i}`)
    log(page)
    ++i
  }
  // @snippet-end
}

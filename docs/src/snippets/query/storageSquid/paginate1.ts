import { SnippetParams } from '../../snippet'

export default async function ({ storageSquidApi, log }: SnippetParams) {
  // @snippet-begin
  // Get ids of ALL storage bags,
  // fetching no more than 1000 bags in a single query
  const bags = await storageSquidApi.query.StorageBag.paginate({
    orderBy: ['id_ASC'],
    select: { id: true },
    pageSize: 1000,
  }).fetchAll()
  log(bags)
  // @snippet-end
}

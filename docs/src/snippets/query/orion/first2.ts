import { SnippetParams } from '../../snippet'

export default async function ({ orionApi, log }: SnippetParams) {
  // @snippet-begin
  // Get a highest revenue channel which title contains the word "Joystream"
  const channel = await orionApi.query.Channel.first({
    where: { title_containsInsensitive: 'Joystream' },
    orderBy: ['cumulativeRevenue_DESC'],
  })
  log(channel)
  // @snippet-end
}

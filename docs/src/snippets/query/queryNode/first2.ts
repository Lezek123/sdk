import { SnippetParams } from '../../snippet'

export default async function ({ qnApi, log }: SnippetParams) {
  // @snippet-begin
  // Get id, handle and totalChannelsCreated of a member with highest number of channels created
  const member = await qnApi.query.Membership.first({
    select: { id: true, handle: true, totalChannelsCreated: true },
    orderBy: ['totalChannelsCreated_DESC'],
  })
  log(member)
  // @snippet-end
}

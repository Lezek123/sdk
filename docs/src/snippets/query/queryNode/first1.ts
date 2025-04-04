import { SnippetParams } from '../../snippet'

export default async function ({ qnApi, log }: SnippetParams) {
  // @snippet-begin
  // Get all scalar fields of a member by their handle
  const member = await qnApi.query.Membership.first({
    where: { handle_eq: 'lezek' },
  })
  log(member)
  // @snippet-end
}

import { SnippetParams } from '../../snippet'

export default async function ({ orionApi, log }: SnippetParams) {
  // @snippet-begin
  // Get id and title of a video by their Youtube video ID
  const video = await orionApi.query.Video.first({
    select: { id: true, title: true },
    where: { ytVideoId_eq: 'GlIQQX5s2bw' },
  })
  log(video)
  // @snippet-end
}

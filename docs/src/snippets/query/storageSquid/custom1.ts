import { SnippetParams } from '../../snippet'

export default async function ({ storageSquidApi, log }: SnippetParams) {
  // @snippet-begin
  const result = await storageSquidApi.client.query({
    squidStatus: {
      height: true,
    },
  })
  log(result)
  // @snippet-end
}

import { SnippetParams } from '../snippet'

export default async function ({ blocks, log }: SnippetParams) {
  // @snippet-begin
  const block = await blocks.blockInfo(12_000_000)
  log(block)
  // @snippet-end
}

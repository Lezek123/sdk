import { SnippetParams } from '../snippet'

export default async function ({ blocks, log }: SnippetParams) {
  // @snippet-begin
  const block = await blocks.exactBlockAt(new Date('2025-01-01 00:00:00'))
  log(block)
  // @snippet-end
}

import { SnippetParams } from '../snippet'

export default async function ({ blocks, log }: SnippetParams) {
  // @snippet-begin
  const blockNumber = await blocks.estimateBlockNumberAt(
    new Date('2025-01-01 00:00:00')
  )
  log(blockNumber)
  // @snippet-end
}

import { SnippetParams } from '../snippet'

export default async function ({ blocks, log }: SnippetParams) {
  // @snippet-begin
  const startingPoint = await blocks.blockInfo(10_000_000)
  const blockNumber = await blocks.estimateBlockNumberAt(
    new Date('2025-01-01 00:00:00'),
    startingPoint
  )
  log(blockNumber)
  // @snippet-end
}

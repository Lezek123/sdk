import { SnippetParams } from '../snippet'

export default async function ({ blocks, log }: SnippetParams) {
  // @snippet-begin
  const block = await blocks.blockInfo(
    '0x8c0e3bcfcdd99053cbf6ce0e0a2ea229190f2407d823deca0a150996dddfe639'
  )
  log(block)
  // @snippet-end
}

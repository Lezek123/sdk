import { SnippetParams } from '../snippet'
// @snippet-begin
import { joyToHapi } from '@joystream/sdk-core/assets'

// @snippet-end
export default async function ({ log }: SnippetParams) {
  // @snippet-begin
  log(joyToHapi(1).toString())

  log(joyToHapi(12.00001).toString())
  // @snippet-end
}

import { SnippetParams } from '../snippet'
// @snippet-begin
import { knownAddresses } from '@joystream/sdk-core/keys'

// ...
// @snippet-end
export default async function ({ log, joystreamToolbox }: SnippetParams) {
  // @snippet-begin
  const { assets } = joystreamToolbox
  const { alice } = knownAddresses

  const balances = await assets.getBalances(alice)

  log(balances)
  // @snippet-end
}

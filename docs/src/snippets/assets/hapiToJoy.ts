import { SnippetParams } from '../snippet'
// @snippet-begin
import { hapiToJoy } from '@joystream/sdk-core/assets'
import BN from 'bn.js'

// @snippet-end
export default async function ({ log }: SnippetParams) {
  // @snippet-begin
  // Providing string value
  log(hapiToJoy('25000000000'))

  // Providing BigInt value
  log(hapiToJoy(BigInt(12_750) * BigInt(5_000_000_000)))

  // Providing number value:
  log(hapiToJoy(999_999_999))

  // Providing BN value
  log(hapiToJoy(new BN(15_430).mul(new BN(42_000_000_000))))
  // @snippet-end
}

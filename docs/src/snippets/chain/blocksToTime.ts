import { SnippetParams } from '../snippet'
// @snippet-begin
import { asTime } from '@joystream/sdk-core/chain/blocks'

// @snippet-end
export default async function ({ log }: SnippetParams) {
  // @snippet-begin
  const numbers = [42, 123, 2025]
  for (const number of numbers) {
    log(`${number} blocks is ${asTime(number, 'ms').toFixed(2)} miliseconds`)
    log(`${number} blocks is ${asTime(number, 's').toFixed(2)} seconds`)
    log(`${number} blocks is ${asTime(number, 'm').toFixed(2)} minutes`)
    log(`${number} blocks is ${asTime(number, 'h').toFixed(2)} hours`)
    log(`${number} blocks is ${asTime(number, 'd').toFixed(2)} days`)
    log('\n')
  }
  // @snippet-end
}

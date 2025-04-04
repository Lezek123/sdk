import { SnippetParams } from '../snippet'
// @snippet-begin
import { asBlocks } from '@joystream/sdk-core/chain/blocks'

// @snippet-end
export default async function ({ log }: SnippetParams) {
  // @snippet-begin
  log(`30 seconds is ~${asBlocks(30, 's')} blocks`)
  log(`15 minutes is ~${asBlocks(15, 'm')} blocks`)
  log(`4 hours is ~${asBlocks(4, 'h')} blocks`)
  log(`3 days is ~${asBlocks(3, 'd')} blocks`)
  log(`4 weeks is ~${asBlocks(4, 'w')} blocks`)
  // @snippet-end
}

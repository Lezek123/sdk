import { SnippetParams } from '../snippet'
// @snippet-begin
import {
  createApi,
  isMainnet,
  isSyncing,
  untilSynced,
} from '@joystream/sdk-core/chain'

// @snippet-end
export default async function ({ log }: SnippetParams) {
  // @snippet-begin
  const api = await createApi(`wss://mainnet.joystream.dev/rpc`)

  if (isMainnet(api)) {
    log('Connected to Joystream mainnet!')
    if (await isSyncing(api)) {
      log('The node is still syncing! Waiting until fully synced...')
      await untilSynced(api)
    }
    log('The node is fully synced!')
  }
  // @snippet-end
}

import { ApiPromise, WsProvider } from '@polkadot/api'
import { ApiOptions } from '@polkadot/api/types'
import { Health } from '@polkadot/types/interfaces'
import { promisifySubscription } from '../utils'
import { MAINNET_GENESIS_HASH } from './consts'

export type ApiConfig = ApiOptions & { wsTimeout?: number }

export async function createApi(
  wsUri: string,
  { wsTimeout, ...apiOptions }: ApiConfig = {}
) {
  // TODO: Or fail?
  const wsProvider = new WsProvider(wsUri, undefined, undefined, wsTimeout)
  const api = await ApiPromise.create({
    provider: wsProvider,
    ...(apiOptions || {}),
  })

  return api
}

export function isMainnet(api: ApiPromise) {
  return api.genesisHash.toHex() === MAINNET_GENESIS_HASH
}

export async function isSyncing(api: ApiPromise): Promise<boolean> {
  const { isSyncing } = await api.rpc.system.health()
  return isSyncing.valueOf()
}

export async function untilSynced(api: ApiPromise): Promise<void> {
  return promisifySubscription<Health>(
    api.rpc.system.health,
    ({ isSyncing }) => isSyncing.isFalse
  )
}

// Disconnect and wait until the api actually disconnects
export async function disconnect(api: ApiPromise): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    api.once('disconnected', resolve)
    api.disconnect().catch(reject)
  })
}

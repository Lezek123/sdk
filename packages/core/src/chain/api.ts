import { AsCodec } from '@joystream/types'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { Codec, Observable } from '@polkadot/types/types'
import { ApiOptions, AugmentedQuery } from '@polkadot/api/types'
import { u8aToBigInt } from '@polkadot/util'
import { Health } from '@polkadot/types/interfaces'
import { promisifySubscription } from '../utils'
import { MAINNET_GENESIS_HASH } from './consts'

export async function createApi(
  wsUri: string,
  { wsTimeout, ...apiOptions }: ApiOptions & { wsTimeout?: number } = {}
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

export async function sortedEntries<
  IDType extends Codec,
  ValueType extends Codec,
>(
  apiMethod: AugmentedQuery<
    'promise',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: any) => Observable<ValueType>,
    [IDType]
  >
): Promise<[IDType, AsCodec<ValueType>][]> {
  const entries: [IDType, AsCodec<ValueType>][] = (
    await apiMethod.entries()
  ).map(([storageKey, value]) => [storageKey.args[0] as IDType, value])

  return entries.sort((a, b) =>
    u8aToBigInt(a[0].toU8a()) < u8aToBigInt(b[0].toU8a()) ? -1 : 1
  )
}

// TODO: Batching of RPC queries?

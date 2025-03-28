import { AsCodec } from '@joystream/types'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { Codec, Observable } from '@polkadot/types/types'
import { AugmentedQuery } from '@polkadot/api/types'
import { u8aToBigInt } from '@polkadot/util'
import { Health } from '@polkadot/types/interfaces'
import { promisifySubscription } from '../utils'

export async function createApi(wsUri: string) {
  const wsProvider = new WsProvider(wsUri)
  const api = await ApiPromise.create({
    provider: wsProvider,
  })

  return api
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

export async function sortedEntries<
  IDType extends Codec,
  ValueType extends Codec,
>(
  apiMethod: AugmentedQuery<
    'promise',
    (key: IDType) => Observable<ValueType>,
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

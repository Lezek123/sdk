import { ApiPromise } from '@polkadot/api'
import { ContentFees, createApi, NftConfig } from '../chain'
import { QueryNodeApi, QueryNodeApiConfig } from '../query/queryNode'
import { CleanObject } from '../utils'
import { OrionApi, OrionApiConfig } from '../query/orion'
import { StorageSquidApi, StorageSquidApiConfig } from '../query/storageSquid'
import { BlockUtils } from '../chain/blocks'
import { createStatescanClient } from '../query/statescan'
import { TxManager } from '../tx'
import { KeyManager, KeyManagerConfig } from '../keys'
import { AssetsManager } from '../assets'
import { ApiConfig } from '../chain/api'

export type ToolboxConfig = {
  nodeWsEndpoint?: string
  apiConfig?: ApiConfig
  keyManagerConfig?: KeyManagerConfig
  queryNodeUrl?: string
  queryNodeApiConfig?: Partial<QueryNodeApiConfig>
  orionUrl?: string
  orionApiConfig?: Partial<OrionApiConfig>
  storageSquidUrl?: string
  storageSquidApiConfig?: Partial<StorageSquidApiConfig>
  statescanGraphqlUrl?: string
}

type ToolboxFromConfig<Config extends ToolboxConfig> = CleanObject<{
  api: Config['nodeWsEndpoint'] extends undefined ? never : ApiPromise
  keys: KeyManager
  assets: Config['nodeWsEndpoint'] extends undefined ? never : AssetsManager
  txm: Config['nodeWsEndpoint'] extends undefined ? never : TxManager
  blockUtils: Config['nodeWsEndpoint'] extends undefined ? never : BlockUtils
  data: Config['nodeWsEndpoint'] extends undefined
    ? never
    : {
        contentFees: ContentFees
        nftConfig: NftConfig
      }
  qnApi: Config['queryNodeUrl'] extends undefined ? never : QueryNodeApi
  orionApi: Config['orionUrl'] extends undefined ? never : OrionApi
  storageSquidApi: Config['storageSquidUrl'] extends undefined
    ? never
    : StorageSquidApi
}>

export async function createJoystreamToolbox<C extends ToolboxConfig>({
  nodeWsEndpoint,
  apiConfig,
  keyManagerConfig,
  queryNodeUrl,
  queryNodeApiConfig,
  orionUrl,
  orionApiConfig,
  storageSquidUrl,
  storageSquidApiConfig,
  statescanGraphqlUrl,
}: C): Promise<ToolboxFromConfig<C>> {
  const api = nodeWsEndpoint
    ? await createApi(nodeWsEndpoint, apiConfig)
    : undefined
  const assets = api ? new AssetsManager(api) : undefined
  const qnApi = queryNodeUrl
    ? new QueryNodeApi(queryNodeUrl, queryNodeApiConfig)
    : undefined
  const orionApi = orionUrl ? new OrionApi(orionUrl, orionApiConfig) : undefined
  const storageSquidApi = storageSquidUrl
    ? new StorageSquidApi(storageSquidUrl, storageSquidApiConfig)
    : undefined
  const statescanClient = statescanGraphqlUrl
    ? createStatescanClient({ url: statescanGraphqlUrl })
    : undefined
  const keys = new KeyManager(keyManagerConfig)
  const blockUtils = api ? new BlockUtils(api, statescanClient) : undefined
  const contentFees = api ? await new ContentFees(api).asReady : undefined
  const nftConfig = api ? await new NftConfig(api).asReady : undefined
  const txm = api ? new TxManager(api, keys, blockUtils) : undefined
  return {
    api,
    assets,
    blockUtils,
    data: {
      contentFees,
      nftConfig,
    },
    keys,
    orionApi,
    qnApi,
    storageSquidApi,
    txm,
  } as unknown as ToolboxFromConfig<C>
}

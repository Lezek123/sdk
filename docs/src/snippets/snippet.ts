import * as importsChain from '@joystream/sdk-core/chain'
import * as importsChainBlocks from '@joystream/sdk-core/chain/blocks'
import { createApi } from '@joystream/sdk-core/chain'
import { BlockUtils } from '@joystream/sdk-core/chain/blocks'
import { OrionApi } from '@joystream/sdk-core/query/orion'
import { QueryNodeApi } from '@joystream/sdk-core/query/queryNode'
import { StorageSquidApi } from '@joystream/sdk-core/query/storageSquid'
import { endpoints } from '@joystream/sdk-core/utils/endpoints'

export const contextVars = [
  'api',
  'qnApi',
  'orionApi',
  'storageSquidApi',
  'blocks',
  'imports',
] as const

const imports = {
  'chain': importsChain,
  'chain/blocks': importsChainBlocks,
}

export const createSnippetContext = async () => {
  const api = await createApi(endpoints.joystreamDev.wsRpc)
  return {
    api,
    qnApi: new QueryNodeApi(endpoints.joystreamDev.queryNode),
    orionApi: new OrionApi(endpoints.joystreamDev.orion),
    storageSquidApi: new StorageSquidApi(endpoints.joystreamDev.storageSquid),
    blocks: new BlockUtils(api),
    imports,
  } satisfies { [K in (typeof contextVars)[number]]: unknown }
}

export type SnippetContext = Awaited<ReturnType<typeof createSnippetContext>>

export type SnippetParams = {
  log: typeof console.log
} & SnippetContext

export type SnippetFunc = (params: SnippetParams) => Promise<void>

export const runSnippet = async (inner: SnippetFunc) => {
  const context = await createSnippetContext()
  await inner({
    log: console.log,
    ...context,
  })
}

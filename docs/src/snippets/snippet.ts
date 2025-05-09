import * as importsChain from '@joystream/sdk-core/chain'
import * as importsChainBlocks from '@joystream/sdk-core/chain/blocks'
import * as importsAssets from '@joystream/sdk-core/assets'
import * as importKeys from '@joystream/sdk-core/keys'
import * as importTx from '@joystream/sdk-core/tx'
import * as importToolbox from '@joystream/sdk-core/toolbox'
import * as importUtils from '@joystream/sdk-core/utils'
import * as importBN from 'bn.js'
import { endpoints } from '@joystream/sdk-core/utils/endpoints'
import { createJoystreamToolbox } from '@joystream/sdk-core/toolbox'

export const contextVars = [
  'api',
  'qnApi',
  'orionApi',
  'storageSquidApi',
  'blocks',
  'assets',
  'keys',
  'imports',
  'joystreamToolbox',
] as const

export const imports = {
  '@joystream/sdk-core/utils': importUtils,
  '@joystream/sdk-core/keys': importKeys,
  '@joystream/sdk-core/tx': importTx,
  '@joystream/sdk-core/chain': importsChain,
  '@joystream/sdk-core/chain/blocks': importsChainBlocks,
  '@joystream/sdk-core/assets': importsAssets,
  '@joystream/sdk-core/toolbox': importToolbox,
  'bn.js': importBN,
}

export const createSnippetContext = async () => {
  const joystreamToolbox = await createJoystreamToolbox({
    nodeWsEndpoint: endpoints.joystreamDev.wsRpc,
    orionUrl: endpoints.joystreamDev.orion,
    storageSquidUrl: endpoints.joystreamDev.storageSquid,
    queryNodeUrl: endpoints.joystreamDev.queryNode,
    keyManagerConfig: { keyringOptions: { isDev: true } },
  })
  return {
    api: joystreamToolbox.api,
    qnApi: joystreamToolbox.qnApi,
    orionApi: joystreamToolbox.orionApi,
    storageSquidApi: joystreamToolbox.storageSquidApi,
    blocks: joystreamToolbox.blockUtils,
    assets: joystreamToolbox.assets,
    keys: joystreamToolbox.keys,
    joystreamToolbox,
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

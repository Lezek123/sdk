import { OrionApi } from '@joystream/sdk-core/query/orion'
import { QueryNodeApi } from '@joystream/sdk-core/query/queryNode'
import { endpoints } from '@joystream/sdk-core/utils/endpoints'

export const snippetScope = {
  qnApi: new QueryNodeApi(endpoints.joystreamDev.queryNode),
  orionApi: new OrionApi(endpoints.joystreamDev.orion),
} as const

export type SnippetParams = {
  log: typeof console.log
} & typeof snippetScope

export type SnippetFunc = (params: SnippetParams) => Promise<void>

export const runSnippet = async (inner: SnippetFunc) => {
  await inner({
    log: console.log,
    ...snippetScope,
  })
}

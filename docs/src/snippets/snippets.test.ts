import { describe } from '@jest/globals'
import { SnippetFunc, createSnippetContext } from './snippet'
import qnSnippets from './query/queryNode'
import orionSnippets from './query/orion'
import storageSquidSnippets from './query/storageSquid'
import { disconnect } from '@joystream/sdk-core/chain'

const snippets = {
  query: {
    queryNode: qnSnippets,
    orion: orionSnippets,
    storageSquid: storageSquidSnippets,
  },
}

const snippetContext = createSnippetContext()

type Snippets = Record<string, SnippetFunc | Record<string, unknown>>

function testSnippets(source: Snippets) {
  for (const [name, value] of Object.entries(source)) {
    if (typeof value === 'function') {
      it.concurrent(
        name,
        async () => {
          await value({
            ...(await snippetContext),
            log: () => null, // Don't log anything to keep the output clean
          })
        },
        60_000
      )
    } else {
      describe(name, () => {
        testSnippets(value as Snippets)
      })
    }
  }
}

afterAll(async () => {
  const { qnApi, api, orionApi } = await snippetContext
  await disconnect(api)
  await qnApi.disconnect()
  await orionApi.disconnect()
})

describe('Snippets', () => {
  testSnippets(snippets)
})

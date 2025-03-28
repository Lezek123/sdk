import { describe } from '@jest/globals'
import { SnippetFunc, snippetScope } from './snippet'
import qnSnippets from './query/queryNode'
import orionSnippets from './query/orion'

const snippets = {
  query: {
    queryNode: qnSnippets,
    orion: orionSnippets,
  },
}

type Snippets = Record<string, SnippetFunc | Record<string, unknown>>

function testSnippets(source: Snippets) {
  for (const [name, value] of Object.entries(source)) {
    if (typeof value === 'function') {
      it.concurrent(
        name,
        async () => {
          await value({
            ...snippetScope,
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
  await snippetScope.qnApi.disconnect()
  await snippetScope.orionApi.disconnect()
})

describe('Snippets', () => {
  testSnippets(snippets)
})

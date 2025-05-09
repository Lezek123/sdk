import React, { useEffect, useState } from 'react'
import Playground from '@theme/Playground'
import ReactLiveScope from '@theme/ReactLiveScope'
import CodeBlock, { type Props } from '@theme-init/CodeBlock'
import { createSnippetContext, SnippetContext } from '../../snippets/snippet'
import { disconnect } from '@joystream/sdk-core/chain'

const withLiveEditor = (Component: typeof CodeBlock) => {
  function WrappedComponent(props: Props) {
    const [context, setContext] = useState<SnippetContext>()
    useEffect(() => {
      const ctxPromise = createSnippetContext()
      ctxPromise.then((ctx) => setContext(ctx))
      return () => {
        ctxPromise.then((ctx) => {
          disconnect(ctx.api)
          ctx.qnApi.disconnect()
          ctx.orionApi.disconnect()
        })
      }
    }, [])
    if (props.live) {
      return <Playground scope={{ ...ReactLiveScope, ...context }} {...props} />
    }

    return <Component {...props} />
  }

  return WrappedComponent
}

export default withLiveEditor(CodeBlock)

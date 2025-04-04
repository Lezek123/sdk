import React from 'react'
import { createSnippetContext } from '../../snippets/snippet'

// Add react-live imports you need here
const ReactLiveScope: unknown = {
  React,
  context: createSnippetContext(),
  ...React,
}

export default ReactLiveScope

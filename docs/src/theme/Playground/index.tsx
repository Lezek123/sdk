import React, { type ReactNode } from 'react'
import useIsBrowser from '@docusaurus/useIsBrowser'
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import BrowserOnly from '@docusaurus/BrowserOnly'
import {
  ErrorBoundaryErrorMessageFallback,
  usePrismTheme,
} from '@docusaurus/theme-common'
import ErrorBoundary from '@docusaurus/ErrorBoundary'

import type { Props } from '@theme/Playground'
import type { ThemeConfig } from '@docusaurus/theme-live-codeblock'

import styles from './styles.module.css'
import { transformLiveCode } from './transformLiveCode'
import { codePreTransform } from './codePreTransform'

function LivePreviewLoader() {
  return <div>Loading...</div>
}

function Preview() {
  // No SSR for the live preview
  // See https://github.com/facebook/docusaurus/issues/5747
  return (
    <BrowserOnly fallback={<LivePreviewLoader />}>
      {() => (
        <>
          <ErrorBoundary
            fallback={(params) => (
              <ErrorBoundaryErrorMessageFallback {...params} />
            )}
          >
            <LivePreview />
          </ErrorBoundary>
          <LiveError />
        </>
      )}
    </BrowserOnly>
  )
}

function Result() {
  return (
    <div className={styles.playgroundPreview}>
      <Preview />
    </div>
  )
}

function ThemedLiveEditor() {
  const isBrowser = useIsBrowser()
  return (
    <LiveEditor
      // We force remount the editor on hydration,
      // otherwise dark prism theme is not applied
      key={String(isBrowser)}
      className={styles.playgroundEditor}
    />
  )
}

function Editor() {
  return <ThemedLiveEditor />
}

export default function Playground({
  children,
  transformCode,
  ...props
}: Props): ReactNode {
  const {
    siteConfig: { themeConfig },
  } = useDocusaurusContext()
  const {
    liveCodeBlock: { playgroundPosition },
  } = themeConfig as ThemeConfig
  const prismTheme = usePrismTheme()

  const noInline = props.metastring?.includes('noInline') ?? false

  return (
    <div className={styles.playgroundContainer}>
      <LiveProvider
        code={codePreTransform(children).replace(/\n$/, '')}
        noInline={noInline}
        transformCode={transformCode ?? transformLiveCode}
        theme={prismTheme}
        {...props}
      >
        {playgroundPosition === 'top' ? (
          <>
            <Result />
            <Editor />
          </>
        ) : (
          <>
            <Editor />
            <Result />
          </>
        )}
      </LiveProvider>
    </div>
  )
}

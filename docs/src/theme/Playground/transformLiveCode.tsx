import { imports } from '../../snippets/snippet'
import _ from 'lodash'

const replaceImports = (code: string) => {
  for (const importPath of Object.keys(imports)) {
    code = code.replace(
      new RegExp(
        `import \\{(?<importedElements>[^\\}]+?)\\} from '${_.escapeRegExp(importPath)}'`
      ),
      `const {$<importedElements>} = imports['${importPath}']`
    )
    code = code.replace(
      new RegExp(
        `import (?<importName>.+) from '${_.escapeRegExp(importPath)}'`
      ),
      `const $<importName> = imports['${importPath}']`
    )
  }
  return code
}

// // this should rather be a stable function
// // see https://github.com/facebook/docusaurus/issues/9630#issuecomment-1855682643
export const transformLiveCode = (code: string) => `
() => {
  const [logs, setLogs] = useState([])
  const [running, setRunning] = useState(false)
  const log = (...values) => setLogs((l) => [
    ...l,
    ...values.map((value) => (
      typeof value === 'string'
        ? value
        : JSON.stringify(value, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2)
    ))
  ])
  const runCode = async () => {
    setLogs([])
    setRunning(true)
    ${replaceImports(code)}
    setRunning(false)
  }
  return (
    <>
      <div>
        <button
          disabled={(typeof imports === 'undefined') || running}
          className="button button--primary margin-right--xs"
          onClick={runCode}
        >
          {running ? 'Running...' : 'Run example'}
        </button>
        {!!logs.length && (
          <button
            className="button button--secondary"
            onClick={() => setLogs([])}
          >
            Clear output
          </button>
        )}
      </div>
      {!!logs.length && (
        <pre style={{ overflow: 'hidden' }} className="margin-vert--md">
          <div
            style={{ maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}
          >
            {logs.map((l) => (
              <div>{l}</div>
            ))}
          </div>
        </pre>
      )}
    </>
  )
}
`

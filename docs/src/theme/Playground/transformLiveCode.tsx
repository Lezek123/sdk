const replaceImports = (code: string) => {
  return code.replace(
    /import \{(?<importedElements>[\s\S]+)\} from '@joystream\/sdk-core\/(?<importPath>.+)'/,
    "const {$<importedElements>} = imports['$<importPath>']"
  )
}

// // this should rather be a stable function
// // see https://github.com/facebook/docusaurus/issues/9630#issuecomment-1855682643
export const transformLiveCode = (code: string) => `
() => {
  const [logs, setLogs] = useState([])
  const [running, setRunning] = useState(false)
  const log = (value) => setLogs((l) => [
    ...l,
    typeof value === 'string' ? value : JSON.stringify(value, null, 2)
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
          disabled={running}
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

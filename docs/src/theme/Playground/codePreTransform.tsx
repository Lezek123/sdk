export function codePreTransform(code?: string) {
  if (
    !code ||
    !(code.includes('@snippet-begin') || code.includes('@snippet-end'))
  ) {
    return code
  }
  let processing = false
  let whitespaceToRm = ''
  let transformed = ''
  for (const line of code.split('\n')) {
    if (line.includes('@snippet-end')) {
      processing = false
    }
    if (processing) {
      transformed += line.replace(new RegExp(`^${whitespaceToRm}`), '') + '\n'
    }
    if (line.includes('@snippet-begin')) {
      processing = true
      const wmMatch = line.match(/^[\s]+/)
      whitespaceToRm = wmMatch ? wmMatch[0] : ''
    }
  }

  return transformed
}

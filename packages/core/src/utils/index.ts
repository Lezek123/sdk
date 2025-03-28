export function hasMessage(e: unknown): e is { message: string } {
  return !!(
    typeof e === 'object' &&
    e &&
    'message' in e &&
    typeof e.message === 'string'
  )
}

export function errorMsg(e: unknown): string {
  if (hasMessage(e)) {
    return e.message
  } else if (typeof e === 'string') {
    return e
  } else if (typeof e === 'object' && e && 'toString' in e) {
    return e.toString()
  } else {
    return `Encountered error of type: ${typeof e}`
  }
}

export function toError(e: unknown): Error {
  if (e instanceof Error) {
    return e
  }
  return new Error(errorMsg(e))
}

export const sleep = (timeMs: number) =>
  new Promise((resolve) => setTimeout(resolve, timeMs))

export * from './subscriptions'

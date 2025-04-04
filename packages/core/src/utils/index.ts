export { promisifySubscription } from './subscriptions'
import BN from 'bn.js'

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

export function toBN(n: number | bigint | BN | string) {
  if (BN.isBN(n)) {
    return n
  }
  if (typeof n === 'number' || typeof n === 'bigint') {
    return new BN(n.toString(16), 16)
  }
  if (typeof n === 'string') {
    return new BN(BigInt(n).toString(16), 16)
  }
  throw new Error('Unsupported number format')
}

export function toBigInt(n: number | bigint | BN | string) {
  return BigInt(n.toString(10))
}

export const sleep = (timeMs: number) =>
  new Promise((resolve) => setTimeout(resolve, timeMs))

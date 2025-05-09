export { promisifySubscription } from './subscriptions'
import { createType } from '@joystream/types'
import { u8aConcat, u8aFixLength } from '@polkadot/util'
import { AbstractInt } from '@polkadot/types-codec'
import BN from 'bn.js'
import { toAddress } from '../keys'

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

export type AnyNumber = number | bigint | BN | string

export function divCeil(a: AnyNumber, b: AnyNumber): bigint {
  const aNorm = toBigInt(a)
  const bNorm = toBigInt(b)
  return aNorm / bNorm + (aNorm % bNorm ? 1n : 0n)
}

export function min<T extends AnyNumber>(...vals: T[]): T {
  return vals.sort((a, b) => (toBigInt(a) < toBigInt(b) ? -1 : 1))[0]
}

export function max<T extends AnyNumber>(...vals: T[]): T {
  return vals.sort((a, b) => (toBigInt(a) > toBigInt(b) ? -1 : 1))[0]
}

export function toBN(n: AnyNumber) {
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

export function toBigInt(n: AnyNumber) {
  if (typeof n === 'bigint') {
    return n
  }
  if (typeof n === 'number') {
    return BigInt(n)
  }
  return BigInt(n.toString(10))
}

export const sleep = (timeMs: number) =>
  new Promise((resolve) => setTimeout(resolve, timeMs))

export const storageUnits = {
  'B': 1,
  'KB': 1_000,
  'KiB': 1_024,
  'MB': 1_000_000,
  'MiB': 1_048_576,
  'GB': 1_000_000_000,
  'GiB': 1_073_741_824,
  'TB': 1_000_000_000_000,
  'TiB': 1_099_511_627_776,
  'PB': 1_000_000_000_000_000, // MAX_SAFE_INTEGER / 9.007
  'PiB': 1_125_899_906_842_624, // MAX_SAFE_INTEGER / 8
} as const

// TODO: Test
export const channelRewardAccount = (channelId: AnyNumber) =>
  runtimeModuleAccount(
    'mContent',
    'CHANNEL',
    createType('u64', toBN(channelId))
  )

export const runtimeModuleAccount = (
  moduleId: string,
  sub?: string,
  id?: AbstractInt
) =>
  toAddress(
    createType(
      'AccountId32',
      u8aFixLength(
        u8aConcat(
          ...[
            'modl',
            moduleId,
            ...(sub ? [createType('Bytes', sub).toU8a(false)] : []),
            ...(id ? [id.toU8a()] : []),
          ]
        ),
        32 * 8,
        true
      )
    )
  )

export type CleanObject<O> = {
  [K in keyof O as O[K] extends never ? never : K]: O[K]
}

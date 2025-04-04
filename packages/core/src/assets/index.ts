import BN from 'bn.js'
import { InvalidAmountError } from './errors'
import _ from 'lodash'
import { toBigInt } from '../utils'

export const JOY_DECIMALS = 10
export const HAPI_PER_JOY = 10 ** JOY_DECIMALS

export function joyToHapi(joy: number): bigint {
  const intPart = Math.floor(joy)
  const fractionPart = joy - intPart
  const intPartAsHAPI = BigInt(intPart) * BigInt(HAPI_PER_JOY)
  const fractionPartAsHAPI = BigInt(Math.round(fractionPart * HAPI_PER_JOY))
  return intPartAsHAPI + fractionPartAsHAPI
}

export function hapiToJoy(hapi: string | bigint | BN | number): number {
  let hapiBn: bigint
  try {
    hapiBn = toBigInt(hapi)
  } catch {
    throw new InvalidAmountError(
      `Cannot convert HAPI to JOY: "${hapi}" is not a valid number`
    )
  }
  const intPart = Number(hapiBn / BigInt(HAPI_PER_JOY))
  const fractionPartHAPI = hapiBn % BigInt(HAPI_PER_JOY)
  const fractionPart = Number(fractionPartHAPI) / HAPI_PER_JOY

  return _.round(intPart + fractionPart, JOY_DECIMALS)
}

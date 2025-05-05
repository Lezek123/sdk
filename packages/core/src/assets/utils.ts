import '@joystream/types'
import BN from 'bn.js'
import { InvalidAmountError } from './errors'
import _ from 'lodash'
import { toBigInt, AnyNumber } from '../utils'
import { HAPI_PER_JOY, JOY_DECIMALS } from './consts'

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

export function calculateAmmMintCost({
  slope,
  intercept,
  providedSupply,
  tokenAmount,
}: {
  slope: AnyNumber
  intercept: AnyNumber
  providedSupply: AnyNumber
  tokenAmount: AnyNumber
}) {
  const supplyBefore = toBigInt(providedSupply)
  const supplyAfter = supplyBefore + toBigInt(tokenAmount)
  return (
    ((supplyAfter ** 2n - supplyBefore ** 2n) * toBigInt(slope)) / 2n +
    (supplyAfter - supplyBefore) * toBigInt(intercept)
  )
}

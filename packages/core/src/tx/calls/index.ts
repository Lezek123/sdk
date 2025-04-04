import { ApiPromise } from '@polkadot/api'
import {
  AugmentedSubmittable,
  AugmentedSubmittables,
  SubmittableExtrinsic,
} from '@polkadot/api/types'
import { AnyFunction } from '@polkadot/types/types'
import { GenericExtrinsic } from '@polkadot/types'

export type CallSection = keyof AugmentedSubmittables<'promise'> & string
export type CallMethod<S extends CallSection> =
  keyof AugmentedSubmittables<'promise'>[S] & string

export type CallType<S extends CallSection, M extends CallMethod<S>> =
  ApiPromise['tx'][S][M] extends AugmentedSubmittable<AnyFunction, infer A>
    ? SubmittableExtrinsic<'promise'> & GenericExtrinsic<A>
    : SubmittableExtrinsic<'promise'>

export function isCall<S extends CallSection, M extends CallMethod<S>>(
  tx: SubmittableExtrinsic<'promise'>,
  section: S,
  method: M
): tx is CallType<S, M> {
  return tx.method.section === section && tx.method.method === method
}

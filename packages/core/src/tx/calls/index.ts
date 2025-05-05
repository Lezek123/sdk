import { ApiPromise } from '@polkadot/api'
import {
  AugmentedSubmittable,
  AugmentedSubmittables,
} from '@polkadot/api/types'
import { AnyFunction } from '@polkadot/types/types'
import { GenericExtrinsic } from '@polkadot/types'
import { Call, Extrinsic } from '@polkadot/types/interfaces'

export type AnyCall = Call | Extrinsic
export type CallSection = keyof AugmentedSubmittables<'promise'> & string
export type CallMethod<S extends CallSection> =
  keyof AugmentedSubmittables<'promise'>[S] & string

export type DecoratedCall<C, S extends CallSection, M extends CallMethod<S>> =
  ApiPromise['tx'][S][M] extends AugmentedSubmittable<AnyFunction, infer A>
    ? C & { args: A }
    : C

// TODO: Move to a more approperiate place
export const workingGroups = {
  Storage: 'storageWorkingGroup',
  Content: 'contentWorkingGroup',
  Forum: 'forumWorkingGroup',
  Membership: 'membershipWorkingGroup',
  App: 'appWorkingGroup',
  Distribution: 'distributionWorkingGroup',
  Builders: 'operationsWorkingGroupAlpha',
  HR: 'operationsWorkingGroupBeta',
  Marketing: 'operationsWorkingGroupGamma',
} as const
type WgName = keyof typeof workingGroups
type WgModule = (typeof workingGroups)[WgName]
export const workingGroupModules = Object.values(workingGroups) as [WgModule]

export function isExtrinsic(c: AnyCall): c is GenericExtrinsic {
  return c instanceof GenericExtrinsic
}

export function isCall<
  C extends AnyCall,
  S extends CallSection,
  M extends CallMethod<S>,
>(c: C, section: S, method: M): c is DecoratedCall<C, S, M> {
  if (isExtrinsic(c)) {
    return c.method.section === section && c.method.method === method
  }
  return c.section === section && c.method === method
}

export function isAnyWgCall<
  C extends AnyCall,
  M extends CallMethod<'storageWorkingGroup'>,
>(c: C, method: M): c is DecoratedCall<C, 'storageWorkingGroup', M> {
  if (isExtrinsic(c)) {
    return (
      workingGroupModules.includes(c.method.section as WgModule) &&
      c.method.method === method
    )
  }
  return (
    workingGroupModules.includes(c.section as WgModule) && c.method === method
  )
}

// TODO: Definitely having txArgs helper which would extract named tx args would be great,
// but it seems like there's no way to do this without adding custom typegen scripts

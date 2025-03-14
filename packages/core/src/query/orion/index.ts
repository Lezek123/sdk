import _ from 'lodash'
import {
  QueryApi,
  AnyEntity,
  PaginationType,
  Config,
} from './__generated__/QueryApi'
import { ENTITY_INFO } from './__generated__/entityInfo'

export const ALL_ENTITIES = Object.keys(ENTITY_INFO) as AnyEntity[]
export const HIDDEN_ENTITIES = [
  // Auth API entities
  'Account',
  'User',
  'Session',
  'Token',
  // Other hidden entities
  'VideoViewEvent',
  'ChannelFollow',
  'Report',
  'Exclusion',
  'NotificationEmailDelivery',
  'ChannelVerification',
  'ChannelSuspension',
  'NftFeaturingRequest',
  'GatewayConfig',
  'EmailDeliveryAttempt',
  'UserInteractionCount',
] as const
export const VISIBLE_ENTITIES = _.difference(
  ALL_ENTITIES,
  HIDDEN_ENTITIES
) as Exclude<AnyEntity, (typeof HIDDEN_ENTITIES)[number]>[]

export class OrionApi extends QueryApi<PaginationType.Connection> {
  constructor(url: string, config?: Partial<Config>) {
    super(url, PaginationType.Connection, config)
  }
}
export { AnyEntity }

import _ from 'lodash'
import { ENTITY_INFO } from './__generated__/entityInfo'
import { AnyEntity } from './__generated__/QueryApi'

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

import '@joystream/types'
import { u8aToU8a } from '@polkadot/util'
import { ApiPromise } from '@polkadot/api'
import {
  PalletContentChannelCreationParametersRecord,
  PalletContentChannelOwner,
  PalletContentChannelUpdateParametersRecord,
  PalletContentPermissionsContentActor,
  PalletContentVideoCreationParametersRecord,
  PalletContentVideoUpdateParametersRecord,
  PalletMembershipBuyMembershipParameters,
} from '@polkadot/types/lookup'
import { AsSimple, MetaInput, metaToBytes } from '../chain/types'
import {
  AppAction,
  ChannelMetadata,
  ChannelModeratorRemarked,
  ChannelOwnerRemarked,
  IAppAction,
  IChannelMetadata,
  IChannelModeratorRemarked,
  IChannelOwnerRemarked,
  IMemberRemarked,
  IMembershipMetadata,
  IVideoMetadata,
  MemberRemarked,
  MembershipMetadata,
  VideoMetadata,
} from '@joystream/metadata-protobuf'
import { AnyMetadataClass } from '@joystream/metadata-protobuf/types'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { isCall } from './calls'

export type WithReplaced<Original, Replacement> = Omit<
  Original,
  keyof Replacement
> &
  Replacement

export type MetaTxParams<Original, Replacement> = WithReplaced<
  AsSimple<Original>,
  Replacement
>

export type MemberRemarkParams<Kind extends keyof IMemberRemarked> = MetaInput<
  IMemberRemarked[Kind]
> & { memberId: number | bigint }

export function memberRemarkMetaTx<Kind extends keyof IMemberRemarked>(
  api: ApiPromise,
  kind: Kind,
  { memberId, ...params }: MemberRemarkParams<Kind>,
  payment?: [string | Uint8Array, number | bigint]
) {
  return api.tx.members.memberRemark(
    memberId,
    metaToBytes(MemberRemarked, {
      [kind]: params,
    }),
    payment || null
  )
}

export type ChannelOwnerRemarkParams<Kind extends keyof IChannelOwnerRemarked> =
  MetaInput<IChannelOwnerRemarked[Kind]> & { channelId: number | bigint }

export function channelOwnerRemarkMetaTx<
  Kind extends keyof IChannelOwnerRemarked,
>(
  api: ApiPromise,
  kind: Kind,
  { channelId, ...params }: ChannelOwnerRemarkParams<Kind>
) {
  return api.tx.content.channelOwnerRemark(
    channelId,
    metaToBytes(ChannelOwnerRemarked, {
      [kind]: params,
    })
  )
}

export type ChannelModeratorRemarkParams<
  Kind extends keyof IChannelModeratorRemarked,
> = MetaInput<IChannelModeratorRemarked[Kind]> & {
  channelId: number | bigint
  actor: AsSimple<PalletContentPermissionsContentActor>
}

export function channelModeratorRemarkMetaTx<
  Kind extends keyof IChannelModeratorRemarked,
>(
  api: ApiPromise,
  kind: Kind,
  { actor, channelId, ...params }: ChannelModeratorRemarkParams<Kind>
) {
  return api.tx.content.channelAgentRemark(
    actor,
    channelId,
    metaToBytes(ChannelModeratorRemarked, { [kind]: params })
  )
}

export type BuyMembershipParams = MetaTxParams<
  PalletMembershipBuyMembershipParameters,
  { metadata?: MetaInput<IMembershipMetadata> }
>

export type UpdateProfileParams = {
  memberId: number | bigint
  handle?: string
  metadata?: MetaInput<IMembershipMetadata>
}

export type AppAttributionParams = {
  appId: string
  signature: `0x${string}` | Uint8Array
  metadata?: `0x${string}` | Uint8Array
}

export type CreateChannelParams = MetaTxParams<
  PalletContentChannelCreationParametersRecord,
  { meta?: MetaInput<IChannelMetadata> }
> & {
  owner: AsSimple<PalletContentChannelOwner>
  appAttribution?: AppAttributionParams
}

export type UpdateChannelParams = MetaTxParams<
  PalletContentChannelUpdateParametersRecord,
  { newMeta?: MetaInput<IChannelMetadata> }
> & {
  actor: AsSimple<PalletContentPermissionsContentActor>
  channelId: number | bigint
}

export type CreateVideoParams = MetaTxParams<
  PalletContentVideoCreationParametersRecord,
  { meta?: MetaInput<IVideoMetadata> }
> & {
  actor: AsSimple<PalletContentPermissionsContentActor>
  channelId: number | bigint
  appAttribution?: AppAttributionParams
}

export type UpdateVideoParams = MetaTxParams<
  PalletContentVideoUpdateParametersRecord,
  { newMeta?: MetaInput<IVideoMetadata> }
> & {
  actor: AsSimple<PalletContentPermissionsContentActor>
  videoId: number | bigint
}

export function asAppAction<T>(
  rawMetaClass: AnyMetadataClass<T>,
  rawMeta: T | undefined,
  { appId, signature, metadata }: AppAttributionParams
): IAppAction {
  return {
    appId,
    signature: u8aToU8a(signature),
    metadata: u8aToU8a(metadata),
    rawAction: rawMeta && rawMetaClass.encode(rawMeta).finish(),
  }
}

export function isPureMetaAction(tx: SubmittableExtrinsic<'promise'>) {
  return (
    isCall(tx, 'members', 'memberRemark') ||
    isCall(tx, 'content', 'channelOwnerRemark') ||
    isCall(tx, 'content', 'channelAgentRemark')
  )
}

export function metaTransactions(api: ApiPromise) {
  return {
    members: {
      buyMembership(params: BuyMembershipParams) {
        return api.tx.members.buyMembership({
          ...params,
          metadata:
            params.metadata && metaToBytes(MembershipMetadata, params.metadata),
        })
      },
      updateProfile({ memberId, handle, metadata }: UpdateProfileParams) {
        return api.tx.members.updateProfile(
          memberId,
          handle || null,
          (metadata || null) && metaToBytes(MembershipMetadata, metadata)
        )
      },
    },
    content: {
      createChannel(params: CreateChannelParams) {
        const { meta, appAttribution } = params
        return api.tx.content.createChannel(params.owner, {
          ...params,
          meta: appAttribution
            ? metaToBytes(
                AppAction,
                asAppAction(ChannelMetadata, meta, appAttribution)
              )
            : meta && metaToBytes(ChannelMetadata, meta),
        })
      },
      updateChannel({ actor, channelId, ...params }: UpdateChannelParams) {
        return api.tx.content.updateChannel(actor, channelId, {
          ...params,
          newMeta:
            params.newMeta && metaToBytes(ChannelMetadata, params.newMeta),
        })
      },
      createVideo({ actor, channelId, ...params }: CreateVideoParams) {
        const { meta, appAttribution } = params
        return api.tx.content.createVideo(actor, channelId, {
          ...params,
          meta: appAttribution
            ? metaToBytes(
                AppAction,
                asAppAction(VideoMetadata, meta, appAttribution)
              )
            : meta && metaToBytes(VideoMetadata, meta),
        })
      },
      updateVideo({ actor, videoId, ...params }: UpdateVideoParams) {
        return api.tx.content.updateVideo(actor, videoId, {
          ...params,
          newMeta: params.newMeta && metaToBytes(VideoMetadata, params.newMeta),
        })
      },
      reactVideo(params: MemberRemarkParams<'reactVideo'>) {
        return memberRemarkMetaTx(api, 'reactVideo', params)
      },
      reactComment(params: MemberRemarkParams<'reactComment'>) {
        return memberRemarkMetaTx(api, 'reactComment', params)
      },
      createComment(params: MemberRemarkParams<'createComment'>) {
        return memberRemarkMetaTx(api, 'createComment', params)
      },
      editComment(params: MemberRemarkParams<'editComment'>) {
        return memberRemarkMetaTx(api, 'editComment', params)
      },
      deleteComment(params: MemberRemarkParams<'deleteComment'>) {
        return memberRemarkMetaTx(api, 'deleteComment', params)
      },
      createVideoCategory(params: MemberRemarkParams<'createVideoCategory'>) {
        return memberRemarkMetaTx(api, 'createVideoCategory', params)
      },
      createApp(params: MemberRemarkParams<'createApp'>) {
        return memberRemarkMetaTx(api, 'createApp', params)
      },
      updateApp(params: MemberRemarkParams<'updateApp'>) {
        return memberRemarkMetaTx(api, 'updateApp', params)
      },
      makeChannelPayment(
        params: MemberRemarkParams<'makeChannelPayment'> & {
          channelRewardAccount: string | Uint8Array
          amount: number | bigint
        }
      ) {
        return memberRemarkMetaTx(api, 'makeChannelPayment', params, [
          params.channelRewardAccount,
          params.amount,
        ])
      },
      pinOrUnpinComment(params: ChannelOwnerRemarkParams<'pinOrUnpinComment'>) {
        return channelOwnerRemarkMetaTx(api, 'pinOrUnpinComment', params)
      },
      banOrUnbanMemberFromChannel(
        params: ChannelOwnerRemarkParams<'banOrUnbanMemberFromChannel'>
      ) {
        return channelOwnerRemarkMetaTx(
          api,
          'banOrUnbanMemberFromChannel',
          params
        )
      },
      videoReactionsPreference(
        params: ChannelOwnerRemarkParams<'videoReactionsPreference'>
      ) {
        return channelOwnerRemarkMetaTx(api, 'videoReactionsPreference', params)
      },
      moderateCommentAsOwner(
        params: ChannelOwnerRemarkParams<'moderateComment'>
      ) {
        return channelOwnerRemarkMetaTx(api, 'moderateComment', params)
      },
      moderateCommentAsModerator(
        params: ChannelModeratorRemarkParams<'moderateComment'>
      ) {
        return channelModeratorRemarkMetaTx(api, 'moderateComment', params)
      },
    },
  } as const
}

export type MetaTransactions = ReturnType<typeof metaTransactions>

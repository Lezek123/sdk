import '@joystream/types'
import { ApiPromise } from '@polkadot/api'
import { PalletMembershipBuyMembershipParameters } from '@polkadot/types/lookup'
import { AsSimple, metaToBytes } from '../chain/types'
import {
  ChannelOwnerRemarked,
  IChannelOwnerRemarked,
  IMemberRemarked,
  IMembershipMetadata,
  MemberRemarked,
  MembershipMetadata,
} from '@joystream/metadata-protobuf'

export type WithReplaced<Original, Replacement> = Omit<
  Original,
  keyof Replacement
> &
  Replacement

export type MetaTxParams<Original, Replacement> = WithReplaced<
  AsSimple<Original>,
  Replacement
>

export type MemberRemarkParams<Kind extends keyof IMemberRemarked> =
  IMemberRemarked[Kind] & { memberId: number | bigint }

export function memberRemarkMetaTx<Kind extends keyof IMemberRemarked>(
  api: ApiPromise,
  kind: Kind,
  params: MemberRemarkParams<Kind>,
  payment?: [string | Uint8Array, number | bigint]
) {
  return api.tx.members.memberRemark(
    params.memberId,
    metaToBytes(MemberRemarked, {
      [kind]: params,
    }),
    payment || null
  )
}

export type ChannelOwnerRemarkParams<Kind extends keyof IChannelOwnerRemarked> =
  IChannelOwnerRemarked[Kind] & { channelId: number | bigint }

export function channelOwnerRemarkMetaTx<
  Kind extends keyof IChannelOwnerRemarked,
>(api: ApiPromise, kind: Kind, params: ChannelOwnerRemarkParams<Kind>) {
  return api.tx.content.channelOwnerRemark(
    params.channelId,
    metaToBytes(ChannelOwnerRemarked, {
      [kind]: params,
    })
  )
}

export function metaTransactions(api: ApiPromise) {
  return {
    members: {
      buyMembership(
        params: MetaTxParams<
          PalletMembershipBuyMembershipParameters,
          { metadata: IMembershipMetadata }
        >
      ) {
        return api.tx.members.buyMembership({
          ...params,
          metadata: metaToBytes(MembershipMetadata, params.metadata),
        })
      },
    },
    content: {
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
      moderateComment(params: ChannelOwnerRemarkParams<'moderateComment'>) {
        return channelOwnerRemarkMetaTx(api, 'moderateComment', params)
      },
    },
  } as const
}

export type MetaTransactions = ReturnType<typeof metaTransactions>

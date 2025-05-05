import { joyToHapi } from '..'
import { storageUnits } from '../../utils'
import { AsSimple } from '../../chain'
import { getEvent } from '../../tx/events'
import { randomBytes, randomUUID } from 'crypto'
import { PalletContentNftTypesNftIssuanceParametersRecord } from '@polkadot/types/lookup'
import { KeyManager, knownAddresses } from '../../keys'
import { ApiPromise } from '@polkadot/api'
import { TxManager } from '../../tx'
import { ContentFees } from '../../chain/queries'

export type MockMemberData = { memberId: number; memberAddr: string }
export type MockChannelData = { channelId: number; owner: MockMemberData }
export type MockVideo = { videoId: number; channel: MockChannelData }

const { alice } = knownAddresses

type Tools = {
  api: ApiPromise
  txm: TxManager
  keys: KeyManager
  data: {
    contentFees: ContentFees
  }
}

export const buildMocks = ({
  api,
  txm,
  keys,
  data: { contentFees: fees },
}: Tools) => {
  const mockAccount = async (joy = 100) => {
    const newAcc = keys.addKey({
      suri: `//${randomUUID().toString()}`,
    })
    await txm
      .run(api.tx.balances.transfer(newAcc.address, joyToHapi(joy)), alice)
      .inBlock(true)
    return newAcc.address
  }
  const mockMember = async (joy = 100) => {
    const memberAddr = await mockAccount(joy)
    const { lastResult } = await txm
      .run(
        txm.meta.members.buyMembership({
          controllerAccount: memberAddr,
          rootAccount: memberAddr,
          handle: memberAddr.slice(-20),
        }),
        memberAddr
      )
      .inBlock(true)
    const memberId = getEvent(
      lastResult,
      'members',
      'MembershipBought'
    ).data[0].toNumber()
    return { memberId, memberAddr }
  }

  const mockAssets = async (sizes: number[]) => {
    const { dataObjectPerMegabyteFee } = fees
    return {
      expectedDataSizeFee: dataObjectPerMegabyteFee,
      objectCreationList: sizes.map((s) => ({
        ipfsContentId: `0x${randomBytes(46).toString('hex')}`,
        size_: s,
      })),
    }
  }

  const mockCreateChannelAseetsParams = async (sizes: number[]) => {
    const { channelStateBloatBondValue, dataObjectStateBloatBondValue } = fees
    return {
      distributionBuckets: [
        { distributionBucketFamilyId: 0, distributionBucketIndex: 0 },
      ],
      storageBuckets: [0],
      expectedChannelStateBloatBond: channelStateBloatBondValue,
      expectedDataObjectStateBloatBond: dataObjectStateBloatBondValue,
      assets: {
        ...(await mockAssets(sizes)),
      },
    }
  }

  const mockCreateVideoAssetsParams = async (sizes: number[]) => {
    const { videoStateBloatBondValue, dataObjectStateBloatBondValue } = fees
    return {
      storageBucketsNumWitness: 1,
      expectedVideoStateBloatBond: videoStateBloatBondValue,
      expectedDataObjectStateBloatBond: dataObjectStateBloatBondValue,
      assets: {
        ...(await mockAssets(sizes)),
      },
    }
  }

  const mockUpdateAssetsParams = async (
    assetsToRemove: number[],
    assetsToUploadSizes: number[]
  ) => {
    const { dataObjectStateBloatBondValue } = fees
    return {
      storageBucketsNumWitness: 1,
      assetsToRemove,
      assetsToUpload: {
        ...(await mockAssets(assetsToUploadSizes)),
      },
      expectedDataObjectStateBloatBond: dataObjectStateBloatBondValue,
    }
  }

  const mockChannel = async (
    member?: MockMemberData
  ): Promise<MockChannelData> => {
    member = member || (await mockMember())
    const { lastResult } = await txm
      .run(
        txm.meta.content.createChannel({
          owner: { Member: member.memberId },
          ...(await mockCreateChannelAseetsParams([
            5 * storageUnits.MiB,
            10 * storageUnits.MiB,
          ])),
        }),
        member.memberAddr
      )
      .inBlock()
    return {
      channelId: getEvent(
        lastResult,
        'content',
        'ChannelCreated'
      ).data[0].toNumber(),
      owner: member,
    }
  }

  const mockVideo = async (
    channel?: MockChannelData,
    nftParams?: AsSimple<PalletContentNftTypesNftIssuanceParametersRecord>
  ): Promise<MockVideo> => {
    channel = channel || (await mockChannel())
    const { lastResult } = await txm
      .run(
        txm.meta.content.createVideo({
          actor: { Member: channel.owner.memberId },
          channelId: channel.channelId,
          ...(await mockCreateVideoAssetsParams([
            3 * storageUnits.MiB,
            8 * storageUnits.MiB,
          ])),
          autoIssueNft: nftParams,
        }),
        channel.owner.memberAddr
      )
      .inBlock(true)
    return {
      videoId: getEvent(
        lastResult,
        'content',
        'VideoCreated'
      ).data[2].toNumber(),
      channel,
    }
  }

  return {
    mockAccount,
    mockMember,
    mockAssets,
    mockCreateChannelAseetsParams,
    mockCreateVideoAssetsParams,
    mockUpdateAssetsParams,
    mockChannel,
    mockVideo,
  }
}

import { AsCodec } from '@joystream/types'
import { ApiPromise } from '@polkadot/api'
import { Codec, Observable } from '@polkadot/types/types'
import { AugmentedQuery, UnsubscribePromise } from '@polkadot/api/types'
import { u8aToBigInt } from '@polkadot/util'
import _ from 'lodash'

export type Query<
  Args extends Codec[] = Codec[],
  ReturnType = Codec,
> = AugmentedQuery<
  'promise',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...args: any[]) => Observable<ReturnType>,
  Args
>

export type QueryWithOptArgs<
  Args extends Codec[] = Codec[],
  ReturnType = Codec,
> = Query<Args, ReturnType> | [Query<Args, ReturnType>, Args]

export type QueriesRecord = { [K: string]: QueryWithOptArgs }

export type QueryResults<Q extends QueriesRecord> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof Q]: Q[K] extends QueryWithOptArgs<any, infer ReturnType>
    ? ReturnType
    : never
}

export async function sortedEntries<
  IDType extends Codec,
  ValueType extends Codec,
>(
  apiMethod: Query<[IDType], ValueType>
): Promise<[IDType, AsCodec<ValueType>][]> {
  const entries: [IDType, AsCodec<ValueType>][] = (
    await apiMethod.entries()
  ).map(([storageKey, value]) => [storageKey.args[0] as IDType, value])

  return entries.sort((a, b) =>
    u8aToBigInt(a[0].toU8a()) < u8aToBigInt(b[0].toU8a()) ? -1 : 1
  )
}

export async function subscribeMulti<Queries extends QueriesRecord>(
  api: ApiPromise,
  queriesRecord: Queries,
  callback: (result: QueryResults<Queries>) => Promise<void> | void
): UnsubscribePromise {
  const queryNames = Object.keys(queriesRecord)
  const queryMethods = Object.values(queriesRecord)
  return api.queryMulti(queryMethods, (results) =>
    callback(_.zipObject(queryNames, results) as QueryResults<Queries>)
  )
}

export abstract class MultiQuerySubscriber<
  Queries extends { [K: string]: QueryWithOptArgs } = Record<
    string,
    QueryWithOptArgs
  >,
> {
  protected abstract getQueries(api: ApiPromise): Queries
  protected _data: QueryResults<Queries> | undefined
  public readonly asReady: Promise<this>
  public readonly unsubscribe: UnsubscribePromise

  public constructor(protected api: ApiPromise) {
    let onReady: (self: this) => void
    this.asReady = new Promise((resolve) => (onReady = resolve))
    this.unsubscribe = subscribeMulti(api, this.getQueries(api), (data) => {
      this._data = data
      onReady(this)
    })
  }

  public get data() {
    if (!this._data) {
      throw new Error('Not intialized yet')
    }
    return this._data
  }
}

function getContentFeeQueries(api: ApiPromise) {
  return {
    dataObjectPerMegabyteFee: api.query.storage.dataObjectPerMegabyteFee,
    dataObjectStateBloatBondValue:
      api.query.storage.dataObjectStateBloatBondValue,
    videoStateBloatBondValue: api.query.content.videoStateBloatBondValue,
    channelStateBloatBondValue: api.query.content.channelStateBloatBondValue,
  } as const
}

export class ContentFees extends MultiQuerySubscriber<
  ReturnType<typeof getContentFeeQueries>
> {
  public getQueries(api: ApiPromise) {
    return getContentFeeQueries(api)
  }

  public get dataObjectPerMegabyteFee(): bigint {
    return this.data.dataObjectPerMegabyteFee.toBigInt()
  }

  public get dataObjectStateBloatBondValue() {
    return this.data.dataObjectStateBloatBondValue.toBigInt()
  }

  public get videoStateBloatBondValue() {
    return this.data.videoStateBloatBondValue.toBigInt()
  }

  public get channelStateBloatBondValue() {
    return this.data.channelStateBloatBondValue.toBigInt()
  }
}

function getNftConfigQueries(api: ApiPromise) {
  return {
    auctionStartsAtMaxDelta: api.query.content.auctionStartsAtMaxDelta,
    minAuctionDuration: api.query.content.minAuctionDuration,
    maxAuctionDuration: api.query.content.maxAuctionDuration,
    minAuctionExtensionPeriod: api.query.content.minAuctionExtensionPeriod,
    maxAuctionExtensionPeriod: api.query.content.maxAuctionExtensionPeriod,
    minBidLockDuration: api.query.content.minBidLockDuration,
    maxBidLockDuration: api.query.content.maxBidLockDuration,
    minBidStep: api.query.content.minBidStep,
    maxBidStep: api.query.content.maxBidStep,
    minCreatorRoyalty: api.query.content.minCreatorRoyalty,
    maxCreatorRoyalty: api.query.content.maxCreatorRoyalty,
    minStartingPrice: api.query.content.minStartingPrice,
    maxStartingPrice: api.query.content.maxStartingPrice,
    platfromFeePercentage: api.query.content.platfromFeePercentage,
  } as const
}

export class NftConfig extends MultiQuerySubscriber<
  ReturnType<typeof getNftConfigQueries>
> {
  public getQueries(api: ApiPromise) {
    return getNftConfigQueries(api)
  }

  public get auctionStartsAtMaxDelta() {
    return this.data.auctionStartsAtMaxDelta.toNumber()
  }

  public get minAuctionDuration() {
    return this.data.minAuctionDuration.toNumber()
  }

  public get maxAuctionDuration() {
    return this.data.maxAuctionDuration.toNumber()
  }

  public get minAuctionExtensionPeriod() {
    return this.data.minAuctionExtensionPeriod.toNumber()
  }

  public get maxAuctionExtensionPeriod() {
    return this.data.maxAuctionExtensionPeriod.toNumber()
  }

  public get minBidLockDuration() {
    return this.data.minBidLockDuration.toNumber()
  }

  public get maxBidLockDuration() {
    return this.data.maxBidLockDuration.toNumber()
  }

  public get minBidStep() {
    return this.data.minBidStep.toBigInt()
  }

  public get maxBidStep() {
    return this.data.maxBidStep.toBigInt()
  }

  public get minCreatorRoyalty() {
    return this.data.minCreatorRoyalty.toNumber()
  }

  public get maxCreatorRoyalty() {
    return this.data.maxCreatorRoyalty.toNumber()
  }

  public get minStartingPrice() {
    return this.data.minStartingPrice.toBigInt()
  }

  public get maxStartingPrice() {
    return this.data.maxStartingPrice.toBigInt()
  }

  public get platfromFeePercentage() {
    return this.data.platfromFeePercentage.toNumber()
  }
}

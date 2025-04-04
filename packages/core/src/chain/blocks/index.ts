import { ApiPromise } from '@polkadot/api'
import { BlockNumber } from '@polkadot/types/interfaces'
import { BN, u8aToHex, u8aToU8a } from '@polkadot/util'
import { BLOCK_TIME_MS, MAINNET_GENESIS_HASH } from '../consts'
import { StatescanClient } from '../../query/statescan'
import { Debugger } from 'debug'
import { rootDebug } from '../../utils/debug'
import { errorMsg } from '../../utils'
import { isMainnet } from '../api'

type BlockInfo = {
  height: number
  hash: `0x${string}`
  time: number
  parentHash?: `0x${string}`
}

export const MAINNET_GENESIS_BLOCK: BlockInfo = {
  height: 0,
  hash: MAINNET_GENESIS_HASH,
  time: 0,
}

const timeUnits = {
  'ms': 1,
  's': 1_000,
  'm': 1_000 * 60,
  'h': 1_000 * 60 * 60,
  'd': 24 * 1_000 * 60 * 60,
  'w': 7 * 24 * 1_000 * 60 * 60,
} as const

type TimeUnit = keyof typeof timeUnits

export function asBlocks(
  time: number,
  unit: TimeUnit = 'ms',
  rate = BLOCK_TIME_MS
): number {
  return Math.ceil((time * timeUnits[unit]) / rate)
}

export function asTime(
  blocks: number,
  unit: TimeUnit = 'ms',
  rate = BLOCK_TIME_MS
): number {
  return (blocks * rate) / timeUnits[unit]
}

export type BlockHashInput = Uint8Array | `0x${string}`
export type BlockNumberInput = BlockNumber | number | BN | bigint
export type BlockIdentifier = BlockHashInput | BlockNumberInput

export type BlockTimeRange =
  | {
      from?: Date
      to?: Date
    }
  | { fromBlock?: BlockIdentifier; toBlock?: BlockIdentifier }

export class BlockUtils {
  private debug: Debugger

  constructor(
    private api: ApiPromise,
    private statescanClient?: StatescanClient
  ) {
    this.debug = rootDebug.extend('blocks')
  }

  async timeAt(blockHash: BlockHashInput): Promise<number> {
    const apiAt = await this.api.at(blockHash)
    const timestamp = await apiAt.query.timestamp.now()
    return timestamp.toNumber()
  }

  async numberOf(blockHash: BlockHashInput): Promise<number> {
    const header = await this.api.rpc.chain.getHeader(blockHash)
    return header.number.toNumber()
  }

  isHash(numberOrHash: BlockIdentifier): numberOrHash is BlockHashInput {
    return (
      typeof numberOrHash === 'string' || numberOrHash instanceof Uint8Array
    )
  }

  async hashOf(numberOrHash: BlockIdentifier): Promise<`0x${string}`> {
    if (this.isHash(numberOrHash)) {
      return u8aToHex(u8aToU8a(numberOrHash))
    }
    const hash = await this.api.rpc.chain.getBlockHash(numberOrHash)
    return hash.toHex()
  }

  async blockInfo(numberOrHash: BlockIdentifier): Promise<BlockInfo> {
    if (isMainnet(this.api) && numberOrHash.toString(10) === '0') {
      return MAINNET_GENESIS_BLOCK
    }

    const blockInfo = await this.tryBlockInfoFromStatescan(numberOrHash)
    if (blockInfo) {
      return blockInfo
    }

    const hash = await this.hashOf(numberOrHash)

    if (hash === this.api.genesisHash.toHex()) {
      return MAINNET_GENESIS_BLOCK
    }

    const time = await this.timeAt(hash)

    const header = await this.api.rpc.chain.getHeader(hash)
    const height = header.number.toNumber()
    const parentHash = u8aToHex(u8aToU8a(header.parentHash))

    this.debug(`Retrieved block info for block ${height} using RPC API`)

    return {
      hash,
      height,
      parentHash,
      time,
    }
  }

  private async tryBlockInfoFromStatescan(
    numberOrHash: BlockIdentifier
  ): Promise<BlockInfo | null> {
    if (!this.statescanClient) {
      return null
    }

    const searchQuery = this.isHash(numberOrHash)
      ? u8aToHex(u8aToU8a(numberOrHash))
      : numberOrHash.toString(10)

    try {
      const { chainBlock } = await this.statescanClient.query({
        chainBlock: {
          __args: {
            blockHeightOrHash: searchQuery,
          },
          hash: true,
          height: true,
          time: true,
          parentHash: true,
        },
      })

      if (!chainBlock) {
        return null
      }

      const blockInfo = {
        hash: chainBlock.hash as `0x${string}`,
        height: chainBlock.height,
        time: chainBlock.time,
        parentHash: chainBlock.parentHash
          ? (chainBlock.parentHash as `0x${string}`)
          : undefined,
      }

      this.debug(`Retrieved block info for block ${searchQuery} from statescan`)

      return blockInfo
    } catch (e) {
      this.debug(`Failed to retrieve block info from statescan: ${errorMsg(e)}`)
      return null
    }
  }

  async bestBlockInfo(): Promise<BlockInfo> {
    return this.blockInfo(await this.api.derive.chain.bestNumberFinalized())
  }

  async estimateBlockNumberAt(
    date: Date,
    startingPoint?: BlockInfo
  ): Promise<number> {
    if (!startingPoint) {
      startingPoint = await this.bestBlockInfo()
    }
    const targetTime = date.getTime()
    const diff = targetTime - startingPoint.time
    return diff >= 0
      ? startingPoint.height + asBlocks(diff)
      : startingPoint.height - asBlocks(Math.abs(diff))
  }

  async avgBlocktime(range: BlockTimeRange): Promise<number> {
    const fromBlock =
      'fromBlock' in range && range.fromBlock
        ? await this.blockInfo(range.fromBlock)
        : 'from' in range && range.from
          ? await this.exactBlockAt(range.from)
          : await this.blockInfo(0)
    const toBlock =
      'toBlock' in range && range.toBlock
        ? await this.blockInfo(range.toBlock)
        : 'to' in range && range.to
          ? await this.exactBlockAt(range.to)
          : await this.bestBlockInfo()

    return (
      (toBlock.time - fromBlock.time) /
      (toBlock.height - fromBlock.height) /
      1000
    )
  }

  async exactBlockAt(date: Date): Promise<BlockInfo> {
    const { api } = this
    const startTs = Date.now()
    const targetTime = date.getTime()
    const bestNumber = await this.api.derive.chain.bestNumberFinalized()
    let [candidateBlock, candidateParentBlock] = await Promise.all([
      this.blockInfo(bestNumber),
      this.blockInfo(bestNumber.subn(1)),
    ])

    if (candidateBlock.time <= targetTime) {
      return candidateBlock
    }

    if (targetTime <= 0) {
      return this.blockInfo(api.genesisHash)
    }

    let upperBoundry = candidateBlock.height - 1
    let lowerBoundry = 1
    let guesses = 1

    const nextGuess = (previousGuess: number, currentGuess: number) => {
      ++guesses
      if (previousGuess > currentGuess && previousGuess - 1 < upperBoundry) {
        upperBoundry = previousGuess - 1
      } else if (
        previousGuess < currentGuess &&
        previousGuess + 1 > lowerBoundry
      ) {
        lowerBoundry = previousGuess + 1
      }

      if (currentGuess < lowerBoundry) {
        return lowerBoundry
      }
      if (currentGuess > upperBoundry) {
        return upperBoundry
      }
      return currentGuess
    }

    while (true) {
      if (!candidateBlock.parentHash) {
        throw new Error(
          `Unexpected state: Block #${candidateBlock.height} has no parent hash.`
        )
      }
      if (
        candidateParentBlock.time > targetTime ||
        candidateBlock.time < targetTime
      ) {
        const newGuess = nextGuess(
          candidateBlock.height,
          await this.estimateBlockNumberAt(date, candidateBlock)
        )
        ;[candidateBlock, candidateParentBlock] = await Promise.all([
          this.blockInfo(newGuess),
          this.blockInfo(newGuess - 1),
        ])
      }
      // candidateParentTs <= targetTime
      // candidateBlock.time >= targetTime
      else {
        const foundBlock =
          targetTime === candidateBlock.time
            ? candidateBlock
            : candidateParentBlock
        this.debug(
          `exactBlockAt(${date.toISOString()}): ${foundBlock.height}` +
            ` (guesses: ${guesses}, took: ${Date.now() - startTs} ms)`
        )

        return foundBlock
      }
    }
  }
}

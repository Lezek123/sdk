import { ApiPromise } from '@polkadot/api'
import { BlockNumber } from '@polkadot/types/interfaces'
import { BN, u8aToHex, u8aToU8a } from '@polkadot/util'
import { BLOCK_TIME_MS } from '../consts'

type BlockInfo = {
  blockHash: `0x${string}`
  number: number
  parentHash?: `0x${string}`
  timestamp: number
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

// TODO: Consider statescan API integration

export class BlockUtils {
  constructor(private api: ApiPromise) {}

  async timeAt(blockHash: BlockHashInput): Promise<number> {
    const apiAt = await this.api.at(blockHash)
    return (await apiAt.query.timestamp.now()).toNumber()
  }

  async numberOf(blockHash: BlockHashInput): Promise<number> {
    return (await this.api.rpc.chain.getHeader(blockHash)).number.toNumber()
  }

  async hashOf(numberOrHash: BlockIdentifier): Promise<`0x${string}`> {
    if (
      typeof numberOrHash === 'string' ||
      numberOrHash instanceof Uint8Array
    ) {
      return u8aToHex(u8aToU8a(numberOrHash))
    }
    return (await this.api.rpc.chain.getBlockHash(numberOrHash)).toHex()
  }

  async blockInfo(numberOrHash: BlockIdentifier): Promise<BlockInfo> {
    const blockHash = await this.hashOf(numberOrHash)
    const timestamp = await this.timeAt(blockHash)

    if (blockHash === this.api.genesisHash.toHex()) {
      return {
        blockHash,
        number: 0,
        timestamp,
      }
    }

    const header = await this.api.rpc.chain.getHeader(blockHash)

    return {
      blockHash,
      number: header.number.toNumber(),
      parentHash: u8aToHex(u8aToU8a(header.parentHash)),
      timestamp,
    }
  }

  async bestBlockInfo(): Promise<BlockInfo> {
    return this.blockInfo(await this.api.derive.chain.bestNumberFinalized())
  }

  estimateBlockNumberAt(date: Date, startingPoint: BlockInfo): number {
    const targetTime = date.getTime()
    const diff = targetTime - startingPoint.timestamp
    return diff >= 0
      ? startingPoint.number + asBlocks(diff)
      : startingPoint.number - asBlocks(Math.abs(diff))
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
      (toBlock.timestamp - fromBlock.timestamp) /
      (toBlock.number - fromBlock.number) /
      1000
    )
  }

  async exactBlockAt(date: Date): Promise<BlockInfo> {
    const { api } = this
    const targetTime = date.getTime()
    let candidateBlock = await this.bestBlockInfo()

    if (candidateBlock.timestamp <= targetTime) {
      return candidateBlock
    }

    if (targetTime <= (await this.timeAt(api.genesisHash))) {
      return this.blockInfo(api.genesisHash)
    }

    let upperBoundry = candidateBlock.number - 1
    let lowerBoundry = 1

    const nextGuess = (previousGuess: number, currentGuess: number) => {
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
          `Unexpected state: Block #${candidateBlock.number} has no parent hash.`
        )
      }
      const candidateParentTs = await this.timeAt(candidateBlock.parentHash)
      if (
        candidateParentTs > targetTime ||
        candidateBlock.timestamp < targetTime
      ) {
        const newGuess = nextGuess(
          candidateBlock.number,
          this.estimateBlockNumberAt(date, candidateBlock)
        )
        candidateBlock = await this.blockInfo(newGuess)
      }
      // candidateParentTs <= targetTime
      // candidateBlock.timestamp >= targetTime
      else if (targetTime === candidateBlock.timestamp) {
        return candidateBlock
      }
      // candidateParentTs <= targetTime
      // candidateBlock.timestamp > targetTime
      else {
        return this.blockInfo(candidateBlock.parentHash)
      }
    }
  }
}

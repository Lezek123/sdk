export type MetaTxStatus =
  | { isSuccess: true }
  | { isSuccess: false; error: string }

export interface BlockProcessorApi {
  lastProcessedBlock(): Promise<number | null>
  hasProcessed(blockNumber: number | bigint): Promise<void>
  metaTxStatus(txHash: `0x${string}`): Promise<MetaTxStatus | null>
}

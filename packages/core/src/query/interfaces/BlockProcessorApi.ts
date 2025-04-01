export interface BlockProcessorApi {
  lastProcessedBlock(): Promise<number | null>
  hasProcessed(blockNumber: number | bigint): Promise<void>
}

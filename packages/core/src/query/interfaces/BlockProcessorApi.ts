export interface BlockProcessorApi {
  endpoint: string
  lastProcessedBlock(): Promise<number | null>
  hasProcessed(blockNumber: number | bigint): Promise<void>
}

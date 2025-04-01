import { BlockProcessorApi } from './BlockProcessorApi'

export type MetaTxStatus =
  | { isSuccess: true }
  | { isSuccess: false; error: string }

export interface MetadataProcessorApi extends BlockProcessorApi {
  metaTxStatus(txHash: `0x${string}`): Promise<MetaTxStatus | null>
}

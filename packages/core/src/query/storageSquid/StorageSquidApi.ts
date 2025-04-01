import { sleep } from '../../utils'
import { UnexpectedEmptyResult } from '../errors'
import { BlockProcessorApi } from '../interfaces'
import { QueryApi, PaginationType, Config } from './__generated__/QueryApi'

export class StorageSquidApi
  extends QueryApi<PaginationType.Connection>
  implements BlockProcessorApi
{
  constructor(url: string, config?: Partial<Config>) {
    super(url, PaginationType.Connection, config)
  }

  async lastProcessedBlock(): Promise<number | null> {
    const query = {
      squidStatus: {
        height: true,
      },
    }
    const { squidStatus } = await this.runQuery(query)

    if (!squidStatus) {
      throw new UnexpectedEmptyResult(JSON.stringify(query), squidStatus)
    }

    return squidStatus.height
  }

  async hasProcessed(blockNumber: number): Promise<void> {
    // Storage Squid doesn't have a wss API, so we fallback to polling approach
    while (true) {
      const lastProcessedBlock = await this.lastProcessedBlock()
      if ((lastProcessedBlock || -1) >= blockNumber) {
        break
      }
      await sleep(1000)
    }
  }
}

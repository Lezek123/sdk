import { sleep } from '../../utils'
import { ENTITY_INFO } from './__generated__/entityInfo'
import {
  QueryApi,
  AnyEntity,
  PaginationType,
  Config,
} from './__generated__/QueryApi'

export const ALL_ENTITIES = Object.keys(ENTITY_INFO) as AnyEntity[]

export class StorageSquidApi extends QueryApi<PaginationType.Connection> {
  constructor(url: string, config?: Partial<Config>) {
    super(url, PaginationType.Connection, config)
  }

  async hasProcessed(blockNumber: number): Promise<void> {
    // Storage Squid doesn't have a wss API, so we fallback to polling approach
    while (true) {
      const { squidStatus } = await this.client.query({
        squidStatus: {
          height: true,
        },
      })
      if ((squidStatus?.height || -1) >= blockNumber) {
        break
      }
      await sleep(100)
    }
  }
}

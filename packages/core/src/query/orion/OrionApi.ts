import { QueryApi, PaginationType, Config } from './__generated__/QueryApi'
import { createClient as createWsClient, Client as WsClient } from 'graphql-ws'
import {
  generateSubscriptionOp,
  SubscriptionResult,
} from './__generated__/genql'
import { BlockProcessorApi, MetaTxStatus } from '../interfaces'
import { UnexpectedEmptyResult } from '../errors'
import { WebSocket } from 'ws'

export class OrionApi
  extends QueryApi<PaginationType.Connection>
  implements BlockProcessorApi
{
  wsClient: WsClient

  constructor(url: string, config?: Partial<Config>) {
    super(url, PaginationType.Connection, config)
    this.wsClient = createWsClient({
      url: url.replace(/^http/, 'ws'),
      webSocketImpl: WebSocket,
    })
  }

  async hasProcessed(blockNumber: number): Promise<void> {
    const subscriptionQ = {
      processorState: {
        lastProcessedBlock: true,
      },
    } as const
    const { query, variables } = generateSubscriptionOp(subscriptionQ)
    const subscription = this.wsClient.iterate<
      SubscriptionResult<typeof subscriptionQ>
    >({ query, variables })
    // TODO: Error handling
    for await (const result of subscription) {
      if (
        result.data &&
        result.data.processorState.lastProcessedBlock >= blockNumber
      ) {
        break
      }
    }
  }

  async metaTxStatus(txHash: `0x${string}`): Promise<MetaTxStatus | null> {
    const statusEvent = await this.query.Event.first({
      where: {
        inExtrinsic_eq: txHash,
        data: {
          isTypeOf_eq: 'MetaprotocolTransactionStatusEventData',
        },
      },
      select: {
        data: {
          __typename: true,
          on_MetaprotocolTransactionStatusEventData: {
            result: {
              __typename: true,
              on_MetaprotocolTransactionResultFailed: {
                errorMessage: true,
              },
            },
          },
        },
      },
    })

    if (
      statusEvent?.data.__typename === 'MetaprotocolTransactionStatusEventData'
    ) {
      const { result } = statusEvent.data
      return result.__typename === 'MetaprotocolTransactionResultFailed'
        ? { isSuccess: false, error: result.errorMessage }
        : { isSuccess: true }
    }

    return null
  }

  async lastProcessedBlock(): Promise<number | null> {
    const result = await this.runQuery({
      squidStatus: {
        height: true,
      },
    })
    const { squidStatus } = result

    if (!squidStatus) {
      throw new UnexpectedEmptyResult('squidStatus', squidStatus)
    }

    return squidStatus.height
  }
}

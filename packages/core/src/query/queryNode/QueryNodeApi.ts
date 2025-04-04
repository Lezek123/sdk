import { UnexpectedEmptyResult } from '../errors'
import { MetadataProcessorApi, MetaTxStatus } from '../interfaces'
import {
  generateSubscriptionOp,
  SubscriptionResult,
} from './__generated__/genql'
import { QueryApi, PaginationType, Config } from './__generated__/QueryApi'
import { SubscriptionClient } from 'subscriptions-transport-ws'
import { WebSocket } from 'ws'
import { toError } from '../../utils'

export class QueryNodeApi
  extends QueryApi<PaginationType.Offset>
  implements MetadataProcessorApi
{
  protected wsClient: SubscriptionClient
  constructor(url: string, config?: Partial<Config>) {
    super(url, PaginationType.Offset, config)
    this.wsClient = this.createWsClient()
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      this.wsClient.unsubscribeAll()
      const websocket = this.wsClient.client as WebSocket | undefined
      if (!websocket) {
        return resolve()
      }
      const status = websocket.readyState
      if (status === WebSocket.CLOSED) {
        return resolve()
      }
      this.wsClient.onDisconnected(resolve)
      if (status === WebSocket.CONNECTING) {
        // Disconnect once connected
        ;(this.wsClient.client as WebSocket).on('open', () => {
          this.wsClient.close(true, true)
        })
      }
      if (status === WebSocket.OPEN) {
        // Disconnect immediately
        this.wsClient.close(true, true)
      }
    })
  }

  createWsClient() {
    return new SubscriptionClient(
      this.url.replace(/^http/, 'ws'),
      {
        reconnect: true,
        lazy: true,
      },
      WebSocket
    )
  }

  subscribeLastCompleteBlock({
    next,
    error,
  }: {
    next: (blockNumber: number) => void
    error: (error: Error) => void
  }) {
    const { wsClient } = this
    const subscriptionQ = {
      stateSubscription: {
        lastCompleteBlock: true,
      },
    } as const
    const { query, variables } = generateSubscriptionOp(subscriptionQ)
    const subscription = wsClient
      .request({
        query,
        variables,
      })
      .subscribe({
        next: ({ data }) => {
          if (data) {
            const result = data as SubscriptionResult<typeof subscriptionQ>
            if (!result.stateSubscription) {
              throw new UnexpectedEmptyResult('stateSubscription', result)
            }
            next(result.stateSubscription.lastCompleteBlock)
          }
        },
        error: (err) => {
          subscription.unsubscribe()
          error(toError(err))
        },
      })

    return subscription
  }

  async hasProcessed(blockNumber: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const { unsubscribe } = this.subscribeLastCompleteBlock({
        next: (processedBlock) => {
          if (processedBlock >= blockNumber) {
            unsubscribe()
            resolve()
          }
        },
        error: reject,
      })
    })
  }

  async metaTxStatus(txHash: `0x${string}`): Promise<MetaTxStatus | null> {
    const statusEvent =
      await this.query.MetaprotocolTransactionStatusEvent.first({
        where: {
          inExtrinsic_eq: txHash,
        },
        select: {
          status: {
            __typename: true,
            on_MetaprotocolTransactionErrored: {
              message: true,
            },
          },
        },
      })

    if (statusEvent) {
      return statusEvent.status.__typename ===
        'MetaprotocolTransactionSuccessful'
        ? { isSuccess: true }
        : {
            isSuccess: false,
            error: statusEvent.status.message,
          }
    }

    return null
  }

  async lastProcessedBlock(): Promise<number | null> {
    return new Promise<number>((resolve, reject) => {
      const { unsubscribe } = this.subscribeLastCompleteBlock({
        next: (processedBlock) => {
          unsubscribe()
          resolve(processedBlock)
        },
        error: reject,
      })
    })
  }

  public get endpoint() {
    return this.url
  }
}

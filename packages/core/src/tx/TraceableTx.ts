import '@joystream/types'
import { SignerOptions, SubmittableExtrinsic } from '@polkadot/api/types'
import { ISubmittableResult } from '@polkadot/types/types/'
import {
  AccountId,
  DispatchError,
  ExtrinsicStatus,
  Hash,
} from '@polkadot/types/interfaces'
import {
  TxBalanceError,
  TxMetaprotocolStatusError,
  TxMissingParamError,
  TxDispatchError,
  TxRejectedError,
  TxStatusError,
} from './errors'
import { BlockUtils } from '../chain/blocks'
import { Debugger } from 'debug'
import { txDebug } from './debug'
import {
  BlockProcessorApi,
  MetadataProcessorApi,
  MetaTxStatus,
} from '../query/interfaces'
import EventEmitter from 'node:events'
import { KeyManager } from '../keys'
import { errorMsg, toError } from '../utils'
import { v7 as uuid } from 'uuid'
import RpcError from '@polkadot/rpc-provider/coder/error'
import { isPureMetaAction } from './metaTransactions'

// TODO: Improve logging, error handling
export class TraceableTx<
  ProcessedResult = ISubmittableResult,
> extends EventEmitter<{
  'signed': []
  'sent': []
  'in_block': [{ blockHash: `0x${string}`; dispatchError?: DispatchError }]
  'retracted': [{ blockHash: `0x${string}` }]
  'finalized': [{ blockHash: `0x${string}`; dispatchError?: DispatchError }]
  'error': [Error]
  'processed': [{ by: BlockProcessorApi; result?: MetaTxStatus }]
}> {
  readonly id: string
  private _blockNumber?: number
  private _blockHash?: Hash
  private _lastResult?: ISubmittableResult
  private _status?:
    | ExtrinsicStatus['type']
    | 'Sent'
    | 'Rejected'
    | 'Signed'
    | 'Unsigned'
  private unsubscribed = false
  private unsubFn?: () => void
  private debug: Debugger

  constructor(
    private tx: SubmittableExtrinsic<'promise'>,
    private sender: AccountId | string,
    private blockUtils: BlockUtils,
    private keyManager: KeyManager,
    private resultProcessor?: (result: ISubmittableResult) => ProcessedResult
  ) {
    super()
    this.id = uuid()
    this.debug = txDebug.extend(`${this.id}`)
    this._status = tx.isSigned ? 'Signed' : 'Unsigned'
  }

  private setBlockHash(newHash: Hash) {
    this._blockHash = newHash
    if (!newHash.eq(this._blockHash)) {
      this._blockNumber = undefined
    }
  }

  public async sign(options?: Pick<SignerOptions, 'tip' | 'nonce'>) {
    if (this.tx.isSigned) {
      return
    }

    await this.keyManager.signTx(this.tx, this.sender, options)
    this._status = 'Signed'
    this.emit('signed')
  }

  public async send(): Promise<void> {
    const statusCallback = async (result: ISubmittableResult) => {
      this.debug(`Status:`, result.status.toHuman())
      this._status = result.status.type

      if (result.status.isRetracted) {
        this.emit('retracted', { blockHash: result.status.asRetracted.toHex() })
      }

      if (!result.isCompleted) {
        return
      }

      const { dispatchError } = result

      if (dispatchError) {
        this.emit('error', new TxDispatchError(this.tx, dispatchError))
      }

      if (result.status.isInBlock) {
        this.setBlockHash(result.status.asInBlock)
        this._lastResult = result
        this.emit('in_block', { blockHash: this.blockHash, dispatchError })
      }

      if (result.status.isFinalized) {
        this.unsubscribe()
        this.setBlockHash(result.status.asFinalized)
        this._lastResult = result
        this.emit('finalized', { blockHash: this.blockHash, dispatchError })
      } else if (result.isError) {
        this.unsubscribe()
        this.emit('error', new TxStatusError(this.tx, result.status))
      }
    }
    try {
      const unsubFn = await this.tx.send(statusCallback)
      this.setUnsubFn(unsubFn)
      this._status = 'Sent'
      this.emit('sent')
    } catch (e) {
      this._status = 'Rejected'
      if (e instanceof RpcError) {
        if (e.code === 1010 && e.message.includes('balance too low')) {
          throw new TxBalanceError(
            this.tx,
            `Insufficient balance to cover tx fees`
          )
        }
      }
      throw new TxRejectedError(this.tx, errorMsg(e))
    }
  }

  public trackIn(api: BlockProcessorApi): this {
    this.on('finalized', async () => {
      this.processedBy(api)
        .then(() => this.emit('processed', { by: api }))
        .catch((e) => this.emit('error', toError(e)))
    })
    return this
  }

  public get status() {
    return this._status
  }

  public get lastResult(): ProcessedResult {
    if (!this._lastResult) {
      throw new TxMissingParamError(this.tx, 'lastResult')
    }
    return (this.resultProcessor?.(this._lastResult) ||
      this._lastResult) as ProcessedResult
  }

  public get blockHash(): `0x${string}` {
    if (!this._blockHash) {
      throw new TxMissingParamError(this.tx, 'blockHash')
    }
    return this._blockHash.toHex()
  }

  async blockNumber(): Promise<number> {
    this._blockNumber =
      this._blockNumber || (await this.blockUtils.numberOf(this.blockHash))
    return this._blockNumber
  }

  public inBlock(stop = false): Promise<this> {
    return new Promise<this>((resolve, reject) => {
      const onInBlock = () => {
        this.off('error', onError)
        if (stop) {
          this.unsubscribe()
        }
        if (this._lastResult?.dispatchError) {
          reject(new TxDispatchError(this.tx, this._lastResult.dispatchError))
        } else {
          resolve(this)
        }
      }
      const onError = (error: Error) => {
        // Ignore DispatchError here, we'll reject after `in_block` event
        if (error instanceof TxDispatchError) {
          return
        }
        this.off('in_block', onInBlock)
        if (stop) {
          this.unsubscribe()
        }
        reject(error)
      }
      if (this._status === 'InBlock' || this._status === 'Finalized') {
        onInBlock()
      } else {
        this.once('in_block', onInBlock)
        this.once('error', onError)
      }
    })
  }

  public finalized(): Promise<this> {
    return new Promise<this>((resolve, reject) => {
      const onFinalized = () => {
        this.off('error', onError)
        if (this._lastResult?.dispatchError) {
          reject(new TxDispatchError(this.tx, this._lastResult.dispatchError))
        } else {
          resolve(this)
        }
      }
      const onError = (error: Error) => {
        // Ignore any intermediate DispatchErrors
        if (error instanceof TxDispatchError) {
          return
        }
        this.off('finalized', onFinalized)
        reject(error)
      }
      if (this._status === 'Finalized') {
        onFinalized()
      } else {
        this.once('finalized', onFinalized)
        this.once('error', onError)
      }
    })
  }

  public async processedBy(api: BlockProcessorApi): Promise<this> {
    await this.finalized()
    await api.hasProcessed(await this.blockNumber())
    return this
  }

  public async metaProcessedBy(api: MetadataProcessorApi): Promise<this> {
    await this.processedBy(api)
    if (isPureMetaAction(this.tx)) {
      const status = await api.metaTxStatus(this.tx.hash.toHex())
      if (!status) {
        throw new TxMetaprotocolStatusError(
          this.tx,
          'Missing metaprotocol status event'
        )
      }
      if (!status.isSuccess) {
        throw new TxMetaprotocolStatusError(this.tx, status.error)
      }
    }
    return this
  }

  public setUnsubFn(unsubFn: () => void) {
    // If already unsubscribed - call immediatelly
    if (this.unsubscribed) {
      unsubFn()
    }
    this.unsubFn = unsubFn
  }

  private unsubscribe() {
    this.unsubFn?.()
    this.unsubscribed = true
  }
}

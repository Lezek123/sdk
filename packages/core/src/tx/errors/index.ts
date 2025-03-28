import { ExtrinsicStatus } from '@polkadot/types/interfaces'
import { DispatchError } from '@polkadot/types/interfaces/system'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { SpRuntimeDispatchError } from '@polkadot/types/lookup'
import { Registry } from '@polkadot/types/types'

export function dispatchErrorMsg(
  registry: Registry,
  e: DispatchError | SpRuntimeDispatchError
): string {
  if (e.isModule) {
    try {
      const { name, docs } = registry.findMetaError(e.asModule)
      return `DispatchError: ${name} (${docs.join(', ')})`
    } catch {
      return `DispatchError: ${e.toString()}`
    }
  }
  return `DispatchError: ${e.toString()}`
}

export class TxError extends Error {
  #tx: SubmittableExtrinsic<'promise'>

  constructor(tx: SubmittableExtrinsic<'promise'>, message: string) {
    super(
      `Transaction error (${tx.method.section}.${tx.method.method}): ${message}`
    )
    this.#tx = tx
  }

  public get tx() {
    return this.#tx
  }
}

export class TxSendError extends TxError {
  constructor(tx: SubmittableExtrinsic<'promise'>, message: string) {
    super(tx, message)
  }
}

export class TxBalanceError extends TxError {
  constructor(
    tx: SubmittableExtrinsic<'promise'>,
    message: string = 'Balance too low'
  ) {
    super(tx, message)
  }
}

export class TxStatusError extends TxError {
  constructor(tx: SubmittableExtrinsic<'promise'>, status: ExtrinsicStatus) {
    super(tx, `Status error: ${status.toString()}`)
  }
}

export class TxRuntimeError extends TxError {
  #original: DispatchError

  constructor(tx: SubmittableExtrinsic<'promise'>, e: DispatchError) {
    super(tx, dispatchErrorMsg(tx.registry, e))
    this.#original = e
  }

  get original() {
    return this.#original
  }
}

export class TxMissingParamError extends TxError {
  constructor(tx: SubmittableExtrinsic<'promise'>, param: string) {
    super(tx, `Tried to access "${param}", which is not available.`)
  }
}

export class TxMetaprotocolStatusError extends TxError {
  constructor(tx: SubmittableExtrinsic<'promise'>, msg: string) {
    super(tx, msg)
  }
}

export class EventNotFoundError extends Error {
  constructor(section: string, method: string) {
    super(`Event ${section}.${method} not found`)
  }
}

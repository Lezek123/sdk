export class AssetsError extends Error {}
export class InvalidAmountError extends AssetsError {}
export class SenderUnknownError extends AssetsError {
  constructor(msg: string = `Cannot estimate extrinsic costs, sender unkown!`) {
    super(msg)
  }
}

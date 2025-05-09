import { encodeAddress } from '@polkadot/util-crypto'
import { SS58_PREFIX } from '../chain/consts'

export function toAddress(input: string | Uint8Array): string {
  return encodeAddress(input, SS58_PREFIX)
}

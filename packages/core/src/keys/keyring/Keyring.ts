import { SS58_PREFIX } from '@joystream/sdk-core/chain/consts'
import { createTestKeyring, Keyring } from '@polkadot/keyring'
import {
  KeyringOptions as BaseKeyringOptions,
  KeyringInstance,
} from '@polkadot/keyring/types'

export type KeyringOptions = BaseKeyringOptions & {
  isDev?: boolean
}

export const DEFAULT_KEYRING_OPTIONS: KeyringOptions = {
  ss58Format: SS58_PREFIX,
}

export const knownAddresses = {
  alice: 'j4W7rVcUCxi2crhhjRq46fNDRbVHTjJrz6bKxZwehEMQxZeSf',
  aliceStash: 'j4VdDQVdwFYfQ2MvEdLT2EYZx4ALPQQ6yMyZopKoZEQmXcJrT',
  bob: 'j4UYhDYJ4pz2ihhDDzu69v2JTVeGaGmTebmBdWaX2ANVinXyE',
  bobStash: 'j4X5AiyNC4497MpJLtyGdgEAS4JjDEjkRvtUPgZkiYudW5zox',
  charlie: 'j4UbMHiS79yvMLJctXggUugkkKmwxG5LW2YSy3ap8SmgF5qW9',
  dave: 'j4SR5Mty5Mzy2dPTunA6TD4gBTwbSb8wRTabvu2gsLqC271d4',
  eve: 'j4WXe5CtD6NkEM1KUXP5BLB4sTN77PFL4edS3c7eXAAHP83aF',
}

export function createKeyring(options?: KeyringOptions): KeyringInstance {
  options = {
    ...DEFAULT_KEYRING_OPTIONS,
    ...options,
  }

  const keyring = options.isDev
    ? createTestKeyring(options)
    : new Keyring(options)

  return keyring
}

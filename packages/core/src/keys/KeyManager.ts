import { createKeyring } from './keyring/Keyring'
import { u8aToHex, u8aToU8a } from '@polkadot/util'
import { KeyringInstance, KeyringPair } from '@polkadot/keyring/types'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import _, { isFunction } from 'lodash'
import {
  KeyManagerError,
  KeyNotFound,
  ProviderNotFound,
  SignerError,
  SignerMethodNotAvailable,
  SignerNotAvailable,
} from './errors'
import {
  AnyKeyringKey,
  Key,
  KeyInfo,
  KeyManagerConfig,
  KeyProvider,
  KeySubscriptionCb,
  SigningKey,
  UnsubscribeFn,
} from './types'
import { errorMsg } from '../utils'
import { SignerOptions, SubmittableExtrinsic } from '@polkadot/api/types'

export class KeyManager {
  private _keyring: KeyringInstance
  private _providers: Map<string, KeyProvider> = new Map()
  private _providerSubscriptions: Map<string, UnsubscribeFn> = new Map()
  private _userSubscriptions: [string, KeySubscriptionCb][] = []

  constructor(config?: KeyManagerConfig) {
    this._keyring = createKeyring(config?.keyringOptions)
  }

  public get keys() {
    return this._keyring.getPairs().map((p) => {
      const provider = p.meta.source || 'internal'
      return {
        address: p.address,
        provider,
        name: p.meta.name,
        type: provider === 'internal' ? p.type : p.meta.type,
      }
    })
  }

  private announceKeysChanged() {
    for (const [, userCallback] of this._userSubscriptions) {
      userCallback(this.keys)
    }
  }

  public async ready(): Promise<void> {
    await cryptoWaitReady()
  }

  private addToKeyring(key: AnyKeyringKey): KeyringPair {
    if ('mnemonic' in key) {
      return this._keyring.addFromMnemonic(key.mnemonic, key.meta, key.type)
    }
    if ('seed' in key) {
      return this._keyring.addFromSeed(u8aToU8a(key.seed), key.meta, key.type)
    }
    if ('suri' in key) {
      return this._keyring.addFromUri(key.suri, key.meta, key.type)
    }
    throw new KeyManagerError(`Unrecognized key type`)
  }

  public addKey(key: AnyKeyringKey): KeyringPair {
    const addedKey = this.addToKeyring(key)
    this.announceKeysChanged()
    return addedKey
  }

  public byName(name: string, caseSensitive = false): Key {
    const found = _.find(this.keys, (k) => {
      return caseSensitive
        ? k.name === name
        : k.name?.toLowerCase() === name.toLowerCase()
    })
    if (!found) {
      throw new KeyNotFound(name)
    }

    return found
  }

  public async addKeysProvider(
    name: string,
    provider: KeyProvider
  ): Promise<void> {
    this._providers.set(name, provider)
    const unsubscribe = await provider.subscribeAccounts((keys) =>
      this.updateKeysByProvider(keys || [], name)
    )
    if (unsubscribe && isFunction(unsubscribe)) {
      this._providerSubscriptions.set(name, unsubscribe)
    }
  }

  public removeKeysProvider(name: string) {
    const unsubscribe = this._providerSubscriptions.get(name)
    if (unsubscribe) {
      unsubscribe()
    }
    this.updateKeysByProvider([], name)
  }

  updateKeysByProvider(keys: KeyInfo[], providerName: string) {
    const keysByProvider = this._keyring
      .getPairs()
      .filter((p) => p.meta.source === providerName)
      .map((p) => p.address)
    const removedKeys = _.difference(
      keysByProvider,
      keys.map((k) => k.address)
    )
    const addedKeys = keys.filter((k) => !keysByProvider.includes(k.address))

    for (const key of removedKeys) {
      this._keyring.removePair(key)
    }
    for (const key of addedKeys) {
      this._keyring.addFromAddress(key.address, {
        source: providerName,
        name: key.name,
        type: key.type,
      })
    }
    this.announceKeysChanged()
  }

  subscribeKeys(cb: (keys: Key[]) => void) {
    const id = _.uniqueId()
    this._userSubscriptions.push([id, cb])
    return () => {
      _.remove(this._userSubscriptions, ([id]) => id === id)
    }
  }

  normalizeKey(key: string | Uint8Array): string {
    return this._keyring.encodeAddress(key)
  }

  getSigningKey(key: string | Uint8Array): SigningKey {
    key = this.normalizeKey(key)
    const keyPair = this._keyring.getPair(key)
    if (!keyPair) {
      throw new KeyNotFound(key)
    }
    const providerName = keyPair.meta.source
    if (providerName) {
      const provider = this._providers.get(providerName)
      if (!provider) {
        throw new ProviderNotFound(key, providerName)
      }
      const signer = provider?.signer
      if (!signer) {
        throw new SignerNotAvailable(key, providerName)
      }
      return { keyPair, provider: { name: providerName, signer } }
    }
    return { keyPair }
  }

  async signTx(
    tx: SubmittableExtrinsic<'promise'>,
    key: string | Uint8Array,
    options?: Pick<SignerOptions, 'tip' | 'nonce'>
  ) {
    const signingKey = this.getSigningKey(key)
    try {
      await tx.signAsync(signingKey.keyPair, {
        signer: signingKey.provider?.signer,
        ...(options || {}),
      })
    } catch (e) {
      throw new SignerError(signingKey.provider?.name || 'keyring', errorMsg(e))
    }
  }

  async signMessage(
    message: string,
    key: string | Uint8Array,
    type: 'payload' | 'bytes' = 'payload'
  ): Promise<`0x${string}`> {
    const signingKey = this.getSigningKey(key)
    if (signingKey.provider) {
      const {
        keyPair: { address },
        provider: { name: providerName, signer },
      } = signingKey
      if (!signer.signRaw) {
        throw new SignerMethodNotAvailable(address, providerName, 'signRaw')
      }

      try {
        const { signature } = await signer.signRaw({
          data: message,
          address,
          type,
        })

        return signature
      } catch (e: unknown) {
        throw new SignerError(providerName, errorMsg(e))
      }
    } else {
      // Try signing directly via Keyring
      const { keyPair } = signingKey
      try {
        const signature = keyPair.sign(u8aToU8a(message))
        return u8aToHex(signature)
      } catch (e: unknown) {
        throw new SignerError('keyring', errorMsg(e))
      }
    }
  }
}

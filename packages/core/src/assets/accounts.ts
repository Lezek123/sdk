import { registry } from '@joystream/types'
import { AnyNumber, runtimeModuleAccount } from '../utils'

export const treasuryAccounts = {
  projectToken: runtimeModuleAccount('mo:token'), // 'j4To6jgKg17fZqBq2qPWLPWiKydubhrFWeRuc9rQj3DYbjh6N'
  storage: runtimeModuleAccount('mstorage'), // 'j4To6jgKg1Jo1wfcPDHye73TRt2c28Y7K9kRraygcocBa1kHL'
  content: runtimeModuleAccount('mContent', 'TREASURY'), // 'j4To6jgKfy8MgiMRDXzd76ZXh6dmMtw5KPdECRNDAiueycmrS'
  proposalsDiscussion: runtimeModuleAccount('mo:prdis', 'TREASURY'), // 'j4To6jgKg17fZHvTzRnbNk5hGaMyNGk6RPTEowp2ZNEE8qZaa'
}

export const tokenAmmTreasuryAccount = (tokenId: AnyNumber) =>
  runtimeModuleAccount('mo:token', 'AMM', registry.createType('u64', tokenId))

export const forumThreadAccount = (threadId: AnyNumber) =>
  runtimeModuleAccount(
    'mo:forum',
    undefined,
    registry.createType('u64', threadId)
  )

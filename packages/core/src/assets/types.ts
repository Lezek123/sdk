export type Balances = {
  // All funds, including locked and reserved
  total: bigint
  // All funds EXCEPT reserved
  free: bigint
  // All funds that can be used to pay transaction fees and other fee-like costs
  feeUsable: bigint
  // All funds that are free to be transferred to another account
  transferrable: bigint
  // TODO: Will be expanded with vesting status, locks etc. in the future
}

export enum FundsDestinyType {
  // Funds are burned, which means they are not recoverable by anyone
  // and reduce the total issuance of JOY
  Burned = 'Burned',
  // Funds are deposited into a treasury or budget, which means they
  // can be withdrawn under some conditions in the future and don't reduce the total issuance of JOY.
  Deposited = 'Deposited',
  // Funds are transferred directly to another account.
  Transferred = 'Transferred',
}

export type FundsDestinyBurned = {
  type: FundsDestinyType.Burned
}

export type FundsDestinyTransferred = {
  type: FundsDestinyType.Transferred
  to?: string
}

export type FundsDestinyDeposited = {
  type: FundsDestinyType.Deposited
  to?: string
}

export type FundsDestiny =
  | FundsDestinyBurned
  | FundsDestinyTransferred
  | FundsDestinyDeposited

export enum BalanceType {
  // free balance (any balance that isn't "reserved")
  Free = 'Free',
  // feeUsable balance balance (free - feeFrozen)
  FeeUsable = 'FeeUsable',
  // transferrable balance (free - max(feeFrozen, miscFrozen))
  Transferrable = 'Transferrable',
}

export enum CostKind {
  // Transaction fee (calculated based on tx size and weight)
  TxFee = 'TxFee',
  // Transaction tip (specified by sender)
  TxTip = 'TxTip',
  // Bloat bonds / deposits
  DataObjectBloatBond = 'DataObjectBloatBond',
  VideoBloatBond = 'VideoBloatBond',
  ChannelBloatBond = 'ChannelBloatBond',
  ForumPostDeposit = 'ForumPostDeposit',
  ForumThreadDeposit = 'ForumThreadDeposit',
  ProposalDiscussionPostDeposit = 'ProposalDiscussionPostDeposit',
  CreatorTokenAccountBloatBond = 'CreatorTokenAccountBloatBond',
  // Burnable platform fees
  MembershipFee = 'MembershipFee',
  DataFee = 'DataFee',
  CreatorTokenSaleFee = 'CreatorTokenSaleFee',
  CreatorTokenAmmFee = 'CreatorTokenAmmFee',
  NftPlatformFee = 'NftPlatformFee',
  ArgoFee = 'ArgoFee',
  // Explicit transfers
  Transfer = 'Transfer',
  // Bids
  NftBid = 'NftBid',
  // Royalties and interest
  NftRoyalty = 'NftRoyalty',
  // Value exchanges
  NftPayment = 'NftPayment',
  ChannelTransferPayment = 'ChannelTransferPayment',
  CreatorTokenPurchase = 'CreatorTokenPurchase',
  // Bridge transfers
  ArgoTransfer = 'ArgoTransfer',
  // Budget funding
  BudgetFunding = 'BudgetFunding',
  // Explicit burn
  Burn = 'Burn',
}

export interface Cost {
  // What kind of cost is this (for example: MembershipFee)
  kind: CostKind
  // Whether paying this cost requires the account to stay alive
  // and therefore its totalBalance to stay above EXISTENTIAL_DEPOSIT
  requiresKeepAlive: boolean
  // Describes what happens with the funds (are they burned? deposisted? transferred?)
  destiny: FundsDestiny
  // Which balance type is used to pay the the cost (eg. free, feeUsable, transferrable)
  paidFrom: BalanceType
  // Value in HAPI
  value: bigint
}

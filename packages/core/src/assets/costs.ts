import { treasuryAccounts } from './accounts'
import {
  CostKind,
  FundsDestinyType,
  BalanceType,
  FundsDestiny,
  Cost,
} from './types'

export const costs = {
  txFee: (value: bigint) => ({
    kind: CostKind.TxFee,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Burned,
    },
    paidFrom: BalanceType.FeeUsable,
    value,
  }),
  transfer: (value: bigint, to?: string, keepAlive = true) => ({
    kind: CostKind.Transfer,
    requiresKeepAlive: keepAlive,
    destiny: {
      type: FundsDestinyType.Transferred,
      to,
    },
    paidFrom: BalanceType.Transferrable,
    value,
  }),
  membershipFee: (value: bigint) => ({
    kind: CostKind.MembershipFee,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Burned,
    },
    paidFrom: BalanceType.Transferrable,
    value,
  }),
  dataFee: (value: bigint) => ({
    kind: CostKind.DataFee,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Burned,
    },
    paidFrom: BalanceType.FeeUsable,
    value,
  }),
  dataObjectBloatBond: (value: bigint) => ({
    kind: CostKind.DataObjectBloatBond,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Deposited,
      to: treasuryAccounts.storage,
    },
    paidFrom: BalanceType.FeeUsable,
    value,
  }),
  videoBloatBond: (value: bigint) => ({
    kind: CostKind.VideoBloatBond,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Deposited,
      to: treasuryAccounts.content,
    },
    paidFrom: BalanceType.FeeUsable,
    value,
  }),
  channelBloatBond: (value: bigint) => ({
    kind: CostKind.ChannelBloatBond,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Deposited,
      // Goes to channel reward account, so we skip the `to` field
      // as we cannot predict the address in advance
    },
    paidFrom: BalanceType.FeeUsable,
    value,
  }),
  nftBid: (value: bigint) => ({
    kind: CostKind.NftBid,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Deposited,
      to: treasuryAccounts.content,
    },
    paidFrom: BalanceType.Transferrable,
    value,
  }),
  nftPayment: (value: bigint, to: string) => ({
    kind: CostKind.NftPayment,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Transferred,
      to,
    },
    paidFrom: BalanceType.Transferrable,
    value,
  }),
  nftRoyalty: (value: bigint, to: string) => ({
    kind: CostKind.NftRoyalty,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Transferred,
      to,
    },
    paidFrom: BalanceType.Transferrable,
    value,
  }),
  nftPlatformFee: (value: bigint) => ({
    kind: CostKind.NftPlatformFee,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Burned,
    },
    paidFrom: BalanceType.Transferrable,
    value,
  }),
  argoTransfer: (value: bigint) => ({
    kind: CostKind.ArgoTransfer,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Burned,
    },
    paidFrom: BalanceType.Transferrable,
    value,
  }),
  argoFee: (value: bigint) => ({
    kind: CostKind.ArgoFee,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Burned,
    },
    paidFrom: BalanceType.Transferrable,
    value,
  }),
  channelTransferPayment: (value: bigint) => ({
    kind: CostKind.ChannelTransferPayment,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Transferred,
      // TODO: to:?
    },
    paidFrom: BalanceType.Transferrable,
    value,
  }),
  creatorTokenSaleFee: (value: bigint) => ({
    kind: CostKind.CreatorTokenSaleFee,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Burned,
    },
    paidFrom: BalanceType.Transferrable,
    value,
  }),
  creatorTokenAmmFee: (value: bigint) => ({
    kind: CostKind.CreatorTokenAmmFee,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Burned,
    },
    paidFrom: BalanceType.Transferrable,
    value,
  }),
  creatorTokenPurchase: (value: bigint, destiny: FundsDestiny) => ({
    kind: CostKind.CreatorTokenPurchase,
    requiresKeepAlive: true,
    destiny,
    paidFrom: BalanceType.Transferrable,
    value,
  }),
  creatorTokenAccountBloatBond: (value: bigint, paidFrom: BalanceType) => ({
    kind: CostKind.CreatorTokenAccountBloatBond,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Deposited,
      to: treasuryAccounts.projectToken,
    },
    paidFrom,
    value,
  }),
  budgetFunding: (value: bigint) => ({
    kind: CostKind.BudgetFunding,
    requiresKeepAlive: false,
    destiny: {
      type: FundsDestinyType.Deposited,
    },
    paidFrom: BalanceType.Transferrable,
    value,
  }),
  forumPostDeposit: (value: bigint, to?: string) => ({
    kind: CostKind.ForumPostDeposit,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Deposited,
      to,
    },
    paidFrom: BalanceType.FeeUsable,
    value,
  }),
  forumThreadDeposit: (value: bigint) => ({
    kind: CostKind.ForumThreadDeposit,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Deposited,
      // Goes to thread account, so we skip the `to` field
      // as we cannot predict the address in advance
    },
    paidFrom: BalanceType.FeeUsable,
    value,
  }),
  proposalDiscussionPostDeposit: (value: bigint) => ({
    kind: CostKind.ProposalDiscussionPostDeposit,
    requiresKeepAlive: true,
    destiny: {
      type: FundsDestinyType.Deposited,
      to: treasuryAccounts.proposalsDiscussion,
    },
    paidFrom: BalanceType.FeeUsable,
    value,
  }),
  burn: (value: bigint) => ({
    kind: CostKind.Burn,
    requiresKeepAlive: false,
    destiny: {
      type: FundsDestinyType.Burned,
    },
    paidFrom: BalanceType.Free,
    value,
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} satisfies Record<string, (value: bigint, ...other: any[]) => Cost>

import _ from 'lodash'
import { ApiPromise } from '@polkadot/api'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { Call } from '@polkadot/types/interfaces'
import { PalletContentStorageAssetsRecord } from '@polkadot/types/lookup'
import {
  encodeAddress,
  sr25519PairFromSeed,
  randomAsU8a,
} from '@polkadot/util-crypto'
import {
  AnyNumber,
  channelRewardAccount,
  divCeil,
  max,
  min,
  storageUnits,
  toBigInt,
} from '../utils'
import { isAnyWgCall, isCall, isExtrinsic } from '../tx/calls'
import {
  BalanceType,
  Cost,
  FundsDestinyBurned,
  FundsDestinyTransferred,
  FundsDestinyType,
  Balances,
} from './types'
import { costs as costBuilders } from './costs'
import { forumThreadAccount, tokenAmmTreasuryAccount } from './accounts'
import { toAddress } from '../keys/utils'
import { EXISTENTIAL_DEPOSIT } from './consts'
import { SenderUnknownError } from './errors'
import { calculateAmmMintCost } from './utils'

export class AssetsManager {
  constructor(private api: ApiPromise) {}

  async getBalances(account: string): Promise<Balances> {
    const { freeBalance, reservedBalance, frozenFee, availableBalance } =
      await this.api.derive.balances.all(account)
    return {
      total: freeBalance.toBigInt() + reservedBalance.toBigInt(),
      free: freeBalance.toBigInt(),
      feeUsable: freeBalance.toBigInt() - frozenFee.toBigInt(),
      transferrable: availableBalance.toBigInt(),
      // TODO: Vesting, locks etc.
    }
  }

  async controllerAccount(memberId: AnyNumber) {
    const member = await this.api.query.members.membershipById(memberId)
    return toAddress(member.unwrap().controllerAccount)
  }

  storageAssetsCosts(
    assets: PalletContentStorageAssetsRecord,
    expectedDataObjectStateBloatBond: bigint
  ) {
    const { objectCreationList, expectedDataSizeFee } = assets
    const totalSize = objectCreationList.reduce(
      (sum, o) => sum + o.size_.toBigInt(),
      0n
    )
    const totalSizeMiB = divCeil(totalSize, storageUnits.MiB)
    const objectsNum = objectCreationList.length
    return [
      costBuilders.dataObjectBloatBond(
        BigInt(objectsNum) * expectedDataObjectStateBloatBond
      ),
      costBuilders.dataFee(totalSizeMiB * expectedDataSizeFee.toBigInt()),
    ]
  }

  async creatorTokenTransferCosts(
    tokenId: AnyNumber,
    dstMemberIds: AnyNumber[]
  ): Promise<Cost[]> {
    const bloatBond = await this.api.query.projectToken.bloatBond()
    const costs: Cost[] = []
    let newAccountsCreated = 0
    await Promise.all(
      dstMemberIds.map(async (dstMemberId) => {
        const acc =
          await this.api.query.projectToken.accountInfoByTokenAndMember(
            tokenId,
            dstMemberId
          )
        if (acc.isEmpty) {
          ++newAccountsCreated
        }
      })
    )
    if (newAccountsCreated > 0) {
      costs.push(
        costBuilders.creatorTokenAccountBloatBond(
          bloatBond.toBigInt() * BigInt(newAccountsCreated),
          BalanceType.FeeUsable
        )
      )
    }
    return costs
  }

  async nftBidCost(
    videoId: AnyNumber,
    memberId: AnyNumber,
    bidAmount: bigint
  ): Promise<Cost> {
    const video = await this.api.query.content.videoById(videoId)
    let prevBid = 0n
    if (video.nftStatus.isSome) {
      const { transactionalStatus } = video.nftStatus.unwrap()
      if (transactionalStatus.isEnglishAuction) {
        const { topBid } = transactionalStatus.asEnglishAuction
        if (
          topBid.isSome &&
          topBid.unwrap().bidderId.toBigInt() === toBigInt(memberId)
        ) {
          prevBid = topBid.unwrap().amount.toBigInt()
        }
      }
      if (transactionalStatus.isOpenAuction) {
        const bid = await this.api.query.content.openAuctionBidByVideoAndMember(
          videoId,
          memberId
        )
        prevBid = bid.amount.toBigInt()
      }
    }
    return costBuilders.nftBid(bidAmount - prevBid)
  }

  async nftPurchaseCost(videoId: AnyNumber, price: bigint): Promise<Cost[]> {
    const video = await this.api.query.content.videoById(videoId)
    const platformFee = await this.api.query.content.platfromFeePercentage()
    const costs: Cost[] = []
    const platformFeeAmount = (price * platformFee.toBigInt()) / BigInt(10e9)
    let paymentAmount = price - platformFeeAmount
    let royaltyAmount = 0n
    if (video.nftStatus.isSome) {
      costs.push(costBuilders.nftPlatformFee(platformFeeAmount))
      const { creatorRoyalty, owner } = video.nftStatus.unwrap()
      if (creatorRoyalty.isSome) {
        const effectiveRoyaltyPerbill = min(
          creatorRoyalty.unwrap().toBigInt(),
          BigInt(10e9) - platformFee.toBigInt()
        )
        royaltyAmount = (price * effectiveRoyaltyPerbill) / BigInt(10e9)
        costs.push(
          costBuilders.nftRoyalty(
            royaltyAmount,
            channelRewardAccount(video.inChannel)
          )
        )
        paymentAmount -= royaltyAmount
      }
      if (paymentAmount > 0n) {
        costs.push(
          costBuilders.nftPayment(
            paymentAmount,
            owner.isChannelOwner
              ? channelRewardAccount(video.inChannel)
              : await this.controllerAccount(owner.asMember)
          )
        )
      }
    }
    return costs
  }

  async estimateFee(
    tx: SubmittableExtrinsic<'promise'>,
    sender?: string
  ): Promise<bigint> {
    // Prevents tx from being modified
    const clonedTx = this.api.tx[tx.method.section][tx.method.method](
      ...tx.args
    )
    // Use mock sender if not provided
    sender =
      sender || encodeAddress(sr25519PairFromSeed(randomAsU8a(32)).publicKey)
    const { partialFee } = await clonedTx.paymentInfo(sender)
    return partialFee.toBigInt()
  }

  async costsOf(
    tx: SubmittableExtrinsic<'promise'> | Call,
    sender?: string
  ): Promise<Cost[]> {
    const costs: Cost[] = []
    if (!sender && isExtrinsic(tx)) {
      sender = tx.signer.toString()
    }
    if (!sender) {
      throw new SenderUnknownError()
    }
    // Transaction fee
    if (isExtrinsic(tx)) {
      costs.push(costBuilders.txFee(await this.estimateFee(tx, sender)))
    }
    // Argo bridge module
    if (isCall(tx, 'argoBridge', 'requestOutboundTransfer')) {
      const [, amount, fee] = tx.args
      costs.push(costBuilders.argoTransfer(amount.toBigInt()))
      costs.push(costBuilders.argoFee(fee.toBigInt()))
    }
    // Balances module
    if (isCall(tx, 'balances', 'transfer')) {
      const [destination, amount] = tx.args
      costs.push(
        costBuilders.transfer(amount.toBigInt(), toAddress(destination), false)
      )
    }
    if (isCall(tx, 'balances', 'transferKeepAlive')) {
      const [destination, amount] = tx.args
      costs.push(
        costBuilders.transfer(amount.toBigInt(), toAddress(destination), true)
      )
    }
    if (isCall(tx, 'balances', 'transferAll')) {
      const [destination, keepAlive] = tx.args
      const { transferrable: transferrableAfterFee } =
        await this.estimateBalancesAfter(sender, costs)
      costs.push(
        costBuilders.transfer(
          max(
            0n,
            transferrableAfterFee -
              (keepAlive.isTrue ? EXISTENTIAL_DEPOSIT : 0n)
          ),
          toAddress(destination),
          keepAlive.isTrue
        )
      )
    }
    // Content module
    if (isCall(tx, 'content', 'createVideo')) {
      const [, , params] = tx.args
      if (params.assets.isSome) {
        costs.push(
          ...this.storageAssetsCosts(
            params.assets.unwrap(),
            params.expectedDataObjectStateBloatBond.toBigInt()
          )
        )
      }
      costs.push(
        costBuilders.videoBloatBond(
          params.expectedVideoStateBloatBond.toBigInt()
        )
      )
    }
    if (isCall(tx, 'content', 'createChannel')) {
      const [, params] = tx.args
      if (params.assets.isSome) {
        costs.push(
          ...this.storageAssetsCosts(
            params.assets.unwrap(),
            params.expectedDataObjectStateBloatBond.toBigInt()
          )
        )
      }
      costs.push(
        costBuilders.channelBloatBond(
          params.expectedChannelStateBloatBond.toBigInt()
        )
      )
    }
    if (isCall(tx, 'content', 'updateVideo')) {
      const [, , params] = tx.args
      if (params.assetsToRemove) {
        // Adding assetsToRemove doesn't affect balance requirements
        // (user still needs enough balance to cover all `assetsToUpload`)
      }
      if (params.assetsToUpload.isSome) {
        costs.push(
          ...this.storageAssetsCosts(
            params.assetsToUpload.unwrap(),
            params.expectedDataObjectStateBloatBond.toBigInt()
          )
        )
      }
    }
    if (isCall(tx, 'content', 'updateChannel')) {
      const [, , params] = tx.args
      if (params.assetsToRemove) {
        // Adding assetsToRemove doesn't affect balance requirements
        // (user still needs enough balance to cover all `assetsToUpload`)
      }
      if (params.assetsToUpload.isSome) {
        costs.push(
          ...this.storageAssetsCosts(
            params.assetsToUpload.unwrap(),
            params.expectedDataObjectStateBloatBond.toBigInt()
          )
        )
      }
    }
    if (isCall(tx, 'content', 'buyNft')) {
      const [videoId, , witnessPrice] = tx.args
      costs.push(
        ...(await this.nftPurchaseCost(videoId, witnessPrice.toBigInt()))
      )
    }
    if (isCall(tx, 'content', 'acceptIncomingOffer')) {
      const [videoId, witnessPrice] = tx.args
      if (witnessPrice.isSome) {
        costs.push(
          ...(await this.nftPurchaseCost(
            videoId,
            witnessPrice.unwrap().toBigInt()
          ))
        )
      }
    }
    if (isCall(tx, 'content', 'makeEnglishAuctionBid')) {
      const [memberId, videoId, bidAmount] = tx.args
      costs.push(await this.nftBidCost(videoId, memberId, bidAmount.toBigInt()))
    }
    if (isCall(tx, 'content', 'makeOpenAuctionBid')) {
      const [memberId, videoId, bidAmount] = tx.args
      costs.push(await this.nftBidCost(videoId, memberId, bidAmount.toBigInt()))
    }
    if (isCall(tx, 'content', 'acceptChannelTransfer')) {
      const [, params] = tx.args
      costs.push(costBuilders.channelTransferPayment(params.price.toBigInt()))
    }
    if (isCall(tx, 'content', 'issueCreatorToken')) {
      const bloatBond = await this.api.query.projectToken.bloatBond()
      const [, , params] = tx.args
      const initAccountsNum = [...params.initialAllocation.keys()].length
      if (initAccountsNum > 0) {
        costs.push(
          costBuilders.creatorTokenAccountBloatBond(
            bloatBond.toBigInt() * BigInt(initAccountsNum),
            BalanceType.FeeUsable
          )
        )
      }
    }
    if (isCall(tx, 'content', 'creatorTokenIssuerTransfer')) {
      const [, channelId, destinations] = tx.args
      const channel = await this.api.query.content.channelById(channelId)
      if (channel.creatorTokenId.isSome) {
        costs.push(
          ...(await this.creatorTokenTransferCosts(
            channel.creatorTokenId.unwrap(),
            destinations.map(([memberId]) => memberId)
          ))
        )
      }
    }
    // Council module
    if (isCall(tx, 'council', 'fundCouncilBudget')) {
      const [, amount] = tx.args
      costs.push(costBuilders.budgetFunding(amount.toBigInt()))
    }
    // Forum module
    if (isCall(tx, 'forum', 'createThread')) {
      const { postDeposit, threadDeposit } = this.api.consts.forum
      costs.push(costBuilders.forumThreadDeposit(threadDeposit.toBigInt()))
      costs.push(costBuilders.forumPostDeposit(postDeposit.toBigInt()))
    }
    if (isCall(tx, 'forum', 'addPost')) {
      const postDeposit = this.api.consts.forum.postDeposit
      const [, , threadId, , editable] = tx.args
      if (editable.isTrue) {
        costs.push(
          costBuilders.forumPostDeposit(
            postDeposit.toBigInt(),
            forumThreadAccount(threadId)
          )
        )
      }
    }
    // Joystream utility module
    if (isCall(tx, 'joystreamUtility', 'burnAccountTokens')) {
      const [amount] = tx.args
      costs.push(costBuilders.burn(amount.toBigInt()))
    }
    // Members module
    if (isCall(tx, 'members', 'buyMembership')) {
      const membershipPrice = await this.api.query.members.membershipPrice()
      costs.push(costBuilders.membershipFee(membershipPrice.toBigInt()))
    }
    if (isCall(tx, 'members', 'giftMembership')) {
      const [params] = tx.args
      const membershipPrice = await this.api.query.members.membershipPrice()
      costs.push(
        costBuilders.transfer(
          params.creditControllerAccount.toBigInt(),
          toAddress(params.controllerAccount)
        ),
        costBuilders.transfer(
          params.creditRootAccount.toBigInt(),
          toAddress(params.rootAccount)
        ),
        costBuilders.membershipFee(membershipPrice.toBigInt())
      )
    }
    if (isCall(tx, 'members', 'memberRemark')) {
      const [, , payment] = tx.args
      if (payment.isSome) {
        costs.push(
          costBuilders.transfer(
            payment.unwrap()[1].toBigInt(),
            toAddress(payment.unwrap()[0])
          )
        )
      }
    }
    // Project token module
    if (isCall(tx, 'projectToken', 'purchaseTokensOnSale')) {
      const [tokenId, memberId, tokenAmount] = tx.args
      const token = await this.api.query.projectToken.tokenInfoById(tokenId)
      if (!token.sale.isSome) {
        return []
      }
      const sale = token.sale.unwrap()
      const existingAcc =
        await this.api.query.projectToken.accountInfoByTokenAndMember(
          tokenId,
          memberId
        )
      if (existingAcc.isEmpty) {
        const bloatBond = await this.api.query.projectToken.bloatBond()
        costs.push(
          costBuilders.creatorTokenAccountBloatBond(
            bloatBond.toBigInt(),
            BalanceType.Transferrable
          )
        )
      }
      let paymentDestiny: FundsDestinyBurned | FundsDestinyTransferred = {
        type: FundsDestinyType.Burned,
      }
      const platformFee = await this.api.query.projectToken.salePlatformFee()
      const joyAmount = toBigInt(sale.unitPrice.mul(tokenAmount))
      const feeAmount = (joyAmount * platformFee.toBigInt()) / BigInt(10e6)
      const paymentAmount = joyAmount - feeAmount
      if (feeAmount > 0n) {
        costs.push(costBuilders.creatorTokenSaleFee(feeAmount))
      }
      if (paymentAmount > 0n) {
        if (sale.earningsDestination.isSome) {
          paymentDestiny = {
            type: FundsDestinyType.Transferred,
            to: toAddress(sale.earningsDestination.unwrap()),
          }
        }
        costs.push(
          costBuilders.creatorTokenPurchase(paymentAmount, paymentDestiny)
        )
      }
    }
    if (isCall(tx, 'projectToken', 'buyOnAmm')) {
      const [tokenId, memberId, tokenAmount] = tx.args
      const token = await this.api.query.projectToken.tokenInfoById(tokenId)
      if (!token.ammCurve.isSome) {
        return []
      }
      const ammCurve = token.ammCurve.unwrap()
      const existingAcc =
        await this.api.query.projectToken.accountInfoByTokenAndMember(
          tokenId,
          memberId
        )
      if (existingAcc.isEmpty) {
        const bloatBond = await this.api.query.projectToken.bloatBond()
        costs.push(
          costBuilders.creatorTokenAccountBloatBond(
            bloatBond.toBigInt(),
            BalanceType.Transferrable
          )
        )
      }
      const platformFee = await this.api.query.projectToken.ammBuyTxFees()
      const paymentAmount = calculateAmmMintCost({
        ...ammCurve,
        tokenAmount,
      })
      const feeAmount = (paymentAmount * platformFee.toBigInt()) / BigInt(10e6)
      if (feeAmount > 0n) {
        costs.push(costBuilders.creatorTokenAmmFee(feeAmount))
      }
      if (paymentAmount > 0n) {
        costs.push(
          costBuilders.creatorTokenPurchase(paymentAmount, {
            type: FundsDestinyType.Deposited,
            to: tokenAmmTreasuryAccount(tokenId),
          })
        )
      }
    }
    if (isCall(tx, 'projectToken', 'joinWhitelist')) {
      const bloatBond = await this.api.query.projectToken.bloatBond()
      costs.push(
        costBuilders.creatorTokenAccountBloatBond(
          bloatBond.toBigInt(),
          BalanceType.FeeUsable
        )
      )
    }
    if (isCall(tx, 'projectToken', 'transfer')) {
      const [, tokenId, destinations] = tx.args
      costs.push(
        ...(await this.creatorTokenTransferCosts(
          tokenId,
          destinations.map(([memberId]) => memberId)
        ))
      )
    }
    // Proposals discussion module
    if (isCall(tx, 'proposalsDiscussion', 'addPost')) {
      const [, , , editable] = tx.args
      if (editable.isTrue) {
        const { postDeposit } = this.api.consts.proposalsDiscussion
        costs.push(
          costBuilders.proposalDiscussionPostDeposit(postDeposit.toBigInt())
        )
      }
    }
    // Working group modules
    if (isAnyWgCall(tx, 'fundWorkingGroupBudget')) {
      const [, amount] = tx.args
      costs.push(costBuilders.budgetFunding(amount.toBigInt()))
    }
    // Utility batch
    if (
      isCall(tx, 'utility', 'batch') ||
      isCall(tx, 'utility', 'forceBatch') ||
      isCall(tx, 'utility', 'batchAll')
    ) {
      const [calls] = tx.args
      for (const call of calls) {
        costs.push(...(await this.costsOf(call, sender)))
      }
    }
    // TODO: Support for multisig pallet (multisig deposits, wrapped calls etc.)
    // TODO: Support for proxy pallet
    // TODO: electionProviderMultiPhase.submit() (requires deposit)
    // TODO: staking.bond
    // TODO: staking.bondExtra
    // TODO: utility.asDerivative
    // TODO: vestedTransfer
    return costs
  }

  requiredBalances(costs: Cost[]): Balances {
    let freeRequired = 0n
    let feeUsableRequired = 0n
    let transferrableRequired = 0n
    let totalRequired = 0n
    for (const [i, cost] of costs.entries()) {
      totalRequired += cost.value
      freeRequired += cost.value
      if (cost.paidFrom === BalanceType.FeeUsable) {
        feeUsableRequired += cost.value
      }
      if (cost.paidFrom === BalanceType.Transferrable) {
        feeUsableRequired += cost.value
        transferrableRequired += cost.value
      }
      const isLast = i === costs.length - 1
      if (isLast) {
        totalRequired += EXISTENTIAL_DEPOSIT
        if (!cost.requiresKeepAlive) {
          totalRequired -= min(EXISTENTIAL_DEPOSIT, cost.value)
        }
      }
    }
    return {
      free: freeRequired,
      feeUsable: feeUsableRequired,
      transferrable: transferrableRequired,
      total: totalRequired,
    }
  }

  async estimateBalancesAfter(
    account: string,
    costs: Cost[]
  ): Promise<Balances> {
    const balances = await this.getBalances(account)
    const requiredBalances = this.requiredBalances(costs)
    const { requiresKeepAlive } = costs.slice(-1)[0]
    const total =
      balances.total - requiredBalances.total < 0n
        ? 0n
        : balances.total -
          requiredBalances.total +
          (requiresKeepAlive ? EXISTENTIAL_DEPOSIT : 0n)
    if (total < EXISTENTIAL_DEPOSIT) {
      return _.mapValues(balances, () => 0n)
    }
    const free = max(0n, min(total, balances.free - requiredBalances.free))
    const feeUsable = max(
      0n,
      min(free, balances.feeUsable - requiredBalances.feeUsable)
    )
    const transferrable = max(
      0n,
      min(feeUsable, balances.transferrable - requiredBalances.transferrable)
    )
    return {
      total,
      free,
      feeUsable,
      transferrable,
    }
  }

  async canPay(account: string, costs: Cost[]) {
    const balances = await this.getBalances(account)
    const requiredBalances = this.requiredBalances(costs)
    return (
      balances.total >= requiredBalances.total &&
      balances.free >= requiredBalances.free &&
      balances.feeUsable >= requiredBalances.feeUsable &&
      balances.transferrable >= requiredBalances.transferrable
    )
  }
}

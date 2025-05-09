import { SnippetParams } from '../snippet'
// @snippet-begin
import {
  treasuryAccounts,
  forumThreadAccount,
  tokenAmmTreasuryAccount,
} from '@joystream/sdk-core/assets'

// @snippet-end
export default async function ({ log }: SnippetParams) {
  // @snippet-begin
  // Module-wide treasuries
  log(`Content treasury: ${treasuryAccounts.content}`)
  log(`Project token treasury: ${treasuryAccounts.projectToken}`)
  log(`Proposals discussion treasury: ${treasuryAccounts.proposalsDiscussion}`)
  log(`Storage treasury: ${treasuryAccounts.storage}`)

  // Specific entity-scoped treasuries
  const threadId = 1
  const threadAccount = forumThreadAccount(threadId)
  log(`Forum thread ${threadId} treasury: ${threadAccount}`)

  const crtId = 1
  const crtAmmAccount = tokenAmmTreasuryAccount(crtId)
  log(`Token ${crtId} AMM treasury: ${crtAmmAccount}`)
  // @snippet-end
}

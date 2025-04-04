---
sidebar_position: 3
---

import consts from '@site/src/consts'
import { GhLink } from '@site/src/components/GhLink';
import { GlossaryLink } from '@site/src/components/Glossary';
import CodeBlock from '@theme/CodeBlock';
import TxFlow from './\_tx-flow.md';

# Tx module

The tx module of Joystream SDK facilitates preparing, sending and tracking transactions (extrinsics) on the Joystream blockchain and provides some utilities for processing their results.

:::info
To test this module without executing any real transactions on Joystream mainnet you may consider [running a local Joystream development network](https://github.com/Joystream/joystream?tab=readme-ov-file#run-local-development-network).
:::

## Key features

- Allows easily tracking extrinsic status through multiple stages, from signing and sending to being processed by a <GlossaryLink to="query-node" /> or <GlossaryLink to="orion" />,
- Simplifies creating batch extrinsics and processing their results,
- Simplifies creating and processing extrinsics which include <GlossaryLink to="metaprotocol">metaprotocol</GlossaryLink> metadata,
- Environment agnositc: works both in the browser and Node.js environments.

## Initial setup

In order to follow the tutorial below, let's initialize some SDK modules first:

```typescript
import { TxManager } from '@joystream/sdk-core/tx'
import { KeyManager } from '@joystream/sdk-core/keys'
import { createApi } from '@joystream/sdk-core/chain'
import { QueryNodeApi } from '@joystream/sdk-core/query/queryNode'

const keys = new KeyManager({ keyringOptions: { isDev: true } })
const api = await createApi(`ws://localhost:9944`)
const tx = new TxManager(api, keys)
const qnApi = new QueryNodeApi(`http://localhost:8081/graphql`)
const orionApi = new OrionApi(`http://localhost:4350/graphql`)
```

## Extrinsic lifecycle

The lifecycle of an extrinsic can be illustrated by a following chart:

<TxFlow />

The tx module makes it very easy to await a given status or react to some selected lifecycle events without having
to write a lot of boilerplate code.

### Using promises

Promises allow you to `await` until an extrinsic reaches a given status and catch any possible intermediate errors.

:::warning
If you want to explicitly ignore any errors that happen after the transaction is included in block,
consider running:

<pre>await TraceableTx.inBlock(**true**)</pre>

Otherwise in case of a `FinalityTimeout` or other erros you may get an uncaught exception.
:::

```typescript
import { joyToHapi } from '@joystream/sdk-core/assets'

// Construct the extrinsic using @polkadot/api
const transfer = api.tx.balances.transfer(
  keys.byName('Bob').address,
  joyToHapi(1)
)

// Create a TraceableTx
const trackedTx = tx.run(transfer, keys.byName('Alice').address)

// Wait until the extrinsic is included in block
try {
  await trackedTx.inBlock()
  console.log(
    `Included in block: #${await trackedTx.blockNumber} (${trackedTx.blockHash})`
  )
} catch (e: Error) {
  console.error(e.message)
}

// Wait until the extrinsic is finalized
try {
  await trackedTx.finalized()
  console.log(
    `Finalized in block: #${await trackedTx.blockNumber} (${trackedTx.blockHash})`
  )
} catch (e) {
  console.error(e.message)
}

// Wait until the extrinsic is processed by a given query node
try {
  await trackedTx.processedBy(qnApi)
  console.log(`Processed by Query Node`)
} catch (e) {
  console.error(e.message)
}
```

### Using events

If you prefer to handle specific events individually, you can use an [event listener](https://nodejs.org/api/events.html) instead.

```typescript
import { joyToHapi } from '@joystream/sdk-core/assets'

// Construct the extrinsic using @polkadot/api
const transfer = api.tx.balances.transfer(
  keys.byName('Bob').address,
  joyToHapi(1)
)

// Create a TraceableTx
const trackedTx = tx.run(transfer, keys.byName('Alice').address)

// Add event listeners
trackedTx
  // In order to retrieve 'processed' event, you need to specify a
  // Query Node / Orion API (s) through which the processing status
  // will be tracked
  .trackIn(qnApi)
  .once('signed', () => console.log('Signed'))
  .once('sent', () => console.log('Sent'))
  .once('in_block', () => console.log('In block'))
  .once('finalized', () => console.log('Finalized'))
  .once('processed', ({ by }) => console.log(`Processed by ${by.endpoint}`))
  .on('error' (e) => console.log('Error: ', e.message))
```

## Extracting chain events

You can use `getEvent` utility to extract an event from transaction result in a type-safe way:

```typescript
const transfer = api.tx.balances.transfer(
  keys.byName('Bob').address,
  joyToHapi(1)
)

const { lastResult } = await tx
  .run(transfer, keys.byName('Alice').address)
  .inBlock(true)

const [from, to, amount] = getEvent(lastResult, 'balances', 'Transfer').data
```

## Batch extrinsics

There are 3 types of batch extrinsics in Joystream, which are represented by the `BatchStrategy` enum:

```typescript
export enum BatchStrategy {
  // Execute calls one-by-one and interrupt in case one of them fails.
  // In case an interruption occurs, all subsequent calls will be skipped,
  // but the state will remain affected by all of the previous calls.
  InterruptOnFailure = 'batch',
  // Execute calls one-by-one, but fail and rollback the entire batch extrinsic
  // in case one of the calls fail. It's an all-or-nothing scenario.
  RollbackOnFailure = 'batchAll',
  // Execute calls one-by-one and continue until the end even if some of them fail.
  ContinueOnFailure = 'forceBatch',
}
```

The tx module provides utilities that simplify parsing the results of those batch extrinsics
through a `tx.batch` method, for example:

```typescript
import { BatchStrategy } from '@joystream/sdk-core/tx'

console.log(`Sending utility.forceBatch transaction...`)
const multiTransfer = tx.batch(
  [
    api.tx.balances.transfer(keys.byName('Bob').address, joyToHapi(1)),
    api.tx.balances.transfer(keys.byName('Charlie').address, joyToHapi(2)),
    api.tx.balances.transfer(keys.byName('Dave').address, joyToHapi(3)),
  ],
  keys.byName('Alice').address,
  { strategy: BatchStrategy.ContinueOnFailure }
)

await multiTransfer.inBlock()

const { callResults } = multiTransfer.lastResult

for (const [i, result] of callResults.entries()) {
  if (result.isSuccess) {
    const [from, to, amount] = getEvent(
      result.events,
      'balances',
      'Transfer'
    ).data
    console.log(
      `Call ${i} successful: Transferred ${hapiToJoy(amount)} JOY from ${from.toHuman()} to ${to.toHuman()}`
    )
  } else {
    console.log(`Call ${i} failed: ${result.error}`)
  }
}
```

## Metaprotocol

Many extrinsics on Joystream expect <GlossaryLink to="metaprotocol">serialized metaprotocol messages</GlossaryLink> to
be provided as one of the arguments in order to be correctly processed by <GlossaryLink to="query-node" /> or <GlossaryLink to="orion" />.

Preparing those extrinsics using `@polkadot/api` and `@joystream/metadata-protobuf` also can be quite cumbersome, that's why tx module
introduces the concept of **meta transactions**.

Meta transactions can be constructed in a similar way to standard extrinsics, but they relieve you from the burden of having to find the right metadata message for your use-case and serializing it properly.

Here's an example:

```typescript
const buyMembershipTx = tx.meta.members.buyMembership({
  handle: 'alice',
  controllerAccount: keys.byName('Alice').address,
  rootAccount: keys.byName('Alice').address,
  metadata: {
    name: 'Alice',
    about: "I'm Alice!",
  },
})

const trackedTx = await tx
  .run(buyMembershipTx, keys.byName('Alice'))
  .inBlock(true)
```

This will have the same effect as running:

```typescript
import { u8aToHex } from '@polkadot/util'
import { MembershipMetadata } from '@joystream/metadata-protobuf'

const serializedMetadata = u8aToHex(
  MembershipMetadata.encode({
    name: 'Alice',
    about: "I'm Alice!",
  }).finish()
)

const buyMembershipTx = api.tx.members.buyMembership({
  handle: 'alice',
  controllerAccount: keys.byName('Alice').address,
  rootAccount: keys.byName('Alice').address,
  metadata: serializedMetadata,
})

const trackedTx = await tx
  .run(buyMembershipTx, keys.byName('Alice'))
  .inBlock(true)
```

Although in this example serializing the metadata to a correct format is quite straighforward, there are scenarios where using `metaTx` can save you a lot more work (for example, adding an app attribution when creating a new video).

### Checking metadata processing results

:::warning
Only actions which are _pure metaprotocol actions_ (ie. executed through `memberRemark`, `channelOwnerRemark` or `channelAgentRemark`)
produce metadata processing events. Extrinsics like `members.buyMembership` or `content.createChannel` are **not** pure metaprotocol actions,
because they can succeed even if the metadata is invalid.

If in doubt, check the list below:

<details>
  <summary>
    List of pure metaprotocol actions
  </summary>
  ```
  tx.meta.content.reactVideo
  tx.meta.content.reactComment
  tx.meta.content.createComment
  tx.meta.content.editComment
  tx.meta.content.deleteComment
  tx.meta.content.createVideoCategory
  tx.meta.content.createApp
  tx.meta.content.updateApp
  tx.meta.content.makeChannelPayment
  tx.meta.content.pinOrUnpinComment
  tx.meta.content.banOrUnbanMemberFromChannel
  tx.meta.content.videoReactionsPreference
  tx.meta.content.moderateCommentAsOwner
  tx.meta.content.moderateCommentAsModerator
  ```
</details>
:::

There are some utilities that allow you to check whether a metaprotocol action was successful even in case its result depends entirely on <GlossaryLink to="query-node" /> or <GlossaryLink to="orion" /> processing.

An example may include adding a video comment. The request to execute this action is normally encoded inside `members.memberRemark` extrinsic and the Joystream runtime does not verify the validity of such request. So even if the `videoId` provided as part of the encoded request is invalid, the extrinsic will still be successful. The real result of adding a video comment will not be determined until the event is processed by either <GlossaryLink to="query-node" /> or <GlossaryLink to="orion" />.

In situations like this, you can make use of `.metaProcessedBy` method to ensure the action was parsed and executed successfully:

```typescript
try {
  await tx
    .run(
      tx.meta.content.createComment({
        memberId: 1,
        videoId: 1,
        body: 'This is a test!',
      }),
      keys.byName('Alice').address
    )
    .metaProcessedBy(orionApi)
} catch (e) {
  // Will catch all errors, including an error resulting from metadata processing issue
  if (e instanceof TxMetaprotocolStatusError) {
    // You can add error handling specific to that case if needed
  }
}
```

## Handling errors

<!-- TODO: inBlock(true) vs inBlock(false)! -->

Errors are divided into following classes in order to allow you to customize the error handling logic to your needs:

- `TxRejectedError` - error occured when trying to submit the extrinsic - it was rejected by the Joystream node.
- `TxBalanceError` - sender does not have enough funds to cover transaction fees or other payments associated with the extrinsic.
- `TxStatusError` - transaction ended up in one of the error states after it was submitted (ie. Usurped, Invalid, Dropped, FinalityTimeout). You can access the status via `e.status`.
- `TxDispatchError` - extrinsic was included in block, but its execution resulted in an error.
- `TxMetaprotocolStatusError` - <GlossaryLink to="query-node" /> / <GlossaryLink to="orion" /> failed to parse / execute a metaprotocol action.

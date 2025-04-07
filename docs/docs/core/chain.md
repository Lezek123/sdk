---
sidebar_position: 4
---

import consts from '@site/src/consts'
import { GhLink } from '@site/src/components/GhLink';
import { GlossaryLink } from '@site/src/components/Glossary';
import CodeBlock from '@theme/CodeBlock';
import blockFromDate from '!!raw-loader!../../src/snippets/chain/blockFromDate.ts';
import blockByHash from '!!raw-loader!../../src/snippets/chain/blockByHash.ts';
import blockByNumber from '!!raw-loader!../../src/snippets/chain/blockByNumber.ts';
import estimateBlock from '!!raw-loader!../../src/snippets/chain/estimateBlock.ts';
import estimateBlockWithStartingPoint from '!!raw-loader!../../src/snippets/chain/estimateBlockWithStartingPoint.ts';
import blocksToTime from '!!raw-loader!../../src/snippets/chain/blocksToTime.ts';
import timeToBlocks from '!!raw-loader!../../src/snippets/chain/timeToBlocks.ts';
import apiUtils from '!!raw-loader!../../src/snippets/chain/apiUtils.ts';
import mapEntries from '!!raw-loader!../../src/snippets/chain/mapEntries.ts';

# Chain module

Chain module provides a set of utilities related to retrieving, decoding and processing data from the Joystream blockchain.

## @polkadot/api utilities

### Creating api instance and checking node status

<CodeBlock language="typescript" live>{apiUtils}</CodeBlock>

### Retrieving map entries from chain state

<CodeBlock language="typescript" live>{mapEntries}</CodeBlock>

## Retrieving block data

You can use `BlockUtils` class from `@joystream/sdk-core/chain` to retrieve various information about blocks in the Joystream blockchain.

There are currently 2 data sources supported for retrieving this kind of information:

- Joystream node RPC API (required)
- Statescan GraphQL API (optional)

Using Statescan API can speed up some operations, but in case it's not available, `BlockUtils` will always fallback to using the Joystream node RPC API.

### Initializing BlockUtils

**Without** Statescan API:

```typescript
import { createApi } from '@joystream/sdk-core/chain'

const api = await createApi('wss://mainnet.joystream.dev/rpc')
const blocks = new BlockUtils(api)
```

**With** Statescan API:

```typescript
import { createApi } from '@joystream/sdk-core/chain'
import { BlockUtils } from '@joystream/sdk-core/chain/blocks'
import { createStatescanClient } from '@joystream/sdk-core/query/statescan'

const api = await createApi('wss://mainnet.joystream.dev/rpc')
const statescanClient = createStatescanClient(
  'https://explorer-graphql.joystream.org/graphql'
)
const blocks = new BlockUtils(api, statescanClient)
```

### Get block info by hash

<CodeBlock language="typescript" live>{blockByHash}</CodeBlock>

### Get block info by block number

<CodeBlock language="typescript" live>{blockByNumber}</CodeBlock>

### Estimate block number from date

:::warning
Note that this function only **estimates** the block number based on a provided staring point (last finalized block by default) and an assumed blockrate of 1&nbsp;block&nbsp;/&nbsp;6&nbsp;sec. If that is not accurate enough for you, consider using [`.exactBlockAt`](#find-exact-block-by-date)
:::

<CodeBlock language="typescript" live>{estimateBlock}</CodeBlock>

#### Using predefined starting point

<CodeBlock language="typescript" live>{estimateBlockWithStartingPoint}</CodeBlock>

### Find exact block by date

:::warning
This method could be slow, especially when using BlockUtils without Statescan API.
:::

<CodeBlock language="typescript" live>{blockFromDate}</CodeBlock>

## Conversion utilities

### Time interval as number of blocks

```typescript
import { asBlocks } from '@joystream/sdk-core/chain/blocks'
```

<CodeBlock language="typescript" live>
  {timeToBlocks}
</CodeBlock>

### Number of blocks as time interval

```typescript
import { asTime } from '@joystream/sdk-core/chain/blocks'
```

<CodeBlock language="typescript" live>
  {blocksToTime}
</CodeBlock>

---
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import CodeBlock from '@theme/CodeBlock';
import qn_byId1 from '!!raw-loader!../../src/snippets/query/queryNode/byId1.ts';
import qn_byId2 from '!!raw-loader!../../src/snippets/query/queryNode/byId2.ts';
import qn_byId3 from '!!raw-loader!../../src/snippets/query/queryNode/byId3.ts';
import qn_first1 from '!!raw-loader!../../src/snippets/query/queryNode/first1.ts';
import qn_first2 from '!!raw-loader!../../src/snippets/query/queryNode/first2.ts';
import qn_byIds1 from '!!raw-loader!../../src/snippets/query/queryNode/byIds1.ts';
import qn_byIds2 from '!!raw-loader!../../src/snippets/query/queryNode/byIds2.ts';
import qn_byMany1 from '!!raw-loader!../../src/snippets/query/queryNode/byMany1.ts';
import qn_byMany2 from '!!raw-loader!../../src/snippets/query/queryNode/byMany2.ts';
import qn_paginate1 from '!!raw-loader!../../src/snippets/query/queryNode/paginate1.ts';
import qn_paginate2 from '!!raw-loader!../../src/snippets/query/queryNode/paginate2.ts';
import qn_custom1 from '!!raw-loader!../../src/snippets/query/queryNode/custom1.ts';
import orion_byId1 from '!!raw-loader!../../src/snippets/query/orion/byId1.ts';
import orion_byId2 from '!!raw-loader!../../src/snippets/query/orion/byId2.ts';
import orion_byId3 from '!!raw-loader!../../src/snippets/query/orion/byId3.ts';
import orion_first1 from '!!raw-loader!../../src/snippets/query/orion/first1.ts';
import orion_first2 from '!!raw-loader!../../src/snippets/query/orion/first2.ts';
import orion_byIds1 from '!!raw-loader!../../src/snippets/query/orion/byIds1.ts';
import orion_byIds2 from '!!raw-loader!../../src/snippets/query/orion/byIds2.ts';
import orion_byIds3 from '!!raw-loader!../../src/snippets/query/orion/byIds3.ts';
import orion_byMany1 from '!!raw-loader!../../src/snippets/query/orion/byMany1.ts';
import orion_byMany2 from '!!raw-loader!../../src/snippets/query/orion/byMany2.ts';
import orion_paginate1 from '!!raw-loader!../../src/snippets/query/orion/paginate1.ts';
import orion_paginate2 from '!!raw-loader!../../src/snippets/query/orion/paginate2.ts';
import orion_custom1 from '!!raw-loader!../../src/snippets/query/orion/custom1.ts';
import storageSquid_byId1 from '!!raw-loader!../../src/snippets/query/storageSquid/byId1.ts';
import storageSquid_byId2 from '!!raw-loader!../../src/snippets/query/storageSquid/byId2.ts';
import storageSquid_first1 from '!!raw-loader!../../src/snippets/query/storageSquid/first1.ts';
import storageSquid_first2 from '!!raw-loader!../../src/snippets/query/storageSquid/first2.ts';
import storageSquid_byIds1 from '!!raw-loader!../../src/snippets/query/storageSquid/byIds1.ts';
import storageSquid_byIds2 from '!!raw-loader!../../src/snippets/query/storageSquid/byIds2.ts';
import storageSquid_byMany1 from '!!raw-loader!../../src/snippets/query/storageSquid/byMany1.ts';
import storageSquid_byMany2 from '!!raw-loader!../../src/snippets/query/storageSquid/byMany2.ts';
import storageSquid_paginate1 from '!!raw-loader!../../src/snippets/query/storageSquid/paginate1.ts';
import storageSquid_paginate2 from '!!raw-loader!../../src/snippets/query/storageSquid/paginate2.ts';
import storageSquid_custom1 from '!!raw-loader!../../src/snippets/query/storageSquid/custom1.ts';

# Query module

The query module facilitates interactions with Joystream GraphQL APIs exposed by:

- [Query node](https://github.com/Joystream/joystream/tree/master/query-node)
- [Orion](https://github.com/Joystream/orion)
- [Storage squid service](https://github.com/Joystream/storage-squid)

It allows executing queries against those APIs in a fully **type-safe** way, without the need for any additional complex setup.

This is possible thanks to [GenQL](https://genql.dev/docs) which generates a TypeScript GraphQL client from a GraphQL schema.

## Create query API

<Tabs>
  <TabItem value="query-node" label="Query node" default>
  ```typescript
  import { QueryNodeApi } from "@joystream/sdk-core/query/queryNode";
  const qnApi = new QueryNodeApi("https://mainnet.joystream.dev/query/graphql");
  ```
  </TabItem>
  <TabItem value="orion" label="Orion" default>
  ```typescript
  import { OrionApi } from "@joystream/sdk-core/query/orion";
  const orionApi = new OrionApi("https://mainnet.joystream.dev/orion/graphql");
  ```
  </TabItem>
  <TabItem value="storage-squid" label="Storage squid" default>
  ```typescript
  import { StorageSquidApi } from '@joystream/sdk-core/query/storageSquid';
  const storageSquidApi = new StorageSquidApi("https://mainnet.joystream.dev/storage/squid/graphql");
  ```
  </TabItem>
</Tabs>

## Configuration

All `QueryApi`s (ie. `QueryNodeApi`, `OrionApi`, `StorageSquidApi`), accept an optional configuration object
as a second argument to their constructors (after url):

```typescript
export type Config = {
  // Maximum size of an array of inputs to a single query
  // (for example, max. chunk size of ids in `query.ENTITY.byIds`)
  // Default: 1000
  inputBatchSize: number
  // Maximum number of results to fetch in a single query
  // Default: 1000
  resultsPerQueryLimit: number
  // Maximum number of requests that can be sent concurrently to GraphQL server
  // Default: 20
  concurrentRequestsLimit: number
  // Additional GenQL client options
  clientOptions?: ClientOptions
}
```

## Execute queries

### Get entity by id

Queries an entity by its ID.

#### Syntax

<pre>
qApi.query.**_ENTITY_NAME_**.byId(**_ID_**) // Selects all scalar fields
qApi.query.**_ENTITY_NAME_**.byId(**_ID_**, **_SELECTION_**) // Selects specified fields
</pre>

#### Examples

<Tabs>
  <TabItem value="query-node" label="Query node" default>
    <CodeBlock languague="typescript" live>
      {qn_byId1}
    </CodeBlock>
    <CodeBlock languague="typescript" live>
      {qn_byId2}
    </CodeBlock>
    <CodeBlock languague="typescript" live>
      {qn_byId3}
    </CodeBlock>
  </TabItem>
  <TabItem value="orion" label="Orion" default>
    <CodeBlock languague="typescript" live>
      {orion_byId1}
    </CodeBlock>
    <CodeBlock languague="typescript" live>
      {orion_byId2}
    </CodeBlock>
    <CodeBlock languague="typescript" live>
      {orion_byId3}
    </CodeBlock>
  </TabItem>
  <TabItem value="storage-squid" label="Storage squid" default>
    <CodeBlock languague="typescript" live>
      {storageSquid_byId1}
    </CodeBlock>
    <CodeBlock languague="typescript" live>
      {storageSquid_byId2}
    </CodeBlock>
  </TabItem>
</Tabs>

### Get first result

Retrieves first entity matching provided conditions.

#### Syntax

<pre>
qApi.query.**_ENTITY_NAME_**.first(\{
  where: **_WHERE_ARGS_**,
  select: **_SELECTION_**, // Optional, by default all scalar fields are selected
  orderBy: **_ORDER_BY_LIST_** // Optional
\})
</pre>

#### Examples

<Tabs>
  <TabItem value="query-node" label="Query node" default>
    <CodeBlock languague="typescript" live>
      {qn_first1}
    </CodeBlock>
    <CodeBlock languague="typescript" live>
      {qn_first2}
    </CodeBlock>
  </TabItem>
  <TabItem value="orion" label="Orion" default>
    <CodeBlock languague="typescript" live>
      {orion_first1}
    </CodeBlock>
    <CodeBlock languague="typescript" live>
      {orion_first2}
    </CodeBlock>
  </TabItem>
  <TabItem value="storage-squid" label="Storage squid" default>
    <CodeBlock languague="typescript" live>
      {storageSquid_first1}
    </CodeBlock>
    <CodeBlock languague="typescript" live>
      {storageSquid_first2}
    </CodeBlock>
  </TabItem>
</Tabs>

### Get multiple entities by ids

Retrieves multiple entities by their ids.

Will execute multiple queries in case the list of ids is very large to avoid hitting the 2 MB request size limit.

The exact number of entities retrieved in a single query can be controlled with [`config.inputBatchSize`](#configuration).

#### Syntax

<pre>
qApi.query.**_ENTITY_NAME_**.byIds(**_IDS_**) // Selects all scalar fields
qApi.query.**_ENTITY_NAME_**.byIds(**_IDS_**, **_SELECTION_**) // Selects specified fields
</pre>

#### Examples

<Tabs>
  <TabItem value="query-node" label="Query node" default>
    <CodeBlock languague="typescript" live>
      {qn_byIds1}
    </CodeBlock>
    <CodeBlock languague="typescript" live>
      {qn_byIds2}
    </CodeBlock>
  </TabItem>

  <TabItem value="orion" label="Orion" default>
    <CodeBlock languague="typescript" live>
      {orion_byIds1}
    </CodeBlock>
    <CodeBlock languague="typescript" live>
      {orion_byIds2}
    </CodeBlock>
    <CodeBlock languague="typescript" live>
      {orion_byIds3}
    </CodeBlock>
  </TabItem>

  <TabItem value="storage-squid" label="Storage squid" default>
    <CodeBlock languague="typescript" live>
      {storageSquid_byIds1}
    </CodeBlock>
    <CodeBlock languague="typescript" live>
      {storageSquid_byIds2}
    </CodeBlock>
  </TabItem>
</Tabs>

### Get multiple entities from a list

Oftentimes you may have a list of values and would like to query some associated entities based on those values.

A specific example may be a list of ids, in which case you can use [`byIds`](#get-multiple-entities-by-ids) method.

But those values may not always ids, they can also be, for example:

- membership handles,
- ids of an associated entity (e.g. bag ids of storage data objects),

If the list you have is very large, you may want to make use of the features that [`byIds`](#get-multiple-entities-by-ids) method provides,
like auto-chunking and query parallelization.

Fortunately this is possible with `byMany` method.

#### Syntax

<pre>
qApi.query.**_ENTITY_NAME_**.byMany(\{
&nbsp;&nbsp;input: **_VALUES_**, // List of values to query from
&nbsp;&nbsp;where: **_WHERE_FUNCTION_**, // Takes a chunk of values and returns the <i>where</i> conditions
&nbsp;&nbsp;select: **_SELECTION_**, // Optional, by default all scalar fields are selected
\})
</pre>

#### Examples

<Tabs>
  <TabItem value="query-node" label="Query node" default>
    <CodeBlock languague="typescript" live>
      {qn_byMany1}
    </CodeBlock>
    <CodeBlock languague="typescript" live>
      {qn_byMany2}
    </CodeBlock>
  </TabItem>

  <TabItem value="orion" label="Orion" default>
    <CodeBlock languague="typescript" live>
      {orion_byMany1}
    </CodeBlock>
    <CodeBlock languague="typescript" live>
      {orion_byMany2}
    </CodeBlock>
  </TabItem>

  <TabItem value="storage-squid" label="Storage squid" default>
    <CodeBlock languague="typescript" live>
      {storageSquid_byMany1}
    </CodeBlock>
    <CodeBlock languague="typescript" live>
      {storageSquid_byMany2}
    </CodeBlock>
  </TabItem>
</Tabs>

### Pagination

Pagination queries are useful for fetching larger quantities of data or loading more data on demand.

Joystream services use [Subsquid](https://docs.sqd.ai/) GraphQL servers which provide different kinds of pagination.

- **Relay-style pagination** using `Connection` queries (works in newer versions of Subsquid) is used by:
  - OrionApi
  - StorageSquidApi
- **Offset pagination** using `limit` and `offset` (works in older version of Subsquid) is used by:
  - QueryNodeApi

The query module of Joystream SDK provides a simple interface for running queries with pagination.

#### Syntax

<pre>
qApi.query.**_ENTITY_NAME_**.paginate(\{
&nbsp;&nbsp;select: **_SELECTION_**,
&nbsp;&nbsp;orderBy: **_ORDER_BY_LIST_**,
&nbsp;&nbsp;where: **_WHERE_ARGS_**,
&nbsp;&nbsp;pageSize: **_PAGE_SIZE_**, // Optional, [config.resultsPerQueryLimit](#configuration) will be used by default
\})
</pre>

The `paginate` method returns a `Pagination` object which matches the following interface:

```typescript
interface Pagination<Entity> {
  // True if next page is available, false otherwise.
  hasNextPage: boolean

  // Fetches next page of entities
  nextPage(): Promise<Entity[]>

  // Fetches all pages and combines them into a single result.
  // This may take a while and consume a lot of memory, so use with caution!
  fetchAll(): Promise<Entity[]>

  // Fetches a specific number of entities, running multiple queries if needed.
  fetch(items: number): Promise<Entity[]>
}
```

#### Examples

<Tabs>
  <TabItem value="query-node" label="Query node" default>
    <CodeBlock languague="typescript" live>
      {qn_paginate1}
    </CodeBlock>
    <CodeBlock languague="typescript" live>
      {qn_paginate2}
    </CodeBlock>
  </TabItem>

  <TabItem value="orion" label="Orion" default>
    <CodeBlock languague="typescript" live>
      {orion_paginate1}
    </CodeBlock>
    <CodeBlock languague="typescript" live>
      {orion_paginate2}
    </CodeBlock>
  </TabItem>

  <TabItem value="storage-squid" label="Storage squid" default>
    <CodeBlock languague="typescript" live>
      {storageSquid_paginate1}
    </CodeBlock>
    <CodeBlock languague="typescript" live>
      {storageSquid_paginate2}
    </CodeBlock>
  </TabItem>
</Tabs>

### Custom queries

If you have more specific needs, you can access the underlying [GenQL](https://genql.dev/docs) client directly and take advantage of its type-safe interface to execute any GraphQL query you wish.

#### Examples

<Tabs>
  <TabItem value="query-node" label="Query node" default>
    <CodeBlock languague="typescript" live>
      {qn_custom1}
    </CodeBlock>
  </TabItem>

  <TabItem value="orion" label="Orion" default>
    <CodeBlock languague="typescript" live>
      {orion_custom1}
    </CodeBlock>
  </TabItem>

  <TabItem value="storage-squid" label="Storage squid" default>
    <CodeBlock languague="typescript" live>
      {storageSquid_custom1}
    </CodeBlock>
  </TabItem>
</Tabs>

Read the [GenQL documentation](https://genql.dev/docs/usage) to find out more about how to use the GenQL client.

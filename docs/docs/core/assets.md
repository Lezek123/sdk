---
sidebar_position: 4
---

import consts from '@site/src/consts'
import { GhLink } from '@site/src/components/GhLink';
import { GlossaryLink } from '@site/src/components/Glossary';
import CodeBlock from '@theme/CodeBlock';
import hapiToJoy from '!!raw-loader!../../src/snippets/assets/hapiToJoy.ts';
import joyToHapi from '!!raw-loader!../../src/snippets/assets/joyToHapi.ts';
import treasuryAccounts from '!!raw-loader!../../src/snippets/assets/treasuryAccounts.ts';
import videoCosts from '!!raw-loader!../../src/snippets/assets/createVideoCosts.ts';
import extrinsicBalancesEffect from '!!raw-loader!../../src/snippets/assets/extrinsicBalancesEffect.ts';
import batchSupport from '!!raw-loader!../../src/snippets/assets/batchSupport.ts';
import mergingCosts from '!!raw-loader!../../src/snippets/assets/mergingCosts.ts';
import balances from '!!raw-loader!../../src/snippets/assets/balances.ts';

# Assets module

The assets module provides a set of utilities related to balances, fees, vesting, locks and stakes on Joystream.

Some of the available features include:

- Retrieving account balances available for different purposes (ie. making transfers, paying different kinds of fees, staking etc.)
- Conversion between `JOY` and `HAPI`, supporting multiple variable types (`number`, `BigInt`, `string`, `BN`)
- Establishing all costs associated with executing a specific runtime extrinsic (tx fees, platform fees, bloat bonds, deposits, transfers etc.), how they would
  affect existing balances and whether an account has sufficient funds to cover them.

## Conversion

### HAPI to JOY

<CodeBlock language="typescript" live>{hapiToJoy}</CodeBlock>

### JOY to HAPI

<CodeBlock language="typescript" live>{joyToHapi}</CodeBlock>

## Constants

The following constants can be imported from `@joystream/sdk-core/assets`:

```typescript
// Number of decimal places that JOY token supports
export const JOY_DECIMALS = 10

// How much HAPI (smallest JOY token units) makes up 1 JOY
export const HAPI_PER_JOY = 10 ** JOY_DECIMALS

// Joystream existential deposit (in HAPI)
export const EXISTENTIAL_DEPOSIT = BigInt(266_666_560)
```

## Treasury accounts

The assets module exports treasury accounts of different runtime modules, which are typically used to store bloat bonds and other deposits:

<CodeBlock language="typescript" live>{treasuryAccounts}</CodeBlock>

## AssetsManager

The main way of interacting with the assets module is through the `AssetsManager` class.
It allows you to retrieve account balances, estimate extrinsic costs and more...

### Initializing

#### Standalone

```typescript
import { createApi } from '@joystream/sdk-core/chain'
import { AssetsManager } from '@joystream/sdk-core/assets'

const api = await createApi(`wss://mainnet.joystream.dev/rpc`)
const assets = new AssetsManager(api)
```

#### via JoystreamToolbox

```typescript
import { createJoystreamToolbox } from '@joystream/sdk-core/toolbox'

const joystreamToolbox = await createJoystreamToolbox({
  nodeWsEndpoint: 'wss://mainnet.joystream.dev/rpc',
  // ...
})
const { assets } = joystreamToolbox
```

### Checking account balances

The `AssetsManager` provides a simple way to retrieve account balances in a format that's typically more useful (than, for example, `api.derive.balances.all`) in context of Joystream:

<CodeBlock language="typescript" live>{balances}</CodeBlock>

#### Balances type

The balances are represented by the following abstraction:

```typescript
export type Balances = {
  // All funds, including locked and reserved
  total: bigint
  // All funds EXCEPT reserved
  free: bigint
  // All funds that can be used to pay transaction fees and other fee-like costs
  feeUsable: bigint
  // All funds that are free to be transferred to another account
  transferrable: bigint
}
```

This representation is directly tied to the [abstraction of a `Cost`](#costs-interface) which is described later in this document.

:::info
The `Balances` representation is still a work in progress and will be expanded with information about vesting and active stakes/locks in the future.
:::

### Estimating extrinsic costs

Imagine a user of your application wants to add a new video to Joystream.

Executing `content.createVideo` extrinsic involves paying multiple different costs, such as:

- **Transaction fee** - based on the extrinsic arguments and size,
- **Data fee** - based on the size of associated video assets (thumbnail, video media file, subtitles etc.),
- **Data object bloat bond** - based on the number of assets associated with the video and the current bloat bond value in the runtime storage module,
- **Video bloat bond** - based on the value in the runtime content module.

Typically you would need to calculate those costs in advance in order to:

- Inform the user about them,
- Validate whether the user has sufficient balance to cover them.

`AssetsManager` provides a unified interface for dealing with a variety of different costs and allows you display detailed summaries and validate balances without having to write your own logic for each Joystream extrinsic separately.

Take a look at the following example:

<CodeBlock language="typescript" live>{videoCosts}</CodeBlock>

#### Costs interface

If you run the code above, you will notice that each of the listed costs conforms to the following interface:

```typescript
export interface Cost {
  // What kind of cost is this (for example: MembershipFee)
  kind: CostKind
  // Whether paying this cost requires the account to stay alive
  // (and therefore its totalBalance to stay above EXISTENTIAL_DEPOSIT)
  requiresKeepAlive: boolean
  // What happens with the funds? (ie. are they burned? deposisted? transferred?)
  destiny: FundsDestiny
  // Which balance type is used to pay the the cost (eg. free, feeUsable, transferrable)
  paidFrom: BalanceType
  // Value in HAPI
  value: bigint
}
```

For more details and exact definitions of `CostKind`, `BalanceType` and `FundsDestiny` types, see <GhLink to="packages/core/src/assets/types.ts" />.

Having such detiled and flexible abstraction of a `Cost` enables multiple other features that `AssetsManager` provides (see more examples below).

#### Checking how costs affect balances

`AssetsManager` allows you to check how the estimated extrinsic costs will affect different types of balances of a given account:

<CodeBlock language="typescript" live>{extrinsicBalancesEffect}</CodeBlock>

#### Ensuring sufficient balances

To check whether an account has sufficient balances to cover all provided [costs](#costs-interface), you can simply use the `canPay` method:

```typescript
const hasSufficientFunds = await assets.canPay(alice, costs)

if (!hasSufficientFunds) {
  console.log("Can't cover the extrinsic costs!")
} else {
  console.log('OK!')
}
```

#### Estimating costs of multiple extrinsics

If your application/script sends multiple extrinsics at once, either because it runs some operations in batches or deals with more complex, multi-step workflows, you may want to estimate the costs of all those extrinsics together beforehand.

:::warning
**Not all costs can be accurately predicted in advance!** (especially if one of the extrinsics you send affects the cost(s) of another)

Imagine a scenario where you batch multiple `projectToken.buyOnAmm` calls for the same token.
Each of those calls will increase the price of the token and affect the costs of subsequent calls. `AssetsManager` will not take those intermediate runtime state changes into account, leading to an underestimation of the total cost.
:::

`AssetsManager` supports all available batch extrinsics (`utility.batch`, `utility.forceBatch`, `utility.batchAll`), so if you're using them to group your extrinsics together, you can simply pass the batch extrinsic to the `costsOf` method:

<CodeBlock language="typescript" live>{batchSupport}</CodeBlock>

Alternatively, if you're sending extrinsics one-by-one, you can estimate the costs separately and then merge them into a single array:

<CodeBlock language="typescript" live>{mergingCosts}</CodeBlock>

This costs representation will work perfectly fine with methods like `canPay`, `estimateBalancesAfter` etc.

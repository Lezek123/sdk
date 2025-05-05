import { describe, test } from '@jest/globals'
import {
  EXISTENTIAL_DEPOSIT,
  HAPI_PER_JOY,
  hapiToJoy,
  joyToHapi,
  treasuryAccounts,
} from '@joystream/sdk-core/assets'
import { InvalidAmountError } from '@joystream/sdk-core/assets/errors'
import { storageUnits, toBN } from '@joystream/sdk-core/utils'
import { endpoints } from '@joystream/sdk-core/utils/endpoints'
import { disconnect } from '@joystream/sdk-core/chain'
import { knownAddresses } from '@joystream/sdk-core/keys'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { createJoystreamToolbox } from '@joystream/sdk-core/toolbox'
import { buildMocks } from './mocks'

const TEST_NODE_ENDPOINT = endpoints.sdkTesting.wsRpc

jest.setTimeout(30_000)

const successCases = [
  { hapi: 1, joy: 0.0000000001 },
  { hapi: 10_000_000_000, joy: 1 },
  { hapi: 10_000_000_001, joy: 1.0000000001 },
  { hapi: BigInt(1_234_567_890) * BigInt(HAPI_PER_JOY), joy: 1_234_567_890 },
]

const expectedTreasuryAccounts = {
  projectToken: 'j4To6jgKg17fZqBq2qPWLPWiKydubhrFWeRuc9rQj3DYbjh6N',
  storage: 'j4To6jgKg1Jo1wfcPDHye73TRt2c28Y7K9kRraygcocBa1kHL',
  content: 'j4To6jgKfy8MgiMRDXzd76ZXh6dmMtw5KPdECRNDAiueycmrS',
  proposalsDiscussion: 'j4To6jgKg17fZHvTzRnbNk5hGaMyNGk6RPTEowp2ZNEE8qZaa',
}

const tools = createJoystreamToolbox({
  nodeWsEndpoint: TEST_NODE_ENDPOINT,
  keyManagerConfig: {
    keyringOptions: { isDev: true },
  },
}).then((tools) => ({
  ...tools,
  mocks: buildMocks(tools),
}))

// Initialized on beforeAll
const { alice } = knownAddresses

async function ensureExtrinsicCostsCorrectlyEstimated(
  tx: SubmittableExtrinsic<'promise'>,
  sender?: string
) {
  const { mocks, assets, txm } = await tools
  sender = sender || (await mocks.mockAccount())
  const costs = await assets.costsOf(tx, sender)
  const canPay = await assets.canPay(sender, costs)
  const estBalancesAfter = await assets.estimateBalancesAfter(sender, costs)
  expect(canPay).toEqual(true)
  const tracked = await txm.run(tx, sender).inBlock(true)
  const balancesAfter = await assets.getBalances(sender)
  expect(balancesAfter.total).toEqual(estBalancesAfter.total)
  expect(balancesAfter.free).toEqual(estBalancesAfter.free)
  expect(balancesAfter.feeUsable).toEqual(estBalancesAfter.feeUsable)
  expect(balancesAfter.transferrable).toEqual(estBalancesAfter.transferrable)
  return tracked
}

afterAll(async () => {
  const { api } = await tools
  await disconnect(api)
})

describe('Assets', () => {
  describe('hapiToJoy', () => {
    for (const { hapi, joy } of successCases) {
      test(`${hapi} HAPI (${typeof hapi}) === ${joy} JOY`, () => {
        expect(hapiToJoy(hapi)).toEqual(joy)
      })
      if (typeof hapi !== 'bigint') {
        test(`${hapi} HAPI (bigint) === ${joy} JOY`, () => {
          expect(hapiToJoy(BigInt(hapi))).toEqual(joy)
        })
      }
      test(`${hapi} HAPI (BN) === ${joy} JOY`, () => {
        expect(hapiToJoy(toBN(hapi))).toEqual(joy)
      })
      test(`${hapi} HAPI (string) === ${joy} JOY`, () => {
        expect(hapiToJoy(hapi.toString())).toEqual(joy)
      })
    }
    test('Invalid characters in input', () => {
      expect(() => hapiToJoy('1a')).toThrowError(InvalidAmountError)
    })
  })
  describe('joyToHapi', () => {
    for (const { hapi, joy } of successCases) {
      test(`${joy} JOY === ${hapi} HAPI`, () => {
        expect(joyToHapi(joy)).toEqual(BigInt(hapi))
      })
    }
  })
  describe('treasuryAccounts', () => {
    for (const [moduleName, expectedAccout] of Object.entries(
      expectedTreasuryAccounts
    )) {
      test(moduleName, () => {
        expect(
          treasuryAccounts[moduleName as keyof typeof expectedTreasuryAccounts]
        ).toEqual(expectedAccout)
      })
    }
  })
  describe('extrinsic costs', () => {
    test.concurrent('balances.transfer', async () => {
      const {
        api,
        mocks: { mockAccount },
      } = await tools
      const sender = await mockAccount(1)
      await ensureExtrinsicCostsCorrectlyEstimated(
        api.tx.balances.transfer(alice, joyToHapi(1)),
        sender
      )
    })
    test.concurrent('balances.transferKeepAlive', async () => {
      const {
        api,
        mocks: { mockAccount },
      } = await tools
      const sender = await mockAccount(1 + hapiToJoy(EXISTENTIAL_DEPOSIT))
      await ensureExtrinsicCostsCorrectlyEstimated(
        api.tx.balances.transferKeepAlive(alice, joyToHapi(1)),
        sender
      )
    })
    test.concurrent('balances.transferAll (keep alive)', async () => {
      const { api } = await tools
      await ensureExtrinsicCostsCorrectlyEstimated(
        api.tx.balances.transferAll(alice, true)
      )
    })
    test.concurrent('balances.transferAll (allow death)', async () => {
      const { api } = await tools
      await ensureExtrinsicCostsCorrectlyEstimated(
        api.tx.balances.transferAll(alice, false)
      )
    })
    describe('content', () => {
      test.concurrent('content.createChannel', async () => {
        const {
          txm,
          mocks: { mockMember, mockCreateChannelAseetsParams },
        } = await tools
        const { memberId, memberAddr } = await mockMember()
        await ensureExtrinsicCostsCorrectlyEstimated(
          txm.meta.content.createChannel({
            owner: { Member: memberId },
            ...(await mockCreateChannelAseetsParams([
              5 * storageUnits.MiB,
              10 * storageUnits.MiB,
            ])),
          }),
          memberAddr
        )
      })
      test.concurrent('content.createVideo', async () => {
        const {
          txm,
          mocks: { mockChannel, mockCreateVideoAssetsParams },
        } = await tools
        const channel = await mockChannel()
        await ensureExtrinsicCostsCorrectlyEstimated(
          txm.meta.content.createVideo({
            actor: { Member: channel.owner.memberId },
            channelId: channel.channelId,
            ...(await mockCreateVideoAssetsParams([
              3 * storageUnits.MiB,
              8 * storageUnits.MiB,
            ])),
          }),
          channel.owner.memberAddr
        )
      })
      test.concurrent('content.updateChannel', async () => {
        const {
          txm,
          mocks: { mockChannel, mockUpdateAssetsParams },
        } = await tools
        const channel = await mockChannel()
        await ensureExtrinsicCostsCorrectlyEstimated(
          txm.meta.content.updateChannel({
            actor: { Member: channel.owner.memberId },
            channelId: channel.channelId,
            ...(await mockUpdateAssetsParams([], [7 * storageUnits.MiB])),
          }),
          channel.owner.memberAddr
        )
      })
      test.concurrent('content.updateVideo', async () => {
        const {
          txm,
          mocks: { mockVideo, mockUpdateAssetsParams },
        } = await tools
        const video = await mockVideo()
        await ensureExtrinsicCostsCorrectlyEstimated(
          txm.meta.content.updateVideo({
            actor: { Member: video.channel.owner.memberId },
            videoId: video.videoId,
            ...(await mockUpdateAssetsParams([], [4 * storageUnits.MiB])),
          }),
          video.channel.owner.memberAddr
        )
      })
      describe('nft', () => {
        test.concurrent('content.buyNft', async () => {
          const {
            api,
            mocks: { mockVideo, mockMember },
          } = await tools
          const price = joyToHapi(10)
          const video = await mockVideo(undefined, {
            initTransactionalStatus: { 'BuyNow': price },
            royalty: 10_000_000,
          })
          const buyer = await mockMember()
          await ensureExtrinsicCostsCorrectlyEstimated(
            api.tx.content.buyNft(video.videoId, buyer.memberId, price),
            buyer.memberAddr
          )
        })
        test.concurrent('content.acceptIncomingOffer', async () => {
          const {
            api,
            mocks: { mockVideo, mockMember },
          } = await tools
          const price = joyToHapi(10)
          const buyer = await mockMember()
          const video = await mockVideo(undefined, {
            initTransactionalStatus: {
              'InitiatedOfferToMember': [buyer.memberId, price],
            },
            royalty: 10_000_000,
          })
          await ensureExtrinsicCostsCorrectlyEstimated(
            api.tx.content.acceptIncomingOffer(video.videoId, price),
            buyer.memberAddr
          )
        })
        test.concurrent(
          'content.makeEnglishAuctionBid (non-completing)',
          async () => {
            const {
              api,
              mocks: { mockMember, mockVideo },
              data: { nftConfig },
            } = await tools
            const video = await mockVideo(undefined, {
              initTransactionalStatus: {
                'EnglishAuction': {
                  duration: nftConfig.minAuctionDuration,
                  minBidStep: nftConfig.minBidStep,
                  startingPrice: nftConfig.minStartingPrice,
                  buyNowPrice:
                    nftConfig.minStartingPrice + nftConfig.minBidStep * 2n,
                },
              },
              royalty: 10_000_000,
            })
            const buyer = await mockMember()
            await ensureExtrinsicCostsCorrectlyEstimated(
              api.tx.content.makeEnglishAuctionBid(
                buyer.memberId,
                video.videoId,
                nftConfig.minStartingPrice + nftConfig.minBidStep
              ),
              buyer.memberAddr
            )
          }
        )
      })
      test.concurrent(
        'content.makeEnglishAuctionBid (completing)',
        async () => {
          const {
            api,
            mocks: { mockMember, mockVideo },
            data: { nftConfig },
          } = await tools
          const video = await mockVideo(undefined, {
            initTransactionalStatus: {
              'EnglishAuction': {
                duration: nftConfig.minAuctionDuration,
                minBidStep: nftConfig.minBidStep,
                startingPrice: nftConfig.minStartingPrice,
                buyNowPrice:
                  nftConfig.minStartingPrice + nftConfig.minBidStep * 2n,
              },
            },
            royalty: 10_000_000,
          })
          const buyer = await mockMember()
          await ensureExtrinsicCostsCorrectlyEstimated(
            api.tx.content.makeEnglishAuctionBid(
              buyer.memberId,
              video.videoId,
              nftConfig.minStartingPrice + nftConfig.minBidStep * 2n
            ),
            buyer.memberAddr
          )
        }
      )
      test.concurrent(
        'content.makeOpenAuctionBid (non-completing)',
        async () => {
          const {
            api,
            mocks: { mockMember, mockVideo },
            data: { nftConfig },
          } = await tools
          const video = await mockVideo(undefined, {
            initTransactionalStatus: {
              'OpenAuction': {
                startingPrice: nftConfig.minStartingPrice,
                buyNowPrice:
                  nftConfig.minStartingPrice + nftConfig.minBidStep * 2n,
              },
            },
            royalty: 10_000_000,
          })
          const buyer = await mockMember()
          await ensureExtrinsicCostsCorrectlyEstimated(
            api.tx.content.makeOpenAuctionBid(
              buyer.memberId,
              video.videoId,
              nftConfig.minStartingPrice + nftConfig.minBidStep
            ),
            buyer.memberAddr
          )
        }
      )
      test.concurrent('content.makeOpenAuctionBid (completing)', async () => {
        const {
          api,
          mocks: { mockMember, mockVideo },
          data: { nftConfig },
        } = await tools
        const video = await mockVideo(undefined, {
          initTransactionalStatus: {
            'OpenAuction': {
              startingPrice: nftConfig.minStartingPrice,
              buyNowPrice:
                nftConfig.minStartingPrice + nftConfig.minBidStep * 2n,
            },
          },
          royalty: 10_000_000,
        })
        const buyer = await mockMember()
        await ensureExtrinsicCostsCorrectlyEstimated(
          api.tx.content.makeOpenAuctionBid(
            buyer.memberId,
            video.videoId,
            nftConfig.minStartingPrice + nftConfig.minBidStep * 2n
          ),
          buyer.memberAddr
        )
      })
    })
    // TODO: Currently disabled by the runtime (CallFiltered)
    // test.concurrent('content.acceptChannelTransfer', async () => {
    //   const {
    //     api,
    //     mocks: { mockChannel, mockMember },
    //     txm,
    //   } = await tools
    //   const price = joyToHapi(5)
    //   const buyer = await mockMember()
    //   const channel = await mockChannel()
    //   const { lastResult } = await txm
    //     .run(
    //       api.tx.content.initializeChannelTransfer(
    //         channel.channelId,
    //         { Member: channel.owner.memberId },
    //         {
    //           newOwner: { Member: buyer.memberId },
    //           price,
    //         }
    //       ),
    //       channel.owner.memberAddr
    //     )
    //     .inBlock(true)
    //   const [, , transfer] = getEvent(
    //     lastResult,
    //     'content',
    //     'InitializedChannelTransfer'
    //   ).data
    //   await ensureExtrinsicCostsCorrectlyEstimated(
    //     api.tx.content.acceptChannelTransfer(channel.channelId, {
    //       price,
    //       transferId: transfer.transferParams.transferId,
    //     }),
    //     buyer.memberAddr
    //   )
    // })
    test.concurrent('content.issueCreatorToken', async () => {
      const {
        api,
        mocks: { mockChannel, mockMember },
      } = await tools
      const channel = await mockChannel()
      const member = await mockMember()
      await ensureExtrinsicCostsCorrectlyEstimated(
        api.tx.content.issueCreatorToken(
          { Member: channel.owner.memberId },
          channel.channelId,
          {
            initialAllocation: new Map([
              [channel.owner.memberId, { amount: 1_000 }],
              [member.memberId, { amount: 100 }],
            ]),
            patronageRate: 10_000, // Permill
            revenueSplitRate: 500_000, // Permill
            transferPolicy: 'Permissionless',
          }
        ),
        channel.owner.memberAddr
      )
    })
    test.concurrent('content.creatorTokenIssuerTransfer', async () => {
      const {
        api,
        mocks: { mockChannel, mockMember },
        txm,
      } = await tools
      const channel = await mockChannel()
      const member = await mockMember()
      await txm
        .run(
          api.tx.content.issueCreatorToken(
            { Member: channel.owner.memberId },
            channel.channelId,
            {
              initialAllocation: new Map([
                [channel.owner.memberId, { amount: 1_000 }],
              ]),
              patronageRate: 10_000, // Permill
              revenueSplitRate: 500_000, // Permill
              transferPolicy: 'Permissionless',
            }
          ),
          channel.owner.memberAddr
        )
        .inBlock(true)
      await ensureExtrinsicCostsCorrectlyEstimated(
        api.tx.content.creatorTokenIssuerTransfer(
          { Member: channel.owner.memberId },
          channel.channelId,
          [
            [member.memberId, { amount: 100 }],
            [channel.owner.memberId, { amount: 100 }],
          ],
          '0x'
        ),
        channel.owner.memberAddr
      )
    })
  })
})

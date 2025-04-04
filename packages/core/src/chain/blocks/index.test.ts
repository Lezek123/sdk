import { describe, expect } from '@jest/globals'
import { createApi, disconnect } from '../api'
import { BlockUtils } from '.'
import { endpoints } from '../../utils/endpoints'

jest.setTimeout(120_000)

const TEST_WS_ENDPOINT = endpoints.joystreamDev.wsRpc

const apiPromise = createApi(TEST_WS_ENDPOINT, { wsTimeout: 120_000 })

describe('BlockUtils', () => {
  beforeAll(async () => {
    await apiPromise
  })

  afterAll(async () => {
    await disconnect(await apiPromise)
  })
  describe('exactBlockAt', () => {
    const testCases = [
      {
        time: 1_670_616_462_000,
        height: 1,
        hash: '0x00c43b849532a554fede900e5ee0d6bfef85a1f3452ade3df77a6aea511d2474',
      },
      {
        time: 1_670_622_456_000,
        height: 1000,
        hash: '0x96411b5123a871642ef4f7830c0cfd40657cbeb1fd8e9354e478db098aae946a',
      },
      {
        time: 1_670_628_456_000,
        height: 2000,
        hash: '0xa9cd1f592537732da025f72d707de2abb0d092fda6f34ec70c19a53ef4940063',
      },
      {
        time: 1_670_640_456_000,
        height: 4000,
        hash: '0xfe3876ee2844359fb736b84a494d38f65ff4d770bc25b4fc576064f420816137',
      },
      {
        time: 1_670_664_456_000,
        height: 8000,
        hash: '0x54d862340a4d2d83ba658fb01d037c972a4f0b9b5598b957fddab77f8722eac2',
      },
      {
        time: 1_670_712_456_000,
        height: 16000,
        hash: '0xa9af604c5fc2bcd3fa07794e3044f93f4b1a484130f3a62c9fbfcb8e2b64b773',
      },
      {
        time: 1_670_808_462_001,
        height: 32000,
        hash: '0x4f4ba75e8977ccbc38b4475e7ad2b04e98f196a85e2672883d1633d0c8abaf46',
      },
      {
        time: 1_671_000_462_001,
        height: 64000,
        hash: '0x82693e951380a6b934838dedc06438c921afc5c5be5ded9c7d6338bb08ad6ccd',
      },
      {
        time: 1_671_387_324_001,
        height: 128000,
        hash: '0x9b804d3a2d1cfaef7aae7e79472f46db2d8e0d0cebf12eeb990c212b73944c72',
      },
      {
        time: 1_672_155_354_000,
        height: 256000,
        hash: '0x9ab82835ed963599518f7054e4863297e4e9af239db507380a546e4582591549',
      },
      {
        time: 1_673_695_506_001,
        height: 512000,
        hash: '0x1766abb8ed8981aa6a5a0420a50ef0e1eee1814d8c1cb849ee1662295a163778',
      },
      {
        time: 1_676_770_884_002,
        height: 1024000,
        hash: '0x4e25c7f35d5378b1f23ae7ae194d12b8b7a45dc2f8647b6a8d4a7f1b2a9b59b6',
      },
      {
        time: 1_682_923_698_000,
        height: 2048000,
        hash: '0xc6c9ddfd6703298aa1f59fe575b69f89e51e14322ebb3e6272e8cb2e1e278ba4',
      },
      {
        time: 1_695_243_126_000,
        height: 4096000,
        hash: '0xd504883063d540df394aa01887d51814651ee367097a10b6f6fc06d301716e19',
      },
      {
        time: 1_719_919_080_000,
        height: 8192000,
        hash: '0x816fd8cbe2e6cdcd77d06ba872b495b69831cffd398bbc1866d5ea958b168746',
      },
    ]
    describe('Exact blockTime match', () => {
      for (const testCase of testCases) {
        test.concurrent(testCase.height.toString(), async () => {
          const api = await apiPromise
          const blockUtils = new BlockUtils(api)
          const block = await blockUtils.exactBlockAt(new Date(testCase.time))
          expect(block.height).toBe(testCase.height)
          expect(block.hash).toBe(testCase.hash)
          expect(block.time).toBe(testCase.time)
        })
      }
    })
    describe('Slightly higher blockTime', () => {
      for (const testCase of testCases) {
        test.concurrent(testCase.height.toString(), async () => {
          const api = await apiPromise
          const blockUtils = new BlockUtils(api)
          const block = await blockUtils.exactBlockAt(
            new Date(testCase.time + 1)
          )
          expect(block.height).toBe(testCase.height)
          expect(block.hash).toBe(testCase.hash)
          expect(block.time).toBe(testCase.time)
        })
      }
    })
    describe('Slightly lower blockTime', () => {
      for (const testCase of testCases) {
        test.concurrent(testCase.height.toString(), async () => {
          const api = await apiPromise
          const blockUtils = new BlockUtils(api)
          const block = await blockUtils.exactBlockAt(
            new Date(testCase.time - 1)
          )
          expect(block.height).toBe(testCase.height - 1)
        })
      }
    })
  })
})

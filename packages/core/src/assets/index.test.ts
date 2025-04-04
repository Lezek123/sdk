import { describe, test } from '@jest/globals'
import { HAPI_PER_JOY, hapiToJoy, joyToHapi } from '../assets'
import { InvalidAmountError } from './errors'
import { toBN } from '../utils'

const successCases = [
  { hapi: 1, joy: 0.0000000001 },
  { hapi: 10_000_000_000, joy: 1 },
  { hapi: 10_000_000_001, joy: 1.0000000001 },
  { hapi: BigInt(1_234_567_890) * BigInt(HAPI_PER_JOY), joy: 1_234_567_890 },
]

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
})

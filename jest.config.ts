import { createJsWithTsPreset, JestConfigWithTsJest } from 'ts-jest'

const packages = ['core']
const envs = (process.env.TEST_ENV || 'node').split(',')

const jestConfig: JestConfigWithTsJest = {
  maxWorkers: 1,
  maxConcurrency: 8,
  detectOpenHandles: true,
  projects: [
    ...packages
      .map((pkg) =>
        envs.map((env) => ({
          displayName: `@joystream/sdk-${pkg} (${env})`,
          testMatch: [`<rootDir>/packages/${pkg}/**/*.test.ts`],
          ...createJsWithTsPreset({
            tsconfig: `<rootDir>/packages/${pkg}/tsconfig.json`,
          }),
          moduleNameMapper: {
            '^@joystream/sdk-core/(.*)$': '<rootDir>/packages/core/src/$1',
          },
        }))
      )
      .flat(),
    {
      displayName: 'Docs',
      testMatch: [`<rootDir>/docs/**/*.test.ts`],
      ...createJsWithTsPreset({
        tsconfig: `<rootDir>/docs/tsconfig.json`,
      }),
    },
  ],
}

export default jestConfig

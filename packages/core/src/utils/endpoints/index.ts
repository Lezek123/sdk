export const endpoints = {
  sdkTesting: {
    wsRpc: 'ws://localhost:9944',
    orionMock: 'http://localhost:50002/graphql',
    queryNode: 'http://localhost:50004/graphql',
  },
  joystreamDev: {
    wsRpc: 'wss://mainnet.joystream.dev/rpc',
    queryNode: 'https://mainnet.joystream.dev/query/graphql',
    queryNodeIndexer: 'https://mainnet.joystream.dev/query/indexer/graphql',
    orion: 'https://mainnet.joystream.dev/orion/graphql',
    orionArchive: 'https://mainnet.joystream.dev/orion/archive/graphql',
    orionAuth: 'https://mainnet.joystream.dev/orion/auth',
    storageSquid: 'https://mainnet.joystream.dev/storage/squid/graphql',
  },
}

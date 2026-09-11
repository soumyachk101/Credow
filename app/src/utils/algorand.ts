import { AlgorandClient } from '@algorandfoundation/algokit-utils'

export function getAlgorandClient() {
  return AlgorandClient.fromConfig({
    algodConfig: {
      server: import.meta.env.VITE_ALGOD_SERVER,
      port: import.meta.env.VITE_ALGOD_PORT,
      token: import.meta.env.VITE_ALGOD_TOKEN,
    },
  })
}

export function getNetwork(): string {
  return import.meta.env.VITE_ALGOD_NETWORK ?? 'localnet'
}

/** App ID of the deployed HelloWorld contract. Set VITE_APP_ID after `npm run deploy`. */
export function getAppId(): bigint | null {
  const raw = import.meta.env.VITE_APP_ID
  return raw ? BigInt(raw) : null
}

export function getKmdConfigFromViteEnvironment() {
  if (!import.meta.env.VITE_KMD_SERVER) {
    throw new Error('Attempt to get default kmd configuration without specifying VITE_KMD_SERVER in the environment variables')
  }
  return {
    server: import.meta.env.VITE_KMD_SERVER as string,
    port: import.meta.env.VITE_KMD_PORT as string,
    token: import.meta.env.VITE_KMD_TOKEN as string,
    wallet: import.meta.env.VITE_KMD_WALLET as string,
    password: import.meta.env.VITE_KMD_PASSWORD as string,
  }
}

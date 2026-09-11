import { AlgorandSubscriber } from '@algorandfoundation/algokit-subscriber'
import algosdk from 'algosdk'
import { readFile, writeFile } from 'node:fs/promises'
import { handleLifecycleEvent } from './handlers.js'

const appId = BigInt(process.env.APP_ID ?? '0')
if (appId === 0n) {
  console.error('APP_ID environment variable is required. Deploy your contract first: npm run deploy')
  process.exit(1)
}

const algod = new algosdk.Algodv2(
  process.env.ALGOD_TOKEN ?? 'a'.repeat(64),
  process.env.ALGOD_SERVER ?? 'http://localhost',
  process.env.ALGOD_PORT ?? '4001',
)

const indexer = new algosdk.Indexer(
  process.env.INDEXER_TOKEN ?? 'a'.repeat(64),
  process.env.INDEXER_SERVER ?? 'http://localhost',
  process.env.INDEXER_PORT ?? '8980',
)

const WATERMARK_FILE = '.watermark.json'

const subscriber = new AlgorandSubscriber(
  {
    filters: [{ name: 'lifecycle', filter: { appId } }],
    frequencyInSeconds: 2,
    // Catch up on everything the app has ever done via indexer, then follow along with algod.
    syncBehaviour: 'catchup-with-indexer',
    maxRoundsToSync: 100,
    watermarkPersistence: {
      get: async () => {
        try {
          return BigInt(JSON.parse(await readFile(WATERMARK_FILE, 'utf-8')).watermark)
        } catch {
          return 0n
        }
      },
      set: async (watermark) => writeFile(WATERMARK_FILE, JSON.stringify({ watermark: watermark.toString() })),
    },
  },
  algod,
  indexer,
)

subscriber.on('lifecycle', (transaction) => handleLifecycleEvent(transaction, appId))
subscriber.onError((error) => console.error('[ERROR]', error))

console.log(`Monitoring application ${appId} for lifecycle events...`)
// Second arg suppresses the library's per-poll logging; drop it to see sync progress.
subscriber.start(undefined, true)

process.on('SIGINT', () => void subscriber.stop('SIGINT'))

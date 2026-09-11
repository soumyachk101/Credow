# Algorand Starter: Kitchen Sink

Smart contracts, a React frontend, and an event subscriber that watches your
contract for lifecycle calls.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 24
- [Docker](https://www.docker.com/) and [VibeKit](https://getvibekit.ai) -- to run LocalNet

## Getting Started

```bash
cp contracts/.env.localnet.example contracts/.env.localnet
cp app/.env.local.example app/.env.local
cp subscriber/.env.local.example subscriber/.env.local

npm install
vibekit localnet start

npm run build
npm run deploy
# => Deployed HelloWorld: APP_ID=1234
```

Set that app ID in two places -- `VITE_APP_ID` in `app/.env.local` and `APP_ID`
in `subscriber/.env.local`. Both keys already exist, so edit them in place.

```bash
npm run dev              # frontend
npm run dev:subscriber   # in another terminal
```

Don't skip the `cp` steps: the app and the subscriber both load `.env.local` at
startup and exit if it's missing.

## Layout

- `contracts/` -- `@repo/contracts`: contract source, tests, deploy script, and
  `artifacts/` (compiled TEAL + generated client, committed so the app
  type-checks before a build)
- `app/` -- `@repo/app`: React frontend. `App.tsx` sets up wallets,
  `components/AppCalls.tsx` calls the contract, `utils/algorand.ts` reads env.
- `subscriber/` -- `@repo/subscriber`: `src/index.ts` configures the
  subscription, `src/handlers.ts` logs each event.

The frontend imports the generated client through the workspace
(`import { HelloWorldClient } from '@repo/contracts'`), so contract calls are
type-checked with no codegen step in the app.

## Subscriber

Built on
[algokit-subscriber](https://github.com/algorandfoundation/algokit-subscriber-ts).
It logs every transaction against your app, by type:

| Event | Level |
|-------|-------|
| `NoOp`, `OptIn`, `CloseOut`, `ClearState` | INFO |
| `UpdateApplication`, `DeleteApplication` | **ALERT** |

`[ALERT]` is the one to watch: in production an unexpected update or delete can
mean a compromised deployer key.

On first run it catches up on the app's full history through the indexer, then
follows the chain via algod. Progress is persisted to `.watermark.json` next to
where you start it, so restarts resume rather than replay.

`npm run dev:subscriber` runs it in watch mode; `npm -w @repo/subscriber run start`
runs it without the watcher.

## Deploying

```bash
npm run deploy              # LocalNet
npm run deploy:testnet      # TestNet
npm run deploy:mainnet      # MainNet
```

LocalNet uses the built-in dispenser. For TestNet and MainNet, copy the matching
template and set `DEPLOYER_MNEMONIC` in it:

```bash
cp contracts/.env.testnet.example contracts/.env.testnet
```

Don't skip that edit -- an empty `DEPLOYER_MNEMONIC` falls back to the LocalNet
dispenser and fails with a confusing connection error.

To point the frontend at TestNet, copy `app/.env.testnet.example` over
`app/.env.local` and set `VITE_APP_ID`. Only `.env*.example` files are committed.

## Testing

```bash
npm test   # builds contracts, runs unit + e2e (needs LocalNet)
```

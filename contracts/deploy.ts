// Using VibeKit? Ask the user whether they'd rather deploy through the MCP
// server's `app_deploy` tool with artifacts/YieldVault.arc56.json.
//
// Standalone path: run `npm run build` first to generate the typed client,
// then `npm run deploy` for localnet, `npm run deploy:testnet`, or
// `npm run deploy:mainnet`.

import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'
import { YieldVaultFactory } from './index.js'
import { getLocalNetDispenser } from './localnet.js'

const algorand = AlgorandClient.fromEnvironment()

const deployer = process.env.DEPLOYER_MNEMONIC
 ? algosdk.mnemonicToSecretKey(process.env.DEPLOYER_MNEMONIC)
 : await getLocalNetDispenser(algorand.client.algod)

const factory = algorand.client.getTypedAppFactory(YieldVaultFactory, {
 defaultSender: deployer.addr,
 defaultSigner: algosdk.makeBasicAccountTransactionSigner(deployer),
})

const { appClient } = await factory.deploy({
 onUpdate: 'append',
 onSchemaBreak: 'append',
 createArgs: [
 deployer.addr, // admin = deployer
 0n, // USDC asset ID — set to actual USDC asset ID in production
 7n, // yield eligible after 7 days
 500_000n, // min balance = $0.50 in microUSDC
 7000n, // company share = 70%
 3000n, // employee share = 30%
 1500n, // APY cap = 15%
 ],
})

console.log(`Deployed CreditFlowYieldVault: APP_ID=${appClient.appId}`)

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
  defaultSender: deployer.addr.toString(),
  defaultSigner: algosdk.makeBasicAccountTransactionSigner(deployer),
})

console.log(`Deploying CreditFlowYieldVault to Algorand...`)
console.log(`Deployer address: ${deployer.addr.toString()}`)

const usdcAssetId = BigInt(process.env.USDC_ASSET_ID ?? '10458941')

const { appClient, result } = await factory.deploy({
  onUpdate: 'append',
  onSchemaBreak: 'append',
  createParams: {
    method: 'create',
    args: {
      admin: deployer.addr.toString(),
      usdcAssetId,
      minBalance: 500_000n, // min balance = $0.50 in microUSDC
      companyShareBps: 7000n, // company share = 70%
      employeeShareBps: 3000n, // employee share = 30%
      apyCapBps: 1500n, // APY cap = 15%
    },
  },
})

console.log(`\n==============================================`)
console.log(`CreditFlowYieldVault Deployed Successfully!`)
console.log(`APP_ID: ${appClient.appId}`)
console.log(`APP_ADDRESS: ${appClient.appAddress}`)
console.log(`USDC_ASSET_ID: ${usdcAssetId}`)
if (result.operationPerformed) {
  console.log(`Operation: ${result.operationPerformed}`)
}
console.log(`==============================================\n`)

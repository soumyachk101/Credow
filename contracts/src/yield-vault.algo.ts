import {
 Contract,
 GlobalState,
 BoxMap,
 Uint64,
 arc4,
 abimethod,
 Txn,
 assert,
} from '@algorandfoundation/algorand-typescript'
import { uint64 } from '@algorandfoundation/algorand-typescript'

const ZERO = Uint64(0)
const DEFAULT_APY_BPS = Uint64(500)
const MIN_BALANCE_MICRO = Uint64(500_000)
const BPS_DIVISOR = Uint64(10_000)
const ROUNDS_PER_YEAR = Uint64(6_312_000)

interface PositionData {
 deposited: uint64
 last_deposit_round: uint64
 last_claim_round: uint64
 active: boolean
}

export class CreditFlowYieldVault extends Contract {
 readonly admin = GlobalState<arc4.Address>({ key: 'admin' })
 readonly usdc_asset_id = GlobalState<uint64>({ key: 'usdc' })
 readonly total_deposits = GlobalState<uint64>({ key: 'tdep' })
 readonly total_yield_paid = GlobalState<uint64>({ key: 'tyld' })
 readonly min_balance = GlobalState<uint64>({ key: 'mbal' })
 readonly company_share_bps = GlobalState<uint64>({ key: 'csbp' })
 readonly employee_share_bps = GlobalState<uint64>({ key: 'esbp' })
 readonly apy_cap_bps = GlobalState<uint64>({ key: 'acap' })
 readonly paused = GlobalState<boolean>({ key: 'paus' })
 readonly positions = BoxMap<arc4.Address, PositionData>({ keyPrefix: 'pos_' })

 @abimethod({ readonly: true })
 create(
 admin: arc4.Address,
 usdcAssetId: uint64,
 minBalance: uint64,
 companyShareBps: uint64,
 employeeShareBps: uint64,
 apyCapBps: uint64
 ): void {
 assert(Txn.sender === admin.native, 'only_admin')
 this.admin.value = admin
 this.usdc_asset_id.value = usdcAssetId
 this.total_deposits.value = Uint64(0)
 this.total_yield_paid.value = Uint64(0)
 this.min_balance.value = minBalance
 this.company_share_bps.value = companyShareBps
 this.employee_share_bps.value = employeeShareBps
 this.apy_cap_bps.value = apyCapBps
 this.paused.value = false
 }

 @abimethod()
 deposit(companyAddr: arc4.Address, amount: uint64): void {
 assert(Txn.sender === this.admin.value.native, 'only_admin')
 assert(!this.paused.value, 'paused')
 assert(amount > Uint64(0), 'zero_amount')
 const existing = this.positions(companyAddr)
 const pos: PositionData = existing.exists ? existing.value : {
 deposited: Uint64(0),
 last_deposit_round: Txn.firstValid,
 last_claim_round: Txn.firstValid,
 active: true,
 }
 pos.deposited = pos.deposited + amount
 pos.last_deposit_round = Txn.firstValid
 pos.active = true
 this.positions(companyAddr).value = pos
 this.total_deposits.value = this.total_deposits.value + amount
 }

 @abimethod()
 claimYield(companyAddr: arc4.Address): uint64 {
 assert(!this.paused.value, 'paused')
 const pos = this.positions(companyAddr)
 assert(pos.exists, 'no_position')
 assert(pos.value.active, 'inactive_position')
 const available = this.calculateYield(companyAddr)
 if (available <= Uint64(0)) return Uint64(0)
 const updated = {
 deposited: pos.value.deposited,
 last_deposit_round: Txn.firstValid,
 last_claim_round: pos.value.last_claim_round,
 active: pos.value.active,
 }
 this.positions(companyAddr).value = updated
 this.total_yield_paid.value = this.total_yield_paid.value + available
 return available
 }

 @abimethod()
 withdraw(companyAddr: arc4.Address, amount: uint64): void {
 assert(Txn.sender === this.admin.value.native, 'only_admin')
 assert(!this.paused.value, 'paused')
 assert(amount > Uint64(0), 'zero_amount')
 const pos = this.positions(companyAddr)
 assert(pos.exists, 'no_position')
 assert(pos.value.active, 'inactive_position')
 const balance = pos.value.deposited
 assert(balance >= amount, 'insufficient_balance')
 const updated = {
 deposited: pos.value.deposited - amount,
 last_deposit_round: pos.value.last_deposit_round,
 last_claim_round: pos.value.last_claim_round,
 active: pos.value.active,
 }
 this.positions(companyAddr).value = updated
 this.total_deposits.value = this.total_deposits.value - amount
 }

 @abimethod()
 updateApy(newApyBps: uint64): void {
 assert(Txn.sender === this.admin.value.native, 'only_admin')
 assert(newApyBps <= this.apy_cap_bps.value, 'apy_too_high')
 }

 @abimethod()
 togglePause(): void {
 assert(Txn.sender === this.admin.value.native, 'only_admin')
 this.paused.value = !this.paused.value
 }

 @abimethod({ readonly: true })
 getAvailableYield(companyAddr: arc4.Address): uint64 {
 const pos = this.positions(companyAddr)
 if (!pos.exists) return Uint64(0)
 return this.calculateYield(companyAddr)
 }

 @abimethod({ readonly: true })
 getCompanyBalance(companyAddr: arc4.Address): uint64 {
 const pos = this.positions(companyAddr)
 if (!pos.exists) return Uint64(0)
 return pos.value.deposited
 }

 @abimethod({ readonly: true })
 getCompanyPosition(companyAddr: arc4.Address): PositionData {
 const pos = this.positions(companyAddr)
 if (!pos.exists) {
 return {
 deposited: Uint64(0),
 last_deposit_round: Txn.firstValid,
 last_claim_round: Txn.firstValid,
 active: false,
 }
 }
 return pos.value
 }

 private calculateYield(company: arc4.Address): uint64 {
 const pos = this.positions(company)
 if (!pos.exists) return Uint64(0)
 const p = pos.value
 const balance = p.deposited
 if (balance < this.min_balance.value) return Uint64(0)
 const roundsSinceClaim: uint64 = Txn.firstValid > p.last_deposit_round
 ? Uint64(Number(Txn.firstValid) - Number(p.last_deposit_round))
 : Uint64(0)
 if (roundsSinceClaim <= Uint64(0)) return Uint64(0)
 const grossBps = (balance * DEFAULT_APY_BPS * roundsSinceClaim) / (ROUNDS_PER_YEAR * BPS_DIVISOR)
 const employeeShare = (grossBps * this.employee_share_bps.value) / BPS_DIVISOR
 return employeeShare > Uint64(0) ? employeeShare : Uint64(0)
 }
}

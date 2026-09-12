import {
 Contract,
 GlobalState,
 BoxMap,
 arc4,
 abimethod,
 Txn,
 assert,
 clone,
} from '@algorandfoundation/algorand-typescript'

const DEFAULT_APY_BPS = new arc4.Uint64(500)
const BPS_DIVISOR = new arc4.Uint64(10_000)
const ROUNDS_PER_YEAR = new arc4.Uint64(6_312_000)
const ZERO_U64 = new arc4.Uint64(0)

interface PositionData {
 deposited: arc4.Uint64
 last_deposit_round: arc4.Uint64
 last_claim_round: arc4.Uint64
 active: arc4.Bool
}

function senderAddress(): arc4.Address {
 return new arc4.Address(Txn.sender)
}

export class CreditFlowYieldVault extends Contract {
 readonly admin = GlobalState<arc4.Address>({ key: 'admin' })
 readonly usdc_asset_id = GlobalState<arc4.Uint64>({ key: 'usdc' })
 readonly total_deposits = GlobalState<arc4.Uint64>({ key: 'tdep' })
 readonly total_yield_paid = GlobalState<arc4.Uint64>({ key: 'tyld' })
 readonly min_balance = GlobalState<arc4.Uint64>({ key: 'mbal' })
 readonly company_share_bps = GlobalState<arc4.Uint64>({ key: 'csbp' })
 readonly employee_share_bps = GlobalState<arc4.Uint64>({ key: 'esbp' })
 readonly apy_cap_bps = GlobalState<arc4.Uint64>({ key: 'acap' })
 readonly paused = GlobalState<arc4.Bool>({ key: 'paus' })
 readonly positions = BoxMap<arc4.Address, PositionData>({ keyPrefix: 'pos_' })

 @abimethod({ onCreate: 'require' })
 create(
 admin: arc4.Address,
 usdcAssetId: arc4.Uint64,
 minBalance: arc4.Uint64,
 companyShareBps: arc4.Uint64,
 employeeShareBps: arc4.Uint64,
 apyCapBps: arc4.Uint64
 ): void {
 assert(senderAddress() === admin, 'only_admin')
 this.admin.value = admin
 this.usdc_asset_id.value = usdcAssetId
 this.total_deposits.value = ZERO_U64
 this.total_yield_paid.value = ZERO_U64
 this.min_balance.value = minBalance
 this.company_share_bps.value = companyShareBps
 this.employee_share_bps.value = employeeShareBps
 this.apy_cap_bps.value = apyCapBps
 this.paused.value = new arc4.Bool(false)
 }

 @abimethod()
 deposit(companyAddr: arc4.Address, amount: arc4.Uint64): void {
 assert(senderAddress() === this.admin.value, 'only_admin')
 assert(this.paused.value === new arc4.Bool(false), 'paused')
 assert(amount.asUint64() > ZERO_U64.asUint64(), 'zero_amount')
 const existing = this.positions(companyAddr)
 let pos: PositionData
 if (existing.exists) {
 pos = { ...existing.value }
 } else {
 pos = {
 deposited: ZERO_U64,
 last_deposit_round: new arc4.Uint64(Txn.firstValid),
 last_claim_round: new arc4.Uint64(Txn.firstValid),
 active: new arc4.Bool(true),
 }
 }
 pos.deposited = new arc4.Uint64(
 pos.deposited.asUint64() + amount.asUint64()
 )
 pos.last_deposit_round = new arc4.Uint64(Txn.firstValid)
 pos.active = new arc4.Bool(true)
 this.positions(companyAddr).value = clone(pos)
 this.total_deposits.value = new arc4.Uint64(
 this.total_deposits.value.asUint64() + amount.asUint64()
 )
 }

 @abimethod()
 claimYield(companyAddr: arc4.Address): arc4.Uint64 {
 assert(this.paused.value === new arc4.Bool(false), 'paused')
 const pos = this.positions(companyAddr)
 assert(pos.exists, 'no_position')
 assert(pos.value.active === new arc4.Bool(true), 'inactive_position')
 const available = this.calculateYield(companyAddr)
 if (available.asUint64() <= ZERO_U64.asUint64()) return ZERO_U64
 const posCopy = { ...pos.value }
 posCopy.last_claim_round = new arc4.Uint64(Txn.firstValid)
 this.positions(companyAddr).value = clone(posCopy)
 this.total_yield_paid.value = new arc4.Uint64(
 this.total_yield_paid.value.asUint64() + available.asUint64()
 )
 return available
 }

 @abimethod()
 withdraw(companyAddr: arc4.Address, amount: arc4.Uint64): void {
 assert(senderAddress() === this.admin.value, 'only_admin')
 assert(this.paused.value === new arc4.Bool(false), 'paused')
 assert(amount.asUint64() > ZERO_U64.asUint64(), 'zero_amount')
 const pos = this.positions(companyAddr)
 assert(pos.exists, 'no_position')
 assert(pos.value.active === new arc4.Bool(true), 'inactive_position')
 assert(pos.value.deposited.asUint64() >= amount.asUint64(), 'insufficient_balance')
 const updated: PositionData = {
 deposited: new arc4.Uint64(
 pos.value.deposited.asUint64() - amount.asUint64()
 ),
 last_deposit_round: pos.value.last_deposit_round,
 last_claim_round: pos.value.last_claim_round,
 active: pos.value.active,
 }
 this.positions(companyAddr).value = clone(updated)
 this.total_deposits.value = new arc4.Uint64(
 this.total_deposits.value.asUint64() - amount.asUint64()
 )
 }

 @abimethod()
 updateApy(newApyBps: arc4.Uint64): void {
 assert(senderAddress() === this.admin.value, 'only_admin')
 assert(newApyBps.asUint64() <= this.apy_cap_bps.value.asUint64(), 'apy_too_high')
 }

 @abimethod()
 togglePause(): void {
 assert(senderAddress() === this.admin.value, 'only_admin')
 this.paused.value = new arc4.Bool(this.paused.value === new arc4.Bool(false))
 }

 @abimethod({ readonly: true })
 getAvailableYield(companyAddr: arc4.Address): arc4.Uint64 {
 const pos = this.positions(companyAddr)
 if (!pos.exists) return ZERO_U64
 return this.calculateYield(companyAddr)
 }

 @abimethod({ readonly: true })
 getCompanyBalance(companyAddr: arc4.Address): arc4.Uint64 {
 const pos = this.positions(companyAddr)
 if (!pos.exists) return ZERO_U64
 return pos.value.deposited
 }

 @abimethod({ readonly: true })
 getCompanyPosition(companyAddr: arc4.Address): PositionData {
 const pos = this.positions(companyAddr)
 if (!pos.exists) {
 return {
 deposited: ZERO_U64,
 last_deposit_round: new arc4.Uint64(Txn.firstValid),
 last_claim_round: new arc4.Uint64(Txn.firstValid),
 active: new arc4.Bool(false),
 }
 }
 return pos.value
 }

 private calculateYield(company: arc4.Address): arc4.Uint64 {
 const pos = this.positions(company)
 if (!pos.exists) return ZERO_U64
 const p = clone(pos.value)
 const balance = p.deposited.asUint64()
 if (balance < this.min_balance.value.asUint64()) return ZERO_U64
 const lastRound = p.last_deposit_round.asUint64()
 const roundsSince = new arc4.Uint64(Txn.firstValid - lastRound)
 if (roundsSince.asUint64() <= ZERO_U64.asUint64()) return ZERO_U64
 const grossBps = new arc4.Uint64(
 (balance * DEFAULT_APY_BPS.asUint64() * roundsSince.asUint64()) /
 (ROUNDS_PER_YEAR.asUint64() * BPS_DIVISOR.asUint64())
 )
 const employeeShare = new arc4.Uint64(
 (grossBps.asUint64() * this.employee_share_bps.value.asUint64()) /
 BPS_DIVISOR.asUint64()
 )
 if (employeeShare.asUint64() <= ZERO_U64.asUint64()) return ZERO_U64
 return employeeShare
 }
}

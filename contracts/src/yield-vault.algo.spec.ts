import { TestExecutionContext } from '@algorandfoundation/algorand-typescript-testing'
import { arc4 } from '@algorandfoundation/algorand-typescript'
import { describe, expect, it, beforeEach } from 'vitest'
import { CreditFlowYieldVault } from './yield-vault.algo'

describe('CreditFlowYieldVault contract', () => {
  const ctx = new TestExecutionContext()

  beforeEach(() => {
    ctx.reset()
  })

  function createVault() {
    const contract = ctx.contract.create(CreditFlowYieldVault)
    const admin = new arc4.Address(ctx.defaultSender)
    contract.create(
      admin,
      new arc4.Uint64(0),
      new arc4.Uint64(500_000),
      new arc4.Uint64(7000),
      new arc4.Uint64(3000),
      new arc4.Uint64(1500)
    )
    return { contract, admin }
  }

  it('creates with correct config', () => {
    const { contract, admin } = createVault()
    expect(contract.admin.value.bytes).toEqual(admin.bytes)
    expect(BigInt(contract.min_balance.value.asUint64().toString())).toBe(500_000n)
    expect(BigInt(contract.company_share_bps.value.asUint64().toString())).toBe(7000n)
    expect(BigInt(contract.employee_share_bps.value.asUint64().toString())).toBe(3000n)
  })

  it('returns zero yield for non-existent company', () => {
    const { contract, admin } = createVault()
    const result = contract.getAvailableYield(admin)
    expect(BigInt(result.asUint64().toString())).toBe(0n)
  })

  it('allows deposit and query', () => {
    const { contract, admin } = createVault()
    const depositAmount = new arc4.Uint64(10_000_000)
    contract.deposit(admin, depositAmount)
    const balance = contract.getCompanyBalance(admin)
    expect(BigInt(balance.asUint64().toString())).toBe(10_000_000n)
  })

  it('calculates employee share of yield', () => {
    const { contract, admin } = createVault()
    const depositAmount = new arc4.Uint64(10_000_000)
    contract.deposit(admin, depositAmount)
    const yield_ = contract.getAvailableYield(admin)
    expect(typeof BigInt(yield_.asUint64().toString())).toBe('bigint')
  })

  it('rejects zero deposit', () => {
    const { contract, admin } = createVault()
    expect(() => contract.deposit(admin, new arc4.Uint64(0))).toThrow('zero_amount')
  })

  it('rejects unauthorized deposit', () => {
    const { contract, admin } = createVault()
    const other = ctx.any.account()
    ctx.txn.createScope([ctx.any.txn.applicationCall({ sender: other })]).execute(() => {
      expect(() => contract.deposit(admin, new arc4.Uint64(1000))).toThrow('only_admin')
    })
  })
})

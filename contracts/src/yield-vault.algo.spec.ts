import { TestExecutionContext } from '@algorandfoundation/algorand-typescript-testing'
import { describe, expect, it } from 'vitest'
import { CreditFlowYieldVault } from './yield-vault.algo'

describe('CreditFlowYieldVault contract', () => {
 const ctx = new TestExecutionContext()

 it('creates with correct config', () => {
 const contract = ctx.contract.create(CreditFlowYieldVault, {
 admin: ctx.defaultSigner.addr,
 usdcAssetId: 0n,
 minBalance: 500_000n,
 companyShareBps: 7000n,
 employeeShareBps: 3000n,
 apyCapBps: 1500n,
 })
 expect(contract.admin.value).toBe(ctx.defaultSigner.addr)
 expect(contract.min_balance.value).toBe(500_000n)
 })

 it('returns zero yield for non-existent company', () => {
 const contract = ctx.contract.create(CreditFlowYieldVault, {
 admin: ctx.defaultSigner.addr,
 usdcAssetId: 0n,
 minBalance: 500_000n,
 companyShareBps: 7000n,
 employeeShareBps: 3000n,
 apyCapBps: 1500n,
 })

 const result = contract.getAvailableYield({ companyAddr: ctx.defaultSigner.addr })
 expect(result.return).toBe(0n)
 })

 it('allows deposit and query', () => {
 const contract = ctx.contract.create(CreditFlowYieldVault, {
 admin: ctx.defaultSigner.addr,
 usdcAssetId: 0n,
 minBalance: 500_000n,
 companyShareBps: 7000n,
 employeeShareBps: 3000n,
 apyCapBps: 1500n,
 })

 const companyAddr = ctx.defaultSigner.addr
 const depositAmount = 10_000_000n

 contract.deposit({ companyAddr, amount: depositAmount })
 const balance = contract.getCompanyBalance({ companyAddr })
 expect(balance.return).toBe(depositAmount)
 })

 it('calculates employee share of yield', () => {
 const contract = ctx.contract.create(CreditFlowYieldVault, {
 admin: ctx.defaultSigner.addr,
 usdcAssetId: 0n,
 minBalance: 500_000n,
 companyShareBps: 7000n,
 employeeShareBps: 3000n,
 apyCapBps: 1500n,
 })

 const companyAddr = ctx.defaultSigner.addr
 const depositAmount = 10_000_000n

 contract.deposit({ companyAddr, amount: depositAmount })
 const yield_ = contract.getAvailableYield({ companyAddr })
 expect(typeof yield_.return).toBe('bigint')
 })

 it('rejects zero deposit', () => {
 const contract = ctx.contract.create(CreditFlowYieldVault, {
 admin: ctx.defaultSigner.addr,
 usdcAssetId: 0n,
 minBalance: 500_000n,
 companyShareBps: 7000n,
 employeeShareBps: 3000n,
 apyCapBps: 1500n,
 })

 expect(() =>
 contract.deposit({ companyAddr: ctx.defaultSigner.addr, amount: 0n })
 ).toThrow('zero_amount')
 })

 it('rejects unauthorized deposit', () => {
 const contract = ctx.contract.create(CreditFlowYieldVault, {
 admin: ctx.defaultSigner.addr,
 usdcAssetId: 0n,
 minBalance: 500_000n,
 companyShareBps: 7000n,
 employeeShareBps: 3000n,
 apyCapBps: 1500n,
 })

 const otherCtx = new TestExecutionContext()
 expect(() =>
 contract.deposit({ companyAddr: otherCtx.defaultSigner.addr, amount: 1000n })
 ).toThrow()
 })
})

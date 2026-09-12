# CreditFlow (Chudgaye) — Master Technical Document

**Version:** 1.0
**Last Updated:** September 2026
**Stack:** React 19 + Vite 6 + TypeScript | Supabase (PostgreSQL + RLS + Auth) | Express.js | PuyaTs (Algorand TEAL, ARC-56) | x402 Payment Protocol | Tailwind CSS v4 + shadcn/ui | Zustand | React Router 7 | Vercel

---

## 1. Executive Summary

CreditFlow (internal codename "Chudgaye") is a corporate credit allocation platform deployed on the Algorand blockchain. It enables managers to allocate digital credits to employees, who can then claim those credits to pay for services using the x402 payment protocol. Unclaimed credits earn yield in an on-chain yield vault (`CreditFlowYieldVault`), with accrued yield split between the company and the employee.

The system consists of three major layers:

- **Smart Contract Layer** — a PuyaTs application (`CreditFlowYieldVault`) running on Algorand TestNet that manages deposits, yield accrual, distribution, and withdrawal for company-level positions.
- **Backend Layer** — an Express.js API server that enforces company-scoped access, mediates x402 payment flows, manages CRUD for all domain entities, and coordinates yield accounting.
- **Frontend Layer** — a React 19 single-page application providing a sidebar-driven dashboard with role-based access for company owners, managers, and employees.

---

## 2. Product Vision & Market Context

Traditional corporate credit card and expense management systems suffer from slow reconciliation, opaque allocation, and idle capital. CreditFlow addresses this by:

- **On-chain credit allocation** — managers allocate digital credits tied to Algorand addresses.
- **x402-native payments** — employees claim credits through a standards-based HTTP 402 → payment → settle flow using USDC on Algorand.
- **Yield on idle credits** — unclaimed credits are parked in a yield vault where they earn yield proportional to duration and principal, with a 70/30 company/employee split.

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ FRONTEND (React 19 / Vite 6) │
│ │
│ ┌──────────┐ ┌─────────────┐ ┌──────────────────┐ │
│ │ Landing │ │ Onboarding │ │ Protected Pages │ │
│ │ Page │ │ Wizard │ │ (Sidebar Shell) │ │
│ └────┬──────┘ └──────┬──────┘ └────────┬─────────┘ │
│ │ │ │ │
│ ┌────┴─────────────────┴───────────────────┴──────────┐ │
│ │ Zustand Stores │ │
│ │ authStore | allocationStore | paymentStore | │ │
│ │ yieldStore | companyStore │ │
│ └────────────┬─────────────────────────────────────────┘ │
│ │ │
│ ┌────────────┴─────────────────────────────────────────┐ │
│ │ Services / Utils │ │
│ │ supabase.ts │ x402.ts │ algorand.ts │ │
│ │ algorandPayment.ts │ algorandBalance.ts │ │
│ └────────────┬─────────────────────────────────────────┘ │
│ │ │
│ ┌────────────┴─────────────────────────────────────────┐ │
│ │ Wallet Integration (use-wallet-react) │ │
│ │ Lute | Pera | KMD | WalletConnect │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────────┘
 │ HTTPS/REST
 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BACKEND (Express.js / Node.js) │
│ │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Auth Middleware (Supabase JWT → req.user) │ │
│ └──────────────────────┬───────────────────────────┘ │
│ │ │
│ ┌──────────────────────┴───────────────────────────┐ │
│ │ Routes (company-scoped) │ │
│ │ /api/companies | /api/teams | /api/employees│ │
│ │ /api/allocations | /api/yield | /api/transactions│ │
│ │ /api/payments (x402 issuance + verification) │ │
│ └──────────────────────┬───────────────────────────┘ │
│ │ │
│ ┌──────────────────────┴───────────────────────────┐ │
│ │ supabaseAdmin (service role) │ │
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────────┘
 │
 ┌────────────┴──────────────┐
 ▼ ▼
┌──────────────────────┐ ┌───────────────────────────┐
│ SUPABASE │ │ ALGORAND TESTNET │
│ (PostgreSQL + RLS) │ │ │
│ │ │ ┌──────────────────────┐ │
│ companies │ │ │ CreditFlowYieldVault │ │
│ teams │ │ │ (PuyaTs, ARC-56) │ │
│ employees │ │ │ GlobalState: admin, │ │
│ allocations │ │ │ usdc_asset_id, total │ │
│ yield_accounts │ │ │ _deposits, min_bal.. │ │
│ transactions │ │ │ BoxMap positions │ │
│ payment_records │ │ │ deposit / accrue / │ │
│ profiles (Auth) │ │ │ distribute / reclaim │ │
│ │ │ └──────────────────────┘ │
│ RLS per table │ │ │
│ company-scoped │ │ USDC ASA: 10,458,941 │
└──────────────────────┘ │ Algod: testnet-api.4160 │
 │ Indexer: testnet-idx.4160 │
 └───────────────────────────┘
```

---

## 4. Data Model

All tables live in the `public` schema of a Supabase PostgreSQL database. UUIDs are generated with `uuid-ossp`.

### 4.1 `companies`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` |
| `name` | `text` | NOT NULL | — |
| `slug` | `text` | UNIQUE, NOT NULL | — |
| `owner_id` | `uuid` | FK → `auth.users(id)`, NOT NULL | — |
| `wallet_address` | `text` | nullable | — |
| `x402_config` | `jsonb` | NOT NULL | `'{}'::jsonb` |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### 4.2 `teams`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` |
| `company_id` | `uuid` | FK → `companies(id) ON DELETE CASCADE`, NOT NULL | — |
| `name` | `text` | NOT NULL | — |
| `manager_id` | `uuid` | FK → `auth.users(id)`, NOT NULL | — |
| `budget_pool` | `numeric` | NOT NULL | `0` |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### 4.3 `employees`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` |
| `company_id` | `uuid` | FK → `companies(id) ON DELETE CASCADE`, NOT NULL | — |
| `team_id` | `uuid` | FK → `teams(id) ON DELETE SET NULL` | null |
| `name` | `text` | NOT NULL | — |
| `email` | `text` | NOT NULL | — |
| `role` | `text` | NOT NULL | — |
| `wallet_address` | `text` | nullable | — |
| `status` | `text` | NOT NULL, CHECK in `('active','suspended','terminated')` | `'active'` |
| `joined_at` | `timestamptz` | NOT NULL | `now()` |
| `terminated_at` | `timestamptz` | nullable | — |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### 4.4 `allocations`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` |
| `company_id` | `uuid` | FK → `companies(id) ON DELETE CASCADE`, NOT NULL | — |
| `team_id` | `uuid` | FK → `teams(id) ON DELETE SET NULL`, NOT NULL | — |
| `employee_id` | `uuid` | FK → `employees(id) ON DELETE CASCADE`, NOT NULL | — |
| `period_start` | `date` | NOT NULL | — |
| `period_end` | `date` | NOT NULL | — |
| `total_credits` | `numeric` | NOT NULL | `0` |
| `claimed_credits` | `numeric` | NOT NULL | `0` |
| `unclaimed_credits` | `numeric` | NOT NULL | `0` |
| `yield_eligible_balance` | `numeric` | NOT NULL | `0` |
| `status` | `text` | NOT NULL, CHECK in `('active','suspended','terminated','expired')` | `'active'` |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### 4.5 `yield_accounts`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` |
| `allocation_id` | `uuid` | FK → `allocations(id) ON DELETE CASCADE`, NOT NULL | — |
| `company_id` | `uuid` | FK → `companies(id) ON DELETE CASCADE`, NOT NULL | — |
| `employee_id` | `uuid` | FK → `employees(id) ON DELETE SET NULL` | null |
| `principal` | `numeric` | NOT NULL | `0` |
| `yield_generated` | `numeric` | NOT NULL | `0` |
| `company_share` | `numeric` | NOT NULL | `0` |
| `employee_share` | `numeric` | NOT NULL | `0` |
| `strategy` | `text` | NOT NULL | `'algorand_tinyman'` |
| `apy_bps` | `numeric` | NOT NULL | `0` |
| `last_calculated_at` | `timestamptz` | NOT NULL | `now()` |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### 4.6 `transactions` (immutable ledger)

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` |
| `allocation_id` | `uuid` | FK → `allocations(id) ON DELETE SET NULL` | null |
| `company_id` | `uuid` | FK → `companies(id) ON DELETE CASCADE`, NOT NULL | — |
| `team_id` | `uuid` | FK → `teams(id) ON DELETE SET NULL` | null |
| `employee_id` | `uuid` | FK → `employees(id) ON DELETE SET NULL` | null |
| `type` | `text` | NOT NULL, CHECK in `('allocate','claim','yield_accrue','yield_distribute','reclaim','adjust','x402_payment')` | — |
| `amount` | `numeric` | NOT NULL | — |
| `from_entity` | `text` | NOT NULL | — |
| `to_entity` | `text` | NOT NULL | — |
| `tx_hash` | `text` | nullable | — |
| `metadata` | `jsonb` | NOT NULL | `'{}'::jsonb` |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### 4.7 `payment_records`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` |
| `allocation_id` | `uuid` | FK → `allocations(id) ON DELETE SET NULL` | null |
| `company_id` | `uuid` | FK → `companies(id) ON DELETE CASCADE`, NOT NULL | — |
| `employee_id` | `uuid` | FK → `employees(id) ON DELETE SET NULL` | null |
| `service_id` | `text` | NOT NULL | — |
| `service_name` | `text` | NOT NULL | — |
| `amount` | `numeric` | NOT NULL | — |
| `currency` | `text` | NOT NULL | `'USDC'` |
| `x402_tx_hash` | `text` | nullable | — |
| `status` | `text` | NOT NULL, CHECK in `('pending','confirmed','failed','cancelled')` | `'pending'` |
| `error_message` | `text` | nullable | — |
| `consumed_at` | `timestamptz` | nullable | — |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### 4.8 `profiles` (Supabase Auth extension)

Extends `auth.users` with `company_id`, `team_id`, `role`, `name`, and `email`. Linked via `id = auth.users.id`.

### 4.9 Indexes

```
idx_employees_company ON employees(company_id)
idx_employees_team ON employees(team_id)
idx_employees_email ON employees(email)
idx_allocations_company ON allocations(company_id)
idx_allocations_employee ON allocations(employee_id)
idx_allocations_status ON allocations(status)
idx_yield_accounts_alloc ON yield_accounts(allocation_id)
idx_yield_accounts_company ON yield_accounts(company_id)
idx_transactions_company ON transactions(company_id)
idx_transactions_allocation ON transactions(allocation_id)
idx_transactions_created ON transactions(created_at DESC)
idx_payment_records_alloc ON payment_records(allocation_id)
idx_payment_records_status ON payment_records(status)
```

---

## 5. Smart Contract — CreditFlowYieldVault

### 5.1 Overview

Written in **PuyaTs** (Algorand TypeScript), compiled to TEAL. Conforms to **ARC-56** (Application Binary Interface standard). The contract manages pooled yield-bearing positions for companies, where each position is keyed by the company's Algorand address.

**Network:** Algorand TestNet
**Asset:** USDC (ASA ID: 10,458,941 on TestNet)

### 5.2 Constants

| Constant | Value | Purpose |
|---|---|---|
| `DEFAULT_APY_BPS` | 500 | Default APY in basis points (5%) |
| `BPS_DIVISOR` | 10,000 | Divisor for basis-point arithmetic |
| `ROUNDS_PER_YEAR` | 6,312,000 | Approximate rounds per Algorand year (~2s/round) |
| `ZERO_U64` | 0 | Zero sentinel |

### 5.3 Global State

| Key | Name | Type | Purpose |
|---|---|---|---|
| `admin` | `admin` | `arc4.Address` | Contract admin / deployer |
| `usdc` | `usdc_asset_id` | `arc4.Uint64` | USDC ASA ID |
| `tdep` | `total_deposits` | `arc4.Uint64` | Aggregate deposited principal |
| `tyld` | `total_yield_paid` | `arc4.Uint64` | Cumulative yield paid out |
| `mbal` | `min_balance` | `arc4.Uint64` | Minimum principal to earn yield |
| `csbp` | `company_share_bps` | `arc4.Uint64` | Company share of yield (bps) |
| `esbp` | `employee_share_bps` | `arc4.Uint64` | Employee share of yield (bps) |
| `acap` | `apy_cap_bps` | `arc4.Uint64` | Maximum allowable APY |
| `paus` | `paused` | `arc4.Bool` | Emergency pause flag |

### 5.4 Box Storage — Positions

**BoxMap:** `positions: BoxMap<arc4.Address, PositionData>`
Key prefix: `pos_`

Each company address maps to:

```typescript
interface PositionData {
 deposited: arc4.Uint64 // Principal deposited (micro-USDC)
 last_deposit_round: arc4.Uint64 // Round of last deposit
 last_claim_round: arc4.Uint64 // Round of last yield claim
 active: arc4.Bool // Whether position is active
}
```

### 5.5 Methods

#### `create(admin, usdcAssetId, minBalance, companyShareBps, employeeShareBps, apyCapBps) → void`
**Type:** `@abimethod({ readonly: true })` (creation)
**Access:** Sender must be `admin`
**Purpose:** Initialize global state on deployment.

```typescript
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
```

#### `deposit(companyAddr, amount) → void`
**Access:** Admin only, not paused
**Purpose:** Deposit USDC into a company's yield position. Creates the BoxMap entry if it does not exist.

```typescript
assert(senderAddress() === this.admin.value, 'only_admin')
assert(this.paused.value === new arc4.Bool(false), 'paused')
assert(amount.asUint64() > ZERO_U64.asUint64(), 'zero_amount')
// ... updates position deposited, last_deposit_round, active
this.total_deposits.value += amount
```

#### `claimYield(companyAddr) → arc4.Uint64`
**Access:** Not paused (callable by anyone)
**Purpose:** Accrue and withdraw yield for a company position. Returns the yield amount. Updates `last_claim_round` and increments `total_yield_paid`.

```typescript
const available = this.calculateYield(companyAddr)
if (available.asUint64() <= ZERO_U64.asUint64()) return ZERO_U64
// update last_claim_round, total_yield_paid
return available
```

#### `withdraw(companyAddr, amount) → void`
**Access:** Admin only, not paused
**Purpose:** Withdraw principal from a company's position.

```typescript
assert(pos.value.deposited.asUint64() >= amount.asUint64(), 'insufficient_balance')
// deduct deposited, update total_deposits
```

#### `updateApy(newApyBps) → void`
**Access:** Admin only
**Purpose:** Update the APY (capped by `apy_cap_bps`).

#### `togglePause() → void`
**Access:** Admin only
**Purpose:** Toggle emergency pause. Blocks `deposit` and `claimYield` when paused.

#### `getAvailableYield(companyAddr) → arc4.Uint64` (read-only)
Returns computed yield for a company position without modifying state.

#### `getCompanyBalance(companyAddr) → arc4.Uint64` (read-only)
Returns deposited principal for a company position.

#### `getCompanyPosition(companyAddr) → PositionData` (read-only)
Returns full PositionData for a company address, or zero values if no position exists.

### 5.6 Yield Calculation

The private `calculateYield` method computes yield as:

```
gross = (balance * DEFAULT_APY_BPS * rounds_since_deposit) / (ROUNDS_PER_YEAR * BPS_DIVISOR)
employee_yield = (gross * employee_share_bps) / BPS_DIVISOR
```

Only the **employee share** is returned to the caller (company retains the rest on-chain). Minimum balance must be >= `min_balance` for yield to be positive.

### 5.7 ABI (ARC-56)

The contract exposes a full ARC-56 ABI. Methods: `create`, `deposit`, `claimYield`, `withdraw`, `updateApy`, `togglePause`, `getAvailableYield`, `getCompanyBalance`, `getCompanyPosition`.

---

## 6. x402 Payment Protocol

### 6.1 Overview

CreditFlow implements the **x402 HTTP payment protocol** (inspired by Coinbase's x402 specification). When an employee attempts to claim credits for a service, the backend either processes the claim directly (if internal to the platform) or issues a 402 Payment Required response, prompting the frontend to construct and sign an Algorand USDC transfer.

### 6.2 x402 Flow

```
Employee clicks "Claim Credits" for a service
 │
 ▼
Frontend → POST /api/payments (no payment_proof yet)
 │
 ▼
Backend validates: allocation active? sufficient unclaimed_credits?
 │
 ▼
Backend creates payment_records row (status: 'pending')
Backend returns HTTP 402 with x402 requirement body:
{
 error: "Payment Required",
 data: {
 payment_id, allocation_id, service_id, amount,
 currency: "USDC",
 x402_version: "1",
 nonce, expires_at (5 min),
 payment_methods: ["algorand_usdc"],
 asset_id: 10458941,
 network: "algorand:testnet"
 }
}
 │
 ▼
Frontend parses 402, builds USDC ASA transfer txn
Frontend signs via Lute/Pera wallet (use-wallet-react)
Frontend submits to Algorand, waits for confirmation
 │
 ▼
Frontend retries POST /api/payments with payment_proof:
{ tx_hash, sender_address }
 │
 ▼
Backend verifies on-chain via Indexer:
 - tx exists and confirmed
 - tx-type is 'axfer' (ASA transfer)
 - asset-id matches USDC
 - amount >= expected (micro-USDC)
 - sender matches employee wallet
 │
 ▼
Backend updates payment_records → status: 'confirmed'
Backend updates allocation (unclaimed_credits -= amount, claimed_credits += amount)
Backend creates immutable transaction record
 │
 ▼
Frontend receives 200 OK with confirmed payment data
```

### 6.3 Backend Endpoints

**`POST /api/payments`** — x402 issuance + settlement
- Body: `{ allocation_id, service_id, service_name, amount, payment_proof? }`
- If no `payment_proof`: returns 402 with x402 requirement
- If `payment_proof` provided: verifies on-chain, confirms or fails
- Idempotency: checks `x402_tx_hash` (nonce) against existing `payment_records`

**`POST /api/payments/verify`** — On-chain transaction verification
- Body: `{ tx_hash, payment_id }`
- Queries Algorand Indexer for the transaction
- Validates: confirmed round, axfer type, USDC asset ID, amount, sender
- Updates payment record to `confirmed` on success

**`POST /api/payments/:id/retry`** — Reset payment to pending
- Body: none (path param `:id`)
- Resets `status` to `pending`, clears `error_message`

**`GET /api/payments`** — List payment records
- Query params: `status?`, `employee_id?`
- Returns all payment records for the authenticated user's company, ordered by `created_at DESC`

### 6.4 Claim Flow (Internal)

**`POST /api/allocations/:id/claim`** — Atomic credit claim
- Body: `{ service_id, service_name, amount, nonce? }`
- Idempotency key: `${allocation_id}:${service_id}:${nonce}`
- Checks: allocation active, sufficient unclaimed_credits
- Atomically: updates allocation balances, creates transaction record, creates payment record
- Rollback on any failure

### 6.5 x402 Frontend Service

The `X402Service` class (`app/src/services/x402.ts`) implements:

- **`fetchWithPayment()`** — Core method: fetch → detect 402 → parse requirements → build USDC transfer → sign with wallet signer → submit → wait for confirmation → retry with `X-PAYMENT-SIGNATURE` header
- **`parse402Response()`** — Parses x402 requirements from JSON body, `X-PAYMENT-REQUIRED` header, or HTML `data-requirements` attribute
- **`submitPayment()`** — Builds an Algorand ASA transfer transaction, signs via the wallet's `signer` callback, submits to Algorand, waits for confirmation
- **`retryRequest()`** — Retries the original request with base64-encoded `X-PAYMENT-SIGNATURE` header containing the x402 V2 payment payload

### 6.6 Idempotency & Retry

- Every payment attempt generates a unique nonce: `${allocation_id}:${service_id}:${Date.now()}`
- The backend checks `payment_records.x402_tx_hash` against the nonce before creating a new record
- Duplicate nonces return the existing payment record immediately
- Failed payments can be retried via `POST /api/payments/:id/retry`, which resets status to `pending`

---

## 7. Frontend Architecture

### 7.1 Routing

| Path | Component | Access |
|---|---|---|
| `/` | `Landing` | Public |
| `/onboarding` | `Onboarding` | Public (redirects if already onboarded) |
| `/dashboard` | `Dashboard` | Any authenticated user |
| `/allocations` | `Allocations` | `company_owner`, `manager` |
| `/yield` | `Yield` | `company_owner`, `manager` |
| `/claims` | `Claims` | Any authenticated user |
| `/teams` | `Teams` | `company_owner`, `manager` |
| `/employees` | `Employees` | `company_owner`, `manager` |
| `/companies` | `Companies` | `super_admin` |
| `/x402-demo` | Redirect to `/claims` | — |

### 7.2 Layout

All protected pages are wrapped in `PageShell` which renders:
- Fixed left sidebar (`Sidebar`) on desktop (64–72px wide)
- Slide-in mobile drawer with spring animation
- Main content area with `max-w-7xl` container

### 7.3 Sidebar

The sidebar (`app/src/components/Sidebar.tsx`) provides:

- **CreditFlow brand** with custom SVG logo (hexagonal mark), "AVM" badge, Algorand TestNet indicator with pulse animation
- **Role Persona Switcher** — toggle between Employee and Executive (company_owner) personas with custom SVG icons
- **Wallet Hub** — connected address display (truncated), ALGO and USDC balance grid, USDC opt-in status indicator, gas dispenser link (< 0.1 ALGO), WalletButton
- **Navigation** — dynamic links based on role
- **User Profile Footer** — avatar, name, email, logout button

Balance refresh interval: every 25 seconds via `fetchAccountBalance`.

### 7.4 Pages

| Page | Purpose |
|---|---|
| `Landing` | Public marketing page with About, Services, Philosophy, Featured Video sections |
| `Onboarding` | 5-step wizard: Create Company → Create Team → Add Employees → Set Budget → Complete |
| `Dashboard` | Stats overview: credit pool, allocations, yield accrued, recent transactions |
| `Allocations` | Create/manage credit allocations for employees with period and amount |
| `Claims` | x402 payment flow: claim credits, payment history, USDC faucet |
| `Yield` | Yield vault dashboard: accrued yield, distribution, APY display |
| `X402Demo` | Standalone x402 payment demo with faucet (redirects to Claims) |
| `Teams` | CRUD management for teams within a company |
| `Employees` | CRUD management for employees, status tracking (active/suspended/terminated) |
| `Companies` | Super-admin company management |

### 7.5 Zustand Stores

**`authStore`** — persisted to localStorage
- `user: AuthUser | null` — id, email, name, role, company_id, team_id, employee_id
- `login()`, `loginWithGoogle()`, `logout()`, `signup()`, `updateProfile()`, `fetchUserProfile()`, `ensureUser()`, `switchRole()`

**`allocationStore`**
- `allocations: Allocation[]`, `loading`, `error`
- `fetchAllocations()`, `createAllocation()`, `updateAllocation()`, `deleteAllocation()`, `claimCredits()`, `getEmployeeBalance()`
- Enriches allocations with employee and team data via parallel Supabase queries

**`paymentStore`**
- `paymentRecords: PaymentRecord[]`, `loading`, `error`
- `fetchPaymentRecords()`, `createPaymentRecord()`, `updatePaymentStatus()`, `getTotalSpent()`

**`yieldStore`**
- `yieldAccounts: YieldAccount[]`, `loading`, `error`
- `fetchYieldAccounts()`, `calculateYield()`, `distributeYield()`, `getTotalYield()`
- Client-side yield calculation: simple interest with 70/30 company/employee split, 5% APY default, minimum 50 credits threshold

**`companyStore`**
- `companies: Company[]`, `teams: Team[]`, `employees: Employee[]`, `loading`, `error`
- `fetchCompanies()`, `fetchTeams()`, `fetchEmployees()`, `createTeam()`, `updateTeam()`, `deleteTeam()`, `createEmployee()`, `updateEmployee()`, `terminateEmployee()`

### 7.6 Services

**`supabase.ts`** — Supabase client instantiation using Vite env vars.

**`x402.ts`** — `X402Service` class (see Section 6.5).

**`circleFaucet.ts`** — Circle Developer-Controlled Wallet API integration for testnet USDC and ALGO faucets.

### 7.7 Utils

**`algorand.ts`** — Network config helpers, `AlgorandClient` factory, `getKmdConfigFromViteEnvironment()` for LocalNet.

**`algorandPayment.ts`** — USDC/ALGO conversion, transaction construction, `PaymentAuthorization` types, `serializeAuthorizationForSigning()` for x402 canonical byte form.

**`algorandBalance.ts`** — ALGO and USDC balance queries via Algorand Indexer, USDC opt-in detection.

**`x402.ts`** — Frontend x402 helpers: `parseX402Response()`, `validateCredits()`, `formatMicroUsd()`, `formatCurrency()`.

### 7.8 Wallet Integration

Uses `@txnlab/use-wallet-react` with:
- **Lute** and **Pera** wallets on TestNet
- **KMD** on LocalNet
- **WalletConnect** support available

Configuration in `App.tsx`:
```typescript
const walletManager = new WalletManager({
 wallets: [{ id: WalletId.PERA }, { id: WalletId.LUTE }],
 defaultNetwork: network,
 networks: { [network]: { algod: { baseServer, port, token } } }
})
```

### 7.9 Styling

- **Tailwind CSS v4** with custom design tokens
- **shadcn/ui** component library
- **Framer Motion** for animations
- **Lucide React** for icons (custom SVGs for brand, no emojis)
- **Design system:** obsidian background (#0a0a0a), emerald accent (#0ecb81), teal secondary (#2dbdb6), slate text (#707a8a)
- Dark mode enforced via `document.documentElement.classList.add('dark')`

---

## 8. Backend API

### 8.1 Server

Express.js application listening on `process.env.PORT || 3001`.

### 8.2 Middleware

- **CORS** — `cors({ origin: true, credentials: true })`
- **Morgan** — HTTP request logging (`dev` format)
- **Body Parser** — `express.json({ limit: '10mb' })`
- **Auth** — Supabase JWT verification via `supabaseAdmin.auth.getUser(token)`. Rejects requests without valid `Bearer` token.

### 8.3 Company Scope Enforcement

Every route handler resolves the company from `req.user.id` via `companies.owner_id`. All subsequent queries are scoped to that company ID. No cross-company data leakage.

### 8.4 Endpoints

#### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Health check |

#### Companies

Full CRUD on companies scoped to authenticated user.

| Method | Path | Description |
|---|---|---|
| GET | `/api/companies` | List companies |
| GET | `/api/companies/:id` | Get company |
| POST | `/api/companies` | Create company |
| PATCH | `/api/companies/:id` | Update company |
| DELETE | `/api/companies/:id` | Delete company |

#### Teams

| Method | Path | Description |
|---|---|---|
| GET | `/api/teams` | List teams for company |
| GET | `/api/teams/:id` | Get team |
| POST | `/api/teams` | Create team |
| PATCH | `/api/teams/:id` | Update team |
| DELETE | `/api/teams/:id` | Delete team |

#### Employees

| Method | Path | Description |
|---|---|---|
| GET | `/api/employees` | List employees for company |
| GET | `/api/employees/:id` | Get employee |
| POST | `/api/employees` | Create employee |
| PATCH | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Terminate employee |

#### Allocations

| Method | Path | Description |
|---|---|---|
| GET | `/api/allocations` | List allocations (filters: `employee_id?`, `team_id?`, `status?`) |
| POST | `/api/allocations` | Create allocation + transaction record (body: `team_id?`, `employee_id`, `total_credits`, `period_start?`, `period_end?`) |
| POST | `/api/allocations/:id/claim` | Claim credits atomically (body: `service_id`, `service_name?`, `amount`, `nonce?`) |
| PATCH | `/api/allocations/:id` | Update allocation status |
| DELETE | `/api/allocations/:id` | Terminate allocation (returns unclaimed credits via reclaim transaction) |

#### Transactions

| Method | Path | Description |
|---|---|---|
| GET | `/api/transactions` | List transactions for company |

#### Yield

| Method | Path | Description |
|---|---|---|
| GET | `/api/yield` | List yield accounts for company (includes allocation data) |
| GET | `/api/yield/:id` | Get specific yield account |
| POST | `/api/yield/calculate` | Calculate yield for an allocation (70/30 split, 5% APY) |
| POST | `/api/yield/distribute` | Distribute accrued yield (employee share added to allocation balance) |

#### Payments (x402)

| Method | Path | Description |
|---|---|---|
| POST | `/api/payments` | x402 issuance (402) or settlement (with proof) |
| POST | `/api/payments/verify` | Verify Algorand transaction on-chain |
| POST | `/api/payments/:id/retry` | Reset payment to pending for retry |
| GET | `/api/payments` | List payment records (filters: `status?`, `employee_id?`) |

---

## 9. Security Model

### 9.1 Row Level Security (RLS)

Every table has RLS enabled with policies that scope access by `company_id` derived from the authenticated user's ownership:

- **companies** — users can only CRUD companies they own
- **teams** — visible to employees of the same company; manageable by managers
- **employees** — visible to company owner; manageable by company owner
- **allocations** — visible/creatable/updatable by company owner
- **yield_accounts** — visible/updatable by company owner
- **transactions** — visible/creatable by company owner (system inserts)
- **payment_records** — visible/creatable/updatable by company owner (system inserts)

### 9.2 x402 Integrity

- **Idempotency:** Every payment attempt is keyed by a unique nonce. Duplicate nonces return the existing record.
- **On-chain verification:** The backend verifies every payment proof against the Algorand Indexer, checking transaction existence, confirmation, type (axfer), asset ID (USDC), amount, and sender address.
- **Expiry:** x402 requirements expire after 5 minutes.
- **Authorization validation:** Frontend validates time windows (`validAfter`, `validBefore`) before signing.

### 9.3 Yield Vault Security

- **Admin-only operations:** `deposit` and `withdraw` require the admin address.
- **Pause mechanism:** `togglePause()` allows the admin to halt deposits and claims.
- **APY cap:** `updateApy()` enforces a maximum APY (`apy_cap_bps`).
- **Minimum balance:** Yield is only calculated when `balance >= min_balance`.
- **No reentrancy:** PuyaTs/ARC-56 model provides atomic execution within a single application call.

### 9.4 Authentication

- Supabase Auth (email/password + Google OAuth)
- JWT tokens verified on every backend request
- Role-based access control: `super_admin`, `company_owner`, `manager`, `employee`
- Frontend role switching for demo/testing purposes

---

## 10. Environment Configuration

### 10.1 Frontend (`app/.env.local`)

```env
# Algorand Algod
VITE_ALGOD_TOKEN=
VITE_ALGOD_SERVER=https://testnet-api.4160.nodely.dev
VITE_ALGOD_PORT=443
VITE_ALGOD_NETWORK=testnet

# Algorand Indexer
VITE_INDEXER_TOKEN=
VITE_INDEXER_SERVER=https://testnet-idx.4160.nodely.dev
VITE_INDEXER_PORT=443

# Deployed App ID (set after `npm run deploy:testnet`)
VITE_APP_ID=

# Circle Developer-Controlled Wallet API (for testnet USDC faucet)
VITE_CIRCLE_API_KEY=
```

### 10.2 Backend (`server/.env`)

```env
PORT=3001
SUPABASE_URL=<supabase-project-url>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
ALGORAND_INDEXER_TOKEN=<indexer-api-token>
ALGORAND_INDEXER_SERVER=https://testnet-idx.4160.nodely.dev
ALGORAND_INDEXER_PORT=443
```

---

## 11. Deployment Guide

### 11.1 Supabase

1. Create a new Supabase project
2. Run the migration in `supabase/migrations/20250925000000_initial_schema.sql`
3. Enable email authentication and optionally Google OAuth in Supabase Auth settings
4. Create a `profiles` table extension or use the existing `profiles` table
5. Note the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for backend config

### 11.2 Smart Contract Deployment

```bash
npm run build # Compiles PuyaTs → TEAL, generates ARC-56 ABI
npm run deploy:testnet # Deploys to Algorand TestNet, outputs APP_ID
```

After deployment, set `VITE_APP_ID` in the frontend `.env.local`.

### 11.3 Backend

```bash
cd server
npm install
npm run dev # Development (nodemon)
npm start # Production
```

Deploy to any Node.js host (Render, Railway, Fly.io). Ensure environment variables are set.

### 11.4 Frontend

```bash
cd app
npm install
npm run dev # Development (Vite dev server)
npm run build # Production build → dist/
npm run preview # Preview production build
```

Deploy `dist/` to Vercel. Set all `VITE_*` environment variables in Vercel project settings.

### 11.5 Algorand TestNet Setup

- USDC ASA on TestNet: Asset ID **10,458,941**
- Fund test accounts via: https://lora.algokit.io/testnet/fund
- Pera Wallet and Lute Wallet are configured for TestNet by default
- Circle Developer-Controlled Wallet required for the USDC faucet feature

---

## 12. Testing Strategy

### 12.1 Smart Contract

```bash
npm test
```

Tests run against VibeKit LocalNet (Docker-based local Algorand network). The test suite validates:
- Contract deployment (`create`)
- Deposit and balance tracking
- Yield calculation accuracy
- Claim and withdrawal mechanics
- Admin operations (APY update, pause toggle)
- Edge cases (zero amounts, insufficient balance, inactive positions)

### 12.2 Backend

Manual endpoint testing via:
- `curl` or Postman against the Express server
- JWT token from Supabase Auth in `Authorization: Bearer <token>` header
- x402 flow tested end-to-end with test wallets

### 12.3 Frontend

- Component-level testing with Vitest (if configured)
- E2E flow: onboarding → allocation creation → claim → yield dashboard
- Wallet integration testing with Lute/Pera on TestNet

---

## 13. Known Issues & Roadmap

### 13.1 Known Issues

- **Schema drift:** The `allocations` table uses both `total_credits`/`unclaimed_credits` (migration) and `amount` (frontend store insert payload). The backend API correctly uses `total_credits`, but the frontend store's `createAllocation` maps to `amount` as a fallback.
- **Foreign key mismatch:** The `allocations` table schema references `employees(id)` as a foreign key, but Supabase Auth `auth.users` UUIDs are used as employee IDs in some contexts, which can cause `23503` foreign key violations. The frontend handles this with a fallback retry.
- **Yield contract divergence:** The on-chain yield contract (`CreditFlowYieldVault`) and the off-chain PostgreSQL yield calculation use different formulas and parameters. The on-chain contract uses a round-based formula with configurable BPS splits, while the backend uses a simple daily interest formula with a hardcoded 70/30 split.
- **Missing proof field:** The `payment_records` table migration defines a `proof (jsonb)` column, but the actual schema in the migration file does not include it — the column is missing from the CREATE TABLE statement.

### 13.2 Roadmap

| Priority | Item | Description |
|---|---|---|
| High | Yield contract integration | Connect off-chain yield accounting to on-chain `CreditFlowYieldVault` contract calls |
| High | x402 facilitator | Deploy a proper x402 facilitator service for payment verification |
| Medium | Multi-asset support | Support ALGO payments in addition to USDC |
| Medium | Allocation expiration | Automated expiration of allocations past `period_end` |
| Medium | CSV import | Bulk employee and allocation import via CSV |
| Low | Mobile app | React Native companion app |
| Low | Advanced yield strategies | Multiple DeFi strategies (Tinyman pools, etc.) |

---

## 14. Glossary

| Term | Definition |
|---|---|
| **AVM** | Algorand Virtual Machine |
| **ARC-56** | Algorand Standard for Application Binary Interface (JSON schema for contract methods) |
| **ASA** | Algorand Standard Asset — the token standard on Algorand (USDC is an ASA) |
| **BoxMap** | A PuyaTs data structure mapping keys to values, stored in an application's box storage |
| **BPS** | Basis Points — 1/100th of a percent (100 BPS = 1%) |
| **CreditFlowYieldVault** | The Algorand smart contract managing yield-bearing deposits |
| **Idempotency** | The property that multiple identical requests produce the same result |
| **micro-USDC** | The smallest unit of USDC (1 USDC = 1,000,000 micro-USDC, reflecting 6 decimals) |
| **PuyaTs** | Algorand TypeScript SDK — a constrained TypeScript dialect for writing Algorand smart contracts |
| **RLS** | Row Level Security — PostgreSQL feature enforcing per-row access policies |
| **TEAL** | Transaction Execution Approval Language — Algorand's low-level assembly language |
| **x402** | HTTP 402 Payment Required protocol for machine-readable payments |
| **Yield Account** | A PostgreSQL record tracking principal, accrued yield, and share splits for an allocation |
| **Zustand** | Lightweight React state management library |
| **VibeKit** | Development tooling for Algorand smart contracts |

---

*Generated from live codebase analysis. Last commit: `4d2d8ca`*

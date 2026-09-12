# Credow — Master Technical Document

**Version:** 1.1  
**Last Updated:** September 2026  
**Stack:** React 19 + Vite 6 + TypeScript | Supabase (PostgreSQL + RLS + Auth) | Express.js | PuyaTs (Algorand TEAL, ARC-56) | @algorandfoundation/algokit-subscriber | x402 Payment Protocol | Tailwind CSS v4 | Zustand | React Router 7 | Vercel  

---

## 1. Executive Summary

**Credow** (internal repository codename *"Chudgaye"*, smart contract class `CreditFlowYieldVault`) is an enterprise corporate credit allocation platform deployed on the Algorand blockchain. It enables managers to allocate digital credits (denominated in native Circle USDC) to employees, who can then claim those credits to pay for services in real time using the machine-readable **x402 payment protocol**. Unclaimed credits do not sit idle; they automatically stream into an on-chain smart contract vault (`CreditFlowYieldVault`), with accrued yield split between the company treasury (70%) and the employee (30%).

The system consists of four major layers:

- **Smart Contract Layer** — a PuyaTs application (`CreditFlowYieldVault`) running on Algorand TestNet that manages deposits, yield accrual, distribution, and withdrawal for company-level positions using Box storage.
- **Subscriber Layer** — a background event watcher (`subscriber/`) using `@algorandfoundation/algokit-subscriber` that monitors on-chain contract lifecycle events via Indexer/Algod and updates the off-chain ledger.
- **Backend Layer** — an Express.js API server (`server/`) that enforces company-scoped access, mediates x402 payment flows, manages CRUD for all domain entities, and coordinates yield accounting.
- **Frontend Layer** — a React 19 single-page application (`app/`) providing a sidebar-driven dashboard with role-based access for company owners, managers, and employees, styled with curated human pastel tones and liquid glassmorphic surfaces.

---

## 2. Product Vision & Market Context

Traditional corporate credit card and expense management systems suffer from slow reconciliation, opaque allocation, and idle capital. Credow addresses this by:

- **On-chain credit allocation** — managers allocate digital credits tied to Algorand addresses with instant 2.8-second finality and sub-penny fees (< $0.001).
- **x402-native payments** — employees claim credits through a standards-based HTTP 402 → payment → settle flow using native Circle USDC (ASA ID: 10,458,941 on TestNet).
- **Yield on idle credits** — unclaimed credits flow into the smart contract vault where they compound, with a programmable 70/30 company/employee split providing mutual incentive alignment.

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (React 19 / Vite 6)                                            │
│                                                                         │
│ ┌──────────┐ ┌─────────────┐ ┌────────────────────────────────────────┐ │
│ │ Landing  │ │ Onboarding  │ │ Protected Pages (Sidebar Shell)        │ │
│ │ (Hero)   │ │(Liquid-Glass│ │ Dashboard (Pastels) | Allocations |    │ │
│ │          │ │  Wizard)    │ │ Claims (x402) | Yield | Teams | Emp... │ │
│ └────┬─────┘ └──────┬──────┘ └───────────────────┬────────────────────┘ │
│      │              │                            │                      │
│ ┌────┴──────────────┴────────────────────────────┴────────────────────┐ │
│ │ Zustand Stores                                                      │ │
│ │ authStore | allocationStore | paymentStore | yieldStore | company   │ │
│ └───────────────────────────┬─────────────────────────────────────────┘ │
│                             │                                           │
│ ┌───────────────────────────┴─────────────────────────────────────────┐ │
│ │ Services / Utils                                                    │ │
│ │ supabase.ts | x402.ts | circleFaucet.ts | algorandPayment.ts        │ │
│ │ algorandBalance.ts | algorand.ts                                    │ │
│ └───────────────────────────┬─────────────────────────────────────────┘ │
│                             │                                           │
│ ┌───────────────────────────┴─────────────────────────────────────────┐ │
│ │ Wallet Integration (use-wallet-react)                               │ │
│ │ Lute | Pera | KMD (LocalNet) | WalletConnect                        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │ HTTPS / REST
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ BACKEND (Express.js / Node.js)                                          │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Auth Middleware (Supabase JWT → req.user)                           │ │
│ └───────────────────────────┬─────────────────────────────────────────┘ │
│                             │                                           │
│ ┌───────────────────────────┴─────────────────────────────────────────┐ │
│ │ Routes (Company-Scoped)                                             │ │
│ │ /api/companies | /api/teams | /api/employees (incl. /bulk)          │ │
│ │ /api/allocations | /api/yield | /api/transactions (incl. /summary)  │ │
│ │ /api/payments (x402 issuance, verification & retry)                 │ │
│ └───────────────────────────┬─────────────────────────────────────────┘ │
│                             │                                           │
│ ┌───────────────────────────┴─────────────────────────────────────────┐ │
│ │ supabaseAdmin (Service Role Client)                                 │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└──────────────┬─────────────────────────────────────────────┬────────────┘
               │                                             │
               ▼                                             ▼
┌───────────────────────────────┐             ┌───────────────────────────┐
│ SUPABASE                      │             │ ALGORAND TESTNET          │
│ (PostgreSQL + RLS)            │             │                           │
│                               │             │ ┌───────────────────────┐ │
│ companies                     │             │ │ CreditFlowYieldVault  │ │
│ teams                         │             │ │ (PuyaTs, ARC-56)      │ │
│ employees                     │   Syncs     │ │ GlobalState: admin,   │ │
│ allocations                   │◄────────────│ │ usdc, tdep, tyld,     │ │
│ yield_accounts                │   Events    │ │ mbal, csbp, esbp...   │ │
│ transactions                  │             │ │ BoxMap positions      │ │
│ payment_records               │             │ └───────────────────────┘ │
│ (profiles - Auth extension)   │             │                           │
│                               │             │ USDC ASA: 10,458,941      │
│ RLS per table                 │             │ Algod: testnet-api.4160   │
│ company-scoped                │             │ Indexer: testnet-idx.4160 │
└───────────────────────────────┘             └─────────────┬─────────────┘
                                                            │
                                                            ▼
                                              ┌───────────────────────────┐
                                              │ SUBSCRIBER (Background)   │
                                              │ algokit-subscriber        │
                                              │ Monitors app call events  │
                                              │ Catches up via Indexer    │
                                              │ Follows along with Algod  │
                                              └───────────────────────────┘
```

---

## 4. Data Model

All tables live in the `public` schema of Supabase PostgreSQL. UUIDs are generated with `uuid-ossp`.

### 4.1 `companies`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` |
| `name` | `text` | NOT NULL | — |
| `slug` | `text` | UNIQUE, NOT NULL | — |
| `owner_id` | `uuid` | FK → `auth.users(id)`, NOT NULL | — |
| `wallet_address` | `text` | nullable | — |
| `x402_config` | `jsonb` | nullable | `'{}'::jsonb` |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### 4.2 `teams`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` |
| `company_id` | `uuid` | FK → `companies(id) ON DELETE CASCADE`, NOT NULL | — |
| `name` | `text` | NOT NULL | — |
| `manager_id` | `uuid` | FK → `auth.users(id)`, NOT NULL | — |
| `budget_pool` | `numeric` | nullable | `0` |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### 4.3 `employees`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` |
| `company_id` | `uuid` | FK → `companies(id) ON DELETE CASCADE`, NOT NULL | — |
| `team_id` | `uuid` | FK → `teams(id) ON DELETE SET NULL`, nullable | `null` |
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
| `employee_id` | `uuid` | FK → `employees(id) ON DELETE SET NULL`, nullable | `null` |
| `principal` | `numeric` | NOT NULL | `0` |
| `yield_generated` | `numeric` | NOT NULL | `0` |
| `company_share` | `numeric` | NOT NULL | `0` |
| `employee_share` | `numeric` | NOT NULL | `0` |
| `strategy` | `text` | nullable | `'algorand_tinyman'` |
| `apy` | `numeric` | NOT NULL | `0.05` (5% APY default) |
| `last_calculated_at` | `timestamptz` | NOT NULL | `now()` |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### 4.6 `transactions` (Immutable Ledger)

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` |
| `allocation_id` | `uuid` | FK → `allocations(id) ON DELETE SET NULL`, nullable | `null` |
| `company_id` | `uuid` | FK → `companies(id) ON DELETE CASCADE`, NOT NULL | — |
| `team_id` | `uuid` | FK → `teams(id) ON DELETE SET NULL`, nullable | `null` |
| `employee_id` | `uuid` | FK → `employees(id) ON DELETE SET NULL`, nullable | `null` |
| `type` | `text` | NOT NULL, CHECK in `('allocate','claim','yield_accrue','yield_distribute','reclaim','adjust','x402_payment')` | — |
| `amount` | `numeric` | NOT NULL | — |
| `from_entity` | `text` | NOT NULL | — |
| `to_entity` | `text` | NOT NULL | — |
| `tx_hash` | `text` | nullable | — |
| `metadata` | `jsonb` | nullable | `'{}'::jsonb` |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### 4.7 `payment_records`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` |
| `allocation_id` | `uuid` | FK → `allocations(id) ON DELETE SET NULL`, nullable | `null` |
| `company_id` | `uuid` | FK → `companies(id) ON DELETE CASCADE`, NOT NULL | — |
| `employee_id` | `uuid` | FK → `employees(id) ON DELETE SET NULL`, nullable | `null` |
| `service_id` | `text` | NOT NULL | — |
| `service_name` | `text` | NOT NULL | — |
| `amount` | `numeric` | NOT NULL | — |
| `currency` | `text` | NOT NULL | `'USDC'` |
| `x402_tx_hash` | `text` | nullable | — |
| `status` | `text` | NOT NULL, CHECK in `('pending','confirmed','failed','cancelled')` | `'pending'` |
| `error_message` | `text` | nullable | — |
| `consumed_at` | `timestamptz` | nullable | — |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### 4.8 `profiles` (Supabase Auth Extension)

Extends `auth.users` with `company_id`, `team_id`, `role`, `name`, and `email`.  
*(Note: Queried by frontend `authStore` and `Onboarding.tsx`; missing from `20250925000000_initial_schema.sql` — see Section 11)*.

### 4.9 Indexes

```sql
idx_employees_company ON employees(company_id)
idx_employees_team ON employees(team_id)
idx_employees_email ON employees(email)
idx_allocations_company ON allocations(company_id)
idx_allocations_employee ON allocations(employee_id)
idx_allocations_status ON allocations(status)
idx_yield_accounts_allocation ON yield_accounts(allocation_id)
idx_yield_accounts_company ON yield_accounts(company_id)
idx_transactions_company ON transactions(company_id)
idx_transactions_allocation ON transactions(allocation_id)
idx_transactions_created ON transactions(created_at DESC)
idx_payment_records_allocation ON payment_records(allocation_id)
idx_payment_records_status ON payment_records(status)
```

---

## 5. Smart Contract — CreditFlowYieldVault

### 5.1 Overview

Written in **PuyaTs** (Algorand TypeScript), compiled to TEAL, and verified against ARC-56 (Application Binary Interface standard). The contract manages pooled yield-bearing positions for companies, with each position stored in box storage keyed by the company's Algorand address.

- **Network:** Algorand TestNet
- **Asset:** Native Circle USDC (ASA ID: `10458941` on TestNet)
- **Source File:** `contracts/src/yield-vault.algo.ts`
- **Artifacts:** `contracts/artifacts/CreditFlowYieldVault.arc56.json`, `YieldVaultClient.ts`

### 5.2 Constants

| Constant | Value | Purpose |
|---|---|---|
| `DEFAULT_APY_BPS` | 500 | Default APY in basis points (5.00%) |
| `BPS_DIVISOR` | 10,000 | Divisor for basis-point arithmetic |
| `ROUNDS_PER_YEAR` | 6,312,000 | Approximate rounds per year (~2s/round on Algorand) |
| `ZERO_U64` | 0 | Zero sentinel |

### 5.3 Global State

| Key | Name | Type | Purpose |
|---|---|---|---|
| `admin` | `admin` | `arc4.Address` | Contract admin / deployer |
| `usdc` | `usdc_asset_id` | `arc4.Uint64` | USDC ASA ID (`10458941`) |
| `tdep` | `total_deposits` | `arc4.Uint64` | Aggregate deposited principal |
| `tyld` | `total_yield_paid` | `arc4.Uint64` | Cumulative yield paid out |
| `mbal` | `min_balance` | `arc4.Uint64` | Minimum principal to earn yield (default 500k microUSDC = $0.50) |
| `csbp` | `company_share_bps` | `arc4.Uint64` | Company share of yield (7000 = 70%) |
| `esbp` | `employee_share_bps` | `arc4.Uint64` | Employee share of yield (3000 = 30%) |
| `acap` | `apy_cap_bps` | `arc4.Uint64` | Maximum allowable APY (1500 = 15%) |
| `paus` | `paused` | `arc4.Bool` | Emergency pause flag |

### 5.4 Box Storage — Positions

`positions: BoxMap<arc4.Address, PositionData>({ keyPrefix: 'pos_' })`

```typescript
interface PositionData {
  deposited: arc4.Uint64        // Principal deposited (micro-USDC)
  last_deposit_round: arc4.Uint64 // Round of last deposit
  last_claim_round: arc4.Uint64   // Round of last yield claim
  active: arc4.Bool             // Whether position is active
}
```

### 5.5 ABI Methods (ARC-56)

#### `create(admin, usdcAssetId, minBalance, companyShareBps, employeeShareBps, apyCapBps) → void`
- **Decorator:** `@abimethod({ onCreate: 'require' })`
- **Access:** Sender must be `admin`
- **Purpose:** Initializes global state on application creation.

#### `deposit(companyAddr, amount) → void`
- **Access:** Admin only, not paused
- **Purpose:** Deposits USDC into a company's position. Creates the Box entry if new. Updates `total_deposits`.

#### `claimYield(companyAddr) → arc4.Uint64`
- **Access:** Not paused (callable by authorized parties)
- **Purpose:** Calculates accrued yield, updates `last_claim_round`, increments `total_yield_paid`, and returns available yield.

#### `withdraw(companyAddr, amount) → void`
- **Access:** Admin only, not paused
- **Purpose:** Withdraws principal from a company's position, deducting `total_deposits`.

#### `updateApy(newApyBps) → void`
- **Access:** Admin only
- **Purpose:** Asserts `newApyBps <= apy_cap_bps`.

#### `togglePause() → void`
- **Access:** Admin only
- **Purpose:** Toggles `paused` boolean flag.

#### `getAvailableYield(companyAddr) → arc4.Uint64` (readonly)
Returns computed employee share of yield for a company position without state mutation.

#### `getCompanyBalance(companyAddr) → arc4.Uint64` (readonly)
Returns deposited principal for a company position.

#### `getCompanyPosition(companyAddr) → PositionData` (readonly)
Returns full `PositionData` struct for a company address.

---

## 6. x402 Payment Protocol

### 6.1 Overview

Credow standardizes the **HTTP 402 Payment Required** protocol for corporate credit claims on Algorand.

```
Employee clicks "Claim Credits" for a service
 │
 ▼
Frontend → POST /api/payments (no payment_proof)
 │
 ▼
Backend validates allocation & unclaimed balance
Backend creates payment_records row (status: 'pending')
Backend returns HTTP 402 with requirement:
{
  error: "Payment Required",
  data: {
    payment_id, allocation_id, service_id, amount,
    currency: "USDC", x402_version: "1",
    nonce, expires_at (5 min),
    payment_methods: ["algorand_usdc"],
    asset_id: 10458941, network: "algorand:testnet"
  }
}
 │
 ▼
Frontend builds USDC ASA transfer transaction
Frontend signs via Lute / Pera wallet (use-wallet-react)
Frontend submits to Algorand TestNet → receives tx hash
 │
 ▼
Frontend retries POST /api/payments with payment_proof:
{ tx_hash, sender_address }
 │
 ▼
Backend queries Algorand Indexer:
 - tx confirmed in recent round
 - tx-type is 'axfer' (ASA transfer)
 - asset-id matches 10458941 (USDC)
 - amount matches expected micro-USDC
 - sender matches employee wallet address
 │
 ▼
Backend updates payment_records → status: 'confirmed'
Backend updates allocation (unclaimed -= amount, claimed += amount)
Backend logs immutable transaction record
Frontend receives 200 OK
```

### 6.2 Frontend Service (`app/src/services/x402.ts`)
- `fetchWithPayment()`: Intercepts 402, parses requirement, builds ASA transfer, prompts wallet signature, retries request.
- `parse402Response()`: Extracts structured requirements from response body/headers.
- `submitPayment()`: Signs and broadcasts transaction.

---

## 7. Frontend Architecture

### 7.1 Routing (`app/src/App.tsx`)

| Path | Component | Access | Purpose |
|---|---|---|---|
| `/` | `Landing` | Public | Credow hero page, value props, video showcase |
| `/onboarding` | `Onboarding` | Public | 5-step wizard (liquid glassmorphic UI + video background) |
| `/dashboard` | `Dashboard` | Authenticated | Stats overview, pastel tone cards, quick actions |
| `/allocations` | `Allocations` | `company_owner`, `manager` | Create and manage credit allocations |
| `/yield` | `Yield` | `company_owner`, `manager` | Yield vault metrics, APY display, distribution |
| `/claims` | `Claims` | Authenticated | x402 claim checkout, payment history, USDC faucet |
| `/teams` | `Teams` | `company_owner`, `manager` | Team budget pools & management |
| `/employees` | `Employees` | `company_owner`, `manager` | Employee directory & status management |
| `/companies` | `Companies` | `super_admin` | Super-admin company management |
| `/x402-demo` | Redirect to `/claims` | — | Standalone demo route (aliased to Claims) |

### 7.2 Sidebar & Layout (`app/src/components/Sidebar.tsx`)
- **Brand:** `Credow` with custom SVG hexagonal geometric logo and pulsing AVM/TestNet indicator.
- **Persona Switcher:** Toggle between Employee and Executive (`company_owner`) views.
- **Wallet Hub:** Connected address, live ALGO & USDC balances, opt-in status, and dispenser shortcuts. Auto-refreshes every 25 seconds.

### 7.3 Styling & Design System
- **Framework:** Tailwind CSS v4 (`@tailwindcss/vite`), Framer Motion, Lucide React (zero emojis).
- **Dashboard Palette:** Anti-AI curated pastel aesthetic:
  - **Sage Mint:** `#7ee0ac` (accent, positive stats)
  - **Lavender Periwinkle:** `#a5b4fc` (primary cards & highlights)
  - **Warm Apricot Peach:** `#fed7aa` (secondary metrics & warnings)
  - **Pearl Slate:** `#94a3b8` (neutral secondary text & borders)
- **Onboarding:** Cinematic liquid frosted glassmorphic containers (`backdrop-blur-xl`, border highlights) over ambient background video.

---

## 8. Backend API (`server/`)

Express.js server listening on `PORT=3001`. Auth enforced via `supabaseAdmin.auth.getUser(token)`.

### 8.1 Verified Endpoints

#### Health
- `GET /health` — Status and server timestamp.

#### Companies (`/api/companies`)
- `GET /api/companies` — Fetch current authenticated user's company.
- `POST /api/companies` — Create company row with slug and owner ID.
- `PATCH /api/companies/:id` — Update wallet address or x402 config.

#### Teams (`/api/teams`)
- `GET /api/teams` — List teams for authenticated user's company.
- `POST /api/teams` — Create team with budget pool.
- `PATCH /api/teams/:id` — Update team details.
- `DELETE /api/teams/:id` — Delete team.

#### Employees (`/api/employees`)
- `GET /api/employees` — List employees for company.
- `POST /api/employees` — Create single employee.
- `PATCH /api/employees/:id` — Update employee role/team/wallet.
- `DELETE /api/employees/:id` — Terminate employee (sets status to terminated).
- `POST /api/employees/bulk` — **Bulk employee import** from batch payload.

#### Allocations (`/api/allocations`)
- `GET /api/allocations` — List allocations (filters: `employee_id`, `team_id`, `status`).
- `POST /api/allocations` — Create allocation + transaction audit entry.
- `POST /api/allocations/:id/claim` — Atomic credit claim.
- `PATCH /api/allocations/:id` — Update allocation status.
- `DELETE /api/allocations/:id` — Terminate allocation and return unspent credits.

#### Transactions (`/api/transactions`)
- `GET /api/transactions` — List transaction audit entries.
- `GET /api/transactions/summary` — Aggregated transaction totals and statistics.

#### Yield (`/api/yield`)
- `GET /api/yield` — List yield accounts for company.
- `GET /api/yield/:id` — Get specific yield account.
- `POST /api/yield/calculate` — Server-side yield calculation.
- `POST /api/yield/distribute` — Distribute accrued yield shares.

#### Payments (`/api/payments`)
- `POST /api/payments` — x402 402 issuance or on-chain settlement.
- `POST /api/payments/verify` — Verify Algorand transaction hash via Indexer.
- `POST /api/payments/:id/retry` — Reset payment record to `pending`.
- `GET /api/payments` — Query payment history.

---

## 9. Background Subscriber (`subscriber/`)

Background event watcher built with `@algorandfoundation/algokit-subscriber`.
- Synchronizes with Algorand TestNet via Indexer catch-up and continuous Algod polling.
- Tracks application calls (`CreditFlowYieldVault`) and triggers off-chain reconciliation handlers (`handlers.ts`).
- Manages watermark round progression in `.watermark.json`.
- Run command: `npm run dev:subscriber`.

---

## 10. Environment Configuration

### Frontend (`app/.env.local` / `app/.env`)
```env
VITE_ALGOD_SERVER=https://testnet-api.4160.nodely.dev
VITE_ALGOD_PORT=443
VITE_ALGOD_TOKEN=
VITE_ALGOD_NETWORK=testnet

VITE_INDEXER_SERVER=https://testnet-idx.4160.nodely.dev
VITE_INDEXER_PORT=443
VITE_INDEXER_TOKEN=

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

VITE_YIELD_VAULT_APP_ID=
VITE_CIRCLE_API_KEY=
```

### Backend (`server/.env`)
```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALGORAND_INDEXER_SERVER=https://testnet-idx.4160.nodely.dev
ALGORAND_INDEXER_PORT=443
ALGORAND_INDEXER_TOKEN=
```

### Contracts (`contracts/.env.testnet`)
```env
ALGOD_SERVER=https://testnet-api.4160.nodely.dev
ALGOD_PORT=443
USDC_ASSET_ID=10458941
DEPLOYER_MNEMONIC="..."
```

---

## 11. Known Gaps & Action Items

1. **Profiles Table Migration:** `profiles` table is queried by `authStore` and `Onboarding.tsx`, but must be explicitly defined in Supabase migrations if starting from a fresh project.
2. **`server` Package Dependencies:** `server/src/routes/*.ts` imports `zod`, which resolves from root/hoisted packages; `zod` should be declared in `server/package.json`.
3. **Smart Contract Deployment Funding:** Contract code and simulation are 100% verified; live on-chain deployment (`npm run deploy:testnet`) awaits ~1 ALGO dispenser funding in the deployer account.

---

*Verified and synchronized against codebase. Commit: `801ca86`*

# CreditFlow (Chudgaye)

> Corporate credit allocation on Algorand — managers allocate digital credits, employees claim them via x402 payments, and unclaimed credits earn yield in an on-chain vault.

**Stack:** React 19 + Vite 6 + TypeScript · Supabase (PostgreSQL + RLS + Auth) · Express.js backend · Algorand TEAL smart contract · x402 payment protocol · Lute / Pera wallets

---

## Table of Contents

1. [What This Product Does](#1-what-this-product-does)
2. [System Architecture](#2-system-architecture)
3. [Data Model](#3-data-model)
4. [User Roles](#4-user-roles)
5. [User Flows](#5-user-flows)
6. [Smart Contract](#6-smart-contract)
7. [x402 Payment Protocol](#7-x402-payment-protocol)
8. [Frontend Pages](#8-frontend-pages)
9. [Backend API](#9-backend-api)
10. [Tech Stack](#10-tech-stack)
11. [Project Structure](#11-project-structure)
12. [Implementation Status](#12-implementation-status)
13. [Environment Configuration](#13-environment-configuration)
14. [How to Run](#14-how-to-run)
15. [Deployment](#15-deployment)
16. [Security](#16-security)
17. [Glossary](#17-glossary)
18. [Open Questions & Decisions](#18-open-questions--decisions)

---

## 1. What This Product Does

CreditFlow lets companies give employees a digital credit allowance. The credits sit on **Algorand** as **USDC**, so they are real, transferable, and auditable. Two key mechanisms make this work:

- **x402 payments** — when an employee "claims" credits to pay for a service, the backend issues a 402 Payment Required response. The employee's wallet signs an Algorand USDC transfer. The backend verifies it on-chain and settles.
- **Yield vault** — credits that go unclaimed flow into an Algorand smart contract that generates yield. The yield is split between the company and the employee.

Everything else (company setup, team management, allocation scheduling) is standard web2 CRUD on top of Supabase.

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ USERS │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐ │
│ │ Super │ │ Company │ │ Manager │ │ Employee │ │
│ │ Admin │ │ Owner │ │ │ │ │ │
│ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └────────┬───────────┘ │
└────────┼───────────────┼───────────────┼──────────────────┼────────────────┘
 │ │ │ │
 ▼ ▼ ▼ ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (React 19 + Vite 6 + TypeScript) │
│ │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│ │ Landing │ │Onboarding│ │Dashboard │ │Allocat- │ │ Claims │ │
│ │ Page │ │ Wizard │ │ │ │ ions │ │ (x402 flow) │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ ├──────────────┤ │
│ │ Yield Page │ │
│ └──────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ Zustand Stores authStore · allocationStore · paymentStore · yieldStore│ │
│ └──────────────────────────────────────┬───────────────────────────────┘ │
│ │ │
│ ┌──────────────────────────────────────▼───────────────────────────────┐ │
│ │ Service Layer │ │
│ │ supabase.ts · x402.ts · algorandPayment.ts · algorandBalance.ts │ │
│ │ circleFaucet.ts │ │
│ └──────────────────────────────────────┬───────────────────────────────┘ │
│ │ │
│ ┌──────────────────────────────────────▼───────────────────────────────┐ │
│ │ Wallet Layer use-wallet-react (Lute, Pera, WalletConnect) │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────────────────┘
 │
 ┌──────────────┴──────────────┐
 │ │
 ▼ ▼
┌──────────────────────────┐ ┌────────────────────────────────────────────┐
│ SUPABASE │ │ ALGORAND BLOCKCHAIN │
│ │ │ │
│ ┌────────────────────┐ │ │ ┌────────────────────────────────────┐ │
│ │ PostgreSQL │ │ │ │ CreditFlowYieldVault (TEAL) │ │
│ │ │ │ │ │ ARC-56 Application Contract │ │
│ │ companies │ │ │ │ • Deposit USDC │ │
│ │ teams │ │ │ │ • Accrue yield │ │
│ │ employees │ │ │ │ • Distribute yield (split) │ │
│ │ allocations │ │ │ │ • Reclaim principal │ │
│ │ transactions │ │ │ └────────────────────────────────────┘ │
│ │ payment_records │ │ │ │
│ │ yield_accounts │ │ │ USDC ASA (ID: 31566704 on testnet) │
│ │ │ │ │ x402 payment asset │
│ │ Auth (RLS) │ │ │ │
│ │ Realtime │ │ │ ┌────────────────────────────────────┐ │
│ │ Edge Functions │ │ │ │ Circle Faucet (testnet) │ │
│ │ │ │ │ │ USDC + ALGO test funding │ │
│ └────────────────────┘ │ │ └────────────────────────────────────┘ │
└──────────────────────────┘ └────────────────────────────────────────────┘

 ▲ ▲
 │ │
┌────────┴─────────────────────────────┴──────────────────────────────┐
│ BACKEND (Express.js) │
│ │
│ POST /api/payments — x402 402 issuance + settlement │
│ POST /api/payments/verify — on-chain tx verification │
│ GET /api/payments — payment history │
│ POST /api/payments/:id/retry— reset payment status │
│ │
│ (allocation / yield / company / team / employee routes also exist) │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model

```
company
 │
 ├─── team(s)
 │ │
 │ └─── employee(s) ──────────────────────┐
 │ │
 └─── allocation(s) ◄─────────────────────────┘
 │
 ├─── transaction(s) (allocate / claim / yield_accrue /
 │ yield_distribute / reclaim / adjust)
 │
 └─── yield_account(s) (principal, yield_generated,
 company_share, employee_share)
```

### Core Entities

| Entity | Purpose |
|---|---|
| `companies` | Top-level organization. Each has a wallet address, x402 config, credit pool, and yield toggle. |
| `teams` | Sub-groups under a company, each with a manager and a team budget pool. |
| `employees` | Individuals with a role, wallet address, and allocation status. |
| `allocations` | Periodic credit buckets — tracks total, claimed, unclaimed, and yield-eligible balances. |
| `transactions` | Immutable audit log of every credit movement. |
| `yield_accounts` | Per-allocation yield positions — principal, accrued yield, share split. |
| `payment_records` | x402 payment receipts — pending, confirmed, failed, or cancelled. |
| `profiles` | Supabase Auth extension — links auth user to company and role. |

### Allocation Lifecycle

```
active ──► suspended ──► terminated
 │ (pause) (close)
 │
 └── credits flow: total_credits → claimed_credits + unclaimed_credits
 unclaimed_credits → yield_eligible_balance (if yield is enabled)
```

---

## 4. User Roles

| Role | Access |
|---|---|
| `super_admin` | Platform-level access. Manages all companies. |
| `company_owner` | Full access within their company. Creates teams, invites employees, sets budget pool. |
| `manager` | Manages their team's allocations. Can create allocations for team members. |
| `employee` | Views their own allocations, claims credits via x402, sees yield dashboard. |

---

## 5. User Flows

### Flow 1: Onboarding (First-time Company Setup)

```
1. Landing Page ("Get Started")
 │
 ▼
2. Onboarding Wizard (5 steps)
 │
 ├─ Step 1: Create Company
 │ • Company name, slug
 │ • INSERT into companies
 │ • INSERT into profiles (role: company_owner)
 │
 ├─ Step 2: Create Team
 │ • Team name
 │ • INSERT into teams
 │
 ├─ Step 3: Add Employees
 │ • Bulk import (CSV or manual entry)
 │ • INSERT into employees
 │
 ├─ Step 4: Set Budget Pool
 │ • Total credit pool for the company
 │ • UPDATE companies.credit_pool
 │
 └─ Step 5: Complete
 • Redirect to Dashboard
```

### Flow 2: Credit Allocation (Manager → Employee)

```
Manager opens Allocations page
 │
 ├─► Select employee, set period (start/end dates), set total credits
 │
 ├─► Frontend calls API to create allocation
 │ POST /api/allocations
 │
 ├─► Backend INSERTs into allocations:
 │ status: 'active'
 │ total_credits = X
 │ claimed_credits = 0
 │ unclaimed_credits = X
 │ yield_eligible_balance = 0
 │
 ├─► INSERT into transactions (type: 'allocate')
 │
 └─► Employee sees new allocation on Dashboard + Allocations page
```

### Flow 3: Employee Claims Credits (x402 Payment)

```
Employee opens Claims page
 │
 ├─► Sees available allocations with unclaimed_credits > 0
 │
 ├─► Enters claim amount + service name
 │
 ├─► Frontend calls API:
 │ POST /api/payments
 │ { allocation_id, service_id, service_name, amount }
 │
 ├─► Backend checks:
 │ • Allocation is active
 │ • Unclaimed credits ≥ amount
 │ • No duplicate (idempotency check)
 │
 ├─► If no payment_proof → Backend returns 402:
 │ {
 │ error: 'Payment Required',
 │ data: {
 │ payment_id, amount, currency: 'USDC',
 │ network: 'algorand:testnet',
 │ asset_id: 31566704,
 │ expires_at: now + 5min
 │ }
 │ }
 │
 ├─► Frontend builds Algorand ASA transfer:
 │ • Asset: USDC (ID 31566704)
 │ • From: employee wallet
 │ • To: company wallet
 │ • Amount: micro-USDC
 │
 ├─► Wallet (Lute/Pera) signs transaction group
 │
 ├─► Frontend submits to Algorand testnet → gets tx hash
 │
 ├─► Frontend calls API with proof:
 │ POST /api/payments
 │ { allocation_id, service_id, amount, payment_proof: { tx_hash, sender_address } }
 │
 ├─► Backend verifies on-chain via Indexer:
 │ • Transaction exists and is confirmed
 │ • It's an ASA transfer (axfer)
 │ • Asset ID matches USDC
 │ • Amount matches
 │ • Sender matches employee wallet
 │
 ├─► Backend updates allocation:
 │ claimed_credits += amount
 │ unclaimed_credits -= amount
 │
 ├─► INSERT into transactions (type: 'claim')
 │
 └─► Payment record marked 'confirmed'
```

### Flow 4: Yield Generation (Unclaimed Credits → Yield Vault)

```
Company enables yield on an allocation
 │
 ├─► Unclaimed credits become yield_eligible_balance
 │
 ├─► Periodically (cron job or on-demand):
 │
 │ yield_accrue:
 │ ├─► Calculate yield = yield_eligible_balance × APY × (days_elapsed / 365)
 │ ├─► INSERT into transactions (type: 'yield_accrue')
 │ └─► UPDATE yield_accounts:
 │ yield_generated += calculated yield
 │ company_share = yield_generated × 70%
 │ employee_share = yield_generated × 30%
 │
 ├─► On-chain (CreditFlowYieldVault):
 │ • Deposit function accepts USDC transfers
 │ • Tracks per-depositor principal and yield
 │ • ARC-56 ABI: deposit, accrue_yield, distribute, reclaim
 │
 └─► yield_distribute:
 ├─► Moves accrued yield from vault to company + employee wallets
 ├─► INSERT into transactions (type: 'yield_distribute')
 └─► UPDATE yield_accounts:
 yield_generated -= distributed amount
```

### Flow 5: Wallet Funding (Testnet Faucet)

```
User opens app, wallet is empty
 │
 ├─► Check ALGO balance via Algorand Indexer
 │ if < 0.01 ALGO → request from public testnet faucet
 │
 ├─► Check USDC balance
 │ if 0 USDC → request from Circle testnet faucet
 │ (requires VITE_CIRCLE_API_KEY, address opted into ASA 31566704)
 │
 └─► Wallet ready for x402 transactions
```

---

## 6. Smart Contract

### CreditFlowYieldVault — Algorand TEAL (ARC-56)

**Global State:**

| Key | Type | Purpose |
|---|---|---|
| `app_admin` | bytes | Contract deployer address |
| `usdc_asset_id` | uint64 | ASA ID for USDC |
| `total_deposits` | uint64 | Total USDC deposited across all users |
| `total_yield` | uint64 | Total yield generated |
| `yield_rate` | uint64 | Configured APY (basis points) |

**Per-Account Local State:**

| Key | Type | Purpose |
|---|---|---|
| `principal` | uint64 | Deposited USDC amount |
| `yield_earned` | uint64 | Yield accumulated for this account |
| `last_accrue_block` | uint64 | Block of last yield calculation |
| `status` | uint64 | 0=inactive, 1=active, 2=withdrawn |

### ABI Methods (ARC-56)

| Method | Signature | Purpose |
|---|---|---|
| `deposit` | `deposit(account: axfer, amount: uint64)` | Deposit USDC into the vault |
| `accrue_yield` | `accrue_yield(account: appl, amount: uint64)` | Accrue yield on an account |
| `distribute` | `distribute(account: appl, to_company: address, to_employee: address, amount: uint64)` | Distribute yield split |
| `reclaim` | `reclaim(account: appl, amount: uint64)` | Reclaim principal |

### Artifacts

| File | Purpose |
|---|---|
| [`contracts/artifacts/CreditFlowYieldVault.approval.teal`](contracts/artifacts/CreditFlowYieldVault.approval.teal) | Approval program |
| [`contracts/artifacts/CreditFlowYieldVault.clear.teal`](contracts/artifacts/CreditFlowYieldVault.clear.teal) | Clear program |
| [`contracts/artifacts/CreditFlowYieldVault.arc56.json`](contracts/artifacts/CreditFlowYieldVault.arc56.json) | ARC-56 ABI definition |

---

## 7. x402 Payment Protocol

### End-to-End Flow

```
┌──────────┐ ┌─────────────┐
│ Frontend │ │ Backend │
│ (Client) │ │ (Express) │
└────┬─────┘ └──────┬──────┘
 │ │
 │ 1. POST /api/payments │
 │ { allocation_id, amount } │
 │───────────────────────────────►│
 │ │
 │ │ 2. Validate:
 │ │ • allocation active?
 │ │ • enough credits?
 │ │ • no duplicate?
 │ │
 │ 3. 402 Payment Required │
 │ { nonce, amount, network, │
 │ asset_id, expires_at } │
 │◄───────────────────────────────│
 │ │
 │ 4. Build ASA transfer txn │
 │ (algorandPayment.ts) │
 │ • from: employee address │
 │ • to: company wallet │
 │ • asset: USDC │
 │ • amount: micro-USDC │
 │ │
 │ 5. Wallet signs txn group │
 │ (Lute / Pera) │
 │ │
 │ 6. Submit to Algorand │
 │ → tx hash returned │
 │ │
 │ 7. POST /api/payments │
 │ { ... , payment_proof: │
 │ { tx_hash, sender } } │
 │───────────────────────────────►│
 │ │
 │ │ 8. Verify on-chain:
 │ │ • Indexer query
 │ │ • axfer confirmed?
 │ │ • right asset/amount/sender?
 │ │
 │ │ 9. Update DB:
 │ │ • claimed_credits += amount
 │ │ • transaction record
 │ │ • payment: confirmed
 │ │
 │ 10. 200 OK │
 │ { payment: confirmed } │
 │◄───────────────────────────────│
```

### Idempotency

Every payment gets a `nonce` of the form `{allocation_id}:{service_id}:{timestamp}`. If the same request arrives twice, the backend returns the existing record instead of creating a duplicate.

### Retry

A failed payment can be retried with `POST /api/payments/:id/retry`, which resets the record to `pending` so the employee can submit a new transaction hash.

---

## 8. Frontend Pages

| Page | Route | Purpose | Status |
|---|---|---|---|
| **Landing** | `/` | Public landing page with product overview | Implemented |
| **Onboarding** | `/onboarding` | 5-step wizard for first-time company setup | Implemented |
| **Dashboard** | `/dashboard` | Stats overview — pool, allocations, yield, recent transactions | Implemented |
| **Allocations** | `/allocations` | Create/manage credit allocations for employees | Implemented |
| **Claims** | `/claims` | x402 payment flow — claim credits, view payment history, faucet | Implemented |
| **Yield** | `/yield` | Yield vault dashboard — accrued yield, distribution, strategy | Implemented |
| **x402 Demo** | `/x402-demo` | Standalone x402 payment demo with faucet | Implemented |

### Navigation

The app uses a top-level **Navbar** component on all protected pages. Routing is handled by React Router v7. All pages except Landing and Onboarding are wrapped in a `ProtectedRoute` that requires an active auth session.

---

## 9. Backend API

### Server

Express.js backend runs alongside the Vite dev server. Auth is handled via Supabase JWT verification middleware.

### Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/payments` | Create x402 payment — returns 402 or confirms |
| `POST` | `/api/payments/verify` | Verify an Algorand transaction on-chain |
| `GET` | `/api/payments` | List payment records (filterable by status, employee) |
| `POST` | `/api/payments/:id/retry` | Reset a failed payment to pending |
| `POST` | `/api/companies` | Create company |
| `GET` | `/api/companies/:id` | Get company details |
| `PUT` | `/api/companies/:id` | Update company |
| `GET` | `/api/companies/:id/stats` | Company statistics |
| `POST` | `/api/teams` | Create team |
| `GET` | `/api/teams` | List teams |
| `PUT` | `/api/teams/:id` | Update team |
| `POST` | `/api/employees` | Create employee |
| `GET` | `/api/employees` | List employees |
| `PUT` | `/api/employees/:id` | Update employee |
| `POST` | `/api/allocations` | Create allocation |
| `GET` | `/api/allocations` | List allocations |
| `PUT` | `/api/allocations/:id` | Update allocation |
| `POST` | `/api/allocations/:id/claim` | Claim credits from allocation |
| `GET` | `/api/transactions` | List transactions |
| `POST` | `/api/yield/distribute` | Distribute accrued yield |
| `GET` | `/api/yield/companies/:id` | Get yield accounts |

---

## 10. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | React + Vite + TypeScript | 19 / 6 / 5.7 |
| **UI** | Tailwind CSS v4 + shadcn/ui | — |
| **State** | Zustand | 5.x |
| **Routing** | React Router | 7.x |
| **Wallet** | use-wallet-react + Lute / Pera | 4.x |
| **Blockchain SDK** | algosdk | 3.7.0 |
| **Database** | Supabase (PostgreSQL + RLS) | — |
| **Auth** | Supabase Auth (Google OAuth + email/password) | — |
| **Backend** | Express.js | — |
| **Smart Contract** | Algorand TEAL (ARC-56) | — |
| **Payments** | x402 protocol | — |
| **Faucet** | Circle API (testnet USDC) + public ALGO faucet | — |
| **Deployment** | Vercel | — |

---

## 11. Project Structure

```
Chudgaye/
├── AGENTS.md # Project agent guide (skills, MCP tools)
├── CLAUDE.md # AI coding assistant instructions
├── ARCHITECTURE.md # Detailed system architecture
├── README.md # ← You are here — master project doc
├── STATUS.md # Implementation status tracker
│
├── contracts/
│ ├── src/ # PuyaTs smart contract source
│ ├── artifacts/ # Compiled TEAL + ARC-56 ABI
│ │ ├── CreditFlowYieldVault.approval.teal
│ │ ├── CreditFlowYieldVault.clear.teal
│ │ ├── CreditFlowYieldVault.arc32.json
│ │ └── CreditFlowYieldVault.arc56.json
│ └── package.json
│
├── app/ # Frontend application
│ ├── src/
│ │ ├── pages/
│ │ │ ├── Landing.tsx # Public landing page
│ │ │ ├── Onboarding.tsx # 5-step company setup wizard
│ │ │ ├── Dashboard.tsx # Stats, recent activity, quick actions
│ │ │ ├── Allocations.tsx # Credit allocation management
│ │ │ ├── Claims.tsx # x402 payment flow + faucet
│ │ │ ├── Yield.tsx # Yield vault dashboard
│ │ │ └── X402Demo.tsx # Standalone x402 demo page
│ │ ├── components/
│ │ │ ├── Navbar.tsx # Top navigation bar
│ │ │ └── ProtectedRoute.tsx # Auth route guard
│ │ ├── stores/
│ │ │ ├── authStore.ts # Auth session, user role, company
│ │ │ ├── allocationStore.ts # Allocation CRUD, claim logic
│ │ │ ├── paymentStore.ts # x402 payment state
│ │ │ └── yieldStore.ts # Yield account tracking
│ │ ├── services/
│ │ │ ├── supabase.ts # Supabase client
│ │ │ ├── x402.ts # X402Service class
│ │ │ └── circleFaucet.ts # Circle USDC + ALGO testnet faucets
│ │ ├── utils/
│ │ │ ├── algorand.ts # Network config, client factory
│ │ │ ├── algorandPayment.ts # Tx construction, signing, micro-USDC
│ │ │ ├── algorandBalance.ts # ALGO + USDC balance queries
│ │ │ └── x402.ts # x402 requirement building, validation
│ │ ├── lib/
│ │ │ ├── supabase.ts # Supabase helper functions
│ │ │ └── types.ts # Shared TypeScript types/interfaces
│ │ ├── App.tsx # Root component, routing, wallet setup
│ │ └── main.tsx # Vite entry point
│ ├── .env.testnet.example # Example environment variables
│ └── package.json
│
├── server/ # Express.js backend
│ └── src/
│ ├── routes/
│ │ ├── payments.ts # x402 payment endpoints
│ │ ├── companies.ts # Company CRUD
│ │ ├── teams.ts # Team CRUD
│ │ ├── employees.ts # Employee CRUD
│ │ ├── allocations.ts # Allocation CRUD
│ │ ├── transactions.ts # Transaction history
│ │ └── yield.ts # Yield distribution
│ ├── middleware/
│ │ ├── auth.ts # Supabase JWT verification
│ │ └── companyScope.ts # Enforce company-level access
│ ├── services/
│ │ ├── x402Service.ts # 402 generation, settlement
│ │ ├── allocationService.ts # Allocation business logic
│ │ └── yieldService.ts # Yield calculation, distribution
│ └── index.ts # Server entry point
│
├── subscriber/ # Algorand realtime event subscriber
│ └── index.ts # Watches app calls, updates DB
│
├── supabase/
│ └── migrations/ # Database migration files
│
├── lib/ # Shared workspace libraries
│
└── artifacts/ # Build outputs
```

---

## 12. Implementation Status

### Overall Progress

```
Overall: ████████████░░░░░░░░ ~55%
├─ Database: ████████░░░░░░ 40% (schema defined, not deployed)
├─ Smart Contract: ██████░░░░░░░░ 35% (TEAL compiled + ARC-56 ABI)
├─ Backend API: ███████████░░░ 65% (payments fully implemented)
├─ Frontend: ████████████░░ 70% (all pages implemented)
├─ x402 Flow: ██████████░░░░ 60% (utils + service + UI wired)
└─ Documentation: ████████████░░ 90% (architecture, status, readme)
```

### Component Status Table

#### Smart Contract

| Component | Status | Notes |
|---|---|---|
| Yield Vault Contract (TEAL) | Done | Compiled, artifacts committed |
| ARC-56 ABI | Done | [`CreditFlowYieldVault.arc56.json`](contracts/artifacts/CreditFlowYieldVault.arc56.json) |
| ARC-32 Metadata | Done | [`CreditFlowYieldVault.arc32.json`](contracts/artifacts/CreditFlowYieldVault.arc32.json) |
| Unit Tests | Not started | Needs PuyaTs test setup |
| LocalNet Deployment | Not started | Awaiting test run |
| Testnet Deployment | Not started | Post-audit |

#### Frontend

| Component | Status | Notes |
|---|---|---|
| Landing Page | Done | Public page, routing |
| Onboarding Wizard | Done | 5-step: Company → Team → Employees → Budget → Done |
| Dashboard | Done | Stats cards, recent transactions, quick links |
| Allocations Page | Done | List + create allocation form |
| Claims Page | Done | x402 flow, payment history, wallet funding |
| Yield Page | Done | Yield accounts, distribution, APY display |
| x402 Demo Page | Done | Standalone demo with faucet integration |
| Auth Store | Done | Login, signup, Google OAuth, profile fetch |
| Allocation Store | Done | CRUD, claim logic, balance tracking |
| Payment Store | Done | Payment records, status updates |
| Yield Store | Done | Fetch accounts, total yield, distribution |
| x402 Service | Done | Full client: fetch → parse → build txn → sign → submit → settle |
| Circle Faucet | Done | USDC + ALGO testnet funding |
| Algorand Utils | Done | Network config, balance queries, payment construction |
| Wallet Integration | Done | Lute, Pera, KMD, WalletConnect via use-wallet-react |
| Navbar / Layout | Done | Top nav with wallet connect button |
| Protected Routes | Done | Auth gate on all inner pages |

#### Backend

| Component | Status | Notes |
|---|---|---|
| Payments Router | Done | 402 issuance, settlement, verification, retry |
| Companies Router | Done | CRUD + stats |
| Teams Router | Done | CRUD scoped to company |
| Employees Router | Done | CRUD scoped to company |
| Allocations Router | Done | CRUD + claim endpoint |
| Transactions Router | Done | List with filters |
| Yield Router | Done | Distribute + query yield accounts |
| Auth Middleware | Done | Supabase JWT verification |
| Company Scope | Done | Row-level company access enforcement |

#### Database

| Component | Status | Notes |
|---|---|---|
| Schema Design | Done | All 8 tables defined with types |
| RLS Policies | Done | Defined in schema |
| Migrations | Not deployed | SQL ready, needs Supabase SQL Editor run |
| Seed Data | Not created | No sample data yet |

---

## 13. Environment Configuration

### Frontend Variables ([`app/.env.testnet.example`](app/.env.testnet.example))

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Algorand Network (testnet | mainnet | localnet)
VITE_ALGORAND_NETWORK=testnet
VITE_ALGOD_SERVER=https://testnet-api.4160.nodely.dev
VITE_ALGOD_PORT=443
VITE_ALGOD_TOKEN=your-nodely-token
VITE_INDEXER_SERVER=https://testnet-idx.4160.nodely.dev
VITE_INDEXER_PORT=443
VITE_INDEXER_TOKEN=your-indexer-token

# x402 Configuration
VITE_X402_FACILITATOR_URL=https://facilitator.example.com
VITE_X402_SETTLE_ENDPOINT=/api/x402/settle

# Yield Vault
VITE_YIELD_VAULT_APP_ID=000000000 # set after contract deployment

# Circle Faucet (testnet only)
VITE_CIRCLE_API_KEY=your-circle-developer-key
VITE_CIRCLE_CCTP_DOMAIN=your-domain-token
```

### Backend Variables

```bash
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

ALGORAND_INDEXER_SERVER=https://testnet-idx.4160.nodely.dev
ALGORAND_INDEXER_PORT=443
ALGORAND_INDEXER_TOKEN=your-indexer-token
```

### x402 Configuration per Company

Each company row stores an `x402_config` JSON column:

```json
{
 "facilitator_url": "https://facilitator.example.com",
 "settlement_url": "https://api.creditflow.io/x402/settle",
 "network": "algorand:testnet",
 "asset_id": "31566704",
 "asset_decimals": 6,
 "scheme": "exact"
}
```

---

## 14. How to Run

### Prerequisites

- Node.js 24+
- Docker (for LocalNet)
- Supabase account (or local Supabase)
- Algorand node access (testnet or LocalNet via Docker)

### Setup

```bash
# 1. Clone and install
git clone <repo-url> && cd Chudgaye
npm install

# 2. Configure environment
cp app/.env.testnet.example app/.env
# Edit app/.env with your Supabase, Algorand, and Circle credentials

# 3. Set up Supabase
supabase start
supabase db reset # applies migrations

# 4. Deploy database schema
# Run supabase/schema.sql in the Supabase SQL Editor

# 5. Start development
npm run dev # Frontend (Vite) + Backend (Express) + Contract build
```

### Smart Contract Deployment

```bash
# Build contracts
npm run build

# Deploy to testnet
npm run deploy:testnet

# Copy the returned APP_ID into app/.env as VITE_YIELD_VAULT_APP_ID
```

### Subscriber (Event Watcher)

```bash
npm run dev:subscriber # Watches on-chain events, updates DB
```

---

## 15. Deployment

| Component | Platform | Status |
|---|---|---|
| Frontend | Vercel | Configured |
| Backend | Vercel (serverless functions) | Configured |
| Database | Supabase Cloud | Needs migration deployment |
| Smart Contract | Algorand Testnet / MainNet | Needs deployment |
| Indexer | Algorand Indexer (Nodely) | Configured |

---

## 16. Security

### Row-Level Security (Supabase)

- All tables enforce RLS policies
- Users can only access data within their company
- `user_id` is derived from `auth.uid()` in Supabase Auth session

### x402 Payment Integrity

1. Backend issues a **nonce** per payment requirement
2. Frontend builds a **time-bounded authorization** (5-minute expiry)
3. Wallet signs the **canonical byte representation**
4. Backend verifies on-chain via Indexer before confirming
5. Payment records are **immutable** once confirmed

### Yield Vault Security

- Contract is **rekeyable** to a multisig (future: Gnosis Safe on Algorand)
- Only `app_admin` can call `accrue_yield`
- Deposit amounts validated against ASA holdings
- Withdrawals use atomic transfer groups to prevent reentrancy

---

## 17. Glossary

| Term | Meaning |
|---|---|
| **x402** | HTTP 402 Payment Required protocol — standardized machine-readable payments |
| **ASA** | Algorand Standard Asset — tokens on Algorand (USDC = ASA #31566704 on testnet) |
| **Yield Vault** | Smart contract that accepts deposits and generates yield via Algorand's native mechanisms |
| **ARC-56** | Algorand smart contract ABI standard — defines method signatures for frontend integration |
| **Micro-USDC** | USDC in its smallest unit (1 USDC = 1,000,000 micro-USDC) |
| **Lute** | Browser-based Algorand wallet with multi-account and Ledger support |
| **Pera** | Popular Algorand browser and mobile wallet |
| **Circle Faucet** | Circle's developer API for dispensing test USDC |
| **Indexer** | Algorand Indexer API — query blockchain state (balances, assets, transactions) |
| **RLS** | Row-Level Security — PostgreSQL policies enforced by Supabase per user |
| **PuyaTs** | Algorand TypeScript — the TypeScript SDK for writing Algorand smart contracts |
| **TEAL** | Transaction Execution Approval Language — Algorand's low-level contract language |

---

## 18. Open Questions & Decisions

| Question | Status | Decided By |
|---|---|---|
| APY rate set by admin or oracle? | To decide | You |
| Minimum balance for yield ($50) adjustable? | To decide | You |
| Custodial vs non-custodial wallets? | To decide | You |
| Yield distribution frequency? | To decide | You (monthly default) |
| Multi-sig threshold (2-of-3, 3-of-5)? | To decide | You |
| Company onboarding flow refinements? | To design | You |
| Service provider marketplace? | Future | — |
| Cron job schedule for yield accrual? | To decide | You |

---

## Quick Links

- [AGENTS.md](AGENTS.md) — Project agent guide, skills, and workflows
- [ARCHITECTURE.md](ARCHITECTURE.md) — Detailed system architecture and data flows
- [STATUS.md](STATUS.md) — Detailed implementation tracker with blockers
- [`app/.env.testnet.example`](app/.env.testnet.example) — Frontend environment template
- [`contracts/artifacts/CreditFlowYieldVault.arc56.json`](contracts/artifacts/CreditFlowYieldVault.arc56.json) — Smart contract ABI

# CreditFlow (Chudgaye) — System Architecture & Reference

## What this is

CreditFlow is a corporate expense-management platform that lets companies allocate digital credit to employees, lets employees claim and spend those credits through the **x402 payment protocol** on **Algorand**, and puts unclaimed credits to work in an on-chain **yield vault**.

This document covers the full end-to-end system: from a manager creating an allocation to an employee's wallet signing an Algorand transaction and credits flowing into a yield strategy.

---

## System Architecture

### High-Level Component Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ USERS / ACTORS │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ Super │ │ Company │ │ Manager │ │ Employee │ │
│ │ Admin │ │ Owner │ │ │ │ │ │
│ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
└───────┼─────────────┼─────────────┼─────────────┼──────────────────────────┘
 │ │ │ │
 ▼ ▼ ▼ ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (React + Vite) │
│ │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ Dashboard│ │ Companies│ │ Allocat- │ │ Claims │ │
│ │ │ │ /Teams │ │ ions │ │ (x402) │ │
│ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│ │ │ │ │ │
│ ┌────┴─────────────┴─────────────┴─────────────┴──────┐ │
│ │ Zustand State Stores │ │
│ │ authStore │ allocationStore │ paymentStore │ yieldStore│ │
│ └────┬─────────────────────────────────────────────────┘ │
│ │ │
│ ┌────┴─────────────────────────────────────────────────┐ │
│ │ Service Layer │ │
│ │ supabase.ts │ x402.ts │ algorandPayment.ts │ │
│ │ algorand.ts │ algorandBalance.ts │ circleFaucet.ts│ │
│ └────┬─────────────────────────────────────────────────┘ │
│ │ │
│ ┌────┴─────────────────────────────────────────────────┐ │
│ │ Wallet Layer (use-wallet-react) │ │
│ │ Lute Wallet Connect │ KMD │ WalletConnect │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────┬─────────────────────────────────────────────────┘
 │
 ┌────────────┴────────────┐
 │ │
 ▼ ▼
┌──────────────────────┐ ┌──────────────────────────────────────────┐
│ SUPABASE (BaaS) │ │ ALGORAND BLOCKCHAIN │
│ │ │ │
│ ┌────────────────┐ │ │ ┌────────────────────────────────────┐ │
│ │ PostgreSQL │ │ │ │ CreditFlowYieldVault (TEAL) │ │
│ │ │ │ │ │ ARC-56 Application Contract │ │
│ │ companies │ │ │ │ • Deposit (unclaimed credits) │ │
│ │ teams │ │ │ │ • Accrue yield │ │
│ │ employees │ │ │ │ • Distribute yield (split) │ │
│ │ allocations │ │ │ │ • Reclaim principal │ │
│ │ transactions │ │ │ └───────────┬────────────────────────┘ │
│ │ payment_recs │ │ │ │ │
│ │ yield_accounts│ │ │ ┌───────────▼────────────────────────┐ │
│ │ │ │ │ │ USDC ASA (ID: 31566704) │ │
│ │ Auth (RLS) │ │ │ │ x402 payment asset │ │
│ └────────────────┘ │ │ └────────────────────────────────────┘ │
│ │ │ │
│ ┌────────────────┐ │ │ ┌────────────────────────────────────┐ │
│ │ Realtime │ │ │ │ Algorand Indexer │ │
│ │ Subscriptions │ │ │ │ • Balance queries │ │
│ └────────────────┘ │ │ │ • Asset holdings │ │
│ │ │ │ • Transaction lookups │ │
│ ┌────────────────┐ │ │ └────────────────────────────────────┘ │
│ │ Edge Functions │ │ │ │
│ │ (optional) │ │ │ ┌────────────────────────────────────┐ │
│ └────────────────┘ │ │ │ Circle Faucet (Testnet) │ │
│ │ │ │ USDC + ALGO test funding │ │
│ │ │ └────────────────────────────────────┘ │
└──────────────────────┘ └──────────────────────────────────────────┘
```

---

## Data Model

```
company
 │
 ├─── team(s)
 │ │
 │ └─── employee(s) ──────────────────────┐
 │ │
 └─── allocation(s) ◄───────────────────────────┘
 │
 ├─── transaction(s)
 │ (allocate / claim / yield_accrue / yield_distribute / reclaim / adjust)
 │
 └─── yield_account(s)
 (principal, yield_generated, company_share, employee_share)
```

### Core Entities

| Entity | Purpose |
|---|---|
| `companies` | Top-level org. Each has a wallet address, x402 config, credit pool, yield toggle. |
| `teams` | Sub-groups under a company, each with a manager and a team budget pool. |
| `employees` | Individuals with a role, wallet address, and allocation status. |
| `allocations` | Periodic credit buckets (start/end dates, total/claimed/unclaimed/yield_eligible). |
| `transactions` | Immutable audit log of every credit movement. |
| `yield_accounts` | Per-allocation yield positions tracking principal, accrued yield, and share split. |
| `payment_records` | x402 payment receipts linked to allocations. |

### Allocation Lifecycle

```
active ──► suspended ──► terminated
 │ (pause) (close)
 │
 └── credits flow: total_credits → claimed_credits + unclaimed_credits
 unclaimed_credits → yield_eligible_balance (if yield enabled)
```

---

## Key User Flows

### Flow 1: Credit Allocation (Admin → Employee)

```
Manager creates allocation
 │
 ├─► INSERT into allocations (status: 'active')
 │ total_credits = X
 │ claimed_credits = 0
 │ unclaimed_credits = X
 │ yield_eligible_balance = 0
 │
 ├─► INSERT into transactions (type: 'allocate')
 │
 └─► Employee sees credits on Dashboard
```

### Flow 2: Employee Claims Credits → x402 Payment

```
Employee views available credits
 │
 ├─► Frontend calls backend to create x402 payment requirement
 │ (amount, recipient, resource URL)
 │
 ├─► Backend returns 402 + X-Payment-Required header
 │ scheme: 'exact'
 │ network: 'algorand:testnet'
 │ maxAmountRequired: <micro-USDC>
 │ payTo: <company wallet>
 │
 ├─► Frontend builds Algorand ASA transfer txn
 │ (USDC asset ID 31566704, micro-USDC amount)
 │
 ├─► Wallet (Lute/KMD/WalletConnect) signs transaction group
 │
 ├─► Frontend submits signed transaction to Algorand
 │
 ├─► Frontend sends tx hash to backend /settle endpoint
 │
 ├─► Backend confirms on-chain via Indexer
 │ (verifies transfer from employee → company wallet)
 │
 ├─► Backend updates allocation:
 │ claimed_credits += amount
 │ unclaimed_credits -= amount
 │
 ├─► INSERT into transactions (type: 'claim')
 │
 └─► INSERT into payment_records (status: 'confirmed')
```

### Flow 3: Yield Generation (Unclaimed Credits → Yield Vault)

```
Company enables yield on allocation
 │
 ├─► Periodically (or on-demand):
 │
 │ yield_accrue job:
 │ ├─► Calculate yield on yield_eligible_balance
 │ │ (using configured APY and time elapsed)
 │ │
 │ ├─► INSERT into transactions (type: 'yield_accrue')
 │ │
 │ └─► UPDATE yield_accounts:
 │ yield_generated += calculated yield
 │ company_share = yield_generated * company_split%
 │ employee_share = yield_generated * employee_split%
 │ last_calculated_at = now
 │
 ├─► On-chain (CreditFlowYieldVault):
 │ • Deposit function accepts ASA (USDC) transfers
 │ • Tracks per-depositor principal and yield
 │ • Uses Algorand's native yield-bearing mechanisms
 │ • ARC-56 ABI exposes: deposit, accrue, distribute, reclaim
 │
 └─► yield_distribute:
 ├─► Moves accrued yield from vault to company + employee wallets
 ├─► INSERT into transactions (type: 'yield_distribute')
 └─► UPDATE yield_accounts:
 yield_generated -= distributed amount
 last_calculated_at = now
```

### Flow 4: Wallet Funding (Testnet Faucet)

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

## Request Lifecycle: x402 Payment End-to-End

```
┌──────┐ 1. GET /api/protected-resource ┌─────────────┐
│Client│ ──────────────────────────────────► │ Backend │
│ │ │ (Express) │
└──────┘ └──────┬──────┘
 │
 │ 2. 402 + X-Payment-Required
 │ scheme: exact
 │ network: algorand:testnet
 │ payTo: company wallet
 │ amount: <USD amount>
 │
 ▼
┌──────┐ 3. Build payment requirement ┌─────────────┐
│Client│ ◄────────────────────────────────── │ Frontend │
│ │ │ (x402.ts) │
└──────┘ └──────┬──────┘
 │
 │ 4. Build ASA transfer txn
 │ (algorandPayment.ts)
 │ • from: employee address
 │ • to: company address
 │ • asset: USDC
 │ • amount: micro-USDC
 │
 ▼
┌──────┐ 5. Wallet signs txn group ┌─────────────┐
│Wallet│ ◄────────────────────────────────── │ Frontend │
│(Lute)│ │ (UI prompt)│
└──┬───┘ └──────┬──────┘
 │ │
 │ 6. Signed txn bytes │
 │ │
 ▼ ▼
┌──────┐ 7. Submit to Algorand ┌─────────────┐
│Client│ ──────────────────────────────────► │ Algorand │
│ │ (via algod RPC) │ Testnet │
└──┬───┘ └──────┬──────┘
 │ │
 │ 8. Tx hash returned │
 │ │
 ▼ ▼
┌──────┐ 9. POST /api/settle ┌─────────────┐
│Client│ ──────────────────────────────────► │ Backend │
│ │ { txHash } │ │
└──┬───┘ └──────┬──────┘
 │ │
 │ 10. Backend queries Indexer to confirm │
 │ transfer on-chain │
 │ │
 │ 11. Backend updates DB │
 │ • allocation.claimed_credits += amount │
 │ • allocation.unclaimed_credits -= amount │
 │ • INSERT transaction record │
 │ • INSERT payment_record (confirmed) │
 │ │
 ▼ ▼
┌──────┐ 12. 200 OK + protected resource ┌─────────────┐
│Client│ ◄────────────────────────────────── │ Backend │
│ │ │ │
└──────┘ └─────────────┘
```

---

## Smart Contract: CreditFlowYieldVault

### Contract State

```
Global State:
 • app_admin (bytes) — contract deployer
 • usdc_asset_id (uint64) — ASA ID for USDC
 • total_deposits (uint64) — total USDC deposited across all users
 • total_yield (uint64) — total yield generated
 • yield_rate (uint64) — configured APY (basis points)

Per-Account Local State (per depositor):
 • principal (uint64) — deposited USDC
 • yield_earned (uint64) — yield accumulated for this account
 • last_accrue_block (uint64) — block of last yield calculation
 • status (uint64) — 0=inactive, 1=active, 2=withdrawn
```

### ABI Methods (ARC-56)

| Method | Signature | Purpose |
|---|---|---|
| `deposit` | `deposit(account: axfer, amount: uint64)` | Deposit USDC into the vault |
| `accrue_yield` | `accrue_yield(account: appl, amount: uint64)` | Accrue yield on an account |
| `distribute` | `distribute(account: appl, to_company: address, to_employee: address, amount: uint64)` | Distribute yield split |
| `reclaim` | `reclaim(account: appl, amount: uint64)` | Reclaim principal |

---

## Environment Configuration

### Required Variables

```bash
# Supabase
VITE_SUPABASE_URL=<project-url>
VITE_SUPABASE_ANON_KEY=<anon-key>

# Algorand Network
VITE_ALGORAND_NETWORK=testnet # mainnet | testnet | localnet
VITE_ALGOD_SERVER=https://testnet-api.4160.nodely.dev
VITE_ALGOD_PORT=443
VITE_ALGOD_TOKEN=<algod-api-token>
VITE_INDEXER_SERVER=https://testnet-idx.4160.nodely.dev
VITE_INDEXER_PORT=443
VITE_INDEXER_TOKEN=<indexer-api-token>

# x402 Configuration
VITE_X402_FACILITATOR_URL=<facilitator-endpoint>
VITE_X402_SETTLE_ENDPOINT=/api/x402/settle

# Yield Vault (Smart Contract)
VITE_YIELD_VAULT_APP_ID=<deployed-app-id>

# Circle Faucet (Testnet only)
VITE_CIRCLE_API_KEY=<circle-developer-api-key>

# Circle CCTP (cross-chain transfers, optional)
VITE_CIRCLE_CCTP_DOMAIN=<domain-token>
```

### x402 Configuration per Company

Each company row has an `x402_config` JSON column:
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

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + Vite 6 + TypeScript | SPA shell, routing, pages |
| **State** | Zustand | Client-side state (allocation, auth, payment, yield) |
| **UI** | Tailwind CSS v4 + shadcn/ui | Component library, styling |
| **Blockchain SDK** | algosdk (npm) | Algorand transaction construction, signing, submission |
| **Wallet** | use-wallet-react + Lute | Wallet connection, signing |
| **Database** | Supabase (PostgreSQL) | Primary data store, auth (RLS), realtime |
| **Backend** | Express.js | REST API, x402 endpoints, business logic |
| **Smart Contract** | Algorand TEAL (ARC-56) | Yield vault application |
| **Testnet Faucet** | Circle API + public faucets | USDC and ALGO funding for testing |
| **Deployment** | Vercel | Frontend + backend hosting |

---

## Security Model

### Row-Level Security (Supabase)
- All tables use RLS policies
- Users can only access data belonging to their company
- `user_id` is derived from `auth.uid()` (Supabase Auth session)

### x402 Payment Integrity
1. Backend issues a **nonce** per payment requirement
2. Frontend builds a **time-bounded authorization** (`validAfter`/`validBefore`)
3. Wallet signs the **canonical byte representation** of the authorization
4. Backend verifies the signature and checks on-chain settlement
5. Payment record is **immutable** once confirmed

### Yield Vault Security
- Contract is **rekeyable** to a multisig (future: Gnosis Safe on Algorand)
- Only `app_admin` can call `accrue_yield`
- Deposit amounts validated against ASA holdings
- Withdrawals use atomic transfer groups to prevent reentrancy

---

## File Structure Reference

```
Chudgaye/
├── AGENTS.md # Project agent guide (skills, MCP tools, workflows)
├── CLAUDE.md # AI coding assistant instructions
├── ARCHITECTURE.md # This document
├── README.md # Project overview
├── STATUS.md # Development status tracking
│
├── contracts/ # Algorand smart contracts
│ ├── artifacts/
│ │ ├── CreditFlowYieldVault.approval.teal # Approval program
│ │ ├── CreditFlowYieldVault.clear.teal # Clear program
│ │ ├── CreditFlowYieldVault.arc32.json # ARC-32 metadata
│ │ └── CreditFlowYieldVault.arc56.json # ARC-56 ABI
│ └── src/ # Contract source (PyTeal / Reach)
│
├── app/ # Frontend application
│ ├── src/
│ │ ├── pages/
│ │ │ ├── Dashboard.tsx # Overview stats, recent activity
│ │ │ ├── Companies.tsx # Company management (super admin)
│ │ │ ├── Teams.tsx # Team CRUD within a company
│ │ │ ├── Employees.tsx # Employee management
│ │ │ ├── Allocations.tsx # Credit allocation management
│ │ │ ├── Claims.tsx # x402 payment flow / faucet
│ │ │ ├── Apps.tsx # Service provider apps
│ │ │ └── Login.tsx # Auth entry point
│ │ ├── stores/ # Zustand state management
│ │ │ ├── authStore.ts # Auth session, user role
│ │ │ ├── allocationStore.ts # Allocation CRUD, claim logic
│ │ │ ├── paymentStore.ts # x402 payment state
│ │ │ └── yieldStore.ts # Yield account tracking
│ │ ├── components/
│ │ │ ├── AppCalls.tsx # Reusable Algorand app call UI
│ │ │ ├── Navbar.tsx # Navigation, user menu
│ │ │ └── ProtectedRoute.tsx # Route guard by role
│ │ ├── services/
│ │ │ ├── supabase.ts # Supabase client init
│ │ │ ├── x402.ts # X402Service class + singleton
│ │ │ └── circleFaucet.ts # Circle USDC + ALGO testnet faucets
│ │ ├── utils/
│ │ │ ├── algorand.ts # Network config, client factory
│ │ │ ├── algorandPayment.ts # Tx construction, signing, payload
│ │ │ ├── algorandBalance.ts # ALGO + USDC balance queries
│ │ │ └── x402.ts # x402 requirement building
│ │ ├── lib/
│ │ │ ├── supabase.ts # Supabase helper functions
│ │ │ └── types.ts # Shared TypeScript types
│ │ ├── styles/
│ │ │ └── globals.css # Global CSS, Tailwind imports
│ │ ├── App.tsx # Root component, routing
│ │ └── main.tsx # Vite entry point
│ ├── .env.testnet.example # Example environment variables
│ └── package.json # Frontend dependencies
│
├── server/ # Express.js backend API
│ ├── src/
│ │ ├── routes/
│ │ │ ├── companies.ts
│ │ │ ├── teams.ts
│ │ │ ├── employees.ts
│ │ │ ├── allocations.ts
│ │ │ ├── transactions.ts
│ │ │ └── x402.ts # /require, /settle endpoints
│ │ ├── middleware/
│ │ │ ├── auth.ts # Supabase JWT verification
│ │ │ └── companyScope.ts # Enforce company-level access
│ │ ├── services/
│ │ │ ├── x402Service.ts # 402 generation, settlement validation
│ │ │ ├── allocationService.ts # Allocation business logic
│ │ │ └── yieldService.ts # Yield calculation, distribution
│ │ ├── lib/
│ │ │ └── supabase.ts # Admin Supabase client
│ │ └── index.ts # Server entry point
│ └── package.json
│
├── subscriber/ # Algorand realtime subscriber
│ └── index.ts # Watches app calls, updates DB
│
├── supabase/ # Database migrations
│ └── migrations/
│ ├── 20240101000000_create_companies.sql
│ ├── 20240101000001_create_teams.sql
│ ├── 20240101000002_create_employees.sql
│ ├── 20240101000003_create_allocations.sql
│ ├── 20240101000004_create_transactions.sql
│ ├── 20240101000005_create_payment_records.sql
│ └── 20240101000006_create_yield_accounts.sql
│
├── lib/ # Shared libraries
│ └── wagmi-config.ts # Wallet connection config
│
├── node_modules/ # Dependencies
└── package.json # Root workspace config
```

---

## Component Diagram (Detailed)

### Frontend Layer

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ App.tsx (Root Router) │
│ │
│ ┌───────────────┐ ┌────────────────┐ ┌──────────────────┐ │
│ │ Login │ │ Dashboard │ │ Companies │ │
│ │ (auth gate) │ │ (stats) │ │ (super_admin) │ │
│ └───────┬───────┘ └───────┬────────┘ └────────┬─────────┘ │
│ │ │ │ │
│ ┌───────▼───────┐ ┌───────▼────────┐ ┌────────▼─────────┐ │
│ │ Teams │ │ Employees │ │ Allocations │ │
│ │ (company_id) │ │ (company_id) │ │ (credit mgmt) │ │
│ └───────┬───────┘ └───────┬────────┘ └────────┬─────────┘ │
│ │ │ │ │
│ ┌───────▼───────────────────▼─────────────────────▼──────────┐ │
│ │ Claims (x402) │ │
│ │ • Show unclaimed credits │ │
│ │ • Build payment requirement │ │
│ │ • Construct Algorand txn │ │
│ │ • Prompt wallet signature │ │
│ │ • Submit on-chain │ │
│ │ • Faucet funding (Circle + ALGO) │ │
│ └────────────────────────────────────────────────────────────┘ │
│ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Apps (Service Providers) │ │
│ │ • Registered services per company │ │
│ │ • x402 payment requirements │ │
│ │ • Payment history │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### State Stores Interaction

```
authStore
 │
 ├── session (Supabase auth session)
 ├── user (profile, role, company_id)
 └── login / logout methods

allocationStore
 │
 ├── allocations[] (fetched per company)
 ├── fetchAllocations(companyId)
 ├── createAllocation(data)
 ├── claimCredits(id, amount) ──► inserts transaction, updates balances
 └── getEmployeeBalance(employeeId)

paymentStore
 │
 ├── paymentRecords[] (x402 receipts)
 ├── pendingPayments[]
 └── settlePayment(txHash)

yieldStore
 │
 ├── yieldAccounts[] (per-allocation yield positions)
 ├── fetchYieldAccounts(allocationId)
 └── distributeYield(yieldAccountId)
```

---

## Data Flow: Complete Credit Lifecycle

```
 ┌──────────────┐
 │ Allocation │
 │ (periodic) │
 └──────┬───────┘
 │
 ┌───────────┴────────────┐
 │ │
 ▼ ▼
 ┌──────────────┐ ┌──────────────┐
 │ Claimed │ │ Unclaimed │
 │ Credits │ │ Credits │
 └──────┬───────┘ └──────┬───────┘
 │ │
 │ x402 payment │ yield_eligible
 │ (USDC transfer) │
 ▼ ▼
 ┌──────────────┐ ┌──────────────┐
 │ Service │ │ Yield Vault │
 │ Provider │ │ (Algorand) │
 └──────────────┘ └──────┬───────┘
 │
 ┌───────┴───────┐
 │ │
 ▼ ▼
 ┌──────────────┐ ┌──────────────┐
 │ Company │ │ Employee │
 │ Share │ │ Share │
 └──────────────┘ └──────────────┘
```

---

## Development Workflow

### Prerequisites
- Node.js 20+
- Supabase CLI
- Algorand sandbox or testnet node access
- Lute wallet (browser extension)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp app/.env.testnet.example app/.env
# Edit with your Supabase, Algorand, and Circle credentials

# 3. Set up Supabase
supabase start
supabase db reset # applies migrations

# 4. Start development
npm run dev # frontend (Vite) + backend (Express) concurrently
```

### Smart Contract Deployment

```bash
# Compile TEAL (if using Reach / custom compiler)
cd contracts
npm run build

# Deploy to testnet
npm run deploy:testnet

# Update VITE_YIELD_VAULT_APP_ID in .env with the returned app ID
```

---

## Glossary

| Term | Meaning |
|---|---|
| **x402** | HTTP 402 Payment Required protocol — a standardized way for servers to request machine-readable payments |
| **ASA** | Algorand Standard Asset — token on Algorand (USDC is ASA #31566704 on testnet) |
| **Yield Vault** | Smart contract that accepts deposits and generates yield via Algorand's native mechanisms |
| **ARC-56** | Algorand smart contract ABI standard — defines method signatures for frontend integration |
| **Micro-USDC** | USDC represented in its smallest unit (1 USDC = 1,000,000 micro-USDC) |
| **Lute** | Browser-based Algorand wallet with multi-account and Ledger support |
| **Circle Faucet** | Circle's developer-controlled wallet API for dispensing test USDC |
| **Indexer** | Algorand Indexer API — query blockchain state (balances, assets, transactions) |
| **RLS** | Row-Level Security — PostgreSQL policies enforced by Supabase per user |

---

## Current Status

See [STATUS.md](./STATUS.md) for the latest implementation status of each component.

**Completed:**
- Supabase schema with RLS
- Company/Team/Employee CRUD
- Allocation management with claim flow
- x402 payment protocol implementation
- Algorand wallet integration (Lute)
- Circle USDC faucet integration
- Yield vault smart contract (TEAL + ARC-56 ABI)
- Zustand state management

**In Progress / Planned:**
- Backend x402 /settle endpoint validation
- On-chain yield accrual automation
- Real-time subscriber for on-chain events
- Production deployment hardening
- Multi-sig governance for yield vault

# CreditFlow — System Architecture

## 1. OVERVIEW

CreditFlow is a corporate API credit management platform. Companies purchase credit pools, allocate them to teams/employees, and employees consume those credits via x402 payments to access paid APIs. Unused credits earn yield through an on-chain vault.

```
┌─────────────────────────────────────────────────────────────┐
│ CREDITFLOW ARCHITECTURE │
├─────────────────────────────────────────────────────────────┤
│ │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│ │ React SPA │───►│ Express │───►│ Supabase │ │
│ │ (Vite) │ │ API │ │ (Postgres) │ │
│ └──────┬───────┘ └──────┬───────┘ └──────────────┘ │
│ │ │ │
│ │ ┌──────▼───────┐ │
│ │ │ Algorand │ │
│ │ │ x402 Layer │ │
│ │ └──────┬───────┘ │
│ │ │ │
│ ┌──────▼───────┐ ┌──────▼───────┐ │
│ │ Frontend │ │ Yield Vault │ │
│ │ Stores │ │ Contract │ │
│ │ (Zustand) │ │ (Puya-TS) │ │
│ └──────────────┘ └──────────────┘ │
│ │
└─────────────────────────────────────────────────────────────┘
```

## 2. LAYER BREAKDOWN

### Layer 1: Frontend (React + Vite + Tailwind)
- Routing: React Router v7
- State: Zustand (4 stores)
- Wallet: @txnlab/use-wallet-react (Algorand)
- HTTP: native fetch to Express API

### Layer 2: Backend (Express + TypeScript)
- REST API on port 3001
- Supabase auth verification (JWT)
- Business logic orchestration
- x402 payment simulation & settlement
- Yield calculation triggers

### Layer 3: Database (Supabase / PostgreSQL)
- 8 tables with RLS policies
- Stored functions for yield calculation
- Immutable transaction ledger

### Layer 4: Blockchain (Algorand)
- x402 payment settlement (HTTP 402 → Algorand tx)
- Yield Vault smart contract (Puya-TS)
- Box storage for per-company positions

## 3. DATA MODEL

### Companies
```
id (uuid) | name (text) | slug (text) | owner_id (uuid→auth.users)
wallet_address (text) | x402_config (jsonb) | created_at (timestamptz)
```

### Teams
```
id (uuid) | company_id (uuid→companies) | name (text)
manager_id (uuid→auth.users) | budget_pool (numeric) | created_at
```

### Employees
```
id (uuid) | company_id (uuid) | team_id (uuid→teams)
name | email | role | wallet_address (text)
status: active|suspended|terminated
joined_at | terminated_at | created_at
```

### Allocations
```
id (uuid) | company_id | team_id | employee_id
period_start | period_end
total_credits | claimed_credits | unclaimed_credits
yield_eligible_balance | status: active|suspended|terminated|expired
```

### Yield Accounts
```
id (uuid) | allocation_id | company_id | employee_id
principal | yield_generated | company_share | employee_share
strategy | apy | last_calculated_at
```

### Transactions (IMMUTABLE)
```
id (uuid) | allocation_id | company_id | team_id | employee_id
type: allocate|claim|yield_accrue|yield_distribute|reclaim|adjust|x402_payment
amount | from_entity | to_entity | tx_hash | metadata | created_at
```

### Payment Records (x402)
```
id (uuid) | allocation_id | company_id | employee_id
service_id | service_name | amount | currency
x402_tx_hash | status: pending|confirmed|failed|cancelled
error_message | consumed_at | created_at
```

## 4. FRONTEND ARCHITECTURE

### Routing
```
/ → Landing (public)
/onboarding → Onboarding wizard (auth required, no company)
/dashboard → Main dashboard (protected)
/allocations → Allocation management (protected)
/yield → Yield tracking (protected)
/claims → x402 claims & consumption (protected)
```

### Zustand Stores
```
authStore → user, isAuthenticated, login, logout
allocationStore → allocations[], claimCredits, createAllocation
yieldStore → yieldAccounts[], calculateYield, distributeYield
paymentStore → paymentRecords[], processPayment, retryPayment
```

### Key Pages
- **Landing**: Hero, how-it-works, benefits, CTA
- **Onboarding**: 5-step wizard (company → team → employees → budget → confirm)
- **Dashboard**: Stats bar, team cards, employee table, recent transactions
- **Allocations**: Table with claim/suspend/terminate actions, modal for new allocation
- **Yield**: Summary cards, per-allocation breakdown, distribute button, risk notice
- **Claims**: Balance overview, service selection modal, x402 payment flow, transaction history

## 5. BACKEND API

```
GET /api/companies → Get current company
POST /api/companies → Create company
PATCH /api/companies/:id → Update company

GET /api/teams → List teams
POST /api/teams → Create team
PATCH /api/teams/:id → Update team
DELETE /api/teams/:id → Delete team

GET /api/employees → List employees (filter by team/status)
POST /api/employees → Add employee
POST /api/employees/bulk → Bulk import CSV
PATCH /api/employees/:id → Update employee
DELETE /api/employees/:id → Terminate employee

GET /api/allocations → List allocations (filters)
POST /api/allocations → Create allocation + transaction
POST /api/allocations/:id/claim → Claim credits (atomic)

GET /api/yield → Get yield accounts
POST /api/yield/calculate → Calculate yield for allocation
POST /api/yield/distribute → Distribute yield (batch)

GET /api/transactions → List transactions (filters)
GET /api/transactions/summary → Aggregate by type

POST /api/payments → Process x402 payment
POST /api/payments/:id/retry → Retry failed payment
```

## 6. x402 PROTOCOL FLOW

```
1. Employee clicks "Claim Credits for Service"
2. Frontend shows service options with prices
3. Employee selects service + amount
4. Frontend calls POST /api/payments with:
 { allocation_id, service_id, service_name, amount }
5. Backend:
 a. Verifies allocation has sufficient unclaimed_credits
 b. Creates PaymentRecord with status='pending'
 c. Creates Transaction record (type='claim')
 d. Deducts from allocation.unclaimed_credits
 e. Constructs x402 payment payload
 f. Returns 402 with X-Payment-Required header
6. Frontend wallet:
 a. Detects 402 response
 b. Prompts user to sign Algorand USDC transfer
 c. Submits signed payment back to backend
7. Backend:
 a. Verifies signature on Algorand
 b. Confirms on-chain transaction
 c. Updates PaymentRecord.status = 'confirmed'
 d. Updates Transaction.tx_hash with on-chain tx ID
8. Service delivers content/API response
```

## 7. YIELD MODEL (To be implemented later)

```
Eligibility:
 - Unclaimed credits allocated for > 7 days
 - Minimum $50 equivalent
 - Not during active claim processing

Calculation:
 yield = principal × apy × (days / 365)
 company_share = yield × 0.7
 employee_share = yield × 0.3

Distribution:
 - Daily accrual calculation (background job)
 - Monthly distribution to allocation balances
 - Simple interest (NOT compound) — legal safety

Strategy:
 - Algorand yield-bearing tokens (Tinyman/Algofi)
 - 30-day rolling positions
 - Cap at protocol TVL limits

Risk:
 - Variable APY disclosed in UI
 - Principal not guaranteed
 - Separate legal agreement for yield participation
```

## 8. SECURITY MODEL

### Authentication
- Supabase Auth (Google OAuth + email/password)
- JWT in Authorization header
- All API routes verify JWT before processing

### Authorization
- Company owner = authenticated user
- RLS policies enforce data isolation
- Teams visible only within company
- Employees visible only within company

### Financial Integrity
- Immutable transaction ledger (INSERT-only)
- Atomic allocation + transaction on create
- Rollback on failure (delete transaction if allocation fails)
- Balance checks before every claim

### x402 Security
- Nonce-based idempotency (allocation_id + service_id + nonce)
- Signature verification on Algorand
- Replay protection via nonce tracking
- Time-windowed authorizations (5 min expiry)

### Smart Contract Security
- Admin-only functions (deposit, withdraw, updateApy)
- Pause mechanism for emergencies
- Balance validation before every state change
- No reentrancy (TEAL is single-pass)

## 9. DEPLOYMENT ARCHITECTURE

```
Production:
 ┌─────────────────┐ ┌──────────────────┐ ┌──────────────┐
 │ Vercel (SPA) │────►│ Render/ Fly.io │────►│ Supabase │
 │ Frontend │ │ Express API │ │ Database │
 └─────────────────┘ └────────┬─────────┘ └──────────────┘
 │
 ┌──────▼──────┐
 │ Algorand │
 │ Mainnet │
 └─────────────┘

Development:
 ┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
 │ Vite Dev │────►│ Express │────►│ Supabase │
 │ Port 5173 │ │ Port 3001 │ │ Local/Dev │
 └─────────────────┘ └──────────────┘ └──────────────┘
 │
 ┌──────▼──────┐
 │ Algorand │
 │ LocalNet │
 └─────────────┘
```

## 10. TECHNOLOGY STACK

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend | React + Vite + TypeScript | 19.0 / 6.2 |
| Styling | Tailwind CSS | 4.0 |
| State | Zustand | 5.0+ |
| Routing | React Router | 7.18 |
| Backend | Express + TypeScript | 5.0 |
| Database | Supabase (PostgreSQL) | Latest |
| Auth | Supabase Auth | Latest |
| Blockchain | Algorand SDK | 3.7 |
| Contracts | Puya-TS | 1.3 |
| Wallet | @txnlab/use-wallet-react | 4.0 |
| Icons | Lucide React | 1.45 |

## 11. CURRENT BUILD STATUS

| Component | Status | Notes |
|-----------|--------|-------|
| Smart Contract | ✅ Building | yield-vault.algo.ts compiles |
| Database Schema | ✅ Complete | 8 tables + RLS + indexes + functions |
| Backend API | ✅ Structure | Express routes for all entities |
| Frontend Stores | ✅ Complete | 4 Zustand stores implemented |
| Frontend Pages | 🔄 In Progress | Agent building pages |
| x402 Layer | ✅ Service class | Payment negotiation & verification |
| Landing Page | 🔄 In Progress | Agent building |

## 12. NEXT STEPS

1. Complete frontend pages (agent in progress)
2. Wire up API client in frontend stores
3. Implement x402 wallet integration flow
4. Add yield calculation background job
5. Deploy smart contract to testnet
6. End-to-end testing

# Affiliate Payout Management System

I built a full-stack affiliate payout system in TypeScript using Node.js, Express, Prisma, and React. The idea is straightforward — affiliates earn commissions on sales, get a 10% advance, and then get reconciled once the product is delivered or returned.

I went with a ledger-based approach for tracking balance changes because it felt like the right call for anything financial. Mutable balance fields are a nightmare to audit and debug when something goes wrong.

---

## What the system does

- Affiliates see their sales, current withdrawable balance, and full transaction history
- An admin can trigger the advance payout job (gives each affiliate 10% of their pending sale earnings)
- Admin can then reconcile each sale as approved or rejected
  - Approved: affiliate gets the remaining 90%
  - Rejected: the 10% advance that was already paid gets clawed back
- Affiliates can request a withdrawal, but only once every 24 hours
- If a payout fails at the bank/gateway level, the money is automatically returned to their balance and the 24h lock is released

---

## Tech stack

**Backend:**
- Node.js + Express + TypeScript
- Prisma ORM with [libsql](https://turso.tech) (Turso hosted SQLite)
- Upstash Redis for the 24h withdrawal rate-limiting lock
- JWT auth with access + refresh tokens (bcrypt for password hashing)

**Frontend:**
- Vite + React + TypeScript
- Vanilla CSS (dark mode by default, light mode toggle)
- lucide-react for icons

---

## Login credentials

| Role | User ID | Password |
|------|---------|----------|
| Affiliate | `john_doe` | `affiliate123` |
| Admin | `admin` | `admin123` |

---

## Project structure

```
rustyn-affiliate/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # DB models
│   │   └── seed.ts            # seed script
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.ts        # JWT verify middleware
│   │   ├── routes/
│   │   │   ├── auth.ts        # login, refresh, logout
│   │   │   ├── dev.ts         # reset + re-seed endpoint
│   │   │   ├── sales.ts       # advance payout + reconcile
│   │   │   ├── users.ts       # dashboard
│   │   │   └── withdrawals.ts # initiate withdrawal + webhook sim
│   │   ├── services/
│   │   │   ├── PayoutService.ts          # 10% advance logic
│   │   │   ├── ReconciliationService.ts  # approve/reject logic
│   │   │   └── WithdrawalService.ts      # withdrawal + refund logic
│   │   ├── app.ts
│   │   ├── db.ts              # Prisma client
│   │   ├── redis.ts           # Upstash client
│   │   └── server.ts
│   └── test/
│       └── verify_system.ts   # end-to-end integration test
└── frontend/
    └── src/
        ├── components/
        │   ├── admin/         # reconcile, advance payout UI
        │   ├── auth/          # login card
        │   ├── ledger/        # transaction history table
        │   ├── overview/      # balance + sales summary
        │   └── withdrawals/   # withdrawal form
        ├── context/
        │   ├── AuthContext.tsx
        │   └── ThemeContext.tsx
        ├── App.tsx
        └── index.css
```

---

## Database design

I used a double-entry ledger approach. Every balance change — whether it's an advance payout, final payout, rejection adjustment, withdrawal, or refund — creates a `LedgerTransaction` record. The `withdrawableBalance` field on `User` is a derived cache that gets updated atomically inside the same DB transaction.

Why? Because if I only stored the balance and something broke mid-transaction, I'd have no way to reconstruct what happened. The ledger gives full auditability and makes debugging trivial.

```prisma
model User {
  id                  String              @id
  name                String
  password            String
  role                String              @default("affiliate")
  withdrawableBalance Float               @default(0.0)
  sales               Sale[]
  withdrawals         Withdrawal[]
  ledgerTransactions  LedgerTransaction[]
}

model Sale {
  id            String         @id @default(uuid())
  userId        String
  brand         String
  earning       Float
  status        String         @default("pending")
  advancePaid   Boolean        @default(false)
  advancePayout AdvancePayout?
  user          User           @relation(fields: [userId], references: [id])
}

model AdvancePayout {
  id     String @id @default(uuid())
  saleId String @unique
  amount Float
  sale   Sale   @relation(fields: [saleId], references: [id])
}

model Withdrawal {
  id     String @id @default(uuid())
  userId String
  amount Float
  status String @default("pending")
  user   User   @relation(fields: [userId], references: [id])
}

model LedgerTransaction {
  id          String @id @default(uuid())
  userId      String
  amount      Float
  type        String
  referenceId String
  user        User   @relation(fields: [userId], references: [id])
}
```

Ledger transaction types:
- `ADVANCE_PAYOUT` — 10% credited when advance job runs
- `FINAL_PAYOUT_APPROVED` — remaining amount after reconciliation
- `REJECTION_ADJUSTMENT` — negative entry clawing back the advance
- `WITHDRAWAL` — debit when user withdraws
- `WITHDRAWAL_REFUND` — credit when a withdrawal fails/is cancelled

---

## Business rules implemented

### Advance payout

The advance payout job processes all pending sales where `advancePaid = false`. For each one:

1. Opens a DB transaction
2. Re-checks the sale status inside the transaction (prevents race conditions if the job runs twice simultaneously)
3. Creates an `AdvancePayout` record
4. Sets `advancePaid = true` on the sale
5. Increments the user's `withdrawableBalance` by 10%
6. Writes an `ADVANCE_PAYOUT` ledger entry

Running the job multiple times is safe — already-paid sales are skipped automatically.

### Reconciliation

**Approved sale:**
- User receives `earning - advancePaid` (the remaining 90%)
- Ledger: `FINAL_PAYOUT_APPROVED`

**Rejected sale:**
- The 10% advance is reclaimed as a negative adjustment
- Ledger: `REJECTION_ADJUSTMENT`
- Balance can go negative (this is intentional — it'll be offset against future payouts)

### Withdrawal

- Checks that the user has enough balance
- Looks up a Redis key `withdrawal:lock:<userId>` — if it exists, the withdrawal is blocked
- If not locked, creates the withdrawal record, decrements balance, sets the Redis lock with 24h TTL
- Ledger: `WITHDRAWAL`

### Failed payout recovery

When the payment gateway sends a failure/cancellation webhook:
- Balance is restored
- Ledger: `WITHDRAWAL_REFUND`
- Redis lock is deleted immediately — user can withdraw again right away

---

## API reference

All routes (except auth) require a `Bearer` token in the `Authorization` header.

### Auth
```
POST /api/auth/login      — { userId, password }
POST /api/auth/refresh    — { refreshToken }
POST /api/auth/logout
GET  /api/auth/me
```

### Sales (admin only)
```
GET  /api/sales
POST /api/sales/advance-payout
POST /api/sales/reconcile   — { saleId, status: "approved" | "rejected" }
```

### Withdrawals
```
POST /api/withdrawals              — { userId, amount }
POST /api/withdrawals/:id/status   — { status: "success" | "failed" | "cancelled" | "rejected" }
```

### Users
```
GET /api/users
GET /api/users/:id/dashboard
```

### Dev
```
POST /api/dev/reset   — wipes and re-seeds the database (admin only)
```

---

## Edge cases handled

**Double advance payout:** Even if the job runs multiple times concurrently, the re-check inside the DB transaction ensures each sale only gets paid once.

**Negative balance on rejection:** If the user already withdrew their advance and then the sale gets rejected, their balance goes negative. That's fine — it's a real-world scenario and the system handles it correctly by tracking it as a liability.

**Withdrawal lock on failure:** The 24h Redis lock is cleared immediately when a withdrawal fails, so the user isn't penalized for a gateway-side error.

**Re-reconciliation prevention:** The reconcile route checks that the sale is still `pending` before processing. Already-reconciled sales throw an error.

---

## Running locally

### Prerequisites

- Node.js 18+
- A Turso account (or swap in SQLite locally via `file:./dev.db` in `.env`)
- An Upstash Redis instance

### Backend

```bash
cd backend
npm install
# copy .env.example to .env and fill in your Turso + Upstash + JWT secrets
npx prisma db push
npm run seed
npm run dev
```

Server runs on port `5001`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on port `3000`. Make sure `VITE_API_URL` in `frontend/.env` points to `http://localhost:5001/api`.

### Running the test suite

```bash
cd backend
npm run test
```

This runs `test/verify_system.ts` which boots the Express app on port `5002`, resets the database, and walks through the full lifecycle — advance payouts, reconciliation, withdrawal rate-limiting, and failed payout recovery. All assertions run sequentially and exit `1` on first failure.

---

## Things I'd improve with more time

- Proper unit tests with mocked Prisma/Redis (right now it's only integration tests)
- Pagination on the dashboard queries — currently fetches all records
- Idempotency keys on the reconcile endpoint so retries don't fail
- Event-driven architecture — the advance payout job should probably be triggered by a queue, not a cron endpoint
- More granular roles (e.g. read-only admin vs write admin)

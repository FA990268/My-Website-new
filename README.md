# High-Precision Dual-Mode CBT & Exam Creation Portal
## Module 1: Admin Core & Database Provisioning (Phase 1)

This project contains the backend core, administrative security layer, and PostgreSQL database schemas for the Dual-Mode Computer-Based Testing (CBT) portal.

---

### Project Architecture & Components Created

```
cbt-portal/
└── backend/
    ├── src/
    │   ├── config/
    │   │   └── env.ts                      # Strict Zod-validated environment config
    │   ├── database/
    │   │   ├── migrations/
    │   │   │   └── 001_initial_cbt_schema.sql # Complete PostgreSQL 14+ schema
    │   │   ├── connection.ts               # PostgreSQL connection pool with transaction & retry support
    │   │   ├── migrate.ts                  # Automated schema migration runner
    │   │   └── seed.ts                     # Root admin seed with Argon2id + audit log
    │   ├── security/
    │   │   ├── password.ts                 # OWASP-grade Argon2id hashing & verification
    │   │   ├── jwt.ts                      # Cryptographically isolated Admin JWT & refresh token rotation
    │   │   └── rateLimiter.ts              # Brute-force & credential stuffing defense (5-attempt lockout)
    │   ├── middleware/
    │   │   └── authMiddleware.ts           # Token verification & role guard (SUPER_ADMIN, EXAM_MANAGER)
    │   ├── schemas/
    │   │   └── auth.schema.ts              # Zod validation schemas for administrative authentication
    │   ├── controllers/
    │   │   └── auth.controller.ts          # Login, Refresh, Logout, Profile, and Audit Log handlers
    │   ├── routes/
    │   │   └── auth.routes.ts              # Secured route endpoints
    │   ├── tests/
    │   │   └── auth.test.ts                # Verification suite for cryptographic & auth protocols
    │   └── server.ts                       # Express bootstrap, CORS policy & health probe
    ├── .env.example
    ├── .env
    ├── package.json
    └── tsconfig.json
```

---

### How to Run

1. **Set Workspace**:
   Open or set the active workspace to:
   `C:\Users\faruk\.gemini\antigravity\scratch\cbt-portal`

2. **Verify Security Protocols**:
   ```bash
   cd backend
   npx tsx src/tests/auth.test.ts
   ```

3. **Configure Database**:
   Update `backend/.env` with your PostgreSQL connection URL:
   ```env
   DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
   ```

4. **Apply Migrations**:
   ```bash
   npm run db:migrate
   ```

5. **Seed Root Administrator**:
   ```bash
   npm run db:seed
   ```

6. **Start Backend Server**:
   ```bash
   npm run dev
   ```

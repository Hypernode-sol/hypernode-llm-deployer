# Hypernode Offchain Services

**Off-chain infrastructure for x402 payment protocol and facilitator integration**

This directory contains the off-chain services that complement the on-chain Hypernode facilitator program, enabling HTTP 402 Payment Required protocol, trustless job verification via Oracle, and seamless integration with the facilitator smart contract.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Hypernode Offchain Services                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │  x402 Protocol│  │ Facilitator  │  │ Oracle Service │   │
│  │               │  │   Adapter    │  │                │   │
│  │ - PaymentIntent│  │              │  │ - 6-Check      │   │
│  │ - Verifier    │  │ - Bridge to  │  │   Verification │   │
│  │ - Middleware  │  │   SDK        │  │ - Proof Submit │   │
│  │ - Store       │  │ - On-chain   │  │ - Queue        │   │
│  └───────┬───────┘  └──────┬───────┘  └───────┬────────┘   │
│          │                  │                  │            │
│          └──────────────────┼──────────────────┘            │
│                             │                               │
│                    ┌────────▼────────┐                      │
│                    │  Express Routes │                      │
│                    │  (HTTP API)     │                      │
│                    └─────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │ hypernode-facilitator Program│
              │ (On-Chain - Solana)          │
              └──────────────────────────────┘
```

---

## Components

### 1. x402 Protocol (`x402/`)

Implementation of the HTTP 402 Payment Required protocol adapted for Solana.

**Files:**
- `x402.js`: Core protocol implementation (PaymentIntent, X402Verifier, Store, Middleware)
- `x402-solana-adapter.js`: Adapter for x402-solana client compatibility

**Features:**
- Payment intent creation and validation
- Ed25519 signature verification (Solana wallets)
- In-memory intent store with automatic cleanup
- Express middleware for payment verification
- x402-solana client format support

**Example:**
```javascript
import { PaymentIntent, X402Verifier } from './x402/x402.js';

// Create payment intent
const intent = new PaymentIntent({
  client: 'WalletPublicKey...',
  amount: '1000000', // 0.001 HYPER (9 decimals)
  jobId: 'job-12345',
});

// Client signs the intent message
const message = intent.toSigningMessage();
const signature = wallet.signMessage(message);

// Verify signature
const result = X402Verifier.verify(intent, signature, 'WalletPublicKey...');
// { valid: true }
```

---

### 2. Facilitator Adapter (`facilitator-adapter.ts`)

Bridge between SDK FacilitatorClient and off-chain services.

**Purpose:**
- Maps standalone facilitator methods to our program's instructions
- Provides interface compatibility for Oracle and x402 adapter
- Handles Oracle authority keypair management

**Key Methods:**
- `authorizePayment()`: Maps to `createIntent` in our program
- `submitUsageProof()`: Maps to `verifyPayment` + `claimPayment`
- `getPaymentIntent()`: Fetches on-chain payment intent data
- `derivePaymentIntentPDA()`: PDA derivation helpers

---

### 3. Oracle Service (`oracle/`)

Trustless job execution verification service.

**Verification Checks (6-check system):**
1. ✅ Execution data exists
2. ✅ Job ID present
3. ✅ Node ID matches
4. ✅ Completion marker in logs
5. ✅ Timing valid (> 1s, < 2x estimated)
6. ✅ Hashes valid (SHA256 format)

**Workflow:**
1. Job completes → Node calls `POST /api/facilitator/complete-job`
2. Oracle queues verification
3. Oracle runs 6 checks (score >= 80% required)
4. If verified → Oracle submits proof to facilitator program
5. Facilitator releases payment to node

**Stats:**
```
GET /api/facilitator/stats
{
  "oracle": {
    "totalVerifications": 42,
    "successfulProofs": 40,
    "failedProofs": 2,
    "queueSize": 1,
    "verifiedJobs": 40,
    "authority": "OraclePublicKey..."
  }
}
```

---

### 4. HTTP API (`routes/facilitator.ts`)

Express.js REST API for x402 payments and job management.

**Endpoints:**

#### `POST /api/facilitator/create-intent`
Creates a payment intent for client to sign.

**Request:**
```json
{
  "wallet": "ClientPublicKey...",
  "amount": "1000000",
  "jobId": "job-12345"
}
```

**Response:**
```json
{
  "intent": { "intentId": "uuid...", "client": "...", "amount": "1000000", ... },
  "message": "HYPERNODE Payment Intent\n\nIntent ID: ...",
  "hash": "sha256...",
  "instructions": "Sign the message with your Solana wallet..."
}
```

---

#### `POST /api/facilitator/submit-job`
Submit job with x402 payment.

**Headers:**
```
X-PAYMENT: {"intent": {...}, "signature": "base58..."}
```

**Request:**
```json
{
  "jobId": "job-12345",
  "jobType": "text-generation",
  "description": "Generate text with GPT",
  "estimatedTime": 60,
  "paymentAmount": "1000000",
  "wallet": "ClientPublicKey..."
}
```

**Response (if no payment):**
```json
{
  "status": 402,
  "error": "Payment Required",
  "paymentRequirements": {
    "price": {
      "amount": "1000000",
      "asset": { "address": "56jZU...", "decimals": 9, "symbol": "HYPER" }
    },
    "network": "solana-devnet"
  }
}
```

**Response (with valid payment):**
```json
{
  "success": true,
  "jobId": "job-12345",
  "intentId": "uuid...",
  "escrow": "EscrowPublicKey...",
  "txSignature": "5Kq...",
  "message": "Job submitted successfully with x402 payment",
  "status": "pending"
}
```

---

#### `POST /api/facilitator/complete-job`
Complete job and trigger Oracle verification.

**Request:**
```json
{
  "jobId": "job-12345",
  "nodeId": "node-abc",
  "intentId": "uuid...",
  "success": true,
  "logs": "Job completed successfully",
  "result": { "output": "..." }
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "job-12345",
  "intentId": "uuid...",
  "message": "Job completion queued for Oracle verification",
  "status": "verifying"
}
```

---

#### `GET /api/facilitator/payment-intent/:intentId`
Get on-chain payment intent data.

**Response:**
```json
{
  "address": "PaymentIntentPDA...",
  "client": "ClientPublicKey...",
  "intentId": "uuid...",
  "amount": "1000000",
  "status": "Verified",
  "createdAt": "2025-11-08T...",
  "expiresAt": "2025-11-08T..."
}
```

---

#### `GET /api/facilitator/oracle/status/:jobId`
Get Oracle verification status.

**Response:**
```json
{
  "intentId": "uuid...",
  "nodeId": "node-abc",
  "verification": {
    "verified": true,
    "score": 1.0,
    "validations": { "hasExecutionData": true, ... }
  },
  "proofHash": "sha256...",
  "txSignature": "5Kq...",
  "verifiedAt": 1699468800000
}
```

---

#### `GET /api/facilitator/stats`
System-wide statistics.

**Response:**
```json
{
  "paymentIntents": {
    "total": 42,
    "active": 10,
    "used": 32
  },
  "oracle": {
    "totalVerifications": 40,
    "successfulProofs": 38,
    "failedProofs": 2
  },
  "facilitatorProgram": "FAC1L...",
  "hyperMint": "56jZU...",
  "network": "devnet"
}
```

---

#### `GET /api/facilitator/health`
Health check.

**Response:**
```json
{
  "status": "healthy",
  "services": {
    "facilitator": "operational",
    "oracle": "operational",
    "x402": "operational"
  },
  "timestamp": "2025-11-08T..."
}
```

---

## Setup

### 1. Install Dependencies

```bash
cd offchain
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

**Key Variables:**
- `FACILITATOR_PROGRAM_ID`: Your deployed facilitator program ID
- `ORACLE_PRIVATE_KEY`: Oracle authority keypair (JSON array)
- `HYPER_MINT_DEVNET`: HYPER token mint for devnet
- `SOLANA_RPC_URL`: Solana RPC endpoint

### 3. Build

```bash
npm run build
```

### 4. Start Server

```bash
npm start
```

Server runs on `http://localhost:3005` by default.

---

## Integration

### With hypernode-llm-deployer

The offchain services integrate with the on-chain programs:

1. **hypernode-facilitator**: Payment escrow management
2. **hypernode-jobs**: Job submission and tracking
3. **hypernode-nodes**: Node registry and rewards

### With x402-solana Client

Compatible with x402-solana client library:

```typescript
import { X402SolanaClient } from '@lightprotocol/x402-solana';

const client = new X402SolanaClient({
  baseUrl: 'http://localhost:3005',
  wallet: solanaWallet,
});

// Submit job with automatic payment
const response = await client.post('/api/facilitator/submit-job', {
  jobType: 'text-generation',
  paymentAmount: '1000000',
});
```

---

## Development

### Run in Development Mode

```bash
npm run dev
```

### Test

```bash
npm test
```

### Project Structure

```
offchain/
├── x402/
│   ├── x402.js                    # Core x402 protocol
│   └── x402-solana-adapter.js     # x402-solana compatibility
├── oracle/
│   └── index.ts                   # Oracle verification service
├── routes/
│   └── facilitator.ts             # Express API routes
├── facilitator-adapter.ts         # SDK bridge
├── index.ts                       # Entry point
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## Deployment

### Production Checklist

- [ ] Generate secure Oracle keypair: `solana-keygen new`
- [ ] Deploy facilitator program to mainnet
- [ ] Update `FACILITATOR_PROGRAM_ID` in .env
- [ ] Set `HYPER_MINT_MAINNET` address
- [ ] Configure production RPC endpoint
- [ ] Enable HTTPS with SSL certificate
- [ ] Set up monitoring and logging
- [ ] Configure CORS for production domains
- [ ] Deploy to cloud (AWS, GCP, or Vercel)

### Example Deployment (Docker)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3005
CMD ["node", "dist/index.js"]
```

```bash
docker build -t hypernode-offchain .
docker run -p 3005:3005 --env-file .env hypernode-offchain
```

---

## Security

### Oracle Authority

The Oracle authority keypair is critical:
- **Devnet**: Auto-generated for testing
- **Production**: Store securely in AWS KMS, Google Secret Manager, or HashiCorp Vault
- **Never commit**: Add to `.gitignore`

### Payment Verification

All payments verified:
1. Signature verification (Ed25519)
2. Amount validation
3. Token mint validation
4. Expiration checks
5. Replay protection (intent store)

### Rate Limiting

Consider adding rate limiting in production:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

app.use('/api/facilitator', limiter);
```

---

## License

MIT License

---

## Support

- GitHub Issues: https://github.com/Hypernode-sol/hypernode-llm-deployer/issues
- Documentation: https://hypernodesolana.org
- Contact: contact@hypernodesolana.org

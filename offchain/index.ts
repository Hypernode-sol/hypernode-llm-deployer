/**
 * Hypernode Offchain Services
 *
 * Express server providing:
 * - x402 Payment Protocol (HTTP 402 Payment Required)
 * - Oracle Service (job verification)
 * - Facilitator API (on-chain payment management)
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import facilitatorRoutes from './routes/facilitator.js';

dotenv.config();

const app = express();
const PORT = process.env.OFFCHAIN_PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/facilitator', facilitatorRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Hypernode Offchain Services',
    version: '0.1.0',
    services: {
      facilitator: {
        description: 'On-chain payment facilitator for x402 protocol',
        endpoints: [
          'POST /api/facilitator/create-intent',
          'POST /api/facilitator/submit-job',
          'POST /api/facilitator/complete-job',
          'GET /api/facilitator/payment-intent/:intentId',
          'GET /api/facilitator/oracle/status/:jobId',
          'GET /api/facilitator/stats',
          'GET /api/facilitator/health',
        ],
      },
      x402: {
        description: 'HTTP 402 Payment Required protocol',
        format: 'Send payment intent and signature in X-PAYMENT header',
      },
      oracle: {
        description: 'Trustless job execution verification',
        authority: process.env.ORACLE_AUTHORITY || 'generated',
      },
    },
    documentation: 'https://github.com/Hypernode-sol/hypernode-llm-deployer/tree/main/offchain',
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Hypernode Offchain Services running on port ${PORT}`);
  console.log(`📡 Facilitator API: http://localhost:${PORT}/api/facilitator`);
  console.log(`💳 x402 Protocol: Enabled`);
  console.log(`🔍 Oracle Service: Active`);
  console.log(`\n🔗 Network: ${process.env.SOLANA_NETWORK || 'devnet'}`);
  console.log(`🪙 HYPER Mint: ${process.env.HYPER_MINT_DEVNET || '56jZUEMAhXxRu7Am3L2AkRRxNJb187zBbBQqnTf6jV75'}`);
  console.log(`\n✅ Ready to accept x402 payments\n`);
});

export default app;

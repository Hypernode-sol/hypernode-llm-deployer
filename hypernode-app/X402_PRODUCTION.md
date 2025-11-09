# x402 Production Configuration Guide

Complete guide for deploying x402 payment protocol in production environments.

## Environment Variables

### Required Configuration

```bash
# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Program IDs (Mainnet)
NEXT_PUBLIC_MARKETS_PROGRAM_ID=<your-markets-program-id>
NEXT_PUBLIC_MARKET_PUBKEY=<your-market-pubkey>

# x402 Basic Configuration
NEXT_PUBLIC_X402_ENABLED=true
X402_MIN_PAYMENT=100000          # 0.0001 SOL minimum
X402_MAX_PAYMENT=100000000000    # 100 SOL maximum
```

### Redis Configuration (Recommended for Production)

```bash
# Redis URL for distributed intent tracking
REDIS_URL=redis://localhost:6379

# Redis connection pooling
REDIS_MAX_CONNECTIONS=10
REDIS_MIN_IDLE=2
```

### Monitoring Configuration

```bash
# Enable Prometheus metrics endpoint
X402_MONITORING_ENABLED=true

# Metrics endpoint: /api/x402/metrics
```

### Rate Limiting Configuration

```bash
# Per-wallet request limits
X402_MAX_REQUESTS_PER_WALLET=100    # Requests per window
X402_RATE_LIMIT_WINDOW_MS=3600000   # 1 hour window
X402_MAX_VOLUME_PER_WALLET=100000000000  # 100 SOL per hour
```

### Security Configuration

```bash
# Payment intent expiration
X402_DEFAULT_EXPIRATION=300  # 5 minutes
X402_MAX_EXPIRATION=3600    # 1 hour maximum

# Circuit breaker settings
X402_CIRCUIT_BREAKER_THRESHOLD=5      # Failures before opening
X402_CIRCUIT_BREAKER_TIMEOUT=60000    # 1 minute timeout
```

---

## Infrastructure Setup

### 1. Redis Deployment

#### Option A: Self-hosted Redis

```bash
# Install Redis
sudo apt-get install redis-server

# Configure persistence
# /etc/redis/redis.conf
appendonly yes
appendfsync everysec

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis
```

#### Option B: Managed Redis (Recommended)

- **AWS ElastiCache**: Multi-AZ deployment with automatic failover
- **Redis Cloud**: Fully managed with global distribution
- **DigitalOcean Managed Redis**: Simple setup with automatic backups

### 2. Monitoring Setup

#### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'x402'
    static_configs:
      - targets: ['your-app:3000']
    metrics_path: '/api/x402/metrics'
    scrape_interval: 15s
```

#### Grafana Dashboard

Import dashboard for x402 metrics:

```json
{
  "dashboard": {
    "title": "x402 Payment Protocol",
    "panels": [
      {
        "title": "Payment Verifications",
        "targets": [
          {
            "expr": "rate(x402_payment_verified_total[5m])"
          }
        ]
      },
      {
        "title": "Active Jobs",
        "targets": [
          {
            "expr": "x402_active_jobs"
          }
        ]
      },
      {
        "title": "Rate Limit Hits",
        "targets": [
          {
            "expr": "rate(x402_rate_limit_hit_total[5m])"
          }
        ]
      }
    ]
  }
}
```

### 3. Database Backup (Optional)

For long-term intent tracking audit:

```sql
CREATE TABLE payment_intents (
  id VARCHAR(64) PRIMARY KEY,
  payer VARCHAR(44) NOT NULL,
  amount BIGINT NOT NULL,
  job_id VARCHAR(64) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  signature VARCHAR(88) NOT NULL,
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payer (payer),
  INDEX idx_timestamp (timestamp)
);
```

---

## Deployment Checklist

### Pre-deployment

- [ ] Update all environment variables for production
- [ ] Configure Redis with persistence and replication
- [ ] Set up Prometheus for metrics collection
- [ ] Configure Grafana dashboards
- [ ] Set up alerting for circuit breaker events
- [ ] Review rate limits for expected load
- [ ] Test failover scenarios
- [ ] Document rollback procedure

### Deployment

- [ ] Deploy to staging environment first
- [ ] Run load tests (recommend 1000 req/s)
- [ ] Verify Redis connectivity
- [ ] Check Prometheus metrics endpoint
- [ ] Test rate limiting with multiple wallets
- [ ] Verify circuit breaker behavior
- [ ] Monitor error rates for 24 hours
- [ ] Deploy to production with gradual rollout

### Post-deployment

- [ ] Monitor Grafana dashboards
- [ ] Set up PagerDuty/alert integration
- [ ] Review logs for any warnings
- [ ] Test end-to-end workflow
- [ ] Document any issues encountered
- [ ] Schedule regular security audits

---

## Performance Tuning

### Redis Optimization

```bash
# Increase max connections
maxclients 10000

# Configure memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Enable persistence
save 900 1
save 300 10
save 60 10000
```

### Next.js Optimization

```javascript
// next.config.js
module.exports = {
  compress: true,
  poweredByHeader: false,

  // Enable SWC minification
  swcMinify: true,

  // Optimize production builds
  productionBrowserSourceMaps: false,

  // Cache optimization
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 5,
  },
};
```

### Solana RPC Optimization

- Use dedicated RPC nodes (not public endpoints)
- Configure connection pooling
- Enable RPC caching for read operations
- Monitor RPC latency and switch providers if needed

---

## Security Hardening

### 1. Rate Limiting

Configure Cloudflare or NGINX rate limiting:

```nginx
limit_req_zone $binary_remote_addr zone=x402:10m rate=10r/s;

location /api/x402 {
    limit_req zone=x402 burst=20 nodelay;
    proxy_pass http://nextjs:3000;
}
```

### 2. DDoS Protection

- Enable Cloudflare DDoS protection
- Configure WAF rules for API endpoints
- Set up geo-blocking if needed
- Monitor for unusual traffic patterns

### 3. Secret Management

Use AWS Secrets Manager or HashiCorp Vault:

```typescript
// Example with AWS Secrets Manager
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManager({ region: 'us-east-1' });
const secret = await client.getSecretValue({ SecretId: 'x402/redis-url' });
```

---

## Monitoring and Alerts

### Critical Alerts

```yaml
# Alert: High rejection rate
- alert: HighPaymentRejectionRate
  expr: rate(x402_payment_rejected_total[5m]) > 0.1
  for: 5m
  annotations:
    summary: "High payment rejection rate detected"

# Alert: Circuit breaker open
- alert: CircuitBreakerOpen
  expr: x402_circuit_breaker_open > 0
  for: 1m
  annotations:
    summary: "Circuit breaker is open"

# Alert: Redis connection failure
- alert: RedisConnectionFailure
  expr: up{job="redis"} == 0
  for: 1m
  annotations:
    summary: "Redis connection lost"
```

### Log Aggregation

Configure centralized logging:

```typescript
// Configure Winston or Pino
import pino from 'pino';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-elasticsearch',
    options: {
      node: process.env.ELASTICSEARCH_URL,
      index: 'x402-logs',
    },
  },
});
```

---

## Scaling Recommendations

### Horizontal Scaling

- Run multiple Next.js instances behind load balancer
- Use Redis for shared state across instances
- Configure session affinity if needed
- Monitor per-instance metrics

### Vertical Scaling

- Recommended: 4 CPU cores, 8GB RAM per instance
- Scale Redis separately (8GB+ RAM recommended)
- Monitor CPU usage during peak loads
- Adjust based on actual traffic patterns

### Database Scaling

- Use read replicas for audit queries
- Partition intent table by date
- Archive old intents to cold storage
- Monitor query performance

---

## Disaster Recovery

### Backup Strategy

```bash
# Redis backup
redis-cli --rdb /backup/dump.rdb

# Database backup
pg_dump x402_db > backup_$(date +%Y%m%d).sql

# Automated daily backups
0 2 * * * /scripts/backup-x402.sh
```

### Recovery Procedures

1. **Redis Failure**: Failover to replica, restore from RDB
2. **Database Failure**: Restore from latest backup, replay WAL
3. **Full System Failure**: Deploy from infrastructure-as-code

---

## Cost Optimization

### Expected Costs (Example)

- **Redis Cloud**: $50-200/month (2GB-8GB)
- **RPC Provider**: $100-500/month (dedicated node)
- **Monitoring**: $50-100/month (Grafana Cloud)
- **Compute**: $200-1000/month (based on traffic)

### Optimization Tips

- Use Redis expiration instead of manual cleanup
- Batch Solana RPC calls when possible
- Cache pricing information
- Optimize bundle size to reduce bandwidth costs

---

## Support and Troubleshooting

### Common Issues

**Issue**: High payment rejection rate
- Check: Wallet signatures, time synchronization, expiration settings

**Issue**: Redis connection timeouts
- Check: Network latency, max connections, connection pool config

**Issue**: Circuit breaker frequently opens
- Check: RPC endpoint health, timeout settings, error rates

### Debug Mode

```bash
# Enable verbose logging
X402_DEBUG=true
X402_LOG_LEVEL=debug
```

### Health Check Endpoint

Monitor application health:

```typescript
// GET /api/health
{
  "status": "healthy",
  "x402": {
    "enabled": true,
    "redis": "connected",
    "solana_rpc": "healthy",
    "circuit_breaker": "closed"
  }
}
```

---

## Contact

For production support:
- Email: contact@hypernodesolana.org
- GitHub Issues: https://github.com/Hypernode-sol/hypernode-llm-deployer/issues

# Deployment Guide

This guide explains how to deploy the Hypernode App to production.

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the easiest way to deploy Next.js applications.

#### Setup

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

#### Environment Variables

Add these in Vercel dashboard:

```
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_MARKETS_PROGRAM_ID=<mainnet_program_id>
NEXT_PUBLIC_STAKING_PROGRAM_ID=<mainnet_program_id>
NEXT_PUBLIC_REWARDS_PROGRAM_ID=<mainnet_program_id>
NEXT_PUBLIC_HYPER_MINT=92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io
NEXT_PUBLIC_PINATA_API_KEY=<your_key>
NEXT_PUBLIC_PINATA_SECRET_KEY=<your_secret>
```

#### Custom Domain

1. Go to Vercel dashboard
2. Settings → Domains
3. Add custom domain (e.g., app.hypernodesolana.org)
4. Update DNS records as instructed

### Option 2: Netlify

Alternative to Vercel with similar features.

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

### Option 3: Self-Hosted

For more control, host on your own server.

#### Build

```bash
npm run build
```

#### Run with PM2

```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start npm --name "hypernode-app" -- start

# Save process list
pm2 save

# Setup startup script
pm2 startup
```

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name app.hypernodesolana.org;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 4: Docker

Deploy using Docker containers.

#### Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

#### Build and Run

```bash
# Build image
docker build -t hypernode-app .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta \
  -e NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
  hypernode-app
```

#### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
      - NEXT_PUBLIC_SOLANA_RPC_URL=${SOLANA_RPC_URL}
      - NEXT_PUBLIC_MARKETS_PROGRAM_ID=${MARKETS_PROGRAM_ID}
    restart: unless-stopped
```

## Pre-Deployment Checklist

### Code Quality

- [ ] All TypeScript errors fixed
- [ ] ESLint warnings addressed
- [ ] Code formatted with Prettier
- [ ] All console.logs removed from production code

### Testing

- [ ] Manual testing completed
- [ ] Wallet connection tested (Phantom, Solflare)
- [ ] All pages load correctly
- [ ] Responsive design verified (mobile, tablet, desktop)
- [ ] Dark mode works correctly

### Security

- [ ] Environment variables secured
- [ ] API keys not exposed in client code
- [ ] HTTPS enabled
- [ ] CSP headers configured
- [ ] Rate limiting in place

### Performance

- [ ] Images optimized
- [ ] Code split appropriately
- [ ] Lighthouse score > 90
- [ ] Bundle size analyzed
- [ ] CDN configured for static assets

### SEO

- [ ] Meta tags configured
- [ ] Sitemap generated
- [ ] robots.txt created
- [ ] Open Graph images added
- [ ] Twitter cards configured

### Monitoring

- [ ] Error tracking setup (Sentry)
- [ ] Analytics configured (Google Analytics, Plausible)
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Performance monitoring (Web Vitals)

## Post-Deployment

### 1. Verify Deployment

```bash
# Check if site is accessible
curl https://app.hypernodesolana.org

# Test wallet connection
# Test job creation
# Test staking
```

### 2. Monitor

- Check error logs
- Monitor response times
- Track user activity
- Watch for crashes

### 3. Announce

- Tweet about launch
- Update main website
- Notify community
- Create launch blog post

## Rollback Plan

If issues arise:

### Vercel

```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback <deployment-url>
```

### Docker

```bash
# Stop current container
docker stop hypernode-app

# Run previous version
docker run hypernode-app:previous
```

### Self-Hosted

```bash
# Restore from backup
pm2 stop hypernode-app
git checkout <previous-commit>
npm install
npm run build
pm2 restart hypernode-app
```

## Scaling

### Horizontal Scaling

- Use load balancer (Nginx, Cloudflare)
- Deploy multiple instances
- Use Redis for session storage

### Vertical Scaling

- Increase server resources
- Optimize database queries
- Use CDN for static assets

### Database

If needed later:

- PostgreSQL for user data
- Redis for caching
- Implement proper indexing

## Monitoring & Alerts

### Sentry Integration

```typescript
// src/app/layout.tsx
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Analytics

```typescript
// src/lib/analytics.ts
export function trackEvent(name: string, properties?: any) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, properties);
  }
}
```

## Costs

### Estimated Monthly Costs

**Vercel (Hobby)**: $0
- 100GB bandwidth
- Unlimited deployments
- HTTPS included

**Vercel (Pro)**: $20/month
- 1TB bandwidth
- Team features
- Priority support

**Self-Hosted (DigitalOcean)**: $12-48/month
- 2-8GB RAM
- 60-320GB SSD
- 3-6TB transfer

**Additional Services**:
- Pinata IPFS: $20/month (100GB)
- Sentry: $26/month (50k events)
- CloudFlare CDN: $0 (free tier)

**Total**: $0-100/month depending on traffic

## Support

For deployment issues:
- Check logs first
- Review error messages
- Test locally
- Contact support if needed

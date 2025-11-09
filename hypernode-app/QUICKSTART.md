# Quick Start Guide

Get the Hypernode App running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- A code editor (VS Code recommended)

## Step 1: Install Dependencies

```bash
cd hypernode-app
npm install
```

This will install:
- Next.js 14
- React 18
- Solana Web3.js
- Wallet Adapter
- TailwindCSS
- And all other dependencies

**Expected time**: 2-3 minutes

## Step 2: Setup Environment

```bash
cp .env.example .env.local
```

The `.env.local` file is already configured for devnet. No changes needed for local development!

## Step 3: Run Development Server

```bash
npm run dev
```

The app will start at [http://localhost:3000](http://localhost:3000)

**Expected output**:
```
  ▲ Next.js 14.0.4
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 2.1s
```

## Step 4: Test the App

1. **Open browser**: Go to http://localhost:3000
2. **Click "Connect Wallet"**: Use Phantom or Solflare (devnet mode)
3. **Explore pages**:
   - Marketplace: Create job form
   - Dashboard: Your stats
   - Node: Setup guide
   - Staking: Stake calculator

## What You'll See

### Landing Page
- Hero section with network stats
- Features overview
- How it works guide
- Call-to-action buttons

### Marketplace
- Job creation form
- Framework selection (PyTorch, HuggingFace, etc.)
- GPU requirements
- Placeholder job list

### Dashboard
- Your job statistics
- Earnings tracker
- Recent jobs table
- (Currently shows placeholders - needs SDK integration)

### Node Operator
- Step-by-step setup guide
- System requirements
- Earnings calculator
- Worker client instructions

### Staking
- Stake amount input
- Duration selector (2 weeks to 1 year)
- xHYPER calculator
- Multiplier tiers
- Rewards claiming

## Troubleshooting

### Port 3000 already in use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm run dev
```

### Module not found errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Wallet connection fails

- Make sure wallet extension is installed
- Switch wallet to devnet mode
- Refresh the page

### TypeScript errors

```bash
# Check TypeScript
npm run build

# Type errors are expected in useHypernodeSDK.ts
# They're placeholders waiting for SDK integration
```

## Next Steps

### 1. Explore the Code

```bash
# Open in VS Code
code .

# Key files to review:
src/app/page.tsx              # Landing page
src/app/marketplace/page.tsx  # Marketplace
src/components/Header.tsx     # Navigation
src/lib/config.ts            # Configuration
src/hooks/useHypernodeSDK.ts # SDK hooks (placeholders)
```

### 2. Customize Styling

All styles are in TailwindCSS. Edit:
- `tailwind.config.js` - Colors, fonts
- `src/app/globals.css` - Global styles
- Individual components - Component-specific styles

### 3. Test Wallet Features

```bash
# Install Phantom wallet extension
# https://phantom.app/

# Get devnet SOL
# https://faucet.solana.com/
```

### 4. Build for Production

```bash
# Create production build
npm run build

# Test production build
npm start

# Should see optimized build output
```

### 5. Integrate SDK

See `INTEGRATION_GUIDE.md` for detailed steps:

```bash
# 1. Build SDK
cd ../sdk
npm install
npm run build

# 2. Link to app
npm link
cd ../hypernode-app
npm link @hypernode/sdk

# 3. Update hooks
# Edit src/hooks/useHypernodeSDK.ts
# Replace placeholders with real SDK calls
```

## Development Workflow

### Making Changes

1. **Edit component**: Changes hot-reload automatically
2. **Check browser**: See updates instantly
3. **Fix TypeScript errors**: Check terminal for errors
4. **Test thoroughly**: Test in browser

### Common Tasks

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint

# Format code (if configured)
npm run format
```

### File Organization

```
src/
├── app/              # Pages (Next.js App Router)
│   ├── page.tsx     # Home page
│   └── */page.tsx   # Other pages
├── components/       # Reusable components
├── hooks/           # Custom React hooks
├── lib/             # Utilities and config
└── types/           # TypeScript types
```

## Testing Checklist

- [ ] Landing page loads
- [ ] Navigation works
- [ ] Wallet connects (Phantom)
- [ ] Wallet connects (Solflare)
- [ ] Marketplace form validates
- [ ] Dashboard shows placeholders
- [ ] Node page displays guide
- [ ] Staking calculator works
- [ ] Dark mode works
- [ ] Mobile responsive

## Getting Help

### Check Logs

```bash
# Development server logs
# Check terminal where you ran `npm run dev`

# Browser console
# Press F12 in browser → Console tab
```

### Common Errors

**"Cannot find module"**
→ Run `npm install`

**"Port already in use"**
→ Run `npx kill-port 3000`

**"Wallet not detected"**
→ Install wallet extension, refresh page

**"RPC error"**
→ Check `.env.local` has correct RPC URL

### Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Solana Docs**: https://docs.solana.com
- **Wallet Adapter**: https://github.com/solana-labs/wallet-adapter
- **TailwindCSS**: https://tailwindcss.com/docs

## Performance Tips

### Development

- Use `npm run dev` for hot reload
- Keep browser DevTools open
- Use React DevTools extension

### Production

- Always run `npm run build` before deploying
- Test production build locally first
- Monitor bundle size with `npm run build`

## What's Next?

1. ✅ **Explore the UI**: Click around, test features
2. ✅ **Read the code**: Understand structure
3. ✅ **Customize**: Make it yours
4. ⏳ **Integrate SDK**: Connect to blockchain
5. ⏳ **Deploy**: Push to Vercel/Netlify
6. ⏳ **Test on devnet**: Real transactions
7. ⏳ **Launch**: Mainnet deployment

---

**You're ready to start developing! 🚀**

Run `npm run dev` and start building on Hypernode.

For detailed integration steps, see `INTEGRATION_GUIDE.md`
For deployment instructions, see `DEPLOYMENT.md`
For full documentation, see `README.md`

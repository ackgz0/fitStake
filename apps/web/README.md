# FitStake — Web App

This is the Next.js frontend for [FitStake](../../README.md), a Web3 fitness accountability platform on Solana.

## Tech Stack

- **Next.js 15** (App Router, Turbopack)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS v4**
- **Solana Wallet Adapter** (Phantom)
- **Google MediaPipe** (browser-side pose detection)
- **Anchor** (Solana smart contract client)

## Getting Started

From the repo root:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key Source Files

| File | Description |
|------|-------------|
| `src/app/page.tsx` | Main application page — wallet connection, challenge flow, stake/claim logic |
| `src/components/SquatTracker.tsx` | Camera feed + MediaPipe pose detection + rep counting |
| `src/components/WalletProvider.tsx` | Solana `ConnectionProvider` + `WalletProvider` context |
| `src/components/ProfileDropdown.tsx` | User profile UI — trophies and challenge history |
| `src/lib/fitstakeStorage.ts` | localStorage abstraction for persisting user state |
| `src/idl/fitstake_vault.json` | Anchor IDL for the deployed Solana program |

## Environment

The app connects to **Solana Devnet** by default. No `.env` file is required for local development — the RPC endpoint and program ID are hardcoded for the MVP.

**Program ID (Devnet):** `Y423PxcQ8DobRYRrWRCYG7XrRkfvhT7MyP8TWex1MxX`

## Available Scripts

```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Notes

- `SquatTracker` and the confetti component are loaded with `dynamic(() => import(...), { ssr: false })` because they require browser APIs (camera, canvas).
- User profile data is persisted in `localStorage` keyed by wallet address — there is no backend database.
- MediaPipe is loaded via CDN (`jsdelivr`) for optimal browser-side performance.

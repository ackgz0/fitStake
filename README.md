<div align="center">

# FitStake

**Stake SOL. Work out. Earn it back.**

[![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-red.svg)](#license)
[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?logo=solana)](https://solana.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Anchor](https://img.shields.io/badge/Anchor-0.30.1-512BD4)](https://www.anchor-lang.com)

FitStake is a Web3 fitness accountability platform on the Solana blockchain. Users stake real SOL to commit to a fitness challenge, prove their reps via AI-powered camera tracking, and claim their stake back on completion. Users who fail to complete their challenge contribute to the reward pool for those who succeed.

</div>

---

## How It Works

```
Connect Wallet → Select Challenge → Stake 0.1 SOL → Complete Exercises (AI-verified) → Claim Rewards
```

1. **Connect** your Phantom wallet (Solana Devnet)
2. **Choose** a challenge: Quick Demo or 30-Day Transformation
3. **Stake** 0.1 SOL — locked in a Solana smart contract vault
4. **Exercise** — your camera verifies every rep using MediaPipe pose detection
5. **Claim** your stake back (plus a share of the pool from users who dropped out)

---

## Challenges

| Challenge | Goal | Duration | Claim |
|-----------|------|----------|-------|
| **Quick Demo** | 5 reps of any exercise | Instant | Claim immediately after completion |
| **30-Day Transformation** | 10 reps/day for 30 consecutive days | 30 days | Claim after final day |

**Supported Exercises:** Squats · Push-ups

---

## Features

- **AI Exercise Verification** — MediaPipe pose detection tracks 33 body landmarks and validates reps using joint angle thresholds (no cheating)
- **Solana Smart Contract** — Non-custodial vault via Program Derived Accounts (PDAs); your funds are controlled by code, not a company
- **Phantom Wallet Integration** — Sign transactions directly from your browser extension
- **Real-time Skeleton Overlay** — Live camera feed with pose skeleton rendered on canvas
- **Trophy System** — Earn points for completed challenges; track your history in your profile
- **Confetti Celebration** — Because finishing a 30-day challenge deserves it

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15.x | React framework (App Router, Turbopack) |
| React | 19.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |

### Blockchain
| Technology | Version | Purpose |
|---|---|---|
| Solana Web3.js | 1.98.x | Blockchain RPC client |
| Anchor | 0.30.1 | Solana program framework (Rust) |
| @solana/wallet-adapter | 0.15.x | Phantom wallet integration |

### AI / Computer Vision
| Technology | Purpose |
|---|---|
| Google MediaPipe Pose | 33-point body landmark detection |
| @mediapipe/camera_utils | Camera feed management |
| HTML5 Canvas | Real-time skeleton overlay rendering |

---

## Smart Contract

**Program ID (Devnet):** `Y423PxcQ8DobRYRrWRCYG7XrRkfvhT7MyP8TWex1MxX`

**Network:** Solana Devnet

### Instructions

| Instruction | Description |
|---|---|
| `stake_sol(challenge_id)` | Stakes 0.1 SOL into the vault PDA and creates a user profile |
| `claim_reward(challenge_id)` | Returns staked SOL to the user after challenge completion |

### Program Derived Accounts

| PDA | Seeds | Purpose |
|---|---|---|
| Vault | `["vault"]` | Holds the shared pool of staked SOL |
| User Profile | `["user_profile", user_pubkey, challenge_id]` | Tracks per-user stake and completion status |

---

## Project Structure

```
fitStake/
├── apps/
│   └── web/                        # Next.js frontend
│       └── src/
│           ├── app/
│           │   ├── page.tsx         # Main app logic & UI (~750 lines)
│           │   └── layout.tsx       # Root layout with WalletProvider
│           ├── components/
│           │   ├── SquatTracker.tsx  # MediaPipe camera + rep counting
│           │   ├── WalletProvider.tsx
│           │   └── ProfileDropdown.tsx
│           ├── idl/
│           │   └── fitstake_vault.json  # Anchor IDL
│           └── lib/
│               └── fitstakeStorage.ts  # localStorage abstraction
├── programs/
│   └── fitstake_vault/
│       └── src/lib.rs              # Solana smart contract (Rust/Anchor)
├── docs/                           # Architecture & spec documents
├── Anchor.toml                     # Anchor configuration
├── Cargo.toml                      # Rust workspace
└── package.json                    # npm workspace root
```

---

## Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.x
- **Rust** 1.79.0 (via `rust-toolchain.toml`)
- **Anchor CLI** 0.30.1
- **Solana CLI** (for deploying the smart contract)
- **Phantom Wallet** browser extension (set to Devnet)
- **Devnet SOL** — get free SOL from the [Solana faucet](https://faucet.solana.com)

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/fitStake.git
cd fitStake
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. (Optional) Build the Solana program

> The program is already deployed on Devnet. Only needed if you want to redeploy.

```bash
npm run anchor:build
```

---

## Usage

1. Install the [Phantom wallet](https://phantom.app) browser extension
2. Switch Phantom to **Devnet** in Settings → Developer Settings
3. Get free Devnet SOL from [faucet.solana.com](https://faucet.solana.com)
4. Open the app and click **Connect Wallet**
5. Choose your challenge and stake 0.1 SOL
6. Allow camera access when prompted
7. Complete your reps — the AI will count them automatically
8. Click **Claim Reward** when your challenge is complete

---

## AI Exercise Detection

FitStake uses joint angle thresholds to validate reps:

| Exercise | Down Position | Up Position (completes rep) |
|---|---|---|
| **Squat** | Knee angle < 100° | Knee angle > 160° |
| **Push-up** | Elbow angle < 90° | Elbow angle > 150° |

A 10-second calibration phase runs before tracking begins so you can position yourself correctly in frame.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on reporting issues and submitting pull requests.

---

## License

Copyright © 2025 Ulas Ucrak. All rights reserved.

This software and its source code are proprietary. No part of this project may be reproduced, distributed, or transmitted in any form or by any means without the prior written permission of the author. See [LICENSE](LICENSE) for full terms.

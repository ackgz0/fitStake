# Project Overview: FitStake (Hackathon MVP)

## Core Concept
FitStake is a "Stake-to-Fit" Web3 platform. Users log in with their Phantom wallet, stake SOL to join a fitness challenge, and must complete daily physical tasks verified by device cameras (Computer Vision). If they maintain their streak, they claim their staked SOL back plus a share from the fail pool.

## Tech Stack
- **Frontend:** Next.js (App Router), React, Tailwind CSS. Must be mobile-responsive (PWA style).
- **Blockchain:** Solana, Anchor Framework, `@solana/wallet-adapter-react`.
- **AI/Vision:** Google MediaPipe (Pose Detection) via CDN for browser-side exercise tracking.

## Hackathon Constraints (CRITICAL)
- **Time limits:** We have under 4 hours. DO NOT overengineer. 
- **Database:** Skip real databases (Postgres/Mongo) to save time. Use `localStorage` or simple Next.js API variables to track user streaks (Days 1 to 5) for the demo.
- **Smart Contract:** Prioritize a working `stake` and `claim` function over complex proportional reward distribution math.
- **Tone:** Write functional, clean, boilerplate-free code. Give me the code immediately without long explanations.
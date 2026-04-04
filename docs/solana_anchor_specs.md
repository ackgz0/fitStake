# Solana Anchor Contract Specs: FitStake Vault

## Program: fitstake_vault
Assume we are deploying on Solana Devnet.

## State Requirements
1. **Vault Account:** A global PDA to hold the staked SOL pool.
2. **User Profile:** A PDA derived from `[user_pubkey, challenge_id]` tracking `amount_staked` and `is_completed`.

## Required Instructions (Keep it simple)
1. `initialize_vault`: Sets up the escrow pool.
2. `stake_sol`: User transfers a fixed amount (e.g., 0.1 SOL) to the Vault PDA.
3. `claim_reward`: If the frontend passes a valid completion state, the user can call this to transfer their staked amount back from the Vault PDA to their wallet.

## Instructions for Cursor
- Generate the Rust code for `lib.rs`.
- Immediately after, provide the TypeScript snippet to call `stake_sol` and `claim_reward` using `@project-serum/anchor` or `@coral-xyz/anchor`.
- Ensure signer checks and basic security are in place, but ignore edge cases that would take hours to resolve.
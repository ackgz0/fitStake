use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("Y423PxcQ8DobRYRrWRCYG7XrRkfvhT7MyP8TWex1MxX"); 

#[program]
pub mod fitstake_vault {
    use super::*;

    // 1. SOL Kilitle (0.1 SOL sabit - Hackathon MVP)
    pub fn stake_sol(ctx: Context<StakeSol>, challenge_id: u64) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        let stake_amount: u64 = 100_000_000; // 0.1 SOL (Lamports)

        // Kullanıcı verilerini PDA'ya kaydet
        user_profile.user = ctx.accounts.user.key();
        user_profile.challenge_id = challenge_id;
        user_profile.amount_staked = stake_amount;
        user_profile.is_completed = false;

        // SOL Transferi: Kullanıcı -> Vault PDA
        // Not: Vault hesabı burada ilk parayı aldığı an otomatik oluşur!
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, stake_amount)?;

        msg!("Staked 0.1 SOL for challenge {}", challenge_id);
        Ok(())
    }

    // 2. Ödülü Geri Al (Frontend'den tetiklenecek)
    pub fn claim_reward(ctx: Context<ClaimReward>, _challenge_id: u64) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        require!(user_profile.amount_staked > 0, FitStakeError::NoStakeFound);

        let return_amount = user_profile.amount_staked;
        
        // State'i güncelle
        user_profile.amount_staked = 0;
        user_profile.is_completed = true;

        // Vault'tan kullanıcıya transfer işlemi (PDA Signer)
        let bump = ctx.bumps.vault;
        let seeds = &["vault".as_bytes(), &[bump]];
        let signer = &[&seeds[..]];

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user.to_account_info(),
            },
            signer,
        );
        system_program::transfer(cpi_context, return_amount)?;

        msg!("Claimed {} lamports back!", return_amount);
        Ok(())
    }
}

// --- Hesap Yapıları ---

#[derive(Accounts)]
#[instruction(challenge_id: u64)]
pub struct StakeSol<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 8 + 1, // Discriminator + Pubkey + u64 + u64 + bool
        seeds = [b"user_profile", user.key().as_ref(), &challenge_id.to_le_bytes()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    // Vault artık sadece transfer hedefi, init gerektirmez
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault: SystemAccount<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(challenge_id: u64)]
pub struct ClaimReward<'info> {
    #[account(
        mut,
        seeds = [b"user_profile", user.key().as_ref(), &challenge_id.to_le_bytes()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault: SystemAccount<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// --- State Yapıları ---

#[account]
pub struct UserProfile {
    pub user: Pubkey,
    pub challenge_id: u64,
    pub amount_staked: u64,
    pub is_completed: bool,
}

// --- Hata Yönetimi ---

#[error_code]
pub enum FitStakeError {
    #[msg("No staked SOL found for this challenge.")]
    NoStakeFound,
}
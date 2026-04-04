//! Faz 0 iskeleti: derlenebilir Anchor programı.
//! Vault / stake / claim mantığı Saat 1'de eklenecek.

use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod fitstake_vault {
    use super::*;

    /// Geçici no-op; deploy ve IDL üretimini doğrulamak için.
    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

use anchor_lang::prelude::*;

declare_id!("C8NqjFTmhBkVGE5V5dR4zT2un7WHpsYe5oqVGwiZEUFE");

#[program]
pub mod solmind_staking {
    use super::*;

    /// Initialize a staking pool for a capsule
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        capsule_id: String,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.staking_pool;
        pool.capsule_id = capsule_id;
        pool.total_staked = 0;
        pool.creator = ctx.accounts.creator.key();
        pool.bump = ctx.bumps.staking_pool;

        msg!("Staking pool initialized for capsule: {}", pool.capsule_id);
        Ok(())
    }

    /// Stake SOL on a capsule
    pub fn stake(
        ctx: Context<Stake>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, StakingError::InvalidAmount);

        // Get keys before any borrows
        let pool_key = ctx.accounts.staking_pool.key();
        let user_key = ctx.accounts.user.key();

        // Transfer SOL from user to pool
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.staking_pool.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, amount)?;

        // Update stake records
        let user_stake = &mut ctx.accounts.user_stake;
        if user_stake.user == Pubkey::default() {
            user_stake.user = user_key;
            // Calculate and store bump
            let (_pda, bump) = Pubkey::find_program_address(
                &[b"user_stake", pool_key.as_ref(), user_key.as_ref()],
                ctx.program_id
            );
            user_stake.bump = bump;
        }
        user_stake.amount += amount;
        user_stake.staked_at = Clock::get()?.unix_timestamp;

        let pool = &mut ctx.accounts.staking_pool;
        pool.total_staked += amount;

        msg!("Staked {} lamports on capsule {}", amount, pool.capsule_id);
        Ok(())
    }

    /// Unstake SOL from a capsule
    pub fn unstake(
        ctx: Context<Unstake>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, StakingError::InvalidAmount);
        require!(ctx.accounts.user_stake.amount >= amount, StakingError::InsufficientStake);

        // Transfer SOL from pool to user using anchor's transfer
        let pool_lamports = ctx.accounts.staking_pool.to_account_info().lamports();
        **ctx.accounts.staking_pool.to_account_info().try_borrow_mut_lamports()? = pool_lamports
            .checked_sub(amount)
            .ok_or(StakingError::InsufficientStake)?;

        let user_lamports = ctx.accounts.user.to_account_info().lamports();
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? = user_lamports
            .checked_add(amount)
            .ok_or(StakingError::InvalidAmount)?;

        // Update stake records
        ctx.accounts.user_stake.amount -= amount;
        ctx.accounts.staking_pool.total_staked -= amount;

        msg!("Unstaked {} lamports from capsule {}", amount, ctx.accounts.staking_pool.capsule_id);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(capsule_id: String)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + StakingPool::INIT_SPACE,
        seeds = [b"staking_pool", capsule_id.as_bytes()],
        bump
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool", staking_pool.capsule_id.as_bytes()],
        bump = staking_pool.bump
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserStake::INIT_SPACE,
        seeds = [b"user_stake", staking_pool.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_stake: Account<'info, UserStake>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool", staking_pool.capsule_id.as_bytes()],
        bump = staking_pool.bump
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        mut,
        seeds = [b"user_stake", staking_pool.key().as_ref(), user.key().as_ref()],
        bump = user_stake.bump
    )]
    pub user_stake: Account<'info, UserStake>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct StakingPool {
    #[max_len(64)]
    pub capsule_id: String,
    pub total_staked: u64,
    pub creator: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserStake {
    pub user: Pubkey,
    pub amount: u64,
    pub staked_at: i64,
    pub bump: u8,
}

#[error_code]
pub enum StakingError {
    #[msg("Invalid stake amount")]
    InvalidAmount,
    #[msg("Insufficient stake to unstake")]
    InsufficientStake,
}

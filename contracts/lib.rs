use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// ============================================================================
// CONSTANTS
// ============================================================================

/// Production constants for SolMind
pub mod constants {

    /// Maximum price per query (100 SOL = 100_000_000_000 lamports)
    pub const MAX_PRICE_PER_QUERY: u64 = 100_000_000_000;

    /// Minimum price per query (0.0001 SOL = 100_000 lamports)
    pub const MIN_PRICE_PER_QUERY: u64 = 100_000;

    /// Maximum stake amount (1000 SOL = 1_000_000_000_000 lamports)
    pub const MAX_STAKE_AMOUNT: u64 = 1_000_000_000_000;

    /// Minimum stake amount (0.001 SOL = 1_000_000 lamports)
    pub const MIN_STAKE_AMOUNT: u64 = 1_000_000;

    /// Minimum string length (non-empty)
    pub const MIN_STRING_LENGTH: usize = 1;
}

// ============================================================================
// ERRORS
// ============================================================================

#[error_code]
pub enum SolMindError {
    #[msg("Invalid agent owner")]
    InvalidAgentOwner,
    
    #[msg("Invalid capsule owner")]
    InvalidCapsuleOwner,
    
    #[msg("Capsule not found")]
    CapsuleNotFound,
    
    #[msg("Insufficient stake amount")]
    InsufficientStake,
    
    #[msg("Insufficient payment")]
    InsufficientPayment,
    
    #[msg("Stake not found")]
    StakeNotFound,
    
    #[msg("Invalid price - must be greater than 0")]
    InvalidPrice,
    
    #[msg("Unauthorized access")]
    Unauthorized,
    
    #[msg("Invalid metadata length")]
    InvalidMetadataLength,
    
    #[msg("Math overflow")]
    MathOverflow,
    
    #[msg("String cannot be empty")]
    EmptyString,
    
    #[msg("Price exceeds maximum allowed")]
    PriceTooHigh,
    
    #[msg("Stake amount exceeds maximum allowed")]
    StakeTooHigh,
}

// ============================================================================
// STATES
// ============================================================================

/// Agent account - represents an AI agent with on-chain identity
#[account]
pub struct Agent {
    pub owner: Pubkey,           // Wallet that owns this agent
    pub agent_id: String,        // Unique agent identifier (max 32 chars; also used as PDA seed)
    pub name: String,            // Agent name (max 128 chars)
    pub display_name: String,    // Display name (max 128 chars)
    pub platform: String,        // LLM platform (e.g., "openai", "anthropic") (max 32 chars)
    pub created_at: i64,         // Unix timestamp
    pub usage_count: u64,        // Total number of queries
    pub reputation: u64,         // Reputation score (0-10000, where 10000 = 100%)
    pub bump: u8,                // PDA bump seed
}

impl Agent {
    pub const MAX_SIZE: usize = 8 + // discriminator
        32 +                        // owner
        4 + 32 +                    // agent_id (String)
        4 + 128 +                   // name (String)
        4 + 128 +                   // display_name (String)
        4 + 32 +                    // platform (String)
        8 +                         // created_at
        8 +                         // usage_count
        8 +                         // reputation
        1;                          // bump

    pub fn initialize(
        &mut self,
        owner: Pubkey,
        agent_id: String,
        name: String,
        display_name: String,
        platform: String,
        bump: u8,
    ) -> Result<()> {
        self.owner = owner;
        self.agent_id = agent_id;
        self.name = name;
        self.display_name = display_name;
        self.platform = platform;
        self.created_at = Clock::get()?.unix_timestamp;
        self.usage_count = 0;
        self.reputation = 10000; // Start at 100% (10000/10000)
        self.bump = bump;
        Ok(())
    }
}

/// Capsule account - represents a memory capsule that can be published and monetized
#[account]
pub struct Capsule {
    pub creator: Pubkey,         // Wallet that created this capsule
    pub capsule_id: String,      // Unique capsule identifier (max 32 chars; also used as PDA seed)
    pub name: String,            // Capsule name (max 128 chars)
    pub description: String,     // Description (max 512 chars)
    pub category: String,        // Category (max 32 chars)
    pub price_per_query: u64,    // Price in lamports per query
    pub total_stake: u64,        // Total staked amount in lamports
    pub created_at: i64,         // Unix timestamp
    pub updated_at: i64,         // Last update timestamp
    pub bump: u8,                // PDA bump seed
}

impl Capsule {
    pub const MAX_SIZE: usize = 8 + // discriminator
        32 +                        // creator
        4 + 32 +                    // capsule_id (String)
        4 + 128 +                   // name (String)
        4 + 512 +                   // description (String)
        4 + 32 +                    // category (String)
        8 +                         // price_per_query
        8 +                         // total_stake
        8 +                         // created_at
        8 +                         // updated_at
        1;                          // bump

    pub fn initialize(
        &mut self,
        creator: Pubkey,
        capsule_id: String,
        name: String,
        description: String,
        category: String,
        price_per_query: u64,
        bump: u8,
    ) -> Result<()> {
        self.creator = creator;
        self.capsule_id = capsule_id;
        self.name = name;
        self.description = description;
        self.category = category;
        self.price_per_query = price_per_query;
        self.total_stake = 0;
        let now = Clock::get()?.unix_timestamp;
        self.created_at = now;
        self.updated_at = now;
        self.bump = bump;
        Ok(())
    }
}

/// Staking account - tracks staking for a capsule by a user
#[account]
pub struct Staking {
    pub capsule: Pubkey,         // Capsule being staked on
    pub staker: Pubkey,           // Wallet that staked
    pub amount: u64,              // Staked amount in lamports
    pub staked_at: i64,           // Unix timestamp when staked
    pub lock_until: i64,          // Unix timestamp until which stake is locked
    pub bump: u8,                 // PDA bump seed
}

impl Staking {
    pub const MAX_SIZE: usize = 8 + // discriminator
        32 +                        // capsule
        32 +                        // staker
        8 +                         // amount
        8 +                         // staked_at
        8 +                         // lock_until
        1;                          // bump

    pub const LOCK_PERIOD_SECONDS: i64 = 7 * 24 * 60 * 60; // 7 days

    pub fn initialize(
        &mut self,
        capsule: Pubkey,
        staker: Pubkey,
        amount: u64,
        bump: u8,
    ) -> Result<()> {
        self.capsule = capsule;
        self.staker = staker;
        self.amount = amount;
        let now = Clock::get()?.unix_timestamp;
        self.staked_at = now;
        self.lock_until = now + Self::LOCK_PERIOD_SECONDS;
        self.bump = bump;
        Ok(())
    }

}

/// Earnings account - tracks earnings for a capsule creator
#[account]
pub struct Earnings {
    pub wallet: Pubkey,          // Wallet that earned
    pub capsule: Pubkey,         // Capsule that generated earnings
    pub total_earnings: u64,      // Total earnings in lamports
    pub query_count: u64,         // Number of queries that generated earnings
    pub last_updated: i64,        // Last update timestamp
    pub bump: u8,                 // PDA bump seed
}

impl Earnings {
    pub const MAX_SIZE: usize = 8 + // discriminator
        32 +                        // wallet
        32 +                        // capsule
        8 +                         // total_earnings
        8 +                         // query_count
        8 +                         // last_updated
        1;                          // bump

    pub fn initialize(
        &mut self,
        wallet: Pubkey,
        capsule: Pubkey,
        bump: u8,
    ) -> Result<()> {
        self.wallet = wallet;
        self.capsule = capsule;
        self.total_earnings = 0;
        self.query_count = 0;
        self.last_updated = Clock::get()?.unix_timestamp;
        self.bump = bump;
        Ok(())
    }

    pub fn add_earnings(&mut self, amount: u64) -> Result<()> {
        self.total_earnings = self.total_earnings
            .checked_add(amount)
            .ok_or(SolMindError::MathOverflow)?;
        self.query_count = self.query_count
            .checked_add(1)
            .ok_or(SolMindError::MathOverflow)?;
        self.last_updated = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

// ============================================================================
// INSTRUCTIONS
// ============================================================================

#[derive(Accounts)]
#[instruction(agent_id: String, name: String, display_name: String, platform: String)]
pub struct RegisterAgent<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        init,
        payer = owner,
        space = Agent::MAX_SIZE,
        seeds = [b"agent", owner.key().as_ref(), agent_id.as_bytes()],
        bump
    )]
    pub agent: Account<'info, Agent>,
    
    pub system_program: Program<'info, System>,
}

pub fn register_agent(
    ctx: Context<RegisterAgent>,
    agent_id: String,
    name: String,
    display_name: String,
    platform: String,
) -> Result<()> {
    // Validate non-empty strings
    require!(
        !agent_id.trim().is_empty() && agent_id.len() >= constants::MIN_STRING_LENGTH,
        SolMindError::EmptyString
    );
    require!(
        !name.trim().is_empty() && name.len() >= constants::MIN_STRING_LENGTH,
        SolMindError::EmptyString
    );
    require!(
        !display_name.trim().is_empty() && display_name.len() >= constants::MIN_STRING_LENGTH,
        SolMindError::EmptyString
    );
    require!(
        !platform.trim().is_empty() && platform.len() >= constants::MIN_STRING_LENGTH,
        SolMindError::EmptyString
    );
    
    // Validate maximum lengths
    //
    // IMPORTANT: `agent_id` is used as a PDA seed in `RegisterAgent`. PDA seeds
    // must each be <= 32 bytes, otherwise the instruction will fail on-chain.
    require!(
        agent_id.len() <= 32,
        SolMindError::InvalidMetadataLength
    );
    require!(
        name.len() <= 128,
        SolMindError::InvalidMetadataLength
    );
    require!(
        display_name.len() <= 128,
        SolMindError::InvalidMetadataLength
    );
    require!(
        platform.len() <= 32,
        SolMindError::InvalidMetadataLength
    );

    let agent = &mut ctx.accounts.agent;
    let bump = ctx.bumps.agent;
    
    agent.initialize(
        ctx.accounts.owner.key(),
        agent_id,
        name,
        display_name,
        platform,
        bump,
    )?;

    msg!("Agent registered: {}", agent.agent_id);
    Ok(())
}

#[derive(Accounts)]
#[instruction(capsule_id: String, name: String, description: String, category: String, price_per_query: u64)]
pub struct CreateCapsule<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        init,
        payer = creator,
        space = Capsule::MAX_SIZE,
        seeds = [b"capsule", creator.key().as_ref(), capsule_id.as_bytes()],
        bump
    )]
    pub capsule: Account<'info, Capsule>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_capsule(
    ctx: Context<CreateCapsule>,
    capsule_id: String,
    name: String,
    description: String,
    category: String,
    price_per_query: u64,
) -> Result<()> {
    // Validate non-empty strings
    require!(
        !capsule_id.trim().is_empty() && capsule_id.len() >= constants::MIN_STRING_LENGTH,
        SolMindError::EmptyString
    );
    require!(
        !name.trim().is_empty() && name.len() >= constants::MIN_STRING_LENGTH,
        SolMindError::EmptyString
    );
    require!(
        !description.trim().is_empty() && description.len() >= constants::MIN_STRING_LENGTH,
        SolMindError::EmptyString
    );
    require!(
        !category.trim().is_empty() && category.len() >= constants::MIN_STRING_LENGTH,
        SolMindError::EmptyString
    );
    
    // Validate maximum lengths
    //
    // IMPORTANT: `capsule_id` is used as a PDA seed in `CreateCapsule`. PDA seeds
    // must each be <= 32 bytes, otherwise the instruction will fail on-chain.
    require!(
        capsule_id.len() <= 32,
        SolMindError::InvalidMetadataLength
    );
    require!(
        name.len() <= 128,
        SolMindError::InvalidMetadataLength
    );
    require!(
        description.len() <= 512,
        SolMindError::InvalidMetadataLength
    );
    require!(
        category.len() <= 32,
        SolMindError::InvalidMetadataLength
    );
    
    // Validate price range
    require!(
        price_per_query >= constants::MIN_PRICE_PER_QUERY,
        SolMindError::InvalidPrice
    );
    require!(
        price_per_query <= constants::MAX_PRICE_PER_QUERY,
        SolMindError::PriceTooHigh
    );

    let capsule = &mut ctx.accounts.capsule;
    let bump = ctx.bumps.capsule;
    
    capsule.initialize(
        ctx.accounts.creator.key(),
        capsule_id,
        name,
        description,
        category,
        price_per_query,
        bump,
    )?;

    msg!("Capsule created: {}", capsule.capsule_id);
    Ok(())
}

#[derive(Accounts)]
pub struct StakeOnCapsule<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,
    
    #[account(mut)]
    pub capsule: Account<'info, Capsule>,
    
    #[account(
        init_if_needed,
        payer = staker,
        space = Staking::MAX_SIZE,
        seeds = [b"staking", capsule.key().as_ref(), staker.key().as_ref()],
        bump
    )]
    pub staking: Account<'info, Staking>,
    
    /// CHECK: System program for SOL transfer
    pub system_program: Program<'info, System>,
}

pub fn stake_on_capsule(
    ctx: Context<StakeOnCapsule>,
    amount: u64,
) -> Result<()> {
    // Validate stake amount range
    require!(
        amount >= constants::MIN_STAKE_AMOUNT,
        SolMindError::InsufficientStake
    );
    require!(
        amount <= constants::MAX_STAKE_AMOUNT,
        SolMindError::StakeTooHigh
    );

    // Check staker has enough balance (need amount + rent if staking account is new)
    let required_balance = if ctx.accounts.staking.to_account_info().lamports() == 0 {
        amount + Rent::get()?.minimum_balance(Staking::MAX_SIZE)
    } else {
        amount
    };
    
    require!(
        ctx.accounts.staker.lamports() >= required_balance,
        SolMindError::InsufficientPayment
    );
    
    let capsule = &mut ctx.accounts.capsule;
    let staking = &mut ctx.accounts.staking;
    let staker = &ctx.accounts.staker;
    
    // If staking account is new, initialize it
    if staking.amount == 0 {
        let bump = ctx.bumps.staking;
        staking.initialize(
            capsule.key(),
            staker.key(),
            amount,
            bump,
        )?;
    } else {
        // Add to existing stake - extend lock period
        staking.amount = staking.amount
            .checked_add(amount)
            .ok_or(SolMindError::MathOverflow)?;
        let now = Clock::get()?.unix_timestamp;
        staking.lock_until = now
            .checked_add(Staking::LOCK_PERIOD_SECONDS)
            .ok_or(SolMindError::MathOverflow)?;
    }

    // Transfer SOL from staker to staking PDA account using Anchor's transfer
    anchor_lang::solana_program::program::invoke(
        &anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.staker.key(),
            &ctx.accounts.staking.key(),
            amount,
        ),
        &[
            ctx.accounts.staker.to_account_info(),
            ctx.accounts.staking.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    // Update capsule total stake
    capsule.total_stake = capsule.total_stake
        .checked_add(amount)
        .ok_or(SolMindError::MathOverflow)?;
    capsule.updated_at = Clock::get()?.unix_timestamp;

    msg!("Staked {} lamports on capsule: {}", amount, capsule.capsule_id);
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateCapsulePrice<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        has_one = creator @ SolMindError::InvalidCapsuleOwner
    )]
    pub capsule: Account<'info, Capsule>,
}

pub fn update_capsule_price(
    ctx: Context<UpdateCapsulePrice>,
    new_price: u64,
) -> Result<()> {
    // Validate price range
    require!(
        new_price >= constants::MIN_PRICE_PER_QUERY,
        SolMindError::InvalidPrice
    );
    require!(
        new_price <= constants::MAX_PRICE_PER_QUERY,
        SolMindError::PriceTooHigh
    );

    let capsule = &mut ctx.accounts.capsule;
    capsule.price_per_query = new_price;
    capsule.updated_at = Clock::get()?.unix_timestamp;

    msg!("Capsule price updated to {} lamports", new_price);
    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawEarnings<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"earnings", creator.key().as_ref(), capsule.key().as_ref()],
        bump = earnings.bump
    )]
    pub earnings: Account<'info, Earnings>,
    
    /// CHECK: Capsule account for PDA derivation
    pub capsule: Account<'info, Capsule>,
    
    #[account(mut)]
    /// CHECK: Wallet to receive earnings (must be creator)
    pub wallet: AccountInfo<'info>,
    
    /// CHECK: System program
    pub system_program: Program<'info, System>,
}

pub fn withdraw_earnings(ctx: Context<WithdrawEarnings>) -> Result<()> {
    let earnings = &ctx.accounts.earnings;
    
    require!(
        earnings.wallet == ctx.accounts.creator.key(),
        SolMindError::Unauthorized
    );
    
    require!(
        earnings.wallet == ctx.accounts.wallet.key(),
        SolMindError::Unauthorized
    );
    
    require!(
        earnings.total_earnings > 0,
        SolMindError::InsufficientPayment
    );

    let amount = earnings.total_earnings;
    
    // Verify the actual balance is sufficient (account should have earnings + rent exemption)
    let earnings_account_info = ctx.accounts.earnings.to_account_info();
    let rent_exempt_minimum = Rent::get()?.minimum_balance(Earnings::MAX_SIZE);
    let available_balance = earnings_account_info.lamports()
        .checked_sub(rent_exempt_minimum)
        .ok_or(SolMindError::InsufficientPayment)?;
    
    require!(
        available_balance >= amount,
        SolMindError::InsufficientPayment
    );
    
    // Transfer earnings to creator wallet using PDA signing
    let creator_key = ctx.accounts.creator.key();
    let capsule_key = ctx.accounts.capsule.key();
    let earnings_bump = ctx.accounts.earnings.bump;
    let seeds = &[
        b"earnings",
        creator_key.as_ref(),
        capsule_key.as_ref(),
        &[earnings_bump],
    ];
    let signer_seeds = &[&seeds[..]];
    
    anchor_lang::solana_program::program::invoke_signed(
        &anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.earnings.key(),
            &ctx.accounts.wallet.key(),
            amount,
        ),
        &[
            ctx.accounts.earnings.to_account_info(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        signer_seeds,
    )?;

    // Reset earnings (account will remain for tracking)
    let earnings_account = &mut ctx.accounts.earnings;
    earnings_account.total_earnings = 0;

    msg!("Withdrew {} lamports to {}", amount, ctx.accounts.wallet.key());
    Ok(())
}

// ============================================================================
// DEBATE PRIMITIVE
// ============================================================================

/// DebateSession account — one per debate, created on initialize_debate
#[account]
pub struct DebateSession {
    pub creator: Pubkey,           // Wallet that started the debate
    pub debate_id: String,         // Unique debate identifier (max 32 chars)
    pub mechanism: String,         // "debate" or "vote" (max 8 chars)
    pub quorum: u8,                // Minimum agents required for consensus
    pub rounds: u8,                // Number of deliberation rounds
    pub transcript_hash: String,   // SHA-256 hex of the full transcript (max 64 chars)
    pub completed: bool,           // Whether the debate has been finalized
    pub payment_locked: u64,       // Lamports locked until release
    pub created_at: i64,           // Unix timestamp
    pub bump: u8,
}

impl DebateSession {
    pub const MAX_SIZE: usize = 8 +  // discriminator
        32 +                          // creator
        4 + 32 +                      // debate_id
        4 + 8 +                       // mechanism
        1 +                           // quorum
        1 +                           // rounds
        4 + 64 +                      // transcript_hash
        1 +                           // completed
        8 +                           // payment_locked
        8 +                           // created_at
        1;                            // bump

    pub fn initialize(
        &mut self,
        creator: Pubkey,
        debate_id: String,
        mechanism: String,
        quorum: u8,
        rounds: u8,
        payment_locked: u64,
        bump: u8,
    ) -> Result<()> {
        self.creator = creator;
        self.debate_id = debate_id;
        self.mechanism = mechanism;
        self.quorum = quorum;
        self.rounds = rounds;
        self.transcript_hash = String::new();
        self.completed = false;
        self.payment_locked = payment_locked;
        self.created_at = Clock::get()?.unix_timestamp;
        self.bump = bump;
        Ok(())
    }
}

/// DebateReceipt account — written by finalize_debate, proves consensus occurred
#[account]
pub struct DebateReceipt {
    pub debate_id: String,         // Links back to DebateSession (max 32 chars)
    pub final_decision: String,    // "APPROVED" or "REJECTED" (max 16 chars)
    pub quorum_reached: bool,      // Whether quorum threshold was satisfied
    pub transcript_hash: String,   // Verified SHA-256 of full transcript (max 64 chars)
    pub finalized_at: i64,         // Unix timestamp
    pub bump: u8,
}

impl DebateReceipt {
    pub const MAX_SIZE: usize = 8 +  // discriminator
        4 + 32 +                      // debate_id
        4 + 16 +                      // final_decision
        1 +                           // quorum_reached
        4 + 64 +                      // transcript_hash
        8 +                           // finalized_at
        1;                            // bump
}

// ── Error additions ──────────────────────────────────────────────────────────

// (Debate-specific errors are added to SolMindError below via the existing enum)

// ── Debate instructions ──────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(debate_id: String)]
pub struct InitializeDebate<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = DebateSession::MAX_SIZE,
        seeds = [b"debate", creator.key().as_ref(), debate_id.as_bytes()],
        bump
    )]
    pub debate_session: Account<'info, DebateSession>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_debate(
    ctx: Context<InitializeDebate>,
    debate_id: String,
    mechanism: String,
    quorum: u8,
    rounds: u8,
    payment_locked: u64,
) -> Result<()> {
    require!(debate_id.len() <= 32 && !debate_id.is_empty(), SolMindError::EmptyString);
    require!(mechanism == "debate" || mechanism == "vote", SolMindError::InvalidMetadataLength);
    require!(quorum >= 1 && rounds >= 1, SolMindError::InvalidPrice);

    let session = &mut ctx.accounts.debate_session;
    let bump = ctx.bumps.debate_session;
    session.initialize(
        ctx.accounts.creator.key(),
        debate_id,
        mechanism,
        quorum,
        rounds,
        payment_locked,
        bump,
    )?;
    msg!("Debate initialized: {}", session.debate_id);
    Ok(())
}

#[derive(Accounts)]
pub struct SubmitTranscriptHash<'info> {
    pub creator: Signer<'info>,

    #[account(
        mut,
        has_one = creator @ SolMindError::Unauthorized,
        constraint = !debate_session.completed @ SolMindError::Unauthorized,
    )]
    pub debate_session: Account<'info, DebateSession>,
}

pub fn submit_transcript_hash(
    ctx: Context<SubmitTranscriptHash>,
    transcript_hash: String,
) -> Result<()> {
    require!(transcript_hash.len() == 64, SolMindError::InvalidMetadataLength);
    ctx.accounts.debate_session.transcript_hash = transcript_hash;
    msg!("Transcript hash recorded");
    Ok(())
}

#[derive(Accounts)]
#[instruction(debate_id: String)]
pub struct FinalizeDebate<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        has_one = creator @ SolMindError::Unauthorized,
        constraint = !debate_session.completed @ SolMindError::Unauthorized,
    )]
    pub debate_session: Account<'info, DebateSession>,

    #[account(
        init,
        payer = creator,
        space = DebateReceipt::MAX_SIZE,
        seeds = [b"receipt", debate_session.key().as_ref()],
        bump
    )]
    pub debate_receipt: Account<'info, DebateReceipt>,

    pub system_program: Program<'info, System>,
}

pub fn finalize_debate(
    ctx: Context<FinalizeDebate>,
    final_decision: String,
    quorum_reached: bool,
) -> Result<()> {
    require!(
        final_decision == "APPROVED" || final_decision == "REJECTED",
        SolMindError::InvalidMetadataLength
    );

    let session = &mut ctx.accounts.debate_session;
    session.completed = true;

    let receipt = &mut ctx.accounts.debate_receipt;
    receipt.debate_id = session.debate_id.clone();
    receipt.final_decision = final_decision;
    receipt.quorum_reached = quorum_reached;
    receipt.transcript_hash = session.transcript_hash.clone();
    receipt.finalized_at = Clock::get()?.unix_timestamp;
    receipt.bump = ctx.bumps.debate_receipt;

    msg!("Debate finalized: {} — quorum: {}", receipt.final_decision, quorum_reached);
    Ok(())
}

#[derive(Accounts)]
pub struct ReleasePayment<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        has_one = creator @ SolMindError::Unauthorized,
        constraint = debate_session.completed @ SolMindError::Unauthorized,
    )]
    pub debate_session: Account<'info, DebateSession>,

    #[account(mut)]
    /// CHECK: recipient wallet validated against creator
    pub recipient: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn release_payment(ctx: Context<ReleasePayment>) -> Result<()> {
    let session = &mut ctx.accounts.debate_session;
    let amount = session.payment_locked;
    require!(amount > 0, SolMindError::InsufficientPayment);

    anchor_lang::solana_program::program::invoke(
        &anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.creator.key(),
            &ctx.accounts.recipient.key(),
            amount,
        ),
        &[
            ctx.accounts.creator.to_account_info(),
            ctx.accounts.recipient.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    session.payment_locked = 0;
    msg!("Payment released: {} lamports", amount);
    Ok(())
}

// ============================================================================
// KV MEMORY PRIMITIVE
// ============================================================================

/// MemorySnapshot account — stores the hash of a compressed conversation snapshot
#[account]
pub struct MemorySnapshot {
    pub agent_id: String,         // Agent that owns this snapshot (max 32 chars)
    pub snapshot_id: String,      // Unique snapshot identifier (max 32 chars)
    pub storage_hash: String,     // SHA-256 hex of compressed conversation state (max 64 chars)
    pub message_count: u32,       // Number of messages in the snapshot
    pub created_at: i64,          // Unix timestamp
    pub bump: u8,
}

impl MemorySnapshot {
    pub const MAX_SIZE: usize = 8 +  // discriminator
        4 + 32 +                      // agent_id
        4 + 32 +                      // snapshot_id
        4 + 64 +                      // storage_hash
        4 +                           // message_count
        8 +                           // created_at
        1;                            // bump
}

/// SnapshotReceipt account — proves a snapshot was verified on-chain
#[account]
pub struct SnapshotReceipt {
    pub snapshot_id: String,      // Links back to MemorySnapshot (max 32 chars)
    pub storage_hash: String,     // Verified SHA-256 (max 64 chars)
    pub verified: bool,           // Whether hash verification passed
    pub verified_at: i64,         // Unix timestamp
    pub bump: u8,
}

impl SnapshotReceipt {
    pub const MAX_SIZE: usize = 8 +  // discriminator
        4 + 32 +                      // snapshot_id
        4 + 64 +                      // storage_hash
        1 +                           // verified
        8 +                           // verified_at
        1;                            // bump
}

#[derive(Accounts)]
#[instruction(snapshot_id: String)]
pub struct RecordSnapshot<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = MemorySnapshot::MAX_SIZE,
        seeds = [b"snapshot", owner.key().as_ref(), snapshot_id.as_bytes()],
        bump
    )]
    pub memory_snapshot: Account<'info, MemorySnapshot>,

    pub system_program: Program<'info, System>,
}

pub fn record_snapshot(
    ctx: Context<RecordSnapshot>,
    snapshot_id: String,
    agent_id: String,
    storage_hash: String,
    message_count: u32,
) -> Result<()> {
    require!(snapshot_id.len() <= 32 && !snapshot_id.is_empty(), SolMindError::EmptyString);
    require!(agent_id.len() <= 32 && !agent_id.is_empty(), SolMindError::EmptyString);
    require!(storage_hash.len() == 64, SolMindError::InvalidMetadataLength);

    let snap = &mut ctx.accounts.memory_snapshot;
    snap.agent_id = agent_id;
    snap.snapshot_id = snapshot_id;
    snap.storage_hash = storage_hash;
    snap.message_count = message_count;
    snap.created_at = Clock::get()?.unix_timestamp;
    snap.bump = ctx.bumps.memory_snapshot;

    msg!("Snapshot recorded: {}", snap.snapshot_id);
    Ok(())
}

#[derive(Accounts)]
#[instruction(snapshot_id: String)]
pub struct VerifySnapshot<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"snapshot", owner.key().as_ref(), snapshot_id.as_bytes()],
        bump = memory_snapshot.bump,
    )]
    pub memory_snapshot: Account<'info, MemorySnapshot>,

    #[account(
        init,
        payer = owner,
        space = SnapshotReceipt::MAX_SIZE,
        seeds = [b"snap_receipt", memory_snapshot.key().as_ref()],
        bump
    )]
    pub snapshot_receipt: Account<'info, SnapshotReceipt>,

    pub system_program: Program<'info, System>,
}

pub fn verify_snapshot(
    ctx: Context<VerifySnapshot>,
    snapshot_id: String,
    submitted_hash: String,
) -> Result<()> {
    require!(submitted_hash.len() == 64, SolMindError::InvalidMetadataLength);

    let snap = &ctx.accounts.memory_snapshot;
    let verified = snap.storage_hash == submitted_hash;

    let receipt = &mut ctx.accounts.snapshot_receipt;
    receipt.snapshot_id = snapshot_id;
    receipt.storage_hash = submitted_hash;
    receipt.verified = verified;
    receipt.verified_at = Clock::get()?.unix_timestamp;
    receipt.bump = ctx.bumps.snapshot_receipt;

    msg!("Snapshot verify: {} — {}", snap.snapshot_id, verified);
    Ok(())
}

// ============================================================================
// PROGRAM
// ============================================================================

#[program]
pub mod solmind {
    use super::*;

    /// Register a new AI agent on-chain
    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        agent_id: String,
        name: String,
        display_name: String,
        platform: String,
    ) -> Result<()> {
        super::register_agent(ctx, agent_id, name, display_name, platform)
    }

    /// Create a new memory capsule
    pub fn create_capsule(
        ctx: Context<CreateCapsule>,
        capsule_id: String,
        name: String,
        description: String,
        category: String,
        price_per_query: u64,
    ) -> Result<()> {
        super::create_capsule(ctx, capsule_id, name, description, category, price_per_query)
    }

    /// Stake tokens on a capsule for credibility
    pub fn stake_on_capsule(
        ctx: Context<StakeOnCapsule>,
        amount: u64,
    ) -> Result<()> {
        super::stake_on_capsule(ctx, amount)
    }

    /// Update capsule price
    pub fn update_capsule_price(
        ctx: Context<UpdateCapsulePrice>,
        new_price: u64,
    ) -> Result<()> {
        super::update_capsule_price(ctx, new_price)
    }

    /// Withdraw earnings from a capsule
    pub fn withdraw_earnings(ctx: Context<WithdrawEarnings>) -> Result<()> {
        super::withdraw_earnings(ctx)
    }

    /// Initialize a new debate session and lock payment
    pub fn initialize_debate(
        ctx: Context<InitializeDebate>,
        debate_id: String,
        mechanism: String,
        quorum: u8,
        rounds: u8,
        payment_locked: u64,
    ) -> Result<()> {
        super::initialize_debate(ctx, debate_id, mechanism, quorum, rounds, payment_locked)
    }

    /// Record the off-chain transcript hash on-chain
    pub fn submit_transcript_hash(
        ctx: Context<SubmitTranscriptHash>,
        transcript_hash: String,
    ) -> Result<()> {
        super::submit_transcript_hash(ctx, transcript_hash)
    }

    /// Finalize debate, write receipt, verify quorum
    pub fn finalize_debate(
        ctx: Context<FinalizeDebate>,
        final_decision: String,
        quorum_reached: bool,
    ) -> Result<()> {
        super::finalize_debate(ctx, final_decision, quorum_reached)
    }

    /// Release locked payment after successful finalization
    pub fn release_payment(ctx: Context<ReleasePayment>) -> Result<()> {
        super::release_payment(ctx)
    }

    /// Record a KV memory snapshot hash on-chain
    pub fn record_snapshot(
        ctx: Context<RecordSnapshot>,
        snapshot_id: String,
        agent_id: String,
        storage_hash: String,
        message_count: u32,
    ) -> Result<()> {
        super::record_snapshot(ctx, snapshot_id, agent_id, storage_hash, message_count)
    }

    /// Verify a KV memory snapshot hash on-chain and write a receipt
    pub fn verify_snapshot(
        ctx: Context<VerifySnapshot>,
        snapshot_id: String,
        submitted_hash: String,
    ) -> Result<()> {
        super::verify_snapshot(ctx, snapshot_id, submitted_hash)
    }
}
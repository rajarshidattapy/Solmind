# PRD — SolMind Debate Primitive

## Multi-Agent LLM Collaboration with On-Chain Arbitration

---

# Product Name

## SolMind Debate Primitive

### Tagline

**Verifiable coordination infrastructure for autonomous AI agents**

---

# Vision

Most AI agent systems today are not trustworthy because collaboration happens off-chain, invisibly, and without verifiable consensus.

When multiple agents need to decide:

* which action to take
* whether a transaction should execute
* whether a memory capsule is trustworthy
* whether a strategy is safe
* whether a proposal should be approved

there is no reliable way to prove:

* how they reached that decision
* whether real deliberation happened
* whether quorum was satisfied
* whether payments should be released

This creates massive trust problems.

SolMind Debate Primitive solves this by making **agent coordination itself a first-class on-chain primitive on Solana.**

Instead of trusting hidden orchestration layers like LangGraph or CrewAI:

we create:

## Debate-as-a-Contract

where:

* debate vs vote is enforced on-chain
* debate transcripts are hashed and stored as receipts
* quorum must be satisfied
* payment release happens only after verified completion

This turns agent collaboration into auditable infrastructure.

---

# Problem Statement

Current agent frameworks:

* LangGraph
* CrewAI
* AutoGen
* OpenAI Swarm

all suffer from the same problem:

## coordination is unverifiable

Problems:

### Hidden Deliberation

Users cannot inspect whether agents truly debated or simply returned outputs.

---

### No Consensus Proof

There is no cryptographic proof that quorum was reached.

---

### Payment Risk

Funds may be released before actual coordination quality is verified.

---

### No Arbitration Layer

There is no trust-minimized decision layer between agent output and economic execution.

---

### No Replayability

No way to audit why a decision happened.

---

This becomes dangerous for:

* agentic payments
* DAO operations
* autonomous trading agents
* treasury execution
* insurance approvals
* governance systems

---

# Product Goal

Build:

## an on-chain coordination primitive

that enables:

### Debate Mode

agents deliberate across multiple rounds before final answer

### Vote Mode

agents independently propose outputs and majority decides

and ensures:

### verifiable receipts

### transcript hashing

### quorum enforcement

### payment locking + release

### trust-minimized execution

---

# Core Hypothesis

Li et al. (2025) show:

## sometimes debate wins

and

## sometimes voting wins

depending on task complexity.

Instead of choosing manually:

we make:

## the mechanism itself programmable

through smart contracts.

This becomes infrastructure.

---

# Target Users

---

# Primary Users

## Agent Runtime Providers

Examples:

* LangGraph
* CrewAI
* AutoGen

Need:

drop-in arbitration layer

---

## AI Infra Builders

Need:

trust-minimized execution

---

## Web3 Agent Protocols

Need:

economic safety for autonomous agents

---

## DAO Tooling Platforms

Need:

provable governance decisions

---

# Secondary Users

## Hackathon Builders

## Protocol Teams

## Solana-native AI Startups

---

# Success Criteria

---

# MVP Success

### debate session successfully created

### agents complete multiple rounds

### transcript generated

### transcript hash stored on-chain

### quorum verified

### payment released only after consensus

### receipt retrievable from frontend

---

# Strong Success

### SDK integration with external frameworks

### reusable arbitration API

### production-grade Anchor contract

---

# Failure Condition

If this feels like “just another chat UI”

it failed.

This must feel like:

## infrastructure

not interface.

---

# Functional Requirements

---

# FEATURE 1 — Debate Session Creation

## User Flow

User selects:

* task
* participating agents
* debate OR vote
* number of rounds
* quorum threshold
* payment amount

then creates session.

---

## Requirements

### API Endpoint

```text
POST /api/v1/debate/start
```

### Payload

```json
{
  "task": "Should treasury execute this swap?",
  "agents": [
    "risk-agent",
    "strategy-agent",
    "compliance-agent"
  ],
  "mechanism": "debate",
  "rounds": 3,
  "quorum": 2,
  "payment_locked": 0.5
}
```

---

# FEATURE 2 — Debate Runtime Engine

## Backend Service

```text
backend/app/services/debate_service.py
```

---

## Responsibilities

### Agent orchestration

spawn agents

---

### Role assignment

example:

* proposer
* critic
* verifier
* judge

---

### Debate rounds

agent A → response

agent B → critique

agent C → verification

repeat

---

### Vote mode

parallel outputs

majority aggregation

---

### Consensus engine

final resolution

---

### Transcript builder

store:

every prompt

every response

every round

every critique

every final output

---

### Transcript hash

SHA-256 hash generation

---

### Receipt generation

proof object for smart contract submission

---

# FEATURE 3 — Smart Contract Arbitration

## New Anchor Program Module

```text
contracts/programs/solmind/src/debate.rs
```

---

# New Accounts

---

## DebateSession

```rust
pub struct DebateSession {
    pub creator: Pubkey,
    pub debate_id: String,
    pub mechanism: String,
    pub quorum: u8,
    pub rounds: u8,
    pub transcript_hash: String,
    pub completed: bool,
    pub payment_locked: u64,
    pub created_at: i64,
    pub bump: u8
}
```

---

## DebateReceipt

```rust
pub struct DebateReceipt {
    pub debate_id: String,
    pub final_decision: String,
    pub quorum_reached: bool,
    pub execution_tx: String,
    pub finalized_at: i64
}
```

---

# Instructions

---

## initialize_debate()

creates session

locks payment

stores mechanism

---

## submit_transcript_hash()

stores transcript receipt

---

## finalize_debate()

stores final decision

verifies quorum

---

## release_payment()

funds released only after successful finalization

---

## cancel_debate()

refund if quorum fails

---

# FEATURE 4 — Frontend Debate Arena

## New Pages

```text
src/pages/DebateArena.tsx
src/pages/DebateReceipt.tsx
```

---

# Debate Arena UI

## Must Show

### participating agents

### selected mechanism

### live round-by-round transcript

### consensus progress

### quorum state

### payment lock state

### final decision

### finalize button

---

# Debate Receipt UI

## Must Show

### transcript hash

### receipt proof

### quorum proof

### payment released

### Solana tx explorer link

### replay transcript

This page is your demo weapon.

---

# FEATURE 5 — SDK Integration

## New SDK Module

```text
solmind-sdk/debate.py
```

---

# Example

```python
from solmind import DebateSession

session = DebateSession(
    task="Should we buy this capsule?",
    agents=["agent1", "agent2", "agent3"],
    mechanism="debate",
    quorum=2
)

result = session.run()
print(result.receipt)
```

This is what sells to infra companies.

---

# Non-Functional Requirements

---

# Performance

debate initialization < 3s

---

# Reliability

receipt must be deterministic

---

# Security

payment cannot release before quorum

---

# Auditability

all decisions replayable

---

# Compatibility

works with existing SolMind agent architecture

Must integrate with current:

* agent service
* capsule service
* wallet service
* Solana contracts 

---

# Demo Scenario (Hackathon Winning Flow)

1. User opens Debate Arena

2. Chooses:

“Should we purchase this memory capsule?”

3. 3 agents begin debate

4. live transcript streams

5. consensus reached

6. transcript hash written on Solana

7. payment releases

8. receipt opens

9. investor says:
   “What the hell is this”

10. you win

This is the goal.

---

# Priority Order

## P0

Backend debate engine

Anchor contract

Receipt page

---

## P1

SDK integration

Vote mode optimization

---

## P2

External runtime integrations

LangGraph adapter

CrewAI adapter

---

# Final Product Positioning

Do NOT pitch as:

“multi-agent chat”

Pitch as:

# Verifiable agent coordination infrastructure

because that is what investors fund.

# PRD — SolMind TurboQuant KV Cache Memory

## Persistent On-Chain Agent Identity via Compressed KV Cache Snapshots

---

# Product Name

## SolMind Persistent Memory Layer

### Tagline

**Verifiable agent memory that survives models, providers, and time**

---

# Vision

Today, almost every “AI memory” product is fake memory.

They store:

* summaries
* embeddings
* vector search results
* extracted notes

But they do not store:

## actual cognition state

The real working memory of an LLM lives inside:

# the KV Cache

—the key-value attention state that preserves reasoning continuity across tokens.

This is the closest thing an LLM has to short-term memory.

The problem:

KV cache is massive.

Too large to persist.

Too expensive to store.

Too provider-dependent.

It dies when the session ends.

This means agents do not truly persist.

They restart.

Every time.

TurboQuant changes this.

Google Research’s TurboQuant shows KV cache quantization can achieve “absolute quality neutrality” at ~3.5 bits/channel and only marginal degradation at 2.5 bits/channel, with strong KV cache compression and long-context retrieval performance. They also report perfect downstream results on needle-in-a-haystack tasks and at least 6x KV memory reduction in benchmark settings. ([arXiv][1])

This creates the opportunity for:

# on-chain persistent agent memory

for the first time.

SolMind uses TurboQuant to:

* snapshot compressed KV cache
* pin it to decentralized storage (Arweave/Filecoin)
* store verification hash on Solana
* restore the memory state at next session start

This creates:

## persistent agent identity

not just persistent chat history.

This is the missing primitive for autonomous agents.

---

# Problem Statement

Current agent memory systems:

* mem0
* vector DB memory
* RAG memory
* summary memory
* context replay

all suffer from the same problem:

## they are approximations

Problems:

---

## Memory ≠ Cognition

Summaries are not thought state.

They are lossy approximations.

---

## Provider Lock-In

Inference providers own the memory state.

Switch providers → lose continuity.

---

## No Verifiability

No cryptographic proof of what memory existed.

---

## No True Persistence

Sessions end → cognition disappears.

---

## No Agent Identity

The “same agent” is actually a new agent every time.

This kills:

* autonomous finance agents
* treasury bots
* long-term assistants
* governance agents
* persistent copilots
* stateful AI runtimes

---

# Product Goal

Build:

# Persistent KV Memory Infrastructure

that allows agents to:

### snapshot cognition

### compress cognition

### persist cognition

### verify cognition

### restore cognition

across:

* sessions
* providers
* wallets
* time

without trusting inference providers.

---

# Core Hypothesis

If TurboQuant preserves retrieval quality at extreme compression:

then:

## KV cache becomes portable memory

and

## portable memory becomes agent identity

This transforms SolMind from:

“memory marketplace”

into

# cognition infrastructure

which is a much bigger company.

---

# Target Users

---

# Primary Users

## Stateful Agent Runtime Providers

Examples:

* LangGraph
* CrewAI
* AutoGen

Need:

persistent memory independent of provider

---

## AI Infra Builders

Need:

verifiable agent state

---

## Solana-native Agent Protocols

Need:

ownership + persistence of cognition

---

## Autonomous Finance Systems

Need:

long-lived agents with trusted continuity

---

# Secondary Users

## Web3 AI Startups

## Research Teams

## Hackathon Builders

---

# Success Criteria

---

# MVP Success

### successful KV snapshot creation

### TurboQuant compression applied

### decentralized storage upload succeeds

### content hash stored on Solana

### agent restored from snapshot

### restored output quality remains acceptable

### visible memory timeline on frontend

---

# Strong Success

### provider switching works seamlessly

### restore quality is near-lossless

### multiple snapshot rollback supported

### SDK integration works for external runtimes

---

# Failure Condition

If this becomes:

“chat history with extra steps”

it failed.

This must feel like:

# cognition persistence

not storage.

---

# Functional Requirements

---

# FEATURE 1 — KV Snapshot Engine

## New Backend Service

```text
backend/app/services/kv_memory_service.py
```

---

# Responsibilities

### extract KV cache

capture model KV state after session end

---

### TurboQuant compression

apply quantization pipeline

target:

3–4 bit effective representation

TurboQuant uses a data-oblivious quantization approach and reports quality neutrality at 3.5 bits/channel with marginal degradation at 2.5 bits/channel. ([arXiv][1])

---

### serialization

convert compressed state into portable snapshot object

---

### metadata generation

store:

* agent_id
* model
* provider
* session_id
* created_at
* compression ratio
* checksum
* snapshot size

---

### verification hash

SHA-256 hash generation

---

### restore pipeline

reconstruct KV state on next session

---

# FEATURE 2 — Decentralized Storage Layer

## Storage Targets

### Arweave

### Filecoin

---

# Flow

```text
Session Ends
→ KV Cache Snapshot
→ TurboQuant Compression
→ Serialize Snapshot
→ Upload to Arweave/Filecoin
→ Content Hash Returned
→ Hash Stored on Solana
→ Immutable Memory Receipt Created
```

---

# Requirements

### snapshot must be immutable

### content-addressable retrieval required

### ownership must be verifiable

### storage must survive provider failure

---

# FEATURE 3 — Smart Contract Layer

## New Anchor Program Module

```text
contracts/programs/solmind/src/memory_snapshot.rs
```

---

# New Accounts

---

## MemorySnapshot

```rust
pub struct MemorySnapshot {
    pub owner: Pubkey,
    pub agent_id: String,
    pub snapshot_id: String,
    pub storage_hash: String,
    pub compression_ratio: u16,
    pub model_name: String,
    pub created_at: i64,
    pub verified: bool,
    pub bump: u8
}
```

---

## SnapshotReceipt

```rust
pub struct SnapshotReceipt {
    pub snapshot_id: String,
    pub restore_verified: bool,
    pub provider_origin: String,
    pub restored_at: i64
}
```

---

# Instructions

---

## save_snapshot()

stores immutable reference

---

## verify_snapshot()

verifies integrity hash

---

## restore_snapshot()

registers restoration proof

---

## rollback_snapshot()

restore older cognition state

---

## transfer_snapshot_ownership()

supports agent ownership transfer

This becomes powerful for capsule sales.

---

# FEATURE 4 — API Layer

## New Routes

```text
/api/v1/kv-memory/
```

---

# Endpoints

---

## POST /snapshot

create snapshot

### Payload

```json
{
  "agent_id": "agent-001",
  "session_id": "chat-123",
  "provider": "OpenRouter",
  "model": "gemma-3-27b"
}
```

---

## GET /restore/{agent_id}

restore latest snapshot

---

## GET /history/{agent_id}

fetch full memory timeline

---

## POST /rollback/{snapshot_id}

restore prior state

---

## GET /verify/{snapshot_id}

verify integrity proof

---

# FEATURE 5 — Frontend Memory Timeline

## New Pages

```text
src/pages/MemoryTimeline.tsx
src/pages/SnapshotReceipt.tsx
```

---

# Memory Timeline UI

## Must Show

### snapshot history

### compression ratio

### model/provider used

### snapshot verification state

### restore points

### rollback button

### ownership proof

### Solana explorer links

---

# Snapshot Receipt UI

## Must Show

### storage hash

### Arweave/Filecoin proof

### Solana verification hash

### restored successfully

### provider independence proof

### replay continuity proof

This page is your demo killer.

---

# FEATURE 6 — SDK Integration

## New SDK Module

```python
from solmind import PersistentMemory

memory = PersistentMemory(
    agent_id="oracle-agent"
)

memory.snapshot()

memory.restore()

memory.rollback("snapshot-123")
```

---

## New File

```text
solmind-sdk/memory.py
```

This is what makes it sellable.

Infra people buy SDKs.

Not dashboards.

---

# Non-Functional Requirements

---

# Performance

snapshot creation < 5s

restore latency < 3s

---

# Reliability

hash verification must be deterministic

---

# Security

snapshot tampering must be impossible

---

# Auditability

full memory lineage must be replayable

---

# Compatibility

must work with current SolMind architecture:

* agent service
* memory service
* capsule service
* wallet service
* Solana contracts 

---

# Research Validation Layer (Important)

Because this is a frontier idea:

you must prove:

## restoration quality

not assume it.

---

# Required Benchmarks

### long-context retrieval

### memory continuity tasks

### needle-in-a-haystack recall

### multi-session reasoning consistency

TurboQuant reports perfect downstream results on needle-in-a-haystack tasks and strong LongBench performance while reducing KV memory footprint significantly, making this benchmark alignment critical. ([Google Research][2])

---

# Demo Scenario (Hackathon Winning Flow)

1. User chats with agent

2. Agent builds context

3. Session ends

4. KV cache snapshot created

5. TurboQuant compresses memory

6. snapshot pinned to Arweave/Filecoin

7. proof stored on Solana

8. new session starts

9. memory restored instantly

10. agent remembers prior reasoning

11. investor asks:
    “How is this not magic?”

12. you win

That is the goal.

---

# Priority Order

## P0

snapshot engine

storage proof

restore flow

frontend timeline

---

## P1

rollback system

SDK integration

ownership transfer

---

## P2

cross-provider rehydration

capsule sales using cognition state

full portable agent identity layer

---

# Final Product Positioning

Do NOT pitch as:

“memory storage”

Pitch as:

# Verifiable Persistent Agent Identity Infrastructure

because that is the real business.

[1]: https://arxiv.org/abs/2504.19874?utm_source=chatgpt.com "TurboQuant: Online Vector Quantization with Near-optimal Distortion Rate"
[2]: https://research.google/blog/turboquant-redefining-ai-efficiency-with-extreme-compression/?utm_source=chatgpt.com "TurboQuant: Redefining AI efficiency with extreme ..."

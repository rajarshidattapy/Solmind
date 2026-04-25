# SolMind

**Stateful AI runtime + verifiable multi-agent coordination on Solana.**

SolMind transforms stateless LLM APIs into persistent, composable, and monetizable AI agents — with long-term memory, on-chain coordination, and cryptographic proof of decision-making.

It combines three core primitives:

### 🧠 Memory Capsules

Agents accumulate semantic memory across conversations and package it into reusable intelligence capsules that can be published, queried, staked on, and monetized.

### ⚖️ Debate Primitive

Multiple agents deliberate or vote on tasks, with structured rounds, quorum enforcement, transcript hashing (SHA-256), and on-chain finalization via Solana. Every decision produces a verifiable receipt.

### 💾 KV Memory Layer

TurboQuant-inspired persistent memory snapshots compress full conversation state, generate integrity hashes, and anchor them on-chain—allowing restore, rollback, and verification of agent memory across sessions.

---

## Why it matters

Today’s LLMs are stateless.

* No persistent memory
* No intelligence compounding
* No cross-app reusable reasoning
* No verifiable agent coordination

SolMind fixes that.

It creates a runtime where AI agents remember, collaborate, prove decisions, and generate revenue—without being locked to a single inference provider.

---

## Architecture

```text
Frontend (React + Vite)
   ↕ REST + SSE
Backend (FastAPI + Python)
   ├── LLM Service (OpenRouter)
   ├── Debate Engine
   ├── Memory Engine
   ├── Capsule Marketplace
   └── Snapshot + Verification Layer
   ↕ JSON-RPC
Solana (Anchor Programs)
   ├── Agent registration
   ├── Capsule staking + payments
   ├── Debate receipts
   └── Memory hash anchoring
```

---

## Stack

* **Frontend:** React, Vite, Tailwind CSS
* **Backend:** FastAPI, Python
* **LLM Layer:** OpenRouter
* **Memory:** Supermemory + compressed state snapshots
* **Storage:** Filecoin via Lighthouse (permanent snapshot pinning)
* **Blockchain:** Solana + Anchor
* **Payments:** SOL micropayments + staking primitives

---

## Running locally

**Backend**
```bash
cd backend
pip install -r requirements.txt
cp ../.env.example .env
uvicorn main:app --reload
```

**Frontend**
```bash
npm install
npm run dev
```

**Environment variables** (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key for LLM calls |
| `SUPERMEMORY_API_KEY` | No | Semantic memory (graceful fallback if missing) |
| `LIGHTHOUSE_API_KEY` | No | Filecoin snapshot pinning via [lighthouse.storage](https://files.lighthouse.storage/dashboard) |

---

## SDK

```bash
cd solmind-sdk
pip install -e .
```

**Debate**
```python
from solmind import DebateSession

result = DebateSession(
    task="Should we execute this treasury swap?",
    agents=["agent1", "agent2"],
    mechanism="debate",
    quorum=2,
).run()

print(result.final_decision)    # "APPROVED" | "REJECTED"
print(result.transcript_hash)   # SHA-256
print(result.quorum_reached)    # bool
```

**Memory**
```python
from solmind import PersistentMemory

mem = PersistentMemory(agent_id="oracle-agent")

snap = mem.snapshot(chat_id="chat-123")
print(snap.compression_ratio)   # e.g. 4.2x
print(snap.bits_per_token)      # e.g. 3.8 (FP16 baseline = 16)
print(snap.filecoin_cid)        # IPFS CID if LIGHTHOUSE_API_KEY is set

mem.verify(snap.id)             # re-derives SHA-256, returns verified=True/False
mem.restore()                   # decompress + return messages
mem.rollback("snap-abc123")     # restore older state
```

---

## Core Outcome

**Turn conversations into on-chain intelligence.**

Not just chat.
Persistent agents.
Verifiable reasoning.
Programmable memory.
Monetizable intelligence.

  

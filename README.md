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
* **Blockchain:** Solana + Anchor
* **Payments:** SOL micropayments + staking primitives

---

## Core Outcome

**Turn conversations into on-chain intelligence.**

Not just chat.
Persistent agents.
Verifiable reasoning.
Programmable memory.
Monetizable intelligence.

  

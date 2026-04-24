# SolMind — Codebase Reference

## What It Is

SolMind is a **stateful AI runtime built on Solana**. It solves the statelessness problem of LLM APIs by giving AI agents persistent memory that lives on-chain. Users can create agents, chat with them, package their learned context into "memory capsules," and sell or share those capsules on a marketplace — all backed by SOL staking and micropayments.

Built for the Denova Hackathon.

---

## Repository Layout

```
Solmind/
├── src/                  # React frontend
├── backend/              # FastAPI Python backend
├── contracts/            # Solana smart contracts (Anchor/Rust)
├── solmind-sdk/          # Python SDK for external integrations
├── docs/                 # Documentation
├── index.html            # Frontend entry point
├── package.json          # Frontend dependencies
├── vite.config.ts        # Vite build config
├── tailwind.config.js    # Tailwind CSS config
├── vercel.json           # Vercel deployment config
└── env.example           # Environment variable template
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router v7 |
| Backend | FastAPI (Python), Uvicorn, Pydantic v2 |
| Database | Supabase (PostgreSQL) |
| Cache | Upstash Redis / Vercel KV |
| Memory | mem0ai + ChromaDB (local) or mem0 Platform (hosted) |
| LLM | OpenRouter (aggregates GPT-4, Claude, Mistral, Gemma) |
| Blockchain | Solana (devnet/mainnet), Anchor 0.30, Rust |
| Wallet | @solana/wallet-adapter (Phantom) |
| Deployment | Vercel |

---

## Frontend (`/src`)

### Entry & Routing

| File | Role |
|---|---|
| `src/main.tsx` | React entry point |
| `src/App.tsx` | Router — three top-level routes: `/` (landing), `/app/*` (main app), `/developers` |
| `src/index.css`, `src/globals.css` | Global styles |

### Pages

| File | What it renders |
|---|---|
| `pages/LandingPage.tsx` | Public marketing page |
| `pages/MainApp.tsx` | App shell with tab navigation (agents / marketplace / wallet / settings) |
| `pages/AgentsView.tsx` | List and manage the user's AI agents |
| `pages/AgentChat.tsx` | Active chat session with an agent |
| `pages/ChatInterface.tsx` | Example/placeholder chat UI |
| `pages/Marketplace.tsx` | Browse and purchase memory capsules |
| `pages/MarketplaceView.tsx` | Marketplace listing view |
| `pages/CapsuleDetail.tsx` | Individual capsule detail page |
| `pages/MemoryCapsuleView.tsx` | Manage a user's own memory capsules |
| `pages/Staking.tsx` | Stake SOL on capsules |
| `pages/EarningsDashboard.tsx` | Earnings history and stats |
| `pages/WalletBalance.tsx` | Wallet SOL balance display |
| `pages/WalletView.tsx` | Full wallet info view |
| `pages/ImportChats.tsx` | Import chats from external sources |
| `pages/Settings.tsx` | User preferences |
| `pages/DevelopersPage.tsx` | SDK and API docs for external developers |

### Components & Hooks

| File | Role |
|---|---|
| `components/Navbar.tsx` | Top navigation bar with tab switching |
| `contexts/WalletContextProvider.tsx` | Solana wallet adapter setup (Phantom, devnet) |
| `hooks/useCapsuleQuery.ts` | Query capsule data |
| `hooks/useSolanaBalance.ts` | Fetch live SOL wallet balance |

### Utilities & Libraries

| File | Role |
|---|---|
| `lib/api.ts` | Centralized `ApiClient` class — all HTTP calls to backend (agents, chats, capsules, marketplace, wallet, preferences). Injects `X-Wallet-Address` header for auth. |
| `utils/solanaPayment.ts` | Build and sign Solana System Program transfer transactions; wait for confirmation |
| `utils/storage.ts` | Local storage read/write helpers |

---

## Backend (`/backend`)

### Entry & Configuration

| File | Role |
|---|---|
| `main.py` | FastAPI app setup, router registration, CORS middleware, lifespan hooks |
| `app/core/config.py` | `Settings` (Pydantic BaseSettings) — reads all env vars: Supabase, Redis, LLM keys, Solana RPC, JWT config |
| `app/core/auth_dependencies.py` | Extracts wallet address from `X-Wallet-Address` request header |
| `app/db/database.py` | Supabase client init; falls back to in-memory storage if unconfigured |
| `app/models/schemas.py` | All Pydantic request/response schemas (Message, Chat, Agent, Capsule, Staking, etc.) |

### API Routes

**Agents** — `/api/v1/agents/`

| Method + Path | What it does |
|---|---|
| `GET /` | List all agents for the authenticated wallet |
| `POST /` | Create a new agent |
| `GET /{agent_id}/chats` | List chats for an agent |
| `POST /{agent_id}/chats` | Create a new chat session |
| `GET /{agent_id}/chats/{chat_id}/messages` | Get all messages in a chat |
| `POST /{agent_id}/chats/{chat_id}/messages` | Send a message (non-streaming) |
| `POST /{agent_id}/chats/{chat_id}/messages/stream` | Send a message (streaming SSE) |
| `GET /{agent_id}/chats/{chat_id}/memories` | Get stored memories for a chat |
| `DELETE /{agent_id}/chats/{chat_id}` | Delete a chat |
| `POST /{agent_id}/stake` | Stake SOL on an agent (creates a capsule) |

**Capsules** — `/api/v1/capsules/`

| Method + Path | What it does |
|---|---|
| `GET /` | List user's capsules |
| `POST /` | Create a capsule |
| `GET /{capsule_id}` | Get capsule details |
| `PUT /{capsule_id}` | Update capsule metadata |
| `DELETE /{capsule_id}` | Delete capsule |
| `POST /{capsule_id}/query` | Query a capsule (triggers micropayment) |

**Marketplace** — `/api/v1/marketplace/`

| Method + Path | What it does |
|---|---|
| `GET /` | Browse with filters (category, reputation, price, sort, pagination) |
| `GET /trending` | Trending capsules by query count |
| `GET /categories` | Available categories |
| `GET /search` | Full-text search |
| `GET /debug` | Debug: inspect raw capsule data |

**Wallet** — `/api/v1/wallet/`

| Method + Path | What it does |
|---|---|
| `GET /balance` | Get SOL balance via Solana RPC |
| `GET /earnings` | Get earnings history |
| `GET /staking` | Get staking info |
| `POST /staking` | Create staking entry |

**Preferences** — `/api/v1/preferences/`

| Method + Path | What it does |
|---|---|
| `GET /` | Get user preferences |
| `POST /` | Update preferences |
| `DELETE /` | Clear preferences |

**Health**

| Path | What it does |
|---|---|
| `GET /` | Root health check |
| `GET /health` | Health status with dependency info |

### Services

| File | Responsibility |
|---|---|
| `services/agent_service.py` | Agent and chat CRUD. Storage priority: Redis → Supabase → in-memory fallback. |
| `services/llm_service.py` | Multi-LLM completions via OpenRouter. Default model: Gemma 3 27B (free tier). Injects memory context into system prompt. Supports streaming (SSE) and non-streaming. |
| `services/memory_service.py` | Semantic memory via mem0. Hosted (mem0 Platform) or local (mem0 + ChromaDB). Per-chat isolation. Configurable memory size (Small / Medium / Large). |
| `services/capsule_service.py` | Capsule CRUD, query execution, payment tracking, metadata handling. |
| `services/wallet_service.py` | SOL balance from Solana RPC, earnings from DB, staking management. |
| `services/marketplace_service.py` | Capsule discovery with filters and sorting. Only surfaces capsules with `stake_amount > 0`. |
| `services/cache_service.py` | Upstash Redis client (Vercel KV) with in-memory fallback. Caches agent lists and preferences. |

---

## Solana Smart Contracts (`/contracts`)

Built with **Anchor 0.30** / Rust. Deployed to **Solana testnet**.

**Program ID:** `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`

### Constants

| Constant | Value |
|---|---|
| `MAX_PRICE_PER_QUERY` | 100 SOL |
| `MIN_PRICE_PER_QUERY` | 0.0001 SOL |
| `MAX_STAKE` | 1000 SOL |
| `MIN_STAKE` | 0.001 SOL |

### Account Types

| Account | Fields |
|---|---|
| `Agent` | owner, agent_id, name, display_name, platform, created_at, usage_count, reputation, bump |
| `Capsule` | (capsule data: owner, pricing, stake, metadata) |
| `Payment` | (payment record: payer, amount, capsule) |
| `Staking` | (stake record: staker, amount, capsule) |

### Error Codes

`InvalidAgentOwner`, `InvalidCapsuleOwner`, `CapsuleNotFound`, `InsufficientStake`, `InsufficientPayment` (and others)

---

## Python SDK (`/solmind-sdk`)

A minimal SDK so external developers can connect their own code to a SolMind agent.

```python
from solmind import Agent

agent = Agent(
    agent_id="custom-xxx",
    chat_id="uuid",
    wallet_address="<Solana wallet pubkey>",
    base_url="http://localhost:8000"
)
response = agent.chat("Your message here")
```

| File | Role |
|---|---|
| `solmind/agent.py` | `Agent` class — wraps a single agent+chat session, exposes `.chat()` |
| `solmind/client.py` | `SolmindClient` — HTTP client, injects `X-Wallet-Address` header, handles errors |
| `solmind/errors.py` | `AuthenticationError`, `SolmindRuntimeError` |
| `solmind/types.py` | `ChatResponse` type |

---

## Environment Variables

Defined in `env.example` and loaded via `python-dotenv` (backend) and Vite (frontend).

```
# Server
DEBUG=True
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:8080,...

# Supabase
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_KEY=

# Redis / Vercel KV
KV_REST_API_URL=
KV_REST_API_TOKEN=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# LLM Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
MISTRAL_API_KEY=
OPENROUTER_API_KEY=
MEM0_API_KEY=

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# JWT
SECRET_KEY=
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

---

## Data Flow

### Sending a Chat Message

```
User types message
  → ApiClient.sendMessage() [src/lib/api.ts]
  → POST /api/v1/agents/{id}/chats/{id}/messages/stream
  → auth_dependencies extracts wallet from header
  → agent_service validates agent ownership
  → memory_service fetches relevant memories (mem0)
  → llm_service builds prompt (system + memories + history)
  → llm_service streams OpenRouter response (SSE)
  → memory_service stores new memory in the background
  → response streamed to frontend
```

### Querying a Capsule (Marketplace)

```
User pays SOL for capsule query
  → solanaPayment.ts builds System Program transfer tx
  → Phantom wallet signs tx
  → tx confirmed on-chain
  → POST /api/v1/capsules/{id}/query with tx signature
  → capsule_service executes query against capsule memories
  → returns result + records payment in earnings
```

### Storage Priority (Backend)

```
Redis (Vercel KV)  ← fastest, primary for agents + preferences
    ↓ fallback
Supabase (PostgreSQL)  ← persistent relational store
    ↓ fallback
In-memory dict  ← development / no-config fallback
```

---

## Running Locally

**Frontend**
```bash
npm install
npm run dev        # starts on http://localhost:8080
```

**Backend**
```bash
cd backend
pip install -r requirements.txt
cp ../env.example .env   # fill in keys
uvicorn main:app --reload --port 8000
```

Vite proxies `/api` → `localhost:8000` in dev (configured in `vite.config.ts`).

---

## Key Design Decisions

- **Auth is wallet-based** — no passwords. The `X-Wallet-Address` header is the user identity everywhere.
- **Memory is isolated per chat** — `chat_id` is used as the mem0 namespace so agents don't bleed context between sessions.
- **Marketplace only shows staked capsules** — `stake_amount > 0` is the gating condition, creating a credibility signal.
- **Storage degrades gracefully** — Redis → Supabase → in-memory means the app runs even without a full infrastructure setup.
- **Payments are client-signed** — the frontend builds and signs Solana transactions; the backend only verifies the signature, never holds keys.

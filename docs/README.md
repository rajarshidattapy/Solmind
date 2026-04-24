# 🧠 SolMind: Turn AI conversations into on-chain intelligence

<div align="center">


<video src="https://github.com/user-attachments/assets/5663beec-21b5-42bc-8cde-71620eb9dc3c" controls></video>

*Built for Denova Hackathon*

[![Built with FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Solana](https://img.shields.io/badge/Solana-Native-14F195?style=flat-square&logo=solana)](https://solana.com/)

</div>

---

## 🚀 What is SolMind?

**SolMind** is a **stateful AI runtime** that transforms stateless LLM APIs into persistent, composable, and monetizable AI agents. Built natively on Solana, SolMind enables AI agents with long-term memory, cross-application intelligence sharing, and programmable economic controls.

### The Problem

Today's LLM APIs (GPT, Claude, Mistral) are **stateless**:
- ❌ No persistent memory
- ❌ No intelligence compounding  
- ❌ Every app re-prompts from scratch
- ❌ Siloed intelligence locked in single apps

### The Solution

SolMind introduces a **runtime layer** that:
- ✅ Adds long-term memory to any LLM
- ✅ Creates reusable intelligence capsules
- ✅ Enables cross-app intelligence sharing
- ✅ Provides programmable access controls via Solana
- ✅ Turns conversations into revenue-generating assets

---

## ✨ Key Features

### 🎯 **Stateful AI Runtime**
Inject persistent memory into stateless LLM APIs. Every conversation builds intelligence that compounds over time.

### 💊 **Memory Capsules**
Package domain-specific intelligence into isolated, reusable capsules. Each capsule has its own memory store and can be published, shared, or monetized.

### 🏪 **Intelligence Marketplace**
Browse, search, and discover AI capsules. Filter by category, reputation, price, and usage metrics.

### 💰 **Web3-Native Monetization**
- **Staking**: Signal credibility by staking SOL behind your capsules
- **Micropayments**: Lightning-fast Solana payments per query (0.0001s settlement)
- **Earnings Dashboard**: Track revenue, queries, and reputation
- **Wallet Integration**: Seamless Solana wallet connection

### 🧩 **Multi-LLM Support**
- OpenAI (GPT-4)
- Anthropic (Claude 3.5 Sonnet)
- Mistral AI
- OpenRouter (aggregator)

### 🐍 **Python SDK**
Simple SDK for developers to integrate persistent agents into any application:

```python
from solmind import Agent

agent = Agent(
    agent_id="your-agent-id",
    chat_id="your-chat-id",
    wallet_address="YourSolanaWalletAddress",
    base_url="http://localhost:8000"
)

response = agent.chat("Your message here")
```

---

## 🏗️ Architecture

```
Application → SolMind Runtime → LLM API
                ↓
         Memory Layer (mem0/ChromaDB)
                ↓
         Intelligence Capsules
                ↓
         Solana (Identity & Payments)
```

### Tech Stack

**Frontend**
- React 18.3 + TypeScript
- Vite 5.4
- Tailwind CSS
- Solana Web3.js
- React Router v7

**Backend**
- FastAPI 0.109
- Python 3.10+
- Supabase (PostgreSQL)
- mem0 + ChromaDB (Vector Memory)
- Upstash Redis (Caching)

**Blockchain**
- Solana
- Wallet Adapter

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- Solana wallet (Phantom recommended)
- Supabase account (optional)
- LLM API keys (OpenAI, Anthropic, or Mistral)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your keys

# Run migrations (if using Supabase)
# See docs/SETUP.md for details

# Start server
uvicorn main:app --reload
```

Backend runs on `http://localhost:8000`

### Frontend Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env if needed

# Start dev server
npm run dev
```

Frontend runs on `http://localhost:8080`

### Python SDK Setup

```bash
cd solmind-sdk

# Install in development mode
pip install -e .

# Or install normally
pip install .
```

---

## 📚 Documentation

- [Setup Guide](./docs/SETUP.md)
- [Architecture Overview](./docs/REPO.md)
- [Backend Documentation](./docs/backend.md)
- [Storage Architecture](./docs/STORAGE_ARCHITECTURE.md)
- [Supabase Setup](./docs/supabase.md)

---

## 🎨 Features in Detail

### 1. Chat & Compose
Engage with foundational models. SolMind structures conversations into reusable reasoning patterns as you go.

### 2. Package Intelligence
Seal your intelligence into **Memory Capsules**. Define metadata, specialized context, and pricing models.

### 3. Stake for Credibility
Stake SOL behind your capsule to signal reputation and boost visibility in the marketplace.

### 4. Monetize Instantly
Each query triggers a lightning-fast Solana micropayment. Permissionless, transparent, and direct.

---

## 🔌 API Endpoints

- `GET /api/v1/agents` - List agents
- `POST /api/v1/agents` - Create agent
- `GET /api/v1/agents/{id}/chats` - List chats
- `POST /api/v1/agents/{id}/chats/{id}/messages` - Send message
- `GET /api/v1/capsules` - List capsules
- `POST /api/v1/capsules` - Create capsule
- `GET /api/v1/marketplace` - Browse marketplace
- `GET /api/v1/wallet/balance` - Get wallet balance

Full API documentation available at `/docs` when backend is running.

---

## 🛣️ Roadmap

### Phase 1 ✅ (Current)
- Chat UI
- Memory capsules
- Python SDK
- Multi-LLM backend
- Solana wallet integration

### Phase 2 🚧 (In Progress)
- Enhanced marketplace
- Staking & reputation system
- Earnings analytics
- Capsule import/export

### Phase 3 🔮 (Future)
- ZK verification layer
- Multi-agent orchestration
- Ecosystem integrations
- Advanced memory strategies

---

## 🤝 Contributing

This project was built for the **Denova Hackathon**. Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is part of the Denova Hackathon. See repository for license details.

---

## 🌟 Acknowledgments

- Built for **Denova Hackathon**
- Powered by Solana
- Memory layer powered by mem0
- UI components from Lucide React

---

<div align="center">

**Turn ephemeral chats into persistent, composable intelligence.**

[Get Started](#-quick-start) • [Documentation](./docs/) • [Marketplace](#-key-features)

</div>


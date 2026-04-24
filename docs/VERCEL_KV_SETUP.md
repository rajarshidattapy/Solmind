# Vercel KV (Redis) Setup Guide

## Overview
This guide explains how to set up Vercel KV (Redis) for server-side caching and user preferences storage in SolMind.

## What is Vercel KV?
Vercel KV is a Redis-compatible key-value store powered by Upstash. It provides:
- Fast server-side caching
- User preferences storage
- Session management
- Cross-device synchronization

## Setup Steps

### 1. Create Vercel KV Database

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project (or create one)
3. Go to **Storage** → **Create Database** → **KV**
4. Choose a name for your KV database
5. Select a region (choose closest to your backend)

### 2. Get Connection Credentials

After creating the database, you'll see:
- **KV_REST_API_URL** - The REST API endpoint
- **KV_REST_API_TOKEN** - The authentication token

Copy these values.

### 3. Configure Backend Environment Variables

Add to your `backend/.env` file:

```env
# Vercel KV (Redis) Configuration
KV_REST_API_URL=https://your-kv-database.upstash.io
KV_REST_API_TOKEN=your-token-here
```

**Alternative variable names** (also supported):
```env
UPSTASH_REDIS_REST_URL=https://your-kv-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

### 4. Install Python Dependencies

```bash
cd backend
pip install upstash-redis
```

Or update requirements.txt:
```bash
pip install -r requirements.txt
```

### 5. Verify Setup

Start your backend server:
```bash
python main.py
```

You should see:
```
✅ Vercel KV (Redis) connected successfully
```

If you see:
```
⚠️  Vercel KV/Redis not available. Using in-memory cache (data lost on restart).
```

Check:
- Environment variables are set correctly
- `upstash-redis` is installed
- Credentials are valid

## Usage

### Backend (Python)

The cache service is automatically initialized. Use it in your code:

```python
from app.services.cache_service import cache_service

# Get user preferences
prefs = cache_service.get_user_preferences(wallet_address)

# Set user preferences (30 days TTL)
cache_service.set_user_preferences(wallet_address, {
    "default_model": "claude-3.5-sonnet",
    "memory_behavior": "adaptive"
})

# Cache chat list (5 minutes TTL)
cache_service.set_chat_cache(agent_id, wallet_address, chats)

# Get cached chats
cached_chats = cache_service.get_chat_cache(agent_id, wallet_address)
```

### Frontend (TypeScript)

Use the API client to access preferences:

```typescript
import { useApiClient } from '../lib/api';

const api = useApiClient();

// Get preferences
const prefs = await api.getPreferences();

// Update preferences
await api.updatePreferences({
  default_model: 'claude-3.5-sonnet',
  memory_behavior: 'adaptive'
});
```

## What Gets Stored Where?

### Vercel KV (Redis) - Server-Side
- ✅ User preferences (default model, memory behavior)
- ✅ Cached chat lists (5 min TTL)
- ✅ Session data
- ✅ Temporary API response cache

### localStorage - Client-Side
- ✅ UI state (active tab, selected chat)
- ✅ Temporary navigation state
- ✅ Client-side preferences

### Supabase (PostgreSQL) - Persistent
- ✅ Agents
- ✅ Chats
- ✅ Messages
- ✅ Capsules
- ✅ All persistent data

## Fallback Behavior

If Vercel KV is not configured:
- Cache service falls back to in-memory storage
- Data is lost on server restart
- App continues to function normally
- All persistent data still goes to Supabase

## Pricing

Vercel KV offers a free tier:
- **Free Tier:** 10,000 commands/day
- **Pro:** $0.20 per 100K commands

For most applications, the free tier is sufficient.

## Troubleshooting

### "Redis connection failed"
- Check environment variables are set
- Verify credentials are correct
- Ensure `upstash-redis` is installed

### "KV credentials not found"
- Add `KV_REST_API_URL` and `KV_REST_API_TOKEN` to `.env`
- Restart the backend server

### Data not persisting
- Check if Redis is actually connected (look for ✅ message)
- Verify TTL settings (data expires after TTL)
- Check Redis dashboard for stored keys

## API Endpoints

Once set up, these endpoints are available:

- `GET /api/v1/preferences/` - Get user preferences
- `POST /api/v1/preferences/` - Update user preferences
- `DELETE /api/v1/preferences/` - Clear user preferences

All endpoints require wallet authentication via `X-Wallet-Address` header.


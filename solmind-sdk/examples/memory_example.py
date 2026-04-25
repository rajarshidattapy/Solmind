"""
Example: Snapshot, verify, and restore agent memory using the SolMind SDK.

Requires:
  - SolMind backend running on localhost:8000
  - LIGHTHOUSE_API_KEY set in backend/.env for Filecoin pinning (optional)
"""

from solmind import PersistentMemory

AGENT_ID = "gpt"
CHAT_ID  = "replace-with-a-real-chat-id"  # from GET /api/v1/agents/{id}/chats

mem = PersistentMemory(agent_id=AGENT_ID)

# 1. Snapshot current conversation state
print("Creating snapshot…")
snap = mem.snapshot(chat_id=CHAT_ID)
print(snap)
print(f"  SHA-256:           {snap.storage_hash}")
print(f"  Compression ratio: {snap.compression_ratio}x")
print(f"  Bits per token:    {snap.bits_per_token}")
if snap.filecoin_cid:
    print(f"  Filecoin CID:      {snap.filecoin_cid}")
    print(f"  Gateway URL:       {snap.filecoin_gateway_url}")
else:
    print("  Filecoin:          not configured (set LIGHTHOUSE_API_KEY in backend/.env)")

# 2. Verify hash integrity
print("\nVerifying…")
v = mem.verify(snap.id)
print(f"  verified={v['verified']}  expected={v['expected_hash'][:16]}…")

# 3. List history
print("\nSnapshot history:")
for s in mem.history():
    print(f"  {s.id}  {s.message_count} msgs  {s.compression_ratio}x  {s.created_at[:19]}")

# 4. Restore (would be used to inject messages into a new session)
print("\nRestoring latest snapshot…")
restored = mem.restore()
print(restored)
print(f"  {len(restored.messages)} messages restored")
print(f"  Hash verified: {restored.restore_verified}")

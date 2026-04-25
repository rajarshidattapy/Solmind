"""
Example: Run a multi-agent debate using the SolMind SDK.

Requires:
  - SolMind backend running on localhost:8000
  - At least 2 agents registered (via POST /api/v1/agents/ or the UI)
"""

from solmind import DebateSession

result = DebateSession(
    task="Should we execute this 10 SOL treasury swap from USDC to SOL?",
    agents=["gpt", "mistral"],   # use agent IDs from your backend
    mechanism="debate",
    quorum=2,
    rounds=3,
).run(on_event=lambda e: print(f"[{e.get('type')}] {e.get('agent_name', '')} {e.get('role', '')}"))

print()
print("Decision:      ", result.final_decision)
print("Quorum reached:", result.quorum_reached)
print("Transcript hash:", result.transcript_hash)
print("Debate ID:      ", result.debate_id)
print()
print(f"Full transcript: {len(result.transcript)} entries across {len(set(e.round for e in result.transcript))} rounds")

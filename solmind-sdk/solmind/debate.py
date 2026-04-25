"""
SolMind Debate SDK — verifiable multi-agent coordination.

Usage:
    from solmind import DebateSession

    result = DebateSession(
        task="Should we execute this treasury swap?",
        agents=["agent1", "agent2", "agent3"],
        mechanism="debate",
        quorum=2,
        rounds=3,
    ).run()

    print(result.final_decision)   # "APPROVED" or "REJECTED"
    print(result.transcript_hash)  # SHA-256 of full transcript
    print(result.quorum_reached)   # bool
"""

from __future__ import annotations
from typing import Callable, List, Optional
from .client import SolmindClient
from .types import DebateEvent, DebateResult, TranscriptEntry


class DebateSession:
    """
    Runs a structured debate or vote among agents and returns a verifiable receipt.

    Parameters
    ----------
    task        : The question or task for agents to deliberate on.
    agents      : List of agent IDs (must be registered in the SolMind backend).
    mechanism   : "debate" (multi-round deliberation) or "vote" (parallel majority).
    quorum      : Minimum number of agents that must agree for consensus.
    rounds      : Number of debate rounds (ignored for vote mechanism).
    payment_locked : SOL amount locked until debate is finalized.
    wallet_address : Solana wallet address for authentication.
    base_url    : SolMind backend URL.
    """

    def __init__(
        self,
        task: str,
        agents: List[str],
        mechanism: str = "debate",
        quorum: int = 2,
        rounds: int = 3,
        payment_locked: float = 0.0,
        wallet_address: str = "",
        base_url: str = "http://localhost:8000",
    ):
        if len(agents) < 2:
            raise ValueError("At least 2 agents required")
        if mechanism not in ("debate", "vote"):
            raise ValueError('mechanism must be "debate" or "vote"')
        if not (1 <= quorum <= len(agents)):
            raise ValueError(f"quorum must be between 1 and {len(agents)}")

        self.task = task
        self.agents = agents
        self.mechanism = mechanism
        self.quorum = quorum
        self.rounds = rounds
        self.payment_locked = payment_locked
        self._client = SolmindClient(wallet_address, base_url)

    def run(
        self,
        on_event: Optional[Callable[[DebateEvent], None]] = None,
    ) -> DebateResult:
        """
        Stream the debate and block until it completes.

        Parameters
        ----------
        on_event : Optional callback invoked for each SSE event
                   (round_start, response, completed, error).

        Returns
        -------
        DebateResult with final_decision, transcript_hash, quorum_reached,
        and the full transcript list.
        """
        payload = {
            "task": self.task,
            "agents": self.agents,
            "mechanism": self.mechanism,
            "quorum": self.quorum,
            "rounds": self.rounds,
            "payment_locked": self.payment_locked,
        }

        transcript: List[TranscriptEntry] = []
        result_data: dict = {}

        for event in self._client.stream("/api/v1/debate/start", payload):
            if on_event:
                on_event(event)

            if event.get("type") == "response":
                transcript.append(TranscriptEntry(
                    round=event.get("round", 1),
                    agent=event.get("agent", ""),
                    agent_name=event.get("agent_name", ""),
                    role=event.get("role", ""),
                    content=event.get("content", ""),
                ))
            elif event.get("type") == "completed":
                result_data = event
            elif event.get("type") == "error":
                raise RuntimeError(event.get("message", "Debate failed"))

        return DebateResult(
            debate_id=result_data.get("debate_id", ""),
            final_decision=result_data.get("final_decision", ""),
            quorum_reached=result_data.get("quorum_reached", False),
            transcript_hash=result_data.get("transcript_hash", ""),
            transcript=transcript,
        )

    def get_receipt(self, debate_id: str) -> dict:
        """Fetch the finalized receipt for a completed debate."""
        return self._client.get(f"/api/v1/debate/{debate_id}/receipt")

    def list(self) -> list:
        """List all debates for the authenticated wallet."""
        return self._client.get("/api/v1/debate/")

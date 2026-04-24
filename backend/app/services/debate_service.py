import hashlib
import json
from datetime import datetime
from typing import List, Dict, Optional, AsyncGenerator

from app.db import store
from app.models.schemas import DebateMechanism, DebateStatus

try:
    from app.services.agent_service import DEFAULT_AGENTS
except ImportError:
    DEFAULT_AGENTS = {}


class DebateService:
    def _get_agent(self, agent_id: str):
        if agent_id in DEFAULT_AGENTS:
            return DEFAULT_AGENTS[agent_id]
        data = store.agents.get(agent_id)
        if data:
            from app.models.schemas import Agent
            return Agent(**data)
        return None

    async def _call_llm(self, agent_id: str, messages: List[Dict]) -> str:
        from app.services.llm_service import LLMService
        agent = self._get_agent(agent_id)
        if not agent:
            return f"[Agent {agent_id} not configured]"
        try:
            svc = LLMService()
            resp = await svc.get_completion(agent_id=agent_id, messages=messages, agent_config=agent)
            return resp.content
        except Exception as e:
            return f"[LLM error: {e}]"

    @staticmethod
    def _hash_transcript(entries: List[Dict]) -> str:
        payload = json.dumps(
            [{"round": e["round_number"], "agent": e["agent_id"], "role": e["role"], "response": e["response"]}
             for e in entries],
            sort_keys=True
        )
        return hashlib.sha256(payload.encode()).hexdigest()

    @staticmethod
    def _detect_consensus(final_responses: List[str], quorum: int):
        yes = sum(1 for r in final_responses if r.strip().upper().startswith("YES"))
        no = sum(1 for r in final_responses if r.strip().upper().startswith("NO"))
        if yes >= quorum:
            return True, "APPROVED"
        if no >= quorum:
            return True, "REJECTED"
        if yes > no:
            return yes >= quorum, "APPROVED"
        return no >= quorum, "REJECTED"

    async def run_stream(self, debate_id: str) -> AsyncGenerator[str, None]:
        data = store.debates.get(debate_id)
        if not data:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Debate not found'})}\n\n"
            return

        task = data["task"]
        agents = data["agents"]
        mechanism = data["mechanism"]
        num_rounds = data["rounds"]
        quorum = data["quorum"]
        transcript_entries: List[Dict] = []

        def sse(event_type: str, payload: dict) -> str:
            return f"data: {json.dumps({'type': event_type, **payload})}\n\n"

        store.debates[debate_id]["status"] = DebateStatus.RUNNING.value
        yield sse("started", {"debate_id": debate_id, "mechanism": mechanism, "agents": agents})

        try:
            final_responses: List[str] = []

            if mechanism == DebateMechanism.VOTE.value:
                for agent_id in agents:
                    agent_obj = self._get_agent(agent_id)
                    agent_name = agent_obj.display_name if agent_obj else agent_id

                    yield sse("round_start", {"round": 1, "agent": agent_id, "agent_name": agent_name, "role": "voter"})

                    messages = [
                        {"role": "system", "content": f"You are {agent_name}, an AI agent voting on a proposal. Start your response with YES or NO, then justify briefly in 2-3 sentences."},
                        {"role": "user", "content": f"Task: {task}"},
                    ]
                    response = await self._call_llm(agent_id, messages)
                    final_responses.append(response)

                    entry = {
                        "round_number": 1, "agent_id": agent_id, "agent_name": agent_name,
                        "role": "voter", "response": response,
                        "timestamp": datetime.now().isoformat(),
                    }
                    transcript_entries.append(entry)
                    store.debates[debate_id]["transcript"].append(entry)

                    yield sse("response", {"round": 1, "agent": agent_id, "agent_name": agent_name, "role": "voter", "content": response})

            else:
                round_responses: Dict[int, Dict[str, str]] = {}

                for rn in range(1, num_rounds + 1):
                    round_responses[rn] = {}

                    for agent_id in agents:
                        agent_obj = self._get_agent(agent_id)
                        agent_name = agent_obj.display_name if agent_obj else agent_id

                        if rn == 1:
                            role = "proposer"
                            system = f"You are {agent_name}, an AI agent in a structured debate. Independently propose your answer to the task in 3-5 sentences."
                            user_content = f"Task: {task}"
                        elif rn < num_rounds:
                            role = "critic"
                            peers = "\n\n".join(
                                f"{aid}: {resp}"
                                for aid, resp in round_responses[rn - 1].items()
                                if aid != agent_id
                            )
                            system = f"You are {agent_name}. Review the other agents' proposals, identify key agreements and disagreements in 3-5 sentences."
                            user_content = f"Task: {task}\n\nOther agents' proposals:\n{peers}"
                        else:
                            role = "decider"
                            history = "\n".join(
                                f"[Round {r}] {aid}: {resp}"
                                for r in range(1, rn)
                                for aid, resp in round_responses[r].items()
                            )
                            system = f"You are {agent_name}. Based on all debate rounds, give your FINAL DECISION. Start with YES to approve or NO to reject, then explain in 2-3 sentences."
                            user_content = f"Task: {task}\n\nDebate history:\n{history}"

                        yield sse("round_start", {"round": rn, "agent": agent_id, "agent_name": agent_name, "role": role})

                        messages = [{"role": "system", "content": system}, {"role": "user", "content": user_content}]
                        response = await self._call_llm(agent_id, messages)
                        round_responses[rn][agent_id] = response

                        if rn == num_rounds:
                            final_responses.append(response)

                        entry = {
                            "round_number": rn, "agent_id": agent_id, "agent_name": agent_name,
                            "role": role, "response": response,
                            "timestamp": datetime.now().isoformat(),
                        }
                        transcript_entries.append(entry)
                        store.debates[debate_id]["transcript"].append(entry)

                        yield sse("response", {"round": rn, "agent": agent_id, "agent_name": agent_name, "role": role, "content": response})

            quorum_reached, final_decision = self._detect_consensus(final_responses, quorum)
            transcript_hash = self._hash_transcript(transcript_entries)

            store.debates[debate_id].update({
                "status": DebateStatus.COMPLETED.value,
                "transcript_hash": transcript_hash,
                "final_decision": final_decision,
                "quorum_reached": quorum_reached,
                "finalized_at": datetime.now().isoformat(),
            })

            yield sse("completed", {
                "debate_id": debate_id,
                "final_decision": final_decision,
                "quorum_reached": quorum_reached,
                "transcript_hash": transcript_hash,
            })

        except Exception as e:
            store.debates[debate_id]["status"] = DebateStatus.FAILED.value
            yield sse("error", {"message": str(e)})

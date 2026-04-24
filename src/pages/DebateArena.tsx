import { useState, useRef, useEffect } from 'react';
import { Scale, Play, ChevronRight, Check, X, Copy, ArrowLeft } from 'lucide-react';
import { useApiClient } from '../lib/api';

interface LLMConfig {
  id: string;
  name: string;
  displayName: string;
  platform: string;
  apiKeyConfigured: boolean;
}

interface TranscriptEntry {
  round: number;
  agent: string;
  agentName: string;
  role: string;
  content: string;
}

interface DebateResult {
  debateId: string;
  finalDecision: string;
  quorumReached: boolean;
  transcriptHash: string;
}

type View = 'list' | 'setup' | 'running' | 'receipt';

interface DebateSummary {
  id: string;
  task: string;
  mechanism: string;
  status: string;
  final_decision?: string;
  quorum_reached?: boolean;
  agents: string[];
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  proposer: 'Propose',
  critic: 'Critique',
  decider: 'Decide',
  voter: 'Vote',
};

const ROLE_COLORS: Record<string, string> = {
  proposer: 'text-blue-400',
  critic: 'text-amber-400',
  decider: 'text-purple-400',
  voter: 'text-emerald-400',
};

interface DebateArenaProps {
  customLLMs: LLMConfig[];
}

const DebateArena: React.FC<DebateArenaProps> = ({ customLLMs }) => {
  const api = useApiClient();

  const [view, setView] = useState<View>('list');
  const [pastDebates, setPastDebates] = useState<DebateSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<LLMConfig[]>([]);

  // Setup form
  const [task, setTask] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [mechanism, setMechanism] = useState<'debate' | 'vote'>('debate');
  const [rounds, setRounds] = useState(3);
  const [quorum, setQuorum] = useState(2);

  // Running state
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [result, setResult] = useState<DebateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Receipt view
  const [receiptData, setReceiptData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const debates = await api.listDebates() as DebateSummary[];
      setPastDebates(debates);
    } catch {
      // silently fail
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadAgents = async () => {
    try {
      const agents = await api.getAgents() as any[];
      setAvailableAgents(agents.map((a: any) => ({
        id: a.id,
        name: a.name,
        displayName: a.display_name || a.name,
        platform: a.platform,
        apiKeyConfigured: a.api_key_configured || false,
      })));
    } catch {
      setAvailableAgents(customLLMs);
    }
  };

  useEffect(() => {
    loadHistory();
    loadAgents();
  }, []);

  const toggleAgent = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId) ? prev.filter(a => a !== agentId) : [...prev, agentId]
    );
  };

  const canStart = task.trim().length > 0 && selectedAgents.length >= 2 && quorum <= selectedAgents.length;

  const handleStart = async () => {
    if (!canStart) return;
    setView('running');
    setTranscript([]);
    setResult(null);
    setError(null);
    setCurrentAgent(null);

    try {
      await api.startDebate(
        { task, agents: selectedAgents, mechanism, rounds, quorum, payment_locked: 0 },
        (event) => {
          if (event.type === 'round_start') {
            setCurrentAgent(event.agent_name);
          } else if (event.type === 'response') {
            setCurrentAgent(null);
            setTranscript(prev => [...prev, {
              round: event.round,
              agent: event.agent,
              agentName: event.agent_name,
              role: event.role,
              content: event.content,
            }]);
          } else if (event.type === 'completed') {
            setResult({
              debateId: event.debate_id,
              finalDecision: event.final_decision,
              quorumReached: event.quorum_reached,
              transcriptHash: event.transcript_hash,
            });
            loadHistory();
          } else if (event.type === 'error') {
            setError(event.message);
          }
        },
        () => { /* complete */ },
        (err) => setError(err.message)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start debate');
    }
  };

  const openReceipt = async (debateId: string) => {
    try {
      const data = await api.getDebateReceipt(debateId) as any;
      setReceiptData(data);
      setView('receipt');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receipt');
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const groupedTranscript = transcript.reduce<Record<number, TranscriptEntry[]>>((acc, entry) => {
    if (!acc[entry.round]) acc[entry.round] = [];
    acc[entry.round].push(entry);
    return acc;
  }, {});

  // ── Receipt view ──────────────────────────────────────────────────────────

  if (view === 'receipt' && receiptData) {
    const grouped = (receiptData.transcript || []).reduce<Record<number, any[]>>((acc: any, e: any) => {
      if (!acc[e.round_number]) acc[e.round_number] = [];
      acc[e.round_number].push(e);
      return acc;
    }, {});

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="mb-6">
            <p className="text-xs text-zinc-500 mb-1">Debate Receipt</p>
            <p className="text-xs text-zinc-600 font-mono">{receiptData.debate_id}</p>
          </div>

          <div className="flex items-start gap-3 mb-6 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${receiptData.quorum_reached ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {receiptData.quorum_reached
                ? <Check className="h-3 w-3 text-green-400" />
                : <X className="h-3 w-3 text-red-400" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">{receiptData.final_decision}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {receiptData.quorum_reached ? 'Quorum reached' : 'No quorum'} · {receiptData.mechanism} · {receiptData.rounds} rounds · {receiptData.agents?.length} agents
              </p>
            </div>
          </div>

          <div className="mb-6 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <p className="text-xs text-zinc-500 mb-1">Task</p>
            <p className="text-sm text-zinc-200">{receiptData.task}</p>
          </div>

          <div className="mb-6 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-zinc-500">Transcript Hash (SHA-256)</p>
              <button
                onClick={() => copyHash(receiptData.transcript_hash)}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <Copy className="h-3 w-3" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs font-mono text-zinc-300 break-all">{receiptData.transcript_hash}</p>
          </div>

          <div>
            <p className="text-xs text-zinc-500 mb-3">Full Transcript</p>
            <div className="space-y-4">
              {Object.entries(grouped).map(([rn, entries]: [string, any[]]) => (
                <div key={rn}>
                  <p className="text-xs text-zinc-600 mb-2">Round {rn}</p>
                  <div className="space-y-3">
                    {entries.map((e: any, i: number) => (
                      <div key={i} className="p-3 bg-zinc-900 rounded-lg border border-zinc-800/60">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-medium text-zinc-300">{e.agent_name}</span>
                          <span className={`text-xs ${ROLE_COLORS[e.role] || 'text-zinc-500'}`}>{ROLE_LABELS[e.role] || e.role}</span>
                        </div>
                        <p className="text-sm text-zinc-400 leading-relaxed">{e.response}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Running / completed view ──────────────────────────────────────────────

  if (view === 'running') {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="h-11 border-b border-zinc-800 flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => setView('list')} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-zinc-300">
            {mechanism === 'debate' ? 'Debate' : 'Vote'} · {selectedAgents.length} agents
          </span>
          {currentAgent && (
            <span className="ml-auto text-xs text-zinc-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {currentAgent} thinking…
            </span>
          )}
          {result && (
            <span className={`ml-auto text-xs font-medium ${result.quorumReached ? 'text-green-400' : 'text-red-400'}`}>
              {result.finalDecision}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 min-h-0">
          {error && (
            <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {Object.entries(groupedTranscript).map(([rn, entries]) => (
            <div key={rn}>
              <p className="text-xs text-zinc-600 mb-2">
                {mechanism === 'vote' ? 'Votes' : `Round ${rn}`}
              </p>
              <div className="space-y-3">
                {entries.map((e, i) => (
                  <div key={i} className="p-3 bg-zinc-900 rounded-lg border border-zinc-800/60">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-zinc-300">{e.agentName}</span>
                      <span className={`text-xs ${ROLE_COLORS[e.role] || 'text-zinc-500'}`}>{ROLE_LABELS[e.role] || e.role}</span>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">{e.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {!result && !error && transcript.length === 0 && (
            <p className="text-sm text-zinc-600 text-center py-8">Initializing debate…</p>
          )}

          <div ref={transcriptEndRef} />
        </div>

        {result && (
          <div className="border-t border-zinc-800 px-4 py-3 shrink-0 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${result.quorumReached ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium text-zinc-200">{result.finalDecision}</span>
                <span className="text-xs text-zinc-500">{result.quorumReached ? 'Quorum reached' : 'No quorum'}</span>
              </div>
              <p className="text-xs text-zinc-600 font-mono mt-0.5 truncate max-w-xs">{result.transcriptHash}</p>
            </div>
            <button
              onClick={() => openReceipt(result.debateId)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-md transition-colors shrink-0"
            >
              View Receipt <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Setup + list view ─────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">

        {view === 'list' ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-400">Debate Primitive</span>
              </div>
              <button
                onClick={() => setView('setup')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-md transition-colors"
              >
                New Debate
              </button>
            </div>

            {loadingHistory ? (
              <p className="text-sm text-zinc-600 text-center py-16">Loading…</p>
            ) : pastDebates.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-zinc-500 mb-3">No debates yet</p>
                <button
                  onClick={() => setView('setup')}
                  className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors underline underline-offset-2"
                >
                  Start your first debate
                </button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {pastDebates.map((d) => (
                  <div key={d.id} className="py-3 px-2 -mx-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-medium ${
                            d.status === 'completed'
                              ? d.quorum_reached ? 'text-green-400' : 'text-red-400'
                              : d.status === 'running' ? 'text-blue-400' : 'text-zinc-500'
                          }`}>
                            {d.status === 'completed' ? (d.final_decision || 'Done') : d.status}
                          </span>
                          <span className="text-xs text-zinc-600">{d.mechanism} · {d.agents.length} agents</span>
                        </div>
                        <p className="text-sm text-zinc-300 truncate">{d.task}</p>
                      </div>
                      {d.status === 'completed' && (
                        <button
                          onClick={() => openReceipt(d.id)}
                          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 flex items-center gap-1"
                        >
                          Receipt <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setView('list')} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-zinc-300">New Debate</span>
            </div>

            <div className="space-y-6">
              {/* Task */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Task / Question</label>
                <textarea
                  value={task}
                  onChange={e => setTask(e.target.value)}
                  placeholder="e.g. Should we execute this treasury swap?"
                  rows={3}
                  className="w-full bg-zinc-900 text-zinc-100 text-sm px-3.5 py-2.5 rounded-lg border border-zinc-800 focus:border-zinc-600 focus:outline-none placeholder-zinc-600 resize-none"
                />
              </div>

              {/* Mechanism */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Mechanism</label>
                <div className="flex gap-2">
                  {(['debate', 'vote'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setMechanism(m)}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors capitalize ${
                        mechanism === m
                          ? 'bg-zinc-700 text-zinc-100'
                          : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-600 mt-1.5">
                  {mechanism === 'debate'
                    ? 'Agents deliberate across rounds before reaching consensus'
                    : 'Agents vote independently, majority decides'}
                </p>
              </div>

              {/* Agents */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">
                  Agents <span className="text-zinc-600">({selectedAgents.length} selected, min 2)</span>
                </label>
                {availableAgents.length === 0 ? (
                  <p className="text-sm text-zinc-600">No agents available. Make sure the backend is running.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableAgents.map(llm => (
                      <button
                        key={llm.id}
                        onClick={() => toggleAgent(llm.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                          selectedAgents.includes(llm.id)
                            ? 'bg-blue-600/20 text-blue-300 border border-blue-600/40'
                            : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                        }`}
                      >
                        {llm.displayName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Config */}
              {mechanism === 'debate' && (
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Rounds</label>
                  <div className="flex items-center gap-3">
                    {[2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setRounds(n)}
                        className={`w-9 h-9 rounded-lg text-sm transition-colors ${
                          rounds === n ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">
                  Quorum <span className="text-zinc-600">(min agents needed for consensus)</span>
                </label>
                <div className="flex items-center gap-3">
                  {[1, 2, 3].filter(n => n <= Math.max(selectedAgents.length, 3)).map(n => (
                    <button
                      key={n}
                      onClick={() => setQuorum(n)}
                      disabled={n > selectedAgents.length}
                      className={`w-9 h-9 rounded-lg text-sm transition-colors ${
                        quorum === n ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStart}
                disabled={!canStart}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
              >
                <Play className="h-4 w-4" />
                Start {mechanism === 'debate' ? 'Debate' : 'Vote'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DebateArena;

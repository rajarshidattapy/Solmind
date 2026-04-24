import { useState, useEffect } from 'react';
import { ArrowLeft, Archive, CheckCircle, XCircle, RotateCcw, Shield, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { useApiClient } from '../lib/api';

interface KVSnapshot {
  id: string;
  agent_id: string;
  chat_id: string;
  storage_hash: string;
  compression_ratio: number;
  original_size_bytes: number;
  compressed_size_bytes: number;
  bits_per_token: number;
  model: string;
  provider: string;
  message_count: number;
  verified: boolean;
  wallet_address?: string;
  created_at: string;
  on_chain_tx?: string;
}

interface RestoreResult {
  snapshot: KVSnapshot;
  messages: Array<{ role: string; content: string }>;
  restore_verified: boolean;
}

interface MemoryTimelineProps {
  agentId: string;
  agentName: string;
  chatId?: string;
  onBack: () => void;
  onRestoreMessages?: (chatId: string, messages: Array<{ role: string; content: string }>) => void;
}

const MemoryTimeline: React.FC<MemoryTimelineProps> = ({
  agentId,
  agentName,
  chatId,
  onBack,
  onRestoreMessages,
}) => {
  const api = useApiClient();
  const [snapshots, setSnapshots] = useState<KVSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotting, setSnapshotting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifyResults, setVerifyResults] = useState<Record<string, boolean>>({});
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getSnapshotHistory(agentId) as KVSnapshot[];
      setSnapshots(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load snapshots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [agentId]);

  const handleSnapshot = async () => {
    if (!chatId) return;
    setSnapshotting(true);
    setError(null);
    try {
      await api.createSnapshot(agentId, chatId);
      setSuccessMsg('Snapshot created');
      await load();
    } catch (e: any) {
      setError(e.message || 'Snapshot failed');
    } finally {
      setSnapshotting(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleVerify = async (snapshotId: string) => {
    setVerifying(snapshotId);
    try {
      const result = await api.verifySnapshot(snapshotId) as { verified: boolean };
      setVerifyResults(prev => ({ ...prev, [snapshotId]: result.verified }));
    } catch {
      setVerifyResults(prev => ({ ...prev, [snapshotId]: false }));
    } finally {
      setVerifying(null);
    }
  };

  const handleRestore = async (snapshotId: string) => {
    setRestoring(snapshotId);
    setError(null);
    try {
      const result = await api.rollbackSnapshot(snapshotId) as RestoreResult;
      if (onRestoreMessages) {
        onRestoreMessages(result.snapshot.chat_id, result.messages);
      }
      setSuccessMsg(result.restore_verified ? 'Restored and verified' : 'Restored (hash mismatch — data may be corrupt)');
    } catch (e: any) {
      setError(e.message || 'Restore failed');
    } finally {
      setRestoring(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    });
  };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="text-sm font-semibold text-white">{agentName}</div>
            <div className="text-xs text-zinc-500">KV Memory Timeline</div>
          </div>
        </div>
        {chatId && (
          <button
            onClick={handleSnapshot}
            disabled={snapshotting}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Archive className="h-4 w-4" />
            {snapshotting ? 'Saving…' : 'Snapshot Now'}
          </button>
        )}
      </div>

      {/* Status bar */}
      {(error || successMsg) && (
        <div className={`px-6 py-2 text-sm ${error ? 'bg-red-900/30 text-red-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
          {error || successMsg}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="text-center text-zinc-500 py-20 text-sm">Loading snapshots…</div>
        ) : snapshots.length === 0 ? (
          <div className="text-center py-20">
            <Archive className="h-10 w-10 mx-auto mb-4 text-zinc-700" />
            <p className="text-zinc-400 text-sm mb-1">No snapshots yet</p>
            {chatId && (
              <p className="text-zinc-600 text-xs">Click "Snapshot Now" to save the current conversation state.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {snapshots.map((snap, i) => {
              const isExpanded = expanded === snap.id;
              const verifyResult = verifyResults[snap.id];

              return (
                <div key={snap.id} className="border border-zinc-800 rounded-lg overflow-hidden">
                  {/* Row header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-900 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : snap.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-xs text-zinc-500 w-5 text-right shrink-0">{snapshots.length - i}</div>
                      <div className="min-w-0">
                        <div className="text-sm text-white font-mono truncate">{snap.id}</div>
                        <div className="text-xs text-zinc-500">{fmt(snap.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-xs text-zinc-400">{snap.message_count} msgs</span>
                      <span className="text-xs text-zinc-400">{snap.compression_ratio}x</span>
                      <span className="text-xs text-zinc-400">{snap.bits_per_token} b/tok</span>
                      {verifyResult !== undefined && (
                        verifyResult
                          ? <CheckCircle className="h-4 w-4 text-emerald-400" />
                          : <XCircle className="h-4 w-4 text-red-400" />
                      )}
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800 px-4 py-4 bg-zinc-900/50">
                      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                        <div>
                          <div className="text-zinc-500 mb-1">Model</div>
                          <div className="text-zinc-300 font-mono truncate">{snap.model}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500 mb-1">Provider</div>
                          <div className="text-zinc-300">{snap.provider}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500 mb-1">Original</div>
                          <div className="text-zinc-300">{snap.original_size_bytes.toLocaleString()} B</div>
                        </div>
                        <div>
                          <div className="text-zinc-500 mb-1">Compressed</div>
                          <div className="text-zinc-300">{snap.compressed_size_bytes.toLocaleString()} B</div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-zinc-500 text-xs mb-1">SHA-256</div>
                        <div className="flex items-center gap-2">
                          <code className="text-zinc-300 text-xs font-mono truncate flex-1">
                            {snap.storage_hash}
                          </code>
                          <button
                            onClick={() => copyHash(snap.storage_hash)}
                            className="text-zinc-500 hover:text-white transition-colors shrink-0"
                          >
                            {copiedHash === snap.storage_hash
                              ? <Check className="h-3.5 w-3.5 text-emerald-400" />
                              : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      {snap.on_chain_tx && (
                        <div className="mb-4">
                          <div className="text-zinc-500 text-xs mb-1">On-chain Tx</div>
                          <code className="text-zinc-300 text-xs font-mono truncate block">{snap.on_chain_tx}</code>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerify(snap.id)}
                          disabled={verifying === snap.id}
                          className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 px-3 py-1.5 rounded transition-colors"
                        >
                          <Shield className="h-3.5 w-3.5" />
                          {verifying === snap.id ? 'Verifying…' : 'Verify Hash'}
                        </button>
                        <button
                          onClick={() => handleRestore(snap.id)}
                          disabled={restoring === snap.id}
                          className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 px-3 py-1.5 rounded transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {restoring === snap.id ? 'Restoring…' : 'Restore'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryTimeline;

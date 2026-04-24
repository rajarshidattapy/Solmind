import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Store, Wallet, Settings, MessageSquare, Coins, TrendingUp, ArrowLeft, Plus, X } from 'lucide-react';
import { useSolanaBalance } from '../hooks/useSolanaBalance';
import { useWallet } from '@solana/wallet-adapter-react';
import { useApiClient } from '../lib/api';
import appLogo from '../assets/app-logo.png';

interface LLMConfig {
  id: string;
  name: string;
  displayName: string;
  platform: string;
  apiKeyConfigured: boolean;
}

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeSubTab: string;
  setActiveSubTab: (subTab: string) => void;
  customLLMs: LLMConfig[];
  onAddLLM: (llm: LLMConfig) => void;
}

const BalanceDisplay = () => {
  const { balance, loading } = useSolanaBalance();
  const { connected } = useWallet();

  const fmt = (b: number | null) => {
    if (b === null) return '0';
    return b >= 1 ? b.toFixed(4) : b.toFixed(5);
  };

  if (!connected) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-zinc-500">◎</span>
      <span className="text-zinc-200 tabular-nums">
        {loading ? '—' : fmt(balance)}
      </span>
      <span className="text-zinc-500 text-xs">SOL</span>
    </div>
  );
};

const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeSubTab,
  setActiveSubTab,
  customLLMs,
  onAddLLM,
}) => {
  const [showAddLLM, setShowAddLLM] = useState(false);
  const [newLLMName, setNewLLMName] = useState('');
  const [newLLMPlatform, setNewLLMPlatform] = useState('');
  const [newLLMApiKey, setNewLLMApiKey] = useState('');
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const api = useApiClient();

  const mainTabs = [
    { id: 'agents', label: 'Agents', icon: Brain },
    { id: 'marketplace', label: 'Marketplace', icon: Store },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const platforms = [
    'OpenRouter', 'OpenAI', 'Anthropic', 'Google AI',
    'Cohere', 'Hugging Face', 'Replicate', 'Together AI',
    'Groq', 'Perplexity', 'Fireworks AI', 'Other',
  ];

  const isGPTOrMistral = (str: string) => {
    const lower = str.toLowerCase();
    if (lower.includes('openai/gpt-oss-120b:free')) return false;
    return lower === 'gpt' || lower === 'mistral' ||
      /^gpt[-_\s]/.test(lower) || /[-_\s]gpt[-_\s]/.test(lower) || /[-_\s]gpt$/.test(lower) ||
      /^mistral[-_\s]/.test(lower) || /[-_\s]mistral[-_\s]/.test(lower) || /[-_\s]mistral$/.test(lower);
  };

  const getSubTabs = (tabId: string) => {
    switch (tabId) {
      case 'agents':
        return customLLMs
          .filter(llm => {
            const id = llm.id.toLowerCase();
            const name = llm.name.toLowerCase();
            const dn = llm.displayName.toLowerCase();
            return !isGPTOrMistral(id) && !isGPTOrMistral(name) && !isGPTOrMistral(dn);
          })
          .map(llm => ({ id: llm.id, label: llm.displayName, icon: MessageSquare }));
      case 'marketplace':
        return [
          { id: 'browse', label: 'Browse', icon: Store },
          { id: 'staking', label: 'Staking', icon: Coins },
        ];
      case 'wallet':
        return [
          { id: 'balance', label: 'Balance', icon: Wallet },
          { id: 'earnings', label: 'Earnings', icon: TrendingUp },
        ];
      default:
        return [];
    }
  };

  const handleAddLLM = async () => {
    if (!newLLMName.trim() || !newLLMPlatform || !newLLMApiKey.trim()) return;
    setIsCreatingAgent(true);
    try {
      const agentName = newLLMName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '-');
      const created = await api.createAgent({
        name: agentName,
        display_name: newLLMName,
        platform: newLLMPlatform,
        api_key: newLLMApiKey,
        model: newLLMName,
      }) as any;
      onAddLLM({
        id: created.id,
        name: created.name,
        displayName: created.display_name || newLLMName,
        platform: created.platform,
        apiKeyConfigured: true,
      });
      setNewLLMName('');
      setNewLLMPlatform('');
      setNewLLMApiKey('');
      setShowAddLLM(false);
    } catch (error) {
      alert(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingAgent(false);
    }
  };

  const subTabs = getSubTabs(activeTab);

  return (
    <>
      {/* Top bar */}
      <div className="h-12 border-b border-zinc-800 bg-zinc-950 flex items-center px-5 gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/" className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <img src={appLogo} alt="SolMind" className="h-5 w-5" />
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">SolMind</span>
        </div>

        {/* Main nav */}
        <nav className="flex items-stretch h-full gap-0.5 flex-1">
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                const subs = getSubTabs(tab.id);
                if (subs.length > 0) setActiveSubTab(subs[0].id);
              }}
              className={`relative px-3.5 text-sm transition-colors h-full
                ${activeTab === tab.id
                  ? 'text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-blue-500" />
              )}
            </button>
          ))}
        </nav>

        {/* Right */}
        <div className="shrink-0">
          <BalanceDisplay />
        </div>
      </div>

      {/* Sub-tab strip */}
      {(subTabs.length > 0 || activeTab === 'agents') && (
        <div className="h-9 border-b border-zinc-800/60 bg-zinc-950 flex items-center px-5 gap-1">
          {subTabs.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActiveSubTab(sub.id)}
              className={`px-2.5 py-1 rounded text-xs transition-colors
                ${activeSubTab === sub.id
                  ? 'text-zinc-100 bg-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                }`}
            >
              {sub.label}
            </button>
          ))}

          {activeTab === 'agents' && (
            <button
              onClick={() => setShowAddLLM(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors ml-1"
            >
              <Plus className="h-3 w-3" />
              Add model
            </button>
          )}
        </div>
      )}

      {/* Add LLM modal */}
      {showAddLLM && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <span className="text-sm font-medium text-zinc-100">Add model</span>
              <button
                onClick={() => setShowAddLLM(false)}
                className="text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Model name</label>
                <input
                  type="text"
                  value={newLLMName}
                  onChange={(e) => setNewLLMName(e.target.value)}
                  placeholder="e.g. claude-3-5-sonnet, llama-3.1-70b"
                  className="w-full bg-zinc-950 text-zinc-100 text-sm px-3 py-2 rounded-md border border-zinc-800 focus:border-zinc-600 focus:outline-none placeholder-zinc-700"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Provider</label>
                <select
                  value={newLLMPlatform}
                  onChange={(e) => setNewLLMPlatform(e.target.value)}
                  className="w-full bg-zinc-950 text-zinc-100 text-sm px-3 py-2 rounded-md border border-zinc-800 focus:border-zinc-600 focus:outline-none"
                >
                  <option value="">Select provider</option>
                  {platforms.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">API key</label>
                <input
                  type="password"
                  value={newLLMApiKey}
                  onChange={(e) => setNewLLMApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-zinc-950 text-zinc-100 text-sm px-3 py-2 rounded-md border border-zinc-800 focus:border-zinc-600 focus:outline-none placeholder-zinc-700"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowAddLLM(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm py-2 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLLM}
                  disabled={!newLLMName.trim() || !newLLMPlatform || !newLLMApiKey.trim() || isCreatingAgent}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white text-sm py-2 rounded-md transition-colors"
                >
                  {isCreatingAgent ? 'Adding…' : 'Add model'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;

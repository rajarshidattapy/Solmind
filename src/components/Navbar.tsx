import { useState, useEffect } from 'react';
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
  
  // Log balance changes for debugging
  useEffect(() => {
    if (balance !== null && balance !== undefined) {
      console.log('BalanceDisplay: balance changed to', balance);
    }
  }, [balance]);
  
  // Format balance with appropriate decimal places
  const formatBalance = (bal: number | null): string => {
    if (bal === null || bal === undefined) return '0';
    // Show more decimal places to see transaction fee changes
    // If balance is >= 1, show 4 decimals; if < 1, show 5 decimals
    if (bal >= 1) {
      return bal.toFixed(4);
    } else {
      return bal.toFixed(5);
    }
  };
  
  return (
    <div className="bg-gray-900 rounded-lg px-4 py-2 border border-gray-600">
      <div className="text-sm text-gray-400">Balance</div>
      <div className="text-lg font-semibold text-white" key={balance}>
        {loading ? '...' : connected ? `${formatBalance(balance)} SOL` : 'N/A'}
      </div>
    </div>
  );
};

const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  setActiveTab, 
  activeSubTab, 
  setActiveSubTab,
  customLLMs,
  onAddLLM
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
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const platforms = [
    'OpenRouter',
    'OpenAI',
    'Anthropic',
    'Google AI',
    'Cohere',
    'Hugging Face',
    'Replicate',
    'Together AI',
    'Groq',
    'Perplexity',
    'Fireworks AI',
    'Other'
  ];

  const handleAddLLM = async () => {
    if (!newLLMName.trim() || !newLLMPlatform || !newLLMApiKey.trim()) return;

    setIsCreatingAgent(true);
    try {
      // Create agent immediately via API so it persists
      const agentName = newLLMName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '-');
      const createdAgent = await api.createAgent({
        name: agentName,
        display_name: newLLMName,
        platform: newLLMPlatform,
        api_key: newLLMApiKey,
        model: newLLMName // Use display name as model name
      }) as any;

      // Convert created agent to LLMConfig format
      const newLLM: LLMConfig = {
        id: createdAgent.id,
        name: createdAgent.name,
        displayName: createdAgent.display_name || newLLMName,
        platform: createdAgent.platform,
        apiKeyConfigured: true
      };

      // Add to local state
      onAddLLM(newLLM);
      
      // Clear form
      setNewLLMName('');
      setNewLLMPlatform('');
      setNewLLMApiKey('');
      setShowAddLLM(false);
      
      console.log('Agent created successfully:', createdAgent.id);
    } catch (error) {
      console.error('Error creating agent:', error);
      alert(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingAgent(false);
    }
  };

  const getSubTabs = (tabId: string) => {
    switch (tabId) {
      case 'agents':
        // Filter out any GPT or Mistral agents (but not substrings like "devstral")
        // Allow specific exception: 'openai/gpt-oss-120b:free'
        const ALLOWED_MODELS = ['openai/gpt-oss-120b:free'];
        
        const isGPTOrMistral = (str: string): boolean => {
          const lower = str.toLowerCase();
          // Allow specific models
          if (ALLOWED_MODELS.some(allowed => lower.includes(allowed.toLowerCase()))) {
            return false;
          }
          // Check for exact matches or common patterns
          return lower === 'gpt' || lower === 'mistral' ||
                 /^gpt[-_\s]/.test(lower) || /[-_\s]gpt[-_\s]/.test(lower) || /[-_\s]gpt$/.test(lower) ||
                 /^mistral[-_\s]/.test(lower) || /[-_\s]mistral[-_\s]/.test(lower) || /[-_\s]mistral$/.test(lower);
        };
        
        const customAgents = customLLMs
          .filter(llm => {
            const id = (llm.id || '').toLowerCase();
            const name = (llm.name || '').toLowerCase();
            const displayName = (llm.displayName || '').toLowerCase();
            // Check if this is an allowed model
            const isAllowed = ALLOWED_MODELS.some(allowed => 
              id.includes(allowed.toLowerCase()) || 
              name.includes(allowed.toLowerCase()) || 
              displayName.includes(allowed.toLowerCase())
            );
            if (isAllowed) return true;
            // Otherwise apply normal filtering
            return !isGPTOrMistral(id) && !isGPTOrMistral(name) && !isGPTOrMistral(displayName);
          })
          .map(llm => ({
            id: llm.id, // Use agent ID instead of name
            label: llm.displayName,
            icon: MessageSquare
          }));
        return customAgents;
      case 'marketplace':
        return [
          { id: 'browse', label: 'Browse', icon: Store },
          { id: 'staking', label: 'Staking', icon: Coins }
        ];
      case 'wallet':
        return [
          { id: 'balance', label: 'Balance', icon: Wallet },
          { id: 'earnings', label: 'Earnings', icon: TrendingUp }
        ];
      default:
        return [];
    }
  };

  const subTabs = getSubTabs(activeTab);

  return (
    <>
      <div className="bg-gray-800 border-b border-gray-700">
        {/* Main Navigation */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Link
                to="/"
                className="hover:text-blue-400 transition-colors p-1"
                title="Back to landing page"
              >
                <ArrowLeft className="h-6 w-6 text-gray-400 hover:text-blue-400" />
              </Link>
              <img src={appLogo} alt="SolMind" className="h-8 w-8" />
              <span className="text-xl font-bold text-white">SolMind</span>
            </div>
            
            <div className="flex items-center space-x-1">
              {mainTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      // Set default sub-tab when switching main tabs
                      const defaultSubTabs = getSubTabs(tab.id);
                      if (defaultSubTabs.length > 0) {
                        setActiveSubTab(defaultSubTabs[0].id);
                      }
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <BalanceDisplay />
          </div>
        </div>

        {/* Sub Navigation */}
        {subTabs.length > 0 && (
          <div className="px-6 pb-4">
            <div className="flex space-x-1 flex-wrap gap-1">
              {subTabs.map((subTab) => {
                const Icon = subTab.icon;
                return (
                  <button
                    key={subTab.id}
                    onClick={() => setActiveSubTab(subTab.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      activeSubTab === subTab.id
                        ? 'bg-gray-700 text-blue-400 border border-blue-500'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{subTab.label}</span>
                  </button>
                );
              })}
              {/* Add LLM button in agents tab */}
              {activeTab === 'agents' && (
                <button
                  onClick={() => setShowAddLLM(true)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add LLM</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add LLM Modal */}
      {showAddLLM && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">Add New LLM</h2>
              </div>
              <button 
                onClick={() => setShowAddLLM(false)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Model Name
                </label>
                <input
                  type="text"
                  value={newLLMName}
                  onChange={(e) => setNewLLMName(e.target.value)}
                  placeholder="e.g., Gemini Pro, Llama 3, Claude"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Platform / Provider
                </label>
                <select
                  value={newLLMPlatform}
                  onChange={(e) => setNewLLMPlatform(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select a platform</option>
                  {platforms.map(platform => (
                    <option key={platform} value={platform}>{platform}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={newLLMApiKey}
                  onChange={(e) => setNewLLMApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Your API key is stored securely and never shared.
                </p>
              </div>

              <div className="bg-blue-600 bg-opacity-10 border border-blue-500 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-2">Supported Platforms</h4>
                <p className="text-sm text-gray-300">
                  We support any OpenAI-compatible API endpoint. Enter your provider's API key to get started.
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowAddLLM(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLLM}
                  disabled={!newLLMName.trim() || !newLLMPlatform || !newLLMApiKey.trim() || isCreatingAgent}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
                >
                  {isCreatingAgent ? 'Creating...' : 'Add LLM'}
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

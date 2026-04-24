import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AgentsView from './AgentsView';
import MarketplaceView from './MarketplaceView';
import WalletView from './WalletView';
import Settings from './Settings';
import CapsuleDetail from './CapsuleDetail';
import { useApiClient } from '../lib/api';
import { useWallet } from '@solana/wallet-adapter-react';

interface LLMConfig {
  id: string;
  name: string;
  displayName: string;
  platform: string;
  apiKeyConfigured: boolean;
}

// Default agent IDs that should not be loaded as custom LLMs
const DEFAULT_AGENT_IDS: string[] = [];

const MainApp = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('agents');
  const [activeSubTab, setActiveSubTab] = useState('');
  const [customLLMs, setCustomLLMs] = useState<LLMConfig[]>([]);
  const api = useApiClient();
  const { publicKey, connected } = useWallet();
  const preferencesLoadedRef = useRef(false);

  // Check if we're on a capsule detail route
  const capsuleDetailMatch = location.pathname.match(/^\/app\/marketplace\/(.+)$/);
  const isCapsuleDetail = capsuleDetailMatch !== null;

  // Load preferences from Redis (Vercel KV) on mount (only once)
  useEffect(() => {
    if (preferencesLoadedRef.current) return; // Only load once
    if (!connected || !publicKey) return; // Need wallet to load preferences
    
    const loadPreferences = async () => {
      try {
        const prefs = await api.getPreferences();
        if (prefs.active_tab) {
          setActiveTab(prefs.active_tab);
        }
        if (prefs.active_sub_tab) {
          setActiveSubTab(prefs.active_sub_tab);
        }
        preferencesLoadedRef.current = true;
      } catch (error) {
        console.error('Error loading preferences:', error);
        preferencesLoadedRef.current = true; // Mark as loaded even on error to prevent retries
      }
    };

    loadPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]); // api is stable, doesn't need to be in deps

  // Save preferences to Redis when they change
  useEffect(() => {
    const savePreferences = async () => {
      if (!connected || !publicKey) return; // Need wallet to save preferences
      
      try {
        await api.updatePreferences({
          active_tab: activeTab,
          active_sub_tab: activeSubTab
        });
      } catch (error) {
        console.error('Error saving preferences:', error);
        // Fail silently - preferences are not critical
      }
    };

    // Debounce saves to avoid too many API calls
    const timeoutId = setTimeout(savePreferences, 500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeSubTab, connected, publicKey?.toBase58()]); // api is stable, doesn't need to be in deps

  // Load custom agents from backend when wallet is connected
  useEffect(() => {
    const loadCustomAgents = async () => {
      // Only load if wallet is connected (needed for filtering user's agents)
      if (!connected || !publicKey) {
        setCustomLLMs([]);
        return;
      }
      
      try {
        const agents = await api.getAgents() as any[];
        
        // Filter out default agents and any GPT/Mistral agents, and convert to LLMConfig format
        // Allow specific exception: 'openai/gpt-oss-120b:free'
        const ALLOWED_MODELS = ['openai/gpt-oss-120b:free'];
        
        const isGPTOrMistral = (str: string): boolean => {
          const lower = str.toLowerCase();
          // Allow specific models
          if (ALLOWED_MODELS.some(allowed => lower.includes(allowed.toLowerCase()))) {
            return false;
          }
          // Check for exact matches or common patterns (but not substrings like "devstral")
          return lower === 'gpt' || lower === 'mistral' ||
                 /^gpt[-_\s]/.test(lower) || /[-_\s]gpt[-_\s]/.test(lower) || /[-_\s]gpt$/.test(lower) ||
                 /^mistral[-_\s]/.test(lower) || /[-_\s]mistral[-_\s]/.test(lower) || /[-_\s]mistral$/.test(lower);
        };
        
        const customAgents: LLMConfig[] = agents
          .filter(agent => {
            const id = (agent.id || '').toLowerCase();
            const name = (agent.name || '').toLowerCase();
            const displayName = ((agent.display_name || agent.name) || '').toLowerCase();
            // Check if this is an allowed model
            const isAllowed = ALLOWED_MODELS.some(allowed => 
              id.includes(allowed.toLowerCase()) || 
              name.includes(allowed.toLowerCase()) || 
              displayName.includes(allowed.toLowerCase())
            );
            if (isAllowed) return true;
            // Filter out default agent IDs and any GPT/Mistral references
            return !DEFAULT_AGENT_IDS.includes(agent.id) &&
                   !isGPTOrMistral(id) && !isGPTOrMistral(name) && !isGPTOrMistral(displayName);
          })
          .map(agent => ({
            id: agent.id,
            name: agent.name,
            displayName: agent.display_name || agent.name,
            platform: agent.platform,
            apiKeyConfigured: agent.api_key_configured || false
          }));
        
        setCustomLLMs(customAgents);
        console.log(`Loaded ${customAgents.length} custom agents from backend`);
      } catch (error) {
        console.error('Error loading custom agents:', error);
        // Continue with empty list if API fails
        setCustomLLMs([]);
      }
    };

    loadCustomAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey?.toBase58()]); // Reload when wallet connects/disconnects (api is stable)

  const handleAddLLM = (llm: LLMConfig) => {
    setCustomLLMs(prev => [...prev, llm]);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'agents':
        return (
          <AgentsView 
            activeModel={activeSubTab} 
            customLLMs={customLLMs}
            onAddLLM={handleAddLLM}
          />
        );
      case 'marketplace':
        return <MarketplaceView activeSubTab={activeSubTab} />;
      case 'wallet':
        return <WalletView activeSubTab={activeSubTab} />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <AgentsView 
            activeModel={activeSubTab || ''} 
            customLLMs={customLLMs}
            onAddLLM={handleAddLLM}
          />
        );
    }
  };

  // If we're on a capsule detail page, render it without the tab navigation
  if (isCapsuleDetail) {
    return (
      <div className="min-h-screen bg-gray-900">
        <CapsuleDetail />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        customLLMs={customLLMs}
        onAddLLM={handleAddLLM}
      />
      <main>
        {renderContent()}
      </main>
    </div>
  );
};

export default MainApp;

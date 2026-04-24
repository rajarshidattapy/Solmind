import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, ChevronRight, Archive } from 'lucide-react';
import AgentChat from './AgentChat';
import MemoryTimeline from './MemoryTimeline';
import { useApiClient } from '../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Chat {
  id: string;
  name: string;
  memorySize: 'Small' | 'Medium' | 'Large';
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
  messages: Message[];
}

interface LLMConfig {
  id: string;
  name: string;
  displayName: string;
  platform: string;
  apiKeyConfigured: boolean;
}

interface AgentsViewProps {
  activeModel: string;
  customLLMs: LLMConfig[];
  onAddLLM: (llm: LLMConfig) => void;
}

type View = 'list' | 'chat' | 'memory';

const AgentsView: React.FC<AgentsViewProps> = ({ activeModel, customLLMs, onAddLLM }) => {
  const api = useApiClient();
  const [activeView, setActiveView] = useState<View>('list');
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(undefined);
  const [allChats, setAllChats] = useState<Record<string, Chat[]>>({});
  const [loadingChats, setLoadingChats] = useState<Record<string, boolean>>({});
  const prevCustomLLMsLengthRef = useRef<number>(0);

  const getAgentId = (model: string): string => {
    const customLLM = customLLMs.find(llm => llm.id === model || llm.name === model || llm.displayName === model);
    return customLLM ? customLLM.id : model;
  };

  const loadChats = async (model: string, force = false) => {
    const agentId = getAgentId(model);
    if (!force && (loadingChats[model] || allChats[model])) return;

    setLoadingChats(prev => ({ ...prev, [model]: true }));
    try {
      const apiChats = await api.getChats(agentId) as any[];
      const transformedChats: Chat[] = apiChats.map((apiChat: any) => {
        const messages: Message[] = (apiChat.messages || []).map((msg: any) => ({
          id: msg.id || Date.now().toString(),
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        }));
        const ts = apiChat.timestamp ? new Date(apiChat.timestamp) : new Date();
        const label = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
          id: apiChat.id,
          name: label,
          lastMessage: apiChat.last_message || '',
          timestamp: ts,
          messageCount: apiChat.message_count || messages.length,
          messages,
          memorySize: (apiChat.memory_size as 'Small' | 'Medium' | 'Large') || 'Small',
        };
      });
      setAllChats(prev => ({ ...prev, [model]: transformedChats }));
    } catch {
      setAllChats(prev => ({ ...prev, [model]: [] }));
    } finally {
      setLoadingChats(prev => ({ ...prev, [model]: false }));
    }
  };

  useEffect(() => {
    setActiveView('list');
    setSelectedChatId(undefined);
  }, [activeModel]);

  useEffect(() => {
    if (activeModel && !allChats[activeModel]) loadChats(activeModel);
  }, [activeModel]);

  useEffect(() => {
    const current = customLLMs.length;
    if (current > prevCustomLLMsLengthRef.current && prevCustomLLMsLengthRef.current > 0) {
      setActiveView('list');
      setSelectedChatId(undefined);
    }
    prevCustomLLMsLengthRef.current = current;
  }, [customLLMs]);

  useEffect(() => {
    customLLMs.forEach(llm => {
      if (!allChats[llm.id] && !allChats[llm.name]) {
        setAllChats(prev => ({ ...prev, [llm.id]: [], [llm.name]: [] }));
      }
    });
  }, [customLLMs]);

  const currentChats = allChats[activeModel] || [];
  const selectedChat = selectedChatId ? currentChats.find(c => c.id === selectedChatId) : undefined;

  useEffect(() => {
    if (selectedChatId && activeView === 'chat') {
      if (!currentChats.some(c => c.id === selectedChatId)) {
        setActiveView('list');
        setSelectedChatId(undefined);
      }
    }
  }, [selectedChatId, activeView, activeModel, currentChats]);

  const getModelDisplayName = (model: string) => {
    const llm = customLLMs.find(l => l.name === model);
    return llm ? llm.displayName : model;
  };

  const handleContinueChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setActiveView('chat');
  };

  const handleNewChat = () => {
    const newChatId = `new-${Date.now()}`;
    setAllChats(prev => ({
      ...prev,
      [activeModel]: [{
        id: newChatId,
        name: 'New Chat',
        memorySize: 'Small',
        lastMessage: '',
        timestamp: new Date(),
        messageCount: 0,
        messages: [],
      }, ...(prev[activeModel] || [])],
    }));
    setSelectedChatId(newChatId);
    setActiveView('chat');
  };

  const handleBackToList = () => setActiveView('list');

  const handleUpdateMessages = (chatId: string, messages: Message[]) => {
    setAllChats(prev => ({
      ...prev,
      [activeModel]: (prev[activeModel] || []).map(chat => {
        if (chat.id !== chatId) return chat;
        const lastMsg = messages[messages.length - 1];
        const ts = lastMsg?.timestamp instanceof Date ? lastMsg.timestamp : lastMsg?.timestamp ? new Date(lastMsg.timestamp as string) : chat.timestamp;
        return {
          ...chat,
          messages: messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp as string),
          })),
          messageCount: messages.length,
          lastMessage: lastMsg?.content.substring(0, 100) || '',
          timestamp: ts,
        };
      }),
    }));
  };

  const handleUpdateChatId = (oldId: string, newId: string) => {
    setAllChats(prev => {
      const updated = { ...prev };
      const chats = [...(updated[activeModel] || [])];
      const idx = chats.findIndex(c => c.id === oldId);
      if (idx !== -1) {
        const ts = chats[idx].timestamp;
        chats[idx] = {
          ...chats[idx],
          id: newId,
          name: ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
        updated[activeModel] = chats;
      }
      return updated;
    });
    setSelectedChatId(newId);
  };

  // --- Memory view ---
  if (activeView === 'memory') {
    return (
      <MemoryTimeline
        agentId={getAgentId(activeModel)}
        agentName={getModelDisplayName(activeModel)}
        chatId={selectedChatId}
        onBack={handleBackToList}
      />
    );
  }

  // --- Chat view ---
  if (activeView === 'chat' && selectedChatId && selectedChat) {
    return (
      <AgentChat
        activeModel={activeModel}
        chatId={selectedChatId}
        chatName={selectedChat.name}
        initialMessages={(selectedChat.messages || []).map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp as string),
        }))}
        onBack={handleBackToList}
        onUpdateMessages={messages => {
          handleUpdateMessages(selectedChatId, messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp as string),
          })));
        }}
        onUpdateChatId={handleUpdateChatId}
        customLLMs={customLLMs}
        onAddLLM={onAddLLM}
      />
    );
  }

  // --- List view ---
  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-white">{getModelDisplayName(activeModel)}</h2>
          <p className="text-xs text-zinc-500">
            {currentChats.length} {currentChats.length === 1 ? 'chat' : 'chats'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('memory')}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Archive className="h-3.5 w-3.5" />
            Memory
          </button>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Chat
          </button>
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {loadingChats[activeModel] ? (
          <div className="text-center text-zinc-600 text-sm py-16">Loading…</div>
        ) : currentChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 pb-16">
            <MessageSquare className="h-8 w-8 text-zinc-700" />
            <p className="text-zinc-500 text-sm">No chats yet</p>
            <button
              onClick={handleNewChat}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Start first chat
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {currentChats.map(chat => (
              <li
                key={chat.id}
                className="group flex items-center justify-between px-6 py-4 hover:bg-zinc-900 cursor-pointer transition-colors"
                onClick={() => handleContinueChat(chat.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MessageSquare className="h-4 w-4 text-zinc-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm text-white font-medium truncate">{chat.name}</div>
                    {chat.lastMessage && (
                      <div className="text-xs text-zinc-500 truncate mt-0.5">{chat.lastMessage}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <span className="text-xs text-zinc-600">{chat.messageCount}</span>
                  <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AgentsView;

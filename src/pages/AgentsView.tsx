import { useState, useEffect, useRef } from 'react';
import { Plus, ChevronRight } from 'lucide-react';
import AgentChat from './AgentChat';
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

const AgentsView: React.FC<AgentsViewProps> = ({ activeModel, customLLMs, onAddLLM }) => {
  const api = useApiClient();
  const [activeView, setActiveView] = useState<'list' | 'chat'>('list');
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(undefined);
  const [allChats, setAllChats] = useState<Record<string, Chat[]>>({});
  const [loadingChats, setLoadingChats] = useState<Record<string, boolean>>({});
  const prevCustomLLMsLengthRef = useRef<number>(0);

  const getAgentId = (model: string): string => {
    const customLLM = customLLMs.find(llm =>
      llm.id === model || llm.name === model || llm.displayName === model
    );
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
        return {
          id: apiChat.id,
          name: ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          lastMessage: apiChat.last_message || '',
          timestamp: ts,
          messageCount: apiChat.message_count || messages.length,
          messages,
        };
      });
      setAllChats(prev => ({ ...prev, [model]: transformedChats }));
    } catch (error) {
      console.error(`Error loading chats for ${model}:`, error);
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
    if (activeModel && !allChats[activeModel]) {
      loadChats(activeModel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModel]);

  useEffect(() => {
    const currentLength = customLLMs.length;
    if (currentLength > prevCustomLLMsLengthRef.current && prevCustomLLMsLengthRef.current > 0) {
      setActiveView('list');
      setSelectedChatId(undefined);
    }
    prevCustomLLMsLengthRef.current = currentLength;
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
      const chatExists = currentChats.some(c => c.id === selectedChatId);
      if (!chatExists) {
        setActiveView('list');
        setSelectedChatId(undefined);
      }
    }
  }, [selectedChatId, activeView, activeModel, currentChats]);

  const getModelDisplayName = (model: string) => {
    const customLLM = customLLMs.find(llm => llm.name === model);
    return customLLM ? customLLM.displayName : model;
  };

  const handleContinueChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setActiveView('chat');
  };

  const handleNewChat = () => {
    const newChatId = `new-${Date.now()}`;
    const newChat: Chat = {
      id: newChatId,
      name: 'New Chat',
      lastMessage: '',
      timestamp: new Date(),
      messageCount: 0,
      messages: [],
    };
    setAllChats(prev => ({ ...prev, [activeModel]: [newChat, ...(prev[activeModel] || [])] }));
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
        const lastMsgTimestamp = lastMsg?.timestamp instanceof Date
          ? lastMsg.timestamp
          : lastMsg?.timestamp ? new Date(lastMsg.timestamp as string) : chat.timestamp;
        return {
          ...chat,
          messages: messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp as string),
          })),
          messageCount: messages.length,
          lastMessage: lastMsg?.content.substring(0, 100) || '',
          timestamp: lastMsgTimestamp,
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
        chats[idx] = { ...chats[idx], id: newId };
        updated[activeModel] = chats;
      }
      return updated;
    });
    setSelectedChatId(newId);
  };

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
        onUpdateMessages={(messages) => {
          const normalizedMessages = messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp as string),
          }));
          handleUpdateMessages(selectedChatId, normalizedMessages);
        }}
        onUpdateChatId={handleUpdateChatId}
        customLLMs={customLLMs}
        onAddLLM={onAddLLM}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-medium text-zinc-400">
            {getModelDisplayName(activeModel)}
          </span>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-md transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Chat
          </button>
        </div>

        {loadingChats[activeModel] ? (
          <p className="text-sm text-zinc-600 text-center py-16">Loading…</p>
        ) : currentChats.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-zinc-500 mb-3">No chats yet</p>
            <button
              onClick={handleNewChat}
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors underline underline-offset-2"
            >
              Start a conversation
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {currentChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => handleContinueChat(chat.id)}
                className="w-full flex items-center justify-between py-3 px-2 hover:bg-zinc-900 rounded-md transition-colors text-left group -mx-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-zinc-200">{chat.name}</span>
                    {chat.messageCount > 0 && (
                      <span className="text-xs text-zinc-600">{chat.messageCount}</span>
                    )}
                  </div>
                  {chat.lastMessage && (
                    <p className="text-xs text-zinc-500 truncate pr-4">{chat.lastMessage}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-zinc-500 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentsView;

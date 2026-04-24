import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, Brain, Clock, Sparkles } from 'lucide-react';
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

const AgentsView: React.FC<AgentsViewProps> = ({ activeModel, customLLMs, onAddLLM }) => {
  const api = useApiClient();
  const [activeView, setActiveView] = useState<'list' | 'chat'>('list');
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(undefined);
  const [allChats, setAllChats] = useState<Record<string, Chat[]>>({});
  const [loadingChats, setLoadingChats] = useState<Record<string, boolean>>({});
  const prevCustomLLMsLengthRef = useRef<number>(0);

  // Get agent ID from model name
  const getAgentId = (model: string): string => {
    // Check if it's a custom LLM
    const customLLM = customLLMs.find(llm => 
      llm.id === model || 
      llm.name === model || 
      llm.displayName === model
    );
    if (customLLM) {
      return customLLM.id;
    }
    // Default agents use their name as ID
    return model;
  };

  // Load chats from API
  const loadChats = async (model: string, force: boolean = false) => {
    const agentId = getAgentId(model);
    
    // Skip if already loading or already loaded (unless force refresh)
    if (!force && (loadingChats[model] || allChats[model])) {
      return;
    }

    setLoadingChats(prev => ({ ...prev, [model]: true }));

    try {
      const apiChats = await api.getChats(agentId) as any[];
      
      // Transform API response to frontend Chat format
      const transformedChats: Chat[] = apiChats.map((apiChat: any) => {
        // Transform messages
        const messages: Message[] = (apiChat.messages || []).map((msg: any) => ({
          id: msg.id || Date.now().toString(),
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
        }));

        return {
          id: apiChat.id,
          name: apiChat.id,
          lastMessage: apiChat.last_message || '',
          timestamp: apiChat.timestamp ? new Date(apiChat.timestamp) : new Date(),
          messageCount: apiChat.message_count || messages.length,
          messages: messages
        };
      });

      setAllChats(prev => ({
        ...prev,
        [model]: transformedChats
      }));

      console.log(`Loaded ${transformedChats.length} chats for ${model}`);
    } catch (error) {
      console.error(`Error loading chats for ${model}:`, error);
      // Initialize with empty array on error
      setAllChats(prev => ({
        ...prev,
        [model]: []
      }));
    } finally {
      setLoadingChats(prev => ({ ...prev, [model]: false }));
    }
  };

  // Reset view to list when activeModel changes (switching agents)
  useEffect(() => {
    setActiveView('list');
    setSelectedChatId(undefined);
  }, [activeModel]);

  // Load chats when activeModel changes
  useEffect(() => {
    if (activeModel && !allChats[activeModel]) {
      loadChats(activeModel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModel]); // Only reload when activeModel changes (customLLMs are handled separately)

  // Reset view to list when a new agent is created (customLLMs length increases)
  useEffect(() => {
    const currentLength = customLLMs.length;
    if (currentLength > prevCustomLLMsLengthRef.current && prevCustomLLMsLengthRef.current > 0) {
      // A new agent was added, reset to list view
      setActiveView('list');
      setSelectedChatId(undefined);
    }
    prevCustomLLMsLengthRef.current = currentLength;
  }, [customLLMs]);

  // Initialize custom LLM chat arrays
  useEffect(() => {
    customLLMs.forEach(llm => {
      if (!allChats[llm.id] && !allChats[llm.name]) {
        // Don't load yet, just initialize empty array
        setAllChats(prev => ({ ...prev, [llm.id]: [], [llm.name]: [] }));
      }
    });
  }, [customLLMs]);

  const currentChats = allChats[activeModel] || [];
  const selectedChat = selectedChatId ? currentChats.find(c => c.id === selectedChatId) : undefined;

  // Validate selectedChatId - if it doesn't exist in current chats, reset to list view
  useEffect(() => {
    if (selectedChatId && activeView === 'chat') {
      const chatExists = currentChats.some(c => c.id === selectedChatId);
      if (!chatExists) {
        // Selected chat doesn't exist for current model, reset to list
        setActiveView('list');
        setSelectedChatId(undefined);
      }
    }
  }, [selectedChatId, activeView, activeModel, currentChats]);

  const getMemoryColor = (size: string) => {
    switch (size) {
      case 'Small': return 'text-green-400';
      case 'Medium': return 'text-yellow-400';
      case 'Large': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getModelDisplayName = (model: string) => {
    const customLLM = customLLMs.find(llm => llm.name === model);
    if (customLLM) return customLLM.displayName;
    
    return model;
  };

  const handleContinueChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setActiveView('chat');
  };

  const handleNewChat = () => {
    // Create a temporary chat entry (will be replaced with real ID when created via API)
    const newChatId = `new-${Date.now()}`;
    const newChat: Chat = {
      id: newChatId,
      name: newChatId,
      memorySize: 'Small',
      lastMessage: '',
      timestamp: new Date(),
      messageCount: 0,
      messages: []
    };
    
    setAllChats(prev => ({
      ...prev,
      [activeModel]: [newChat, ...(prev[activeModel] || [])]
    }));
    
    setSelectedChatId(newChatId);
    setActiveView('chat');
  };

  const handleBackToList = () => {
    setActiveView('list');
  };

  const handleUpdateMessages = (chatId: string, messages: Message[]) => {
    setAllChats(prev => ({
      ...prev,
      [activeModel]: (prev[activeModel] || []).map(chat => {
        if (chat.id === chatId) {
          const lastMsg = messages[messages.length - 1];
          // Ensure timestamp is Date object
          const lastMsgTimestamp = lastMsg?.timestamp instanceof Date 
            ? lastMsg.timestamp 
            : lastMsg?.timestamp 
              ? new Date(lastMsg.timestamp as string) 
              : chat.timestamp;
          
          return {
            ...chat,
            messages: messages.map(msg => ({
              ...msg,
              timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp as string)
            })),
            messageCount: messages.length,
            lastMessage: lastMsg?.content.substring(0, 100) || '',
            timestamp: lastMsgTimestamp,
            name: chat.id
          };
        }
        return chat;
      })
    }));
    
    // Note: We don't refresh from API here because:
    // 1. Local state is already updated above
    // 2. Aggressive refresh causes chats to disappear
    // 3. Data persistence happens on backend, refresh happens when user navigates away and back
  };

  const handleUpdateChatId = (oldId: string, newId: string) => {
    // Update chat ID mapping when chat is created via API
    setAllChats(prev => {
      const updated = { ...prev };
      const chats = updated[activeModel] || [];
      const chatIndex = chats.findIndex(c => c.id === oldId);
      if (chatIndex !== -1) {
        chats[chatIndex] = { ...chats[chatIndex], id: newId, name: newId };
        updated[activeModel] = chats;
      }
      return updated;
    });
    setSelectedChatId(newId);
  };


  // Only show chat view if we have a valid selectedChat for the current model
  if (activeView === 'chat' && selectedChatId && selectedChat) {
    return (
      <AgentChat 
        activeModel={activeModel}
        chatId={selectedChatId}
        initialMessages={(selectedChat.messages || []).map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp as string)
        }))}
        onBack={handleBackToList}
        onUpdateMessages={(messages) => {
          // Ensure all timestamps are Date objects
          const normalizedMessages = messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp as string)
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
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {getModelDisplayName(activeModel)} Chats
            </h1>
            <p className="text-gray-400">
              Manage your conversations and memory capsules for {getModelDisplayName(activeModel)}
            </p>
          </div>
          
          <button 
            onClick={handleNewChat}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Chat
          </button>
        </div>

        {loadingChats[activeModel] ? (
          <div className="text-center py-20">
            <Brain className="h-16 w-16 mx-auto mb-6 text-gray-600 animate-pulse" />
            <h3 className="text-xl font-semibold text-white mb-2">Loading chats...</h3>
            <p className="text-gray-400">Fetching your conversations</p>
          </div>
        ) : currentChats.length === 0 ? (
          <div className="text-center py-20">
            <Brain className="h-16 w-16 mx-auto mb-6 text-gray-600" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No chats with {getModelDisplayName(activeModel)} yet
            </h3>
            <p className="text-gray-400 mb-6">
              Start your first conversation to begin building memory capsules
            </p>
            <button 
              onClick={handleNewChat}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Start First Chat
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentChats.map((chat) => (
              <div
                key={chat.id}
                className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-blue-400" />
                    <h3 className="font-semibold text-white">{chat.name}</h3>
                  </div>
                  <div className={`text-xs font-medium ${getMemoryColor(chat.memorySize)}`}>
                    {chat.memorySize}
                  </div>
                </div>

                <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                  {chat.lastMessage}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{chat.timestamp.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Sparkles className="h-3 w-3" />
                    <span>{chat.messageCount} messages</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleContinueChat(chat.id)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded text-sm transition-colors"
                    >
                      Continue Chat
                    </button>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm transition-colors">
                      View Capsule
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentsView;

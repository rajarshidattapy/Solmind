import { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import { useApiClient } from '../lib/api';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
}

interface LLMConfig {
  id: string;
  name: string;
  displayName: string;
  platform: string;
  apiKeyConfigured: boolean;
}

interface AgentChatProps {
  activeModel: string;
  chatId?: string;
  chatName?: string;
  initialMessages: Message[];
  onBack: () => void;
  onUpdateMessages: (messages: Message[]) => void;
  onUpdateChatId?: (oldId: string, newId: string) => void;
  customLLMs: LLMConfig[];
  onAddLLM: (llm: LLMConfig) => void;
}

const AgentChat: React.FC<AgentChatProps> = ({
  activeModel,
  chatId,
  chatName,
  initialMessages,
  onBack,
  onUpdateMessages,
  onUpdateChatId,
  customLLMs,
}) => {
  const api = useApiClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualChatId, setActualChatId] = useState<string | undefined>(chatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setActualChatId(chatId); }, [chatId]);

  const currentLLM = customLLMs.find(llm =>
    llm.id === activeModel || llm.name === activeModel || llm.displayName === activeModel ||
    llm.id.toLowerCase() === activeModel.toLowerCase() ||
    llm.name.toLowerCase() === activeModel.toLowerCase() ||
    llm.displayName.toLowerCase() === activeModel.toLowerCase()
  ) || (customLLMs.length > 0 ? customLLMs[0] : null);

  if (!currentLLM) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-sm text-zinc-500 mb-3">No model available. Add one from the navbar.</p>
        <button
          onClick={onBack}
          className="text-sm text-zinc-400 hover:text-zinc-200 underline underline-offset-2 transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  useEffect(() => {
    const loadMessages = async () => {
      if (!actualChatId || actualChatId.startsWith('new-') || messages.length > 0) return;
      try {
        const apiMessages = await api.getMessages(currentLLM.id, actualChatId) as any[];
        const transformed: Message[] = apiMessages.map((msg: any) => ({
          id: msg.id || Date.now().toString(),
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        }));
        if (transformed.length > 0) {
          setMessages(transformed);
          onUpdateMessages(transformed);
        }
      } catch (err) {
        console.error('Error loading messages:', err);
      }
    };
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualChatId, currentLLM.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !chatId) return;

    setIsLoading(true);
    setError(null);

    try {
      let agentId = currentLLM.id;

      if (agentId.startsWith('custom-') && (currentLLM as any).apiKey) {
        const agentName = currentLLM.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '-');
        const createdAgent = await api.createAgent({
          name: agentName,
          display_name: currentLLM.displayName,
          platform: currentLLM.platform,
          api_key: (currentLLM as any).apiKey,
          model: (currentLLM as any).model || currentLLM.displayName,
        }) as any;
        agentId = createdAgent.id;
        currentLLM.id = agentId;
        delete (currentLLM as any).apiKey;
      }

      let currentChatId = actualChatId || chatId;
      if (!currentChatId || currentChatId.startsWith('new-')) {
        const createdChat = await api.createChat(agentId, {
          name: `chat-${Date.now()}`,
          memory_size: 'Small',
        }) as any;
        currentChatId = createdChat.id;
        setActualChatId(currentChatId);
        if (onUpdateChatId && chatId) onUpdateChatId(chatId, currentChatId);
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: currentMessage,
        timestamp: new Date(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setCurrentMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      setMessages([...newMessages, assistantMessage]);

      let streamingContent = '';

      await api.sendMessageStream(
        agentId,
        currentChatId,
        { role: 'user', content: currentMessage },
        (chunk: string) => {
          streamingContent += chunk;
          setMessages(prev => {
            const updated = [...prev];
            const idx = updated.findIndex(m => m.id === assistantMessageId);
            if (idx !== -1) updated[idx] = { ...updated[idx], content: streamingContent };
            return updated;
          });
        },
        () => {
          const finalMessages = [...newMessages, { ...assistantMessage, content: streamingContent }];
          setMessages(finalMessages);
          onUpdateMessages(finalMessages);
          setIsLoading(false);
        },
        (err: Error) => {
          setError(err.message);
          setMessages(newMessages);
          setIsLoading(false);
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="h-11 border-b border-zinc-800 flex items-center px-4 gap-3 shrink-0">
        <button
          onClick={onBack}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-zinc-300">
          {chatName || 'New Chat'}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-xs text-zinc-500">{currentLLM.displayName}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 min-h-0">
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-zinc-600">Send a message to start</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'user' ? (
              <div className="max-w-xl bg-zinc-800 text-zinc-100 text-sm px-4 py-2.5 rounded-2xl rounded-br-sm">
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ) : (
              <div className="max-w-2xl text-zinc-200 text-sm leading-relaxed">
                {message.content ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        code: ({ children, ...props }: any) =>
                          props.inline ? (
                            <code className="bg-zinc-800 px-1 py-0.5 rounded text-xs">{children}</code>
                          ) : (
                            <code className="block bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-sm overflow-x-auto">{children}</code>
                          ),
                        pre: ({ children }) => <pre className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg overflow-x-auto mb-2">{children}</pre>,
                        h1: ({ children }) => <h1 className="text-base font-semibold mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-sm font-semibold mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-medium mb-1">{children}</h3>,
                        strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
                        blockquote: ({ children }) => <blockquote className="border-l-2 border-zinc-700 pl-3 text-zinc-400 mb-2">{children}</blockquote>,
                        a: ({ href, children }) => <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex gap-1 py-1">
                    <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-950/30 border-t border-red-900/40 shrink-0">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-zinc-800 px-4 py-3 shrink-0">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <textarea
            ref={textareaRef}
            value={currentMessage}
            onChange={(e) => {
              setCurrentMessage(e.target.value);
              resizeTextarea();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Message ${currentLLM.displayName}…`}
            rows={1}
            className="flex-1 bg-zinc-900 text-zinc-100 text-sm px-3.5 py-2.5 rounded-xl border border-zinc-800 focus:border-zinc-600 focus:outline-none placeholder-zinc-600 resize-none leading-relaxed"
            disabled={isLoading}
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!currentMessage.trim() || isLoading}
            className="h-[42px] w-[42px] flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 rounded-xl transition-colors shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentChat;

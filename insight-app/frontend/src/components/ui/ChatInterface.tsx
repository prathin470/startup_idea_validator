import { useState, useRef, useEffect } from 'react';
import { chat, type ChatMessage } from '../../services/api';
import { useAsyncError } from '../../hooks';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface Props {
  /* Passes the original idea and full conversation so App can fire /analyse */
  onSubmit: (idea: string, conversation: ChatMessage[]) => void;
}

export default function ChatInterface({ onSubmit }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [aiHasResponded, setAiHasResponded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* useAsyncError wraps the API call — gives us isLoading + error without manual try/catch */
  const { handler: sendChat, error, isLoading } = useAsyncError(chat);

  /* Auto-scroll to the latest message whenever messages update */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  async function sendMessage() {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');

    /* Build the updated history including the new user message.
       UI uses 'ai' as the role label but the API expects 'assistant' — map here. */
    const updatedMessages: Message[] = [...messages, { role: 'user', content: userText }];
    setMessages(updatedMessages);

    const apiHistory: ChatMessage[] = updatedMessages.map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content,
    }));

    const response = await sendChat(apiHistory);
    if (response) {
      setMessages(prev => [...prev, { role: 'ai', content: response }]);
      setAiHasResponded(true);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto px-6">

      {/* Header */}
      <div className="pt-10 pb-8 shrink-0">
        <p className="text-xs font-bold tracking-[0.25em] text-violet-500 uppercase mb-4">
          ◆ Insight
        </p>
        <h1 className="text-[2.6rem] font-extrabold text-zinc-900 leading-tight tracking-tight">
          What's your idea?
        </h1>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-4 py-2">

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mx-auto">
                <span className="text-violet-400 text-xl">◆</span>
              </div>
              <p className="text-zinc-300 text-sm font-light">Your conversation will appear here</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-lg text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  /* User bubble: solid violet, pill shape */
                  ? 'bg-violet-600 text-white px-5 py-3 rounded-2xl rounded-br-md shadow-sm'
                  /* AI card: white, left accent border, light shadow */
                  : 'bg-white text-zinc-700 px-5 py-4 rounded-2xl rounded-bl-md shadow-sm border border-zinc-100 border-l-[3px] border-l-violet-300'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator while waiting for AI response */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-zinc-100 border-l-[3px] border-l-violet-300 px-5 py-4 rounded-2xl rounded-bl-md shadow-sm">
              <div className="flex gap-1.5 items-center h-4">
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Inline error — keeps layout stable */}
        {error && (
          <div className="flex justify-start">
            <div className="bg-red-50 border border-red-200 text-red-500 text-sm px-5 py-3 rounded-2xl max-w-lg">
              {error.message.includes('Network') || error.message.includes('ECONNREFUSED')
                ? 'Cannot reach the backend. Make sure the FastAPI server is running on port 8000.'
                : error.message}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="py-5 space-y-3 shrink-0">

        {/* Shown after AI first responds */}
        {aiHasResponded && (
          <button
            onClick={() => {
              /* First user message is always the raw idea.
                 Remap 'ai' → 'assistant' to match the API schema before passing up. */
              const idea = messages.find(m => m.role === 'user')?.content ?? '';
              const conversation: ChatMessage[] = messages.map(m => ({
                role: m.role === 'ai' ? 'assistant' : 'user',
                content: m.content,
              }));
              onSubmit(idea, conversation);
            }}
            className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-700 active:scale-[0.99] text-white font-semibold text-sm transition-all duration-150 tracking-wide"
          >
            Begin Deep Analysis →
          </button>
        )}

        {/* Text input */}
        <div className="flex gap-3 items-end bg-white border border-zinc-200 rounded-2xl px-4 py-3 shadow-sm focus-within:border-violet-300 focus-within:shadow-md focus-within:shadow-violet-100/60 transition-all duration-200">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={messages.length === 0 ? 'Describe your product idea...' : 'Type your answer...'}
            rows={2}
            className="flex-1 bg-transparent text-zinc-800 text-sm resize-none outline-none placeholder-zinc-300 leading-relaxed"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-100 disabled:text-zinc-300 text-white text-sm font-semibold px-4 py-2 rounded-xl shrink-0 transition-colors duration-150"
          >
            Send
          </button>
        </div>

        <p className="text-center text-zinc-300 text-xs font-light">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { Conversation, Message, User } from '../types';
import { useAuth } from '../store';
import Avatar from './Avatar';
import { formatTime, formatDay } from '../utils';

interface ChatWindowProps {
  conversation: Conversation | null;
  messages: Message[];
  typing: User[];
  onSend: (content: string, mediaUrl?: string, mediaType?: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
}

export default function ChatWindow({ conversation, messages, typing, onSend, onTypingStart, onTypingStop }: ChatWindowProps) {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typing.length, conversation?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (conversation) onTypingStart();
  };

  const handleInputBlur = () => {
    if (conversation) onTypingStop();
  };

  const handleSend = () => {
    const content = input.trim();
    if (!content || !conversation) return;
    onSend(content);
    setInput('');
    onTypingStop();
  };

  const otherParticipants = conversation?.participants || [];
  const displayTitle = conversation
    ? conversation.type === 'group'
      ? conversation.name || 'Group'
      : (conversation.participants.find((p) => p.id !== user?.id)?.displayName || conversation.participants.find((p) => p.id !== user?.id)?.username || 'User')
    : '';

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
        <div className="text-2xl">💬</div>
        Select a conversation to start chatting
      </div>
    );
  }

  // Group by day
  const renderedMessages: JSX.Element[] = [];
  let lastDay: number | null = null;
  for (const m of messages) {
    const day = Math.floor(m.createdAt / 86400000) * 86400000;
    if (day !== lastDay) {
      renderedMessages.push(
        <div key={`day-${day}`} className="flex items-center gap-4 my-4">
          <div className="h-px flex-1 bg-slate-300 dark:bg-slate-700" />
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase">
            {formatDay(m.createdAt)}
          </span>
          <div className="h-px flex-1 bg-slate-300 dark:bg-slate-700" />
        </div>
      );
      lastDay = day;
    }

    const isMe = m.senderId === user?.id;
    const isGroup = conversation.type === 'group';
    const sender = m.sender;

    renderedMessages.push(
      <div key={m.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
        {!isMe && (
          <div className="w-8 shrink-0">
            {isGroup ? (
              <Avatar user={sender} size={32} />
            ) : (
              <div className="w-8" />
            )}
          </div>
        )}
        <div className={`max-w-[75%] rounded-2xl px-4 py-2 msg-anim ${
          isMe
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-900 rounded-bl-sm'
        }`}>
          {isGroup && !isMe && sender && (
            <div className="text-xs font-medium mb-0.5 text-blue-600 dark:text-blue-400">
              {sender.displayName || sender.username}
            </div>
          )}
          {m.content && <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>}
          {m.mediaUrl && m.mediaType === 'image' && (
            <img src={m.mediaUrl} alt="shared" className="mt-2 rounded-xl max-w-full" />
          )}
          <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-100' : 'text-slate-500'}`}>
            {formatTime(m.createdAt)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Avatar user={otherParticipants.find((p) => p.id !== user?.id) || otherParticipants[0]} size={40} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate block">
              {displayTitle}
            </span>
            {conversation.type === 'group' && (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {otherParticipants.length} participants
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
        {renderedMessages}
        <div ref={bottomRef} className="h-2" />
        {typing.length > 0 && (
          <div className="flex items-center gap-2 mt-1 px-2">
            {typing.map((u, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                <span className="text-xs text-slate-400">{u.displayName || u.username} is typing…</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onBlur={handleInputBlur}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-40"
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 160) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Send size={18} />
          </button>
          <button
            onClick={onTypingStop}
            className="p-2.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            <Paperclip size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
}
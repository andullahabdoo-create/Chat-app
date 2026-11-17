import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Search, Moon, Sun, LogOut, Users, MessageCirclePlus, X } from 'lucide-react';
import { Conversation, User } from '../types';
import { api } from '../api';
import { useAuth } from '../store';
import { useTheme } from '../theme';
import Avatar from './Avatar';
import { formatTime, initials } from '../utils';

export default function Sidebar({ conversations, activeId, onSelect, onNewChat }: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [search, setSearch] = useState('');

  const filtered = search
    ? conversations.filter((c) => {
        const names = c.participants.map((p) => (p.displayName || p.username).toLowerCase()).join(' ');
        const groupName = (c.name || '').toLowerCase();
        const q = search.toLowerCase();
        return names.includes(q) || groupName.includes(q);
      })
    : conversations;

  // Mobile: close sidebar when selecting
  const handleSelect = (id: string) => {
    onSelect(id);
    if (window.innerWidth < 768) {
      // The parent should handle mobile sidebar state
      document.dispatchEvent(new CustomEvent('sidebar-close'));
    }
  };

  return (
    <aside className={`w-80 flex flex-col border-r bg-white dark:bg-slate-900 h-screen px-3 border-l-2 border-slate-200 dark:border-slate-700 ${
      dark ? 'text-white' : 'text-slate-800'
    }`}>
      <header className="flex items-center justify-between py-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-medium">
            <MessageCircle size={20} />
          </div>
          <span className="text-xl font-semibold text-slate-800 dark:text-white">
            {user?.displayName || user?.username}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800" title="Toggle theme">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={logout} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800" title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full px-3 py-2 pl-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-2 rounded-lg p-1 mb-3">
          <button
            onClick={() => handleSelect('')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              !activeId ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shadow' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Chats
          </button>
        </div>

        <div className="space-y-1.5" role="list">
          {filtered.map((c) => {
            // Determine display name
            let displayName = '';
            if (c.type === 'group' && c.name) {
              displayName = c.name;
            } else {
              // DM: show other participant
              const other = c.participants.find((p) => p.id !== user?.id);
              displayName = other?.displayName || other?.username || 'Unknown';
            }
            const avatarUser = c.type === 'group'
              ? c.participants[0]
              : c.participants.find((p) => p.id !== user?.id) || c.participants[0];

            const unread = c.unreadCount || 0;
            const lastMsg = c.lastMessage;
            const lastPreview = lastMsg && lastMsg.content && lastMsg.content.length > 30 ? lastMsg.content.slice(0, 30) + '…' : (lastMsg?.content || '');
            const lastTime = lastMsg ? formatTime(lastMsg.createdAt) : '';

            return (
              <button
                key={c.id}
                className={`flex items-start rounded-lg p-3 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                  activeId === c.id ? 'bg-blue-100 dark:bg-blue-900' : 'no-underline'
                }`}
                onClick={() => handleSelect(c.id)}
                role="listitem"
                tabIndex={0}
              >
                <div className="relative mr-3 flex-shrink-0">
                  <Avatar user={avatarUser} size={48} />
                  {c.type === 'group' && <Users className="absolute -bottom-1 -right-1 text-xs text-blue-600 bg-white dark:bg-slate-900 rounded-full p-0.5" size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                      {displayName}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                      {lastTime}
                    </span>
                  </div>
                  {lastPreview && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {lastPreview}
                    </span>
                  )}
                </div>
                {unread > 0 && (
                  <span className="flex-shrink-0 ml-2 rounded-full bg-blue-600 text-white text-xs px-2 py-0.5 min-w-5 text-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
            );
          })}
          {user && conversations.length === 0 && (
            <div className="p-3 text-center text-slate-400 dark:text-slate-500">
              No conversations yet.{" "}
              <button onClick={onNewChat} className="text-blue-600 dark:text-blue-400 hover:underline">
                Start a new chat
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
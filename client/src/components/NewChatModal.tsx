import { useState, useEffect } from 'react';
import { X, Users, MessageCirclePlus, Search, Check } from 'lucide-react';
import { User } from '../types';
import { api } from '../api';
import Avatar from './Avatar';

export default function NewChatModal({ open, onClose, onCreateGroup }: { open: boolean; onClose: () => void; onCreateGroup: (name: string, memberIds: string[]) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [mode, setMode] = useState<'dm' | 'group'>('dm');

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelected([]);
      setGroupName('');
      setMode('dm');
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    api.searchUsers(query).then((r) => {
      if (!cancelled) { setResults(r.users); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [query]);

  const toggleSelect = (id: string) => {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'dm') {
      if (selected.length === 1) onCreateGroup('', selected);
    } else {
      if (groupName.trim() && selected.length >= 1) onCreateGroup(groupName.trim(), selected);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">
        <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">New Chat</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={20} />
          </button>
        </header>

        <div className="flex gap-2 p-3 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setMode('dm')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'dm' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MessageCirclePlus className="inline w-4 h-4 mr-1" /> Direct
          </button>
          <button
            onClick={() => setMode('group')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'group' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="inline w-4 h-4 mr-1" /> Group
          </button>
        </div>

        <form id="new-chat-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3">
          {mode === 'group' && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Group name</label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My awesome group"
              />
            </div>
          )}

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users…"
              className="w-full px-3 py-2 pl-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {loading && <div className="text-center text-slate-500 py-4">Searching…</div>}
          {!loading && results.length === 0 && query && (
            <div className="text-center text-slate-500 py-4">No users found</div>
          )}

          <ul className="space-y-2" role="list">
            {results.map((u) => {
              const isSelected = selected.includes(u.id);
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => toggleSelect(u.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      isSelected ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Avatar user={u} size={40} />
                    <div className="flex-1 text-left min-w-0">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate block">
                        {u.displayName || u.username}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">@{u.username}</span>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">
                        <Check size={14} />
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {selected.length > 0 && (
            <div className="mt-4 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {mode === 'dm' ? `Chatting with ${results.find(r => r.id === selected[0])?.displayName || 'user'}` : `${selected.length + 1} members selected`}
              </p>
            </div>
          )}
        </form>

        <footer className="p-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button
            type="submit"
            form="new-chat-form"
            disabled={mode === 'dm' ? selected.length !== 1 : selected.length < 1 || !groupName.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mode === 'dm' ? 'Start Chat' : 'Create Group'}
          </button>
        </footer>
      </div>
    </div>
  );
}
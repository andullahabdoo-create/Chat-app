import { Conversation, Message, User } from './types';

export interface AuthResponse {
  token: string;
  user: User;
}

const TOKEN_KEY = 'messaging_token';

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((opts.headers as Record<string, string>) || {})
  };
  const res = await fetch(path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  register: (payload: { username: string; password: string; displayName?: string }) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (payload: { username: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  me: () => request<{ user: User }>('/api/auth/me'),

  searchUsers: (q: string) =>
    request<{ users: User[] }>(`/api/users/search?q=${encodeURIComponent(q)}`),

  getUser: (id: string) => request<{ user: User }>(`/api/users/${id}`),

  getConversations: () => request<{ conversations: Conversation[] }>('/api/conversations'),

  createConversation: (participantId: string) =>
    request<{ conversation: Conversation }>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ participantId })
    }),

  getConversation: (id: string) =>
    request<{ conversation: Conversation; participants: User[] }>(`/api/conversations/${id}`),

  markRead: (id: string) => request(`/api/conversations/${id}/read`, { method: 'POST' }),

  getMessages: (conversationId: string, before?: number, limit = 50) =>
    request<{ messages: Message[] }>(
      `/api/messages/${conversationId}?limit=${limit}${before ? `&before=${before}` : ''}`
    ),

  sendMessage: (payload: { conversationId: string; content?: string; mediaUrl?: string; mediaType?: string }) =>
    request<{ message: Message }>('/api/messages', { method: 'POST', body: JSON.stringify(payload) }),

  upload: async (file: File) => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Upload failed`);
    return data as { url: string; mediaType: 'image' | 'file' };
  }
};

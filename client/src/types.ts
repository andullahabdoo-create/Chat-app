export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  status: 'online' | 'offline';
  lastSeen: number | null;
}

export interface LastMessage {
  id: string;
  senderId: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'file' | null;
  createdAt: number;
}

export interface Conversation {
  id: string;
  type: 'dm' | 'group';
  name: string | null;
  avatarColor: string | null;
  createdAt: number;
  unreadCount?: number;
  participants: User[];
  lastMessage: LastMessage | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'file' | null;
  createdAt: number;
  readAt?: number;
  sender?: User;
}
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './store';
import { useTheme } from './theme';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import NewChatModal from './components/NewChatModal';
import { connect, disconnect, getSocket } from './socket';
import { api } from './api';
import { Conversation, Message, User } from './types';

function ChatApp() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<User[]>([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Initialize socket on mount
  useEffect(() => {
    const token = localStorage.getItem('messaging_token');
    if (token) connect(token);

    const sock = getSocket();
    if (sock) {
      sock.on('message:new', handleMessageNew);
      sock.on('typing:start', handleTypingStart);
      sock.on('typing:stop', handleTypingStop);
      sock.on('message:read', handleMessageRead);
      sock.on('presence:update', handlePresenceUpdate);
    }

    loadConversations();

    return () => {
      if (sock) {
        sock.off('message:new', handleMessageNew);
        sock.off('typing:start', handleTypingStart);
        sock.off('typing:stop', handleTypingStop);
        sock.off('message:read', handleMessageRead);
        sock.off('presence:update', handlePresenceUpdate);
      }
    };
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const res = await api.getConversations();
      setConversations(res.conversations);
    } catch (e) {
      console.error('Failed to load conversations', e);
    }
  }, []);

  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      setTypingUsers([]);
      return;
    }
    api.markRead(activeConvId).catch(console.error);
    api.getMessages(activeConvId)
      .then((res) => setMessages(res.messages))
      .catch(console.error);
  }, [activeConvId]);

  const handleMessageNew = useCallback((data: { message: Message }) => {
    const { message } = data;
    const convId = message.conversationId;

    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === convId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        unreadCount: (updated[idx].unreadCount ?? 0) + 1,
        lastMessage: {
          id: message.id,
          senderId: message.senderId,
          content: message.content,
          mediaUrl: message.mediaUrl,
          mediaType: message.mediaType,
          createdAt: message.createdAt
        }
      };
      const [item] = updated.splice(idx, 1);
      return [item, ...updated];
    });

    if (activeConvId === convId) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [message, ...prev].sort((a, b) => b.createdAt - a.createdAt);
      });
      api.markRead(convId).catch(console.error);
    }
  }, [activeConvId]);

  const handleTypingStart = useCallback((data: { userId: string; conversationId: string }) => {
    if (data.conversationId !== activeConvId) return;
    if (!user || data.userId === user.id) return;

    const conv = conversations.find((c) => c.id === activeConvId);
    const u = conv?.participants.find((p) => p.id === data.userId);
    if (!u) return;

    setTypingUsers((prev) => (prev.some((p) => p.id === u.id) ? prev : [...prev, u]));
    if (typingTimeouts.current[u.id]) clearTimeout(typingTimeouts.current[u.id]);
    typingTimeouts.current[u.id] = setTimeout(() => {
      handleTypingStop({ userId: u.id, conversationId: data.conversationId });
    }, 3000);
  }, [activeConvId, user?.id, conversations]);

  const handleTypingStop = useCallback((data: { userId: string; conversationId: string }) => {
    if (data.conversationId !== activeConvId) return;
    if (typingTimeouts.current[data.userId]) clearTimeout(typingTimeouts.current[data.userId]);
    setTypingUsers((prev) => prev.filter((u) => u.id !== data.userId));
  }, [activeConvId]);

  const handleMessageRead = useCallback(() => {}, []);
  const handlePresenceUpdate = useCallback((data: { userId: string; status: string }) => {
    setConversations((prev) =>
      prev.map((c) => ({
        ...c,
        participants: c.participants.map((p) =>
          p.id === data.userId ? { ...p, status: data.status as any, lastSeen: Date.now() } : p
        )
      }))
    );
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!activeConvId) return;
    const sock = getSocket();
    if (sock) sock.emit('message:create', { conversationId: activeConvId, content });
  }, [activeConvId]);

  const onTypingStart = useCallback(() => {
    if (!activeConvId) return;
    const sock = getSocket();
    if (sock) sock.emit('typing:start', { conversationId: activeConvId });
  }, [activeConvId]);

  const onTypingStop = useCallback(() => {
    if (!activeConvId) return;
    const sock = getSocket();
    if (sock) sock.emit('typing:stop', { conversationId: activeConvId });
  }, [activeConvId]);

  const handleCreateChat = useCallback(async (name: string, memberIds: string[]) => {
    const endpoint = name ? '/api/conversations/group' : '/api/conversations';
    const body = name ? { name, memberIds } : { participantId: memberIds[0] };
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('messaging_token')}`
      },
      body: JSON.stringify(body)
    });
    loadConversations();
  }, [loadConversations]);

  const activeConversation = conversations.find((c) => c.id === activeConvId) || null;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="flex h-screen overflow-hidden">
      <div
        className={`w-80 flex-shrink-0 flex flex-col border-r bg-white dark:bg-slate-900 transition-transform duration-300 ${
          isMobile && activeConvId ? '-translate-x-full' : ''
        }`}
      >
        <Sidebar
          conversations={conversations}
          activeId={activeConvId}
          onSelect={setActiveConvId}
          onNewChat={() => setNewChatOpen(true)}
        />
      </div>

      {isMobile && activeConvId && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setActiveConvId(null)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <ChatWindow
          conversation={activeConversation}
          messages={messages}
          typing={typingUsers}
          onSend={sendMessage}
          onTypingStart={onTypingStart}
          onTypingStop={onTypingStop}
        />
      </div>

      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onCreateGroup={handleCreateChat}
      />
    </div>
  );
}

export default function Root() {
  const { user } = useAuth();
  return user ? <ChatApp /> : <AuthPage />;
}

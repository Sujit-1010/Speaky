import { api } from '@/api/apiClient';
import { useSocket } from '@/lib/SocketContext';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { motion } from 'framer-motion';
import { ArrowLeft, Check, Send, Trash2 } from 'lucide-react';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';

export default function Chat() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const friendId = urlParams.get('friendId');

  const [user, setUser] = useState(null);
  const [friend, setFriend] = useState(null);
  const [friendKey, setFriendKey] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const socket = useSocket();
  const [deleting, setDeleting] = useState({});

  const makeClientId = () => {
    try {
      return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    } catch {
      return String(Date.now());
    }
  };

  useEffect(() => {
    loadData();
    // const interval = setInterval(loadMessages, 3000);
    // return () => clearInterval(interval);
  }, [friendId]);

  useEffect(() => {
    if (!socket || !user || !friendKey) return;
    const roomId = [user.email, friendKey].sort().join('_');
    socket.emit('join_room', roomId);

    const handleReceiveMessage = (newMessage) => {
      if (
        (newMessage.from_user_id === friendKey && newMessage.to_user_id === user.email) ||
        (newMessage.from_user_id === user.email && newMessage.to_user_id === friendKey)
      ) {
        const incomingId = newMessage?.id || newMessage?._id;
        const incomingClientId = newMessage?.client_id;

        setMessages((prev) => {
          const list = prev || [];
          // If the incoming message is a confirmation of our optimistic message, replace it.
          if (incomingClientId) {
            const idx = list.findIndex((m) => m.client_id && m.client_id === incomingClientId);
            if (idx !== -1) {
              const next = [...list];
              next[idx] = { ...newMessage, id: incomingId || next[idx].id };
              return next;
            }
          }
          // Deduplicate by id
          if (incomingId && list.some((m) => (m.id || m._id) === incomingId)) {
            return list;
          }
          return [...list, { ...newMessage, id: incomingId || newMessage?.id }];
        });

        if (newMessage.from_user_id === friendKey) {
          const idToMark = incomingId;
          if (!idToMark || String(idToMark).startsWith('local:')) return;
          api.entities.ChatMessage.update(idToMark, { is_read: true })
            .then(() => {
              try { socket.emit('message_read', { message_id: idToMark, from_user_id: friendKey, to_user_id: user.email }); } catch {}
            })
            .catch(() => {});
        }
      }
    };
    const handleMessageRead = (payload = {}) => {
      if (payload.from_user_id === user.email && payload.to_user_id === friendKey) {
        setMessages((prev) => prev.map(m => m.id === payload.message_id ? { ...m, is_read: true } : m));
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_read', handleMessageRead);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_read', handleMessageRead);
    };
  }, [socket, user, friendKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    try {
      const currentUser = await api.auth.me();

      setUser(currentUser);

      const allUsers = await api.entities.User.list();

      const friendUser = allUsers.find(u => u.id === friendId || u.email === friendId);
      setFriend(friendUser);

      const peerId = friendUser?.email || friendId;
      setFriendKey(peerId);

      await loadMessages(currentUser, peerId);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (currentUser, peerId) => {
    if (!peerId || !currentUser) return;

    try {
      const allMessages = await api.entities.ChatMessage.list('-created_date', 200);
      const conversation = allMessages.filter(m =>
        (m.from_user_id === currentUser.email && m.to_user_id === peerId) ||
        (m.from_user_id === peerId && m.to_user_id === currentUser.email)
      ).sort((a, b) => new Date(a.createdAt || a.created_date || 0).getTime() - new Date(b.createdAt || b.created_date || 0).getTime());

      setMessages(conversation);

      const unreadMessages = conversation.filter(m => m.to_user_id === currentUser.email && !m.is_read);
      for (const msg of unreadMessages) {
        try {
          await api.entities.ChatMessage.update(msg.id, { is_read: true });
          try { socket?.emit('message_read', { message_id: msg.id, from_user_id: peerId, to_user_id: currentUser.email }); } catch {}
        } catch {}
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !user || !friend) return;

    const peerId = friendKey || friend.email || friendId;
    const roomId = [user.email, peerId].sort().join('_');
    const clientId = makeClientId();

    const msgData = {
      from_user_id: user.email,
      from_user_name: user.full_name,
      to_user_id: peerId,
      message: inputMessage,
      is_read: false,
      client_id: clientId,
    };

    // Optimistic update (instant UI)
    setMessages((prev) => ([
      ...(prev || []),
      {
        ...msgData,
        id: `local:${clientId}`,
        created_date: new Date().toISOString(),
      }
    ]));

    try {
      if (socket) {
        socket.emit('send_message', { ...msgData, room: roomId }, (ack) => {
          if (!ack || !ack.ok || !ack.message) return;
          const serverMsg = ack.message;
          const serverId = serverMsg.id || serverMsg._id;
          setMessages((prev) => {
            const list = prev || [];
            const idx = list.findIndex((m) => m.client_id === clientId);
            if (idx !== -1) {
              const next = [...list];
              next[idx] = { ...serverMsg, id: serverId || next[idx].id };
              return next;
            }
            if (serverId && list.some((m) => (m.id || m._id) === serverId)) return list;
            return [...list, { ...serverMsg, id: serverId || serverMsg.id }];
          });
        });
      } else {
        // Fallback if socket fails (persist via API)
        const savedMsg = await api.entities.ChatMessage.create({
          from_user_id: msgData.from_user_id,
          from_user_name: msgData.from_user_name,
          to_user_id: msgData.to_user_id,
          message: msgData.message,
          is_read: false,
        });
        const savedId = savedMsg?.id || savedMsg?._id;
        setMessages((prev) => {
          const list = prev || [];
          const idx = list.findIndex((m) => m.client_id === clientId);
          if (idx !== -1) {
            const next = [...list];
            next[idx] = { ...savedMsg, id: savedId || next[idx].id };
            return next;
          }
          return list;
        });
      }

      setInputMessage('');
    } catch (err) {
      console.error("Failed to send", err);
      // Roll back optimistic message on failure
      setMessages((prev) => (prev || []).filter((m) => m.client_id !== clientId));
    }
  };

  const deleteMessage = async (id) => {
    if (!id) return;
    if (String(id).startsWith('local:')) return;
    setDeleting(prev => ({ ...prev, [id]: true }));
    try {
      await api.entities.ChatMessage.delete(id);
      setMessages(prev => prev.filter(m => m.id !== id));
    } finally {
      setDeleting(prev => ({ ...prev, [id]: false }));
    }
  };

  const clearConversation = async () => {
    if (!user || !friendKey) return;
    const ids = messages.filter(m =>
      (m.from_user_id === user.email && m.to_user_id === friendKey) ||
      (m.from_user_id === friendKey && m.to_user_id === user.email)
    ).map(m => m.id);
    try {
      await Promise.all(ids.map(id => api.entities.ChatMessage.delete(id)));
      setMessages([]);
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const displayEmail = friend?.email || friendKey || friendId || '';
  const displayName = friend?.full_name || (displayEmail ? displayEmail.split('@')[0] : 'Unknown');
  const avatarInitial = (friend?.full_name || displayName || 'U').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Dashboard" user={user} />

      <div className="max-w-3xl mx-auto px-4 pt-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
              {avatarInitial}
            </div>
            <div>
              <h2 className="font-bold text-lg">{displayName}</h2>
              <p className="text-sm text-gray-500">{displayEmail}</p>
            </div>
          </div>
          <div className="ml-auto">
            <button
              onClick={clearConversation}
              className="px-3 py-2 rounded-lg bg-red-100 text-red-600 font-bold flex items-center gap-2 hover:bg-red-200"
            >
              <Trash2 className="w-4 h-4" />
              Clear chat
            </button>
          </div>
        </div>

        {/* Messages */}
        <ClayCard className="h-[60vh] flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <motion.div
                  key={message.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.from_user_id === user?.email ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-2xl ${message.from_user_id === user?.email
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                      }`}
                  >
                    <p>{message.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className={`text-xs ${message.from_user_id === user?.email ? 'text-white/70' : 'text-gray-400'}`}>
                        {new Date(message.createdAt || message.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {message.from_user_id === user?.email && (
                        <Check className={`w-4 h-4 ${message.is_read ? 'text-green-200' : ( 'text-white/50')}`} />
                      )}
                      {message.from_user_id === user?.email && (
                        <button
                          onClick={() => deleteMessage(message.id)}
                          disabled={!!deleting[message.id]}
                          className={`ml-1 text-xs ${message.from_user_id === user?.email ? 'text-white/70 hover:text-red-200' : 'text-gray-400 hover:text-red-500'}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 h-10 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={sendMessage}
                disabled={!inputMessage.trim()}
                className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </ClayCard>
      </div>
    </div>
  );
}
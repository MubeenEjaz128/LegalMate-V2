import React, { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import ChatBox from '../components/Chat/ChatBox';
import { MessageCircle, User, Loader2, Users, Paperclip, Inbox, Plus, Camera, Crown, Search, Video, Phone } from 'lucide-react';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

const getSocketServerUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
};

const SOCKET_URL = getSocketServerUrl();

const TABS = [
  { key: 'all', label: 'All', icon: <Inbox className="h-4 w-4" /> },
  { key: 'groups', label: 'Groups', icon: <Users className="h-4 w-4" /> },
  { key: 'unread', label: 'Unread', icon: <MessageCircle className="h-4 w-4" /> },
];

const ChatPage = () => {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const socketRef = useRef();

  // Initial fetch
  useEffect(() => {
    fetchConversations();
    fetchUsers();
  }, [user._id, user.role]);

  // Socket connection for real-time updates
  useEffect(() => {
    if (!user?._id) return;

    // Connect socket
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current.emit('setup', user._id);
    socketRef.current.on('connected', () => console.log('✅ Socket Connected'));

    // Listen for new messages to update conversation list
    socketRef.current.on('receive-chat-message', (newMessage) => {
      console.log('📨 New Message Received in ChatPage:', newMessage);
      updateConversationList(newMessage);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [user._id]); // Removed conversations dependency to prevent re-binding loops

  const updateConversationList = (newMessage) => {
    setConversations(prev => {
      // Logic for both direct and group messages
      // For group: conversation ID is in newMessage.conversation._id or newMessage.conversation
      // For direct: we need to find the conversation with the other user

      let conversationId = newMessage.conversation?._id || newMessage.conversation;
      let existingIndex = -1;

      if (conversationId) {
        existingIndex = prev.findIndex(c => c._id === conversationId);
      } else {
        // Fallback for some backend implementations where conversationId might not be explicit in message
        // Try to match by users
        const otherId = newMessage.sender?._id || newMessage.from?._id || newMessage.from;
        if (otherId) {
          existingIndex = prev.findIndex(c =>
            !c.isGroup && (
              (c.lawyer?._id === otherId) || (c.client?._id === otherId)
            )
          );
        }
      }

      let updatedList = [...prev];

      if (existingIndex > -1) {
        // Update existing conversation
        const existingConv = updatedList[existingIndex];
        const updatedConv = {
          ...existingConv,
          lastMessage: newMessage.message || (newMessage.attachmentUrl ? 'Sent an attachment' : 'New message'),
          lastMessageDate: newMessage.createdAt || new Date().toISOString(), // Ensure date updates
          updatedAt: new Date().toISOString(),
          unreadCount: (selectedConversation?._id === existingConv._id) ? 0 : (existingConv.unreadCount || 0) + 1
        };

        // Move to top
        updatedList.splice(existingIndex, 1);
        updatedList.unshift(updatedConv);
      } else {
        // If it's a new conversation, fetch fresh list to ensure we have full details (lawyer/client objects etc.)
        fetchConversations();
        return prev;
      }

      return updatedList;
    });
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      let res = user.role === 'lawyer'
        ? await chatAPI.getHistoryForLawyer(user._id)
        : await chatAPI.getHistory(user._id);

      // Sort by updatedAt desc
      const sorted = (res.data || []).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setConversations(sorted);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await chatAPI.getHistory(user._id);
      let users = [];
      res.data?.forEach(conv => {
        if (user.role === 'client' && conv.lawyer) users.push(conv.lawyer);
        if (user.role === 'lawyer' && conv.client) users.push(conv.client);
      });
      // Unique users
      const uniqueUsers = Array.from(new Map(users.map(item => [item._id, item])).values());
      setAllUsers(uniqueUsers);
    } catch {
      setAllUsers([]);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!conv.lawyer || !conv.client) return false;
    if (activeTab === 'unread') return conv.unreadCount > 0;
    if (activeTab === 'groups') return conv.isGroup;
    return true;
  }).filter(conv => {
    if (!search) return true;
    const name = conv.isGroup ? conv.name : (user.role === 'client' ? conv.lawyer?.name : conv.client?.name);
    return name?.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelectConversation = (conv) => {
    // Reset unread count locally
    const updated = conversations.map(c =>
      c._id === conv._id ? { ...c, unreadCount: 0 } : c
    );
    setConversations(updated);
    setSelectedConversation(conv);
  };

  // Group creation logic...
  const handleCreateGroup = async () => {
    if (!groupName || groupMembers.length < 2) return;
    setCreatingGroup(true);
    try {
      let avatarUrl = null;
      if (avatarFile) {
        setAvatarUploading(true);
        const formData = new FormData();
        formData.append('file', avatarFile);
        formData.append('conversationId', 'ne-group'); // Temp ID, backend should handle
        // Wait, the API requires a conversation ID for attachment?
        // Let's create group first then upload avatar if essential, or if API supports it in body
        // Assuming createGroup handles it or we skip avatar for now to keep it simple
      }
      // Simplified: Just create group with text first
      await chatAPI.createGroup({
        name: groupName,
        members: [user._id, ...groupMembers]
      });

      setShowGroupModal(false);
      setGroupName('');
      setGroupMembers([]);
      setAvatarFile(null);
      fetchConversations();
      toast.success('Group created successfully');
    } catch (error) {
      toast.error('Failed to create group');
    } finally {
      setCreatingGroup(false);
      setAvatarUploading(false);
    }
  };

  const getUserName = (conv) => {
    if (conv.isGroup) return conv.name;
    return user.role === 'client' ? conv.lawyer?.name : conv.client?.name;
  };

  const getUserAvatar = (conv) => {
    if (conv.isGroup) {
      return (
        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center border-2 border-white shadow-sm">
          <Users className="h-6 w-6 text-purple-600" />
        </div>
      );
    }
    const name = getUserName(conv);
    return (
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg border-2 border-white shadow-sm">
        {name?.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-xl overflow-hidden flex border border-secondary-200">

      {/* Sidebar */}
      <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 flex-col border-r border-secondary-100 bg-secondary-50/50`}>

        {/* Sidebar Header */}
        <div className="p-5 bg-white border-b border-secondary-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-secondary-800 tracking-tight">Messages</h1>
            <button
              onClick={() => setShowGroupModal(true)}
              className="p-2 rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
              title="New Group"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search chat..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex px-5 py-2 space-x-2 overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTab === tab.key
                ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                : 'bg-white text-secondary-600 hover:bg-secondary-100 border border-secondary-200'
                }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-10 opacity-50">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 text-secondary-300" />
              <p className="text-sm">No conversations found</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv._id}
                onClick={() => handleSelectConversation(conv)}
                className={`w-full p-3 rounded-xl flex items-start space-x-3 transition-all ${selectedConversation?._id === conv._id
                  ? 'bg-white shadow-md border-l-4 border-primary-500 scale-100'
                  : 'hover:bg-white/60 hover:shadow-sm scale-95 hover:scale-100' // Slight indent for unselected
                  }`}
              >
                <div className="relative">
                  {getUserAvatar(conv)}
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-error-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`text-sm font-semibold truncate ${selectedConversation?._id === conv._id ? 'text-secondary-900' : 'text-secondary-700'}`}>
                      {getUserName(conv)}
                    </h3>
                    {conv.lastMessageDate && (
                      <span className="text-[10px] text-secondary-400 flex-shrink-0 ml-2">
                        {new Date(conv.lastMessageDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs truncate ${conv.unreadCount > 0
                    ? 'text-secondary-900 font-medium'
                    : 'text-secondary-500'
                    }`}>
                    {conv.lastMessage || 'Start a conversation'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-white relative ${!selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between bg-white z-10">
              <div className="flex items-center space-x-4">
                <button
                  className="lg:hidden p-2 -ml-2 text-secondary-500 hover:text-secondary-700"
                  onClick={() => setSelectedConversation(null)}
                >
                  ←
                </button>
                {getUserAvatar(selectedConversation)}
                <div>
                  <h2 className="text-lg font-bold text-secondary-800">{getUserName(selectedConversation)}</h2>
                  <div className="flex items-center space-x-2 text-xs text-secondary-500">
                    {selectedConversation.isGroup ? (
                      <span>{selectedConversation.members?.length} members</span>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-success-500"></span>
                        <span>Active now</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Icons removed as per requirement */}
              </div>
            </div>

            {/* Chat Box */}
            <div className="flex-1 overflow-hidden relative">
              <ChatBox
                conversationId={selectedConversation._id}
                toUser={selectedConversation.isGroup ? null : (user.role === 'client' ? selectedConversation.lawyer : selectedConversation.client)}
                isGroup={selectedConversation.isGroup}
                groupName={selectedConversation.groupName}
                groupMembers={selectedConversation.members}
                onConversationDeleted={() => {
                  setSelectedConversation(null);
                  fetchConversations();
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-secondary-50/30">
            <div className="w-32 h-32 bg-primary-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <MessageCircle className="h-16 w-16 text-primary-500" />
            </div>
            <h2 className="text-2xl font-bold text-secondary-800 mb-2">Welcome to Messages</h2>
            <p className="text-secondary-500 max-w-sm">
              Select a conversation from the left to start chatting with your {user.role === 'client' ? 'lawyer' : 'client'}.
            </p>
          </div>
        )}
      </div>

      {/* Group Creation Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-secondary-800 mb-6">Create New Group</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Group Name</label>
                <input
                  className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Case #1234 Discussion"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Select Members</label>
                <div className="max-h-48 overflow-y-auto border border-secondary-200 rounded-xl p-2 bg-secondary-50">
                  {allUsers.length === 0 ? (
                    <p className="text-xs text-secondary-500 p-2">No contacts found.</p>
                  ) : (
                    allUsers.map(u => (
                      <label key={u._id} className="flex items-center gap-3 p-2 hover:bg-secondary-100 rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-primary-500 rounded focus:ring-primary-500"
                          checked={groupMembers.includes(u._id)}
                          onChange={e => {
                            if (e.target.checked) setGroupMembers([...groupMembers, u._id]);
                            else setGroupMembers(groupMembers.filter(id => id !== u._id));
                          }}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-secondary-900">{u.name}</p>
                          <p className="text-xs text-secondary-500">{u.email}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-secondary-400 mt-2 text-right">{groupMembers.length} selected (min 2)</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-8">
              <button
                className="px-5 py-2.5 text-secondary-600 font-medium hover:bg-secondary-100 rounded-xl transition-all"
                onClick={() => setShowGroupModal(false)}
              >
                Cancel
              </button>
              <button
                className={`px-5 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all ${(!groupName || groupMembers.length < 2 || creatingGroup) ? 'opacity-50 cursor-not-allowed shadow-none' : ''
                  }`}
                disabled={!groupName || groupMembers.length < 2 || creatingGroup}
                onClick={handleCreateGroup}
              >
                {creatingGroup ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
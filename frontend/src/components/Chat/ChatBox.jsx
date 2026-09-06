import React, { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Send, Paperclip, Users, UserPlus, UserMinus, Download, Eye, Trash2, X, Check, CheckCheck, Mic, Square, Play, Pause, Upload } from 'lucide-react';
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

const ChatBox = ({ conversationId, toUser, isGroup, groupName, groupMembers, onConversationDeleted }) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const socketRef = useRef();
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showMembers, setShowMembers] = useState(false);
  const [addMemberId, setAddMemberId] = useState('');
  const [members, setMembers] = useState(groupMembers || []);
  const messagesEndRef = useRef(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false); // Anti-duplicate flag
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    setMembers(groupMembers || []);
  }, [groupMembers]);

  useEffect(() => {
    if (!conversationId) return;

    // Fetch messages
    chatAPI.getConversationMessages(conversationId)
      .then(res => {
        setMessages(res.data || []);
      })
      .catch(err => {
        console.error('Failed to load messages:', err);
        setMessages([]);
      });

    // Mark as read
    chatAPI.markAsRead(conversationId)
      .catch(err => console.error('Failed to mark as read:', err));

    // Cleanup previous socket logic
    if (socketRef.current) {
      socketRef.current.off('receive-chat-message');
      socketRef.current.off('user-typing');
      socketRef.current.emit('leave-chat-conversation', conversationId);
      socketRef.current.disconnect();
    }

    // Setup new socket connection
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current.emit('join-chat-conversation', conversationId);

    // Listen for new messages
    socketRef.current.on('receive-chat-message', (newMessage) => {
      setMessages(prev => {
        if (prev.find(msg => msg._id === newMessage._id)) return prev;

        // Delivery confirmation
        if (newMessage.from?._id !== user._id) {
          socketRef.current.emit('message-delivered', {
            messageId: newMessage._id,
            userId: user._id
          });
        }
        return [...prev, newMessage];
      });

      // Read confirmation
      if (newMessage.to === user._id || newMessage.isGroup) {
        chatAPI.markAsRead(conversationId);
        socketRef.current.emit('message-read', {
          conversationId,
          messageId: newMessage._id,
          userId: user._id
        });
      }
    });

    socketRef.current.on('message-marked-read', ({ messageId, conversationId: cid, userId }) => {
      if (cid === conversationId) {
        setMessages(prev =>
          prev.map(msg =>
            (msg._id === messageId || ((!messageId) && msg.to === userId)) // Update specific message or all if logic permits, but simpler to just match ID or update all previous unread? 
              // Actually, usually 'message-marked-read' might be for a specific message or "all messages up to X". 
              // The backend emits it per message or we can do a bulk update.
              // Let's look at backend: socket.to(conversationId).emit('message-marked-read', { messageId, ... });
              // It sends per message.
              ? { ...msg, isRead: true, readAt: new Date() }
              : msg
          )
        );
      }
    });

    // Listen for delivery confirmations
    socketRef.current.on('message-delivery-confirmed', ({ messageId, status }) => {
      if (status === 'delivered') {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === messageId
              ? { ...msg, isDelivered: true, deliveredAt: new Date() }
              : msg
          )
        );
      }
    });

    socketRef.current.on('user-typing', ({ userId, isTyping }) => {
      if (userId !== user._id) {
        setIsOtherTyping(isTyping);
        if (isTyping) {
          setTimeout(() => setIsOtherTyping(false), 3000);
        }
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-chat-conversation', conversationId);
        socketRef.current.disconnect();
      }
    };
  }, [conversationId, toUser?._id, user._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOtherTyping]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() && !attachment) return;
    if (isSending) return;

    if (!conversationId) {
      toast.error('Cannot send message: No conversation selected');
      return;
    }

    setIsSending(true);

    try {
      let msg;
      const formData = new FormData();
      formData.append('clientMessageId', Date.now() + '-' + Math.random());
      if (input.trim()) formData.append('message', input.trim());
      if (attachment) {
        formData.append('attachment', attachment);
        setUploading(true);
      }

      if (isGroup) {
        const res = await chatAPI.sendGroupMessage(conversationId, formData, {
          onUploadProgress: attachment ? (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          } : undefined
        });
        msg = res.data;
      } else {
        const toUserId = toUser?._id || (conversationId && conversationId.split('_').find(id => id !== user._id));
        formData.append('conversationId', conversationId);
        formData.append('to', toUserId);

        const res = await chatAPI.sendMessage(formData, {
          onUploadProgress: attachment ? (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          } : undefined
        });
        msg = res.data.message || res.data;
      }

      if (attachment) {
        setUploading(false);
        setAttachment(null);
        setUploadProgress(0);
      }

      setInput('');
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, { ...msg, isDelivered: true, deliveredAt: new Date() }];
      });
      setIsSending(false);

    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      setIsSending(false);
      if (uploading) {
        setUploading(false);
        setAttachment(null);
        setUploadProgress(0);
      }
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (socketRef.current && e.target.value.trim() !== '') {
      socketRef.current.emit('chat-typing', {
        conversationId,
        userId: user._id,
        isTyping: true
      });
      clearTimeout(window.typingTimeout);
      window.typingTimeout = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('chat-typing', {
            conversationId,
            userId: user._id,
            isTyping: false
          });
        }
      }, 2000);
    }
  };

  const handleAddMember = async () => {
    if (!addMemberId) return;
    try {
      await chatAPI.addGroupMember(conversationId, addMemberId);
      setMembers([...members, { _id: addMemberId }]);
      setAddMemberId('');
      toast.success('Member added');
    } catch (error) {
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (id) => {
    try {
      await chatAPI.removeGroupMember(conversationId, id);
      setMembers(members.filter(m => m._id !== id));
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const handleDeleteConversation = async () => {
    try {
      await chatAPI.deleteConversation(conversationId);
      setShowDeleteConfirm(false);
      onConversationDeleted?.(conversationId);
      toast.success('Conversation deleted');
    } catch (error) {
      toast.error('Failed to delete conversation');
    }
  };
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice_message_${Date.now()}.webm`, { type: 'audio/webm' });
        setAttachment(file);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Cannot access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      chunksRef.current = []; // Clear chunks to avoid saving
      // We might need a flag to indicate cancellation in onstop, or just clear attachment immediately after
      setTimeout(() => setAttachment(null), 100);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderAttachment = (msg) => {
    if (!msg.attachmentUrl) return null;
    const fileExtension = msg.attachmentName?.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension);
    const isAudio = ['mp3', 'wav', 'ogg', 'webm', 'mpeg'].includes(fileExtension) || msg.type === 'audio' || msg.attachmentType?.startsWith('audio/');
    const fileUrl = chatAPI.getFileUrl(msg.attachmentUrl.split('/').pop());

    return (
      <div className="mt-1">
        {isImage ? (
          <div className="group relative">
            <img
              src={fileUrl}
              alt={msg.attachmentName}
              className="max-w-[240px] max-h-64 rounded-xl object-cover cursor-pointer hover:opacity-95 transition-opacity shadow-sm"
              onClick={() => window.open(fileUrl, '_blank')}
            />
          </div>
        ) : isAudio ? (
          <div className="flex items-center gap-2 p-2 min-w-[220px] bg-transparent">
            {/* Styling audio player wrapper */}
            <div className="flex-1">
              <audio controls src={fileUrl} className="w-full h-8" />
            </div>
            {/* Filename hidden for audio */}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-secondary-50/80 rounded-xl border border-secondary-100">
            <div className="bg-primary-50 p-2 rounded-lg">
              <Paperclip className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-secondary-700 truncate">{msg.attachmentName}</p>
              <p className="text-[10px] text-secondary-400 uppercase">{fileExtension}</p>
            </div>
            <a
              href={fileUrl}
              download={msg.attachmentName}
              className="p-1.5 hover:bg-secondary-200 rounded-full text-secondary-500 transition-colors"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    );
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#fdfbf7] relative">
      {/* Background Pattern Overlay - Subtle geometric or just nice color */}
      <div className="absolute inset-0 opacity-[0.4] pointer-events-none" style={{
        backgroundImage: `radial-gradient(#e5e7eb 1px, transparent 1px)`,
        backgroundSize: '20px 20px'
      }}></div>

      {/* Group Info Header (only if group & showing members) */}
      {isGroup && showMembers && (
        <div className="bg-white border-b border-secondary-200 p-4 z-20 shadow-sm animate-in slide-in-from-top-2">
          {/* ... existing group header code ... */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-secondary-800">Group Members ({members.length})</h3>
            <button onClick={() => setShowMembers(false)} className="text-secondary-400 hover:text-secondary-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              className="flex-1 px-3 py-2 bg-secondary-50 border border-secondary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-success-500"
              placeholder="Add User ID..."
              value={addMemberId}
              onChange={e => setAddMemberId(e.target.value)}
            />
            <button
              onClick={handleAddMember}
              disabled={!addMemberId}
              className="bg-success-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-success-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar">
            {members.map(m => (
              <div key={m._id} className="flex items-center justify-between p-2 hover:bg-secondary-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-secondary-200 flex items-center justify-center text-xs font-semibold text-secondary-600">
                    {m.name?.charAt(0) || '?'}
                  </div>
                  <span className="text-sm text-secondary-700">{m.name || m._id}</span>
                </div>
                {m._id !== user._id && (
                  <button onClick={() => handleRemoveMember(m._id)} className="text-red-400 hover:text-error-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 z-10 custom-scrollbar">
        {messages.map((msg, idx) => {
          const isMe = msg.from?._id === user._id || msg.from === user._id;
          const showAvatar = !isMe && (idx === 0 || messages[idx - 1]?.from?._id !== msg.from?._id);

          return (
            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              {!isMe && (
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md flex items-center justify-center text-xs font-bold text-white mr-2 flex-shrink-0 self-end mb-1 ${showAvatar ? 'visible' : 'invisible'}`}>
                  {(msg.from?.name || '?').charAt(0).toUpperCase()}
                </div>
              )}

              <div className={`max-w-[75%] rounded-2xl px-4 py-2 relative shadow-sm ${isMe
                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-none'
                : 'bg-white text-secondary-800 rounded-bl-none border border-secondary-100'
                }`}>
                {!isMe && isGroup && showAvatar && (
                  <p className="text-[10px] font-bold text-indigo-600 mb-0.5">{msg.from?.name}</p>
                )}

                <div className={`text-[15px] whitespace-pre-wrap leading-relaxed ${isMe ? 'text-white/95' : 'text-secondary-800'}`}>
                  {msg.message}
                </div>

                {renderAttachment(msg)}

                <div className={`flex items-center justify-end gap-1 mt-1 space-x-0.5 select-none opacity-80`}>
                  <span className={`text-[10px] min-w-[45px] text-right ${isMe ? 'text-indigo-100' : 'text-secondary-400'}`}>
                    {formatTime(msg.createdAt)}
                  </span>
                  {isMe && (
                    <span className="" title={msg.isRead ? "Read" : "Delivered"}>
                      {msg.isRead ? (
                        <CheckCheck className="h-3.5 w-3.5 text-primary-300" />
                      ) : (
                        <Check className="h-3.5 w-3.5 text-indigo-200" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {isOtherTyping && (
        <div className="px-14 py-2 bg-transparent z-10 w-full animate-in fade-in">
          <div className="bg-white/80 backdrop-blur-sm border border-secondary-100 px-4 py-2 rounded-2xl inline-flex items-center gap-1 shadow-sm">
            <span className="text-xs text-secondary-500 font-medium mr-2">Typing</span>
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-75"></span>
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-150"></span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white/90 backdrop-blur-md border-t border-secondary-100 px-4 py-3 z-20 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        {attachment && (
          <div className="flex items-center gap-3 mb-3 bg-secondary-50 p-2.5 rounded-xl border border-secondary-200/60 shadow-sm mx-1 animate-in slide-in-from-bottom-2">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Paperclip className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-secondary-700 truncate">{attachment.name}</p>
              <p className="text-xs text-secondary-400">Ready to send</p>
            </div>
            <button onClick={() => setAttachment(null)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-full text-secondary-400 transition-all">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <form onSubmit={sendMessage} className="flex items-end gap-2 max-w-4xl mx-auto">
          <label className="p-3 text-secondary-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full cursor-pointer transition-all active:scale-95 mb-0.5">
            <Paperclip className="h-5 w-5" />
            <input type="file" className="hidden" onChange={handleFileChange} />
          </label>

          <div className="flex-1 relative flex items-center bg-secondary-100 rounded-3xl border border-transparent focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            {!isRecording ? (
              <textarea
                className="w-full bg-transparent border-none rounded-3xl py-3 px-4 focus:outline-none placeholder-secondary-400 text-sm resize-none max-h-32 min-h-[44px]"
                placeholder="Type a message..."
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e);
                  }
                }}
                rows={1}
                style={{ height: 'auto', minHeight: '44px' }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-between px-4 bg-error-50 rounded-3xl border border-error-100 animate-pulse z-10">
                <div className="flex items-center gap-3 text-error-500">
                  <span className="w-3 h-3 rounded-full bg-error-500 animate-pulse"></span>
                  <span className="font-medium text-sm tabular-nums">{formatDuration(recordingTime)}</span>
                </div>
                <span className="text-xs text-red-400 font-medium hidden sm:inline-block">Recording audio...</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="p-2 text-red-400 hover:text-error-600 hover:bg-error-100 rounded-full transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="p-2 text-success-500 hover:bg-success-100 rounded-full transition-colors"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center mb-0.5">
            {(input.trim() || attachment) && !isRecording ? (
              <button type="submit" disabled={isSending} className="btn-primary p-3 rounded-full aspect-square flex items-center justify-center shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all transform active:scale-95 disabled:opacity-50 disabled:shadow-none">
                <Send className="h-5 w-5 ml-0.5" />
              </button>
            ) : !isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="p-3 bg-secondary-100 text-secondary-500 hover:bg-error-50 hover:text-error-500 rounded-full aspect-square transition-all active:scale-95"
              >
                <Mic className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        </form>
      </div>

      {/* Upload Progress Overlay */}
      {uploading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-secondary-100 w-72 text-center">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-secondary-800 mb-1">Sending File...</h3>
            <p className="text-secondary-500 text-xs mb-4">{attachment?.name}</p>
            <div className="w-full bg-secondary-100 rounded-full h-2 mb-2 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <p className="text-xs font-semibold text-indigo-600">{uploadProgress}%</p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-secondary-900/40 z-50 flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm border border-secondary-100 scale-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-error-50 text-error-500 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-secondary-900 mb-2">Delete Conversation?</h3>
            <p className="text-secondary-500 mb-6 text-sm leading-relaxed">
              This will permanently delete the message history for both you and the other participant. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2.5 rounded-xl text-secondary-600 hover:bg-secondary-50 font-medium text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConversation}
                className="px-5 py-2.5 rounded-xl bg-error-500 text-white hover:bg-error-600 font-medium text-sm shadow-lg shadow-red-200 transition-all transform active:scale-95"
              >
                Delete Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBox;

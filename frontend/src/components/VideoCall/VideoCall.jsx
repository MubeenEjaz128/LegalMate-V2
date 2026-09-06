import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Settings, MessageCircle, X, Circle, Timer, Maximize2, Minimize2 } from 'lucide-react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import toast from 'react-hot-toast';

// Axios instance for video recording API calls
const getApi = () => {
  const token = (() => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) return JSON.parse(authStorage).state?.token;
    } catch { return null; }
    return null;
  })();

  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return { baseURL, headers, token };
};

const videoRecordingAPI = {
  startRecording: async (data) => {
    const { baseURL, headers } = getApi();
    return fetch(`${baseURL}/video-recordings/start`, { method: 'POST', headers, credentials: 'include', body: JSON.stringify(data) }).then(r => r.json());
  },
  uploadRecording: async (id, formData) => {
    const { baseURL, token } = getApi();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${baseURL}/video-recordings/${id}/upload`, { method: 'POST', headers, credentials: 'include', body: formData }).then(r => r.json());
  },
  saveChat: async (id, data) => {
    const { baseURL, headers } = getApi();
    return fetch(`${baseURL}/video-recordings/${id}/chat`, { method: 'POST', headers, credentials: 'include', body: JSON.stringify(data) }).then(r => r.json());
  },
  endRecording: async (id, data) => {
    const { baseURL, headers } = getApi();
    return fetch(`${baseURL}/video-recordings/${id}/end`, { method: 'POST', headers, credentials: 'include', body: JSON.stringify(data) }).then(r => r.json());
  },
};

const SESSION_DURATION_LIMIT = 60 * 60; // 1 hour in seconds

const VideoCall = ({ consultationId, userRole, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [callStartTime, setCallStartTime] = useState(null);
  const [callDuration, setCallDuration] = useState('00:00');
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [remoteStreamError, setRemoteStreamError] = useState(false);
  const [networkStats, setNetworkStats] = useState({ rtt: 0, packetLoss: 0 });
  const [debugLogs, setDebugLogs] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSessionId, setRecordingSessionId] = useState(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(SESSION_DURATION_LIMIT);
  const [sessionWarningShown, setSessionWarningShown] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [isVideoSwapped, setIsVideoSwapped] = useState(false);

  const addDebugLog = (msg) => {
    setDebugLogs(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  const socketRef = useRef();
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();
  const localStreamRef = useRef();
  const screenStreamRef = useRef();
  const isMountedRef = useRef(true);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const allChatMessagesRef = useRef([]);
  const canvasRef = useRef(null);
  const canvasAnimFrameRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Get user info from localStorage
  const userInfo = React.useMemo(() => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        return JSON.parse(authStorage).state?.user || null;
      }
    } catch (e) {
      return null;
    }
    return null;
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    // Use window.location.origin if VITE_API_URL is not set or relative
    let SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
    if (!SOCKET_URL || SOCKET_URL.startsWith('/')) {
      SOCKET_URL = window.location.origin;
    }

    if (!socketRef.current) {
      console.log('Connecting to Socket.IO at:', SOCKET_URL);
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });
    }

    const socket = socketRef.current;

    const joinRoom = () => {
      console.log('Joining consultation:', consultationId);
      socket.emit('join-consultation', {
        consultationId,
        userId: userInfo?._id,
        name: userInfo?.name || (userRole === 'lawyer' ? 'Lawyer' : 'Client'),
        role: userRole,
      });
    };

    if (!socket.connected) {
      socket.on('connect', () => {
        console.log('Connected to Socket.IO server');
        joinRoom();
      });
    } else {
      // Already connected, just join
      joinRoom();
    }

    // Re-join room on reconnection (e.g. after temporary network drop)
    socket.on('reconnect', () => {
      console.log('Socket reconnected — re-joining room');
      addDebugLog('Socket reconnected, re-joining room');
      joinRoom();
      toast.success('Connection restored');
    });

    socket.on('user-joined', (data) => {
      console.log('User joined:', data);
      setParticipants((prev) => {
        if (!prev.some((p) => p.id === data.id)) {
          return [...prev, { id: data.id, name: data.name || 'Unknown', role: data.role }];
        }
        return prev;
      });
      toast.success(`${data.name} joined the consultation`);

      // Initiate connection to the new user
      if (!peerRef.current) {
        addDebugLog(`User joined, initiating connection to ${data.name}`);
        try {
          const peer = new Peer({
            initiator: true,
            trickle: true, // Enable trickle ICE
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                {
                  urls: 'turn:64.227.155.150:3478?transport=udp',
                  username: 'legalmate',
                  credential: 'securepassword'
                },
                {
                  urls: 'turn:64.227.155.150:3478?transport=tcp',
                  username: 'legalmate',
                  credential: 'securepassword'
                }
              ]
            },
            stream: localStreamRef.current,
          });

          peer.on('connect', () => {
            addDebugLog('P2P Connected (Initiator)');
            toast.success('P2P connection established');
          });
          peer.on('signal', (signal) => {
            if (signal.type === 'offer') {
              socketRef.current.emit('offer', {
                consultationId,
                offer: signal,
                name: userInfo?.name || (userRole === 'lawyer' ? 'Lawyer' : 'Client'),
                from: socketRef.current.id,
              });
            } else if (signal.candidate) {
              socketRef.current.emit('ice-candidate', {
                consultationId,
                candidate: signal,
              });
            } else {
              // Handle other signal types if necessary, or just emit as offer/answer depending on state
              // For simple-peer, usually just passing the whole signal object works if we don't split it manually
              // But since we split logic, let's be careful.
              // Actually, simple-peer 'signal' event emits an object that should be passed to the other peer.
              // If it has 'type', it's SDP. If 'candidate', it's ICE.
              // If we are initiator, the first one is offer.
              if (signal.type === 'answer') {
                // Initiator shouldn't generate answer usually, but re-negotiation might
                socketRef.current.emit('answer', {
                  consultationId,
                  answer: signal,
                  to: data.from // We don't have 'to' here easily in this closure unless we track it
                });
              } else {
                // Fallback for initial offer
                socketRef.current.emit('offer', {
                  consultationId,
                  offer: signal,
                  name: userInfo?.name || (userRole === 'lawyer' ? 'Lawyer' : 'Client'),
                  from: socketRef.current.id,
                });
              }
            }
          });
          peer.on('stream', (stream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = stream;
              console.log('Remote stream set:', stream.getTracks());
            }
          });
          peer.on('error', (err) => {
            console.error('Peer connection error:', err);
            addDebugLog(`Peer Init Error: ${err.message}`);
            toast.error('Failed to establish video connection');
          });
          peerRef.current = peer;
        } catch (err) {
          console.error('Peer init exception:', err);
          addDebugLog(`Peer Init Exception: ${err.message}`);
        }
      }
    });

    socketRef.current.on('user-left', (data) => {
      console.log('User left:', data);
      setParticipants((prev) => prev.filter((p) => p.id !== data.id));
      toast.info(`${data.name} left the consultation`);
    });

    socketRef.current.on('offer', handleOffer);
    socketRef.current.on('answer', handleAnswer);
    socketRef.current.on('ice-candidate', handleIceCandidate);
    socketRef.current.on('chat-message', handleChatMessage);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [consultationId, userRole]);

  // Call duration timer
  useEffect(() => {
    let interval;
    if (callStartTime && isConnected) {
      interval = setInterval(() => {
        const elapsed = Date.now() - callStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        setCallDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStartTime, isConnected]);

  // Initialize media stream
  useEffect(() => {
    const initializeMedia = async () => {
      if (!isMountedRef.current) return;
      try {
        setIsLoading(true);
        setError(null);

        const constraints = [
          { video: { width: 640, height: 480, facingMode: 'user' }, audio: true },
          { video: { width: 320, height: 240 }, audio: true },
          { video: true, audio: true },
          { video: false, audio: true },
        ];

        let stream = null;
        let constraintIndex = 0;

        while (!stream && constraintIndex < constraints.length) {
          try {
            console.log(`Trying constraint ${constraintIndex}:`, constraints[constraintIndex]);
            stream = await navigator.mediaDevices.getUserMedia(constraints[constraintIndex]);
            console.log('Stream obtained with constraint:', constraintIndex);
            break;
          } catch (err) {
            console.log(`Constraint ${constraintIndex} failed:`, err.message);
            constraintIndex++;
          }
        }

        if (!stream) {
          throw new Error('Unable to access camera/microphone with any constraint');
        }

        if (!isMountedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        console.log('Local Stream Tracks:', stream.getTracks());
        localStreamRef.current = stream;

        setIsConnected(true);
        setIsLoading(false);

        if (!callStartTime) {
          setCallStartTime(Date.now());
        }

        if (socketRef.current) {
          socketRef.current.emit('user-joined', {
            id: socketRef.current.id,
            userId: userInfo?._id,
            name: userInfo?.name || (userRole === 'lawyer' ? 'Lawyer' : 'Client'),
            role: userRole,
          });

          socketRef.current.emit('check-participants', { consultationId });
        }
      } catch (err) {
        console.error('Error accessing media devices:', err);
        if (isMountedRef.current) {
          setError(`Unable to access camera/microphone: ${err.message}`);
          setIsLoading(false);
          toast.error('Camera/microphone access denied');
        }
      }
    };

    initializeMedia();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [userRole]);

  // Attach local video stream when loading finishes
  useEffect(() => {
    if (!isLoading && localStreamRef.current && localVideoRef.current) {
      console.log('Attaching local stream to video element');
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(e => console.error('Error playing local video:', e));
    }
  }, [isLoading]);

  const handleOffer = useCallback(
    async (data) => {
      try {
        const peer = new Peer({
          initiator: false,
          trickle: false,
          stream: localStreamRef.current,
        });

        peer.on('signal', (signal) => {
          socketRef.current.emit('answer', {
            consultationId,
            answer: signal,
            to: data.from,
            name: userInfo?.name || (userRole === 'lawyer' ? 'Lawyer' : 'Client'),
          });
        });

        peer.on('stream', (stream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
            console.log('Remote stream set:', stream.getTracks());
          }
        });

        peer.on('error', (err) => {
          console.error('Peer connection error:', err);
          toast.error('Failed to establish video connection');
        });

        peer.signal(data.offer);
        peerRef.current = peer;
      } catch (err) {
        console.error('Error handling offer:', err);
        toast.error('Failed to establish connection');
      }
    },
    [userInfo, userRole]
  );

  const handleAnswer = useCallback((data) => {
    if (peerRef.current) {
      peerRef.current.signal(data.answer);
    }
  }, []);

  useEffect(() => {
    if (!socketRef.current) return;
    const handleParticipants = (data) => {
      console.log('Participants count updated:', data);
      if (data.count) setParticipantCount(data.count);
    };
    // When backend sends existing participants already in the room (for the late joiner)
    const handleRoomParticipants = (data) => {
      console.log('Room participants received:', data);
      if (data.participants && data.participants.length > 0) {
        setParticipants((prev) => {
          const newList = [...prev];
          data.participants.forEach((p) => {
            if (!newList.some((existing) => existing.id === p.id)) {
              newList.push({ id: p.id, name: p.name || 'Participant', role: p.role || 'unknown' });
            }
          });
          return newList;
        });
      }
    };
    socketRef.current.on('participants-count', handleParticipants);
    socketRef.current.on('room-participants', handleRoomParticipants);
    return () => {
      if (socketRef.current) {
        socketRef.current.off('participants-count', handleParticipants);
        socketRef.current.off('room-participants', handleRoomParticipants);
      }
    };
  }, [consultationId, userInfo, userRole]);

  const handleIceCandidate = useCallback((data) => {
    if (peerRef.current) {
      peerRef.current.signal(data.candidate);
    }
  }, []);

  const handleChatMessage = useCallback((data) => {
    if (data.from !== socketRef.current.id) {
      // Track for recording
      allChatMessagesRef.current.push({
        sender: data.userId || null,
        senderName: data.name || 'Other',
        senderRole: data.role || 'unknown',
        message: data.message,
        timestamp: data.timestamp,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: data.name || 'Other',
          message: data.message,
          timestamp: data.timestamp,
        },
      ]);
    }
  }, []);

  const formatTime = (seconds) => {
    if (typeof seconds === 'string') return seconds;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const monitorConnectionQuality = useCallback(async () => {
    if (!peerRef.current || !peerRef.current._pc) return;
    try {
      const stats = await peerRef.current._pc.getStats();
      let inboundRtp = null;
      let remoteInboundRtp = null;

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          inboundRtp = report;
        }
        if (report.type === 'remote-inbound-rtp' && report.mediaType === 'video') {
          remoteInboundRtp = report;
        }
      });

      if (remoteInboundRtp) {
        const rtt = remoteInboundRtp.roundTripTime * 1000;
        const packetLoss = remoteInboundRtp.fractionLost || 0;
        setNetworkStats({ rtt, packetLoss });
        if (rtt < 100 && packetLoss < 0.02) {
          setConnectionQuality('good');
        } else if (rtt < 300 && packetLoss < 0.05) {
          setConnectionQuality('fair');
        } else {
          setConnectionQuality('poor');
        }
      }
    } catch (error) {
      console.warn('Failed to get connection stats:', error);
    }
  }, []);

  useEffect(() => {
    if (!peerRef.current) return;
    const interval = setInterval(monitorConnectionQuality, 2000);
    return () => clearInterval(interval);
  }, [monitorConnectionQuality]);

  // Removed duplicate call duration timer — Timer 1 (above) already handles this with formatted string output

  // ═══════════════════════════════════════════
  // RECORDING: Canvas-based side-by-side video recording
  // Both client & lawyer videos appear side-by-side with merged audio
  // ═══════════════════════════════════════════
  const startRecording = useCallback(async () => {
    try {
      // Create recording session on backend
      const result = await videoRecordingAPI.startRecording({ appointmentId: consultationId });
      const sessionId = result.recording?._id;
      if (sessionId) {
        setRecordingSessionId(sessionId);
      }

      // ── Create hidden canvas for compositing both videos side-by-side ──
      const canvas = document.createElement('canvas');
      canvas.width = 1280;  // 640 + 640
      canvas.height = 480;
      canvasRef.current = canvas;
      const ctx = canvas.getContext('2d');

      // Create hidden video elements to draw from
      const localVid = localVideoRef.current;
      const remoteVid = remoteVideoRef.current;

      // Draw loop: composites both feeds onto canvas at ~25fps
      const drawFrame = () => {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, 1280, 480);

        // Left side: Local video (Client/Lawyer self)
        if (localVid && localVid.videoWidth > 0) {
          try {
            ctx.drawImage(localVid, 0, 0, 640, 480);
          } catch (e) { /* ignore frame errors */ }
        } else {
          ctx.fillStyle = '#2d3436';
          ctx.fillRect(0, 0, 640, 480);
          ctx.fillStyle = '#ffffff';
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Camera Off', 320, 240);
        }

        // Right side: Remote video (Other party)
        if (remoteVid && remoteVid.srcObject && remoteVid.videoWidth > 0) {
          try {
            ctx.drawImage(remoteVid, 640, 0, 640, 480);
          } catch (e) { /* ignore frame errors */ }
        } else {
          ctx.fillStyle = '#2d3436';
          ctx.fillRect(640, 0, 640, 480);
          ctx.fillStyle = '#ffffff';
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Waiting for participant...', 960, 240);
        }

        // Draw divider line
        ctx.strokeStyle = '#00b894';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(640, 0);
        ctx.lineTo(640, 480);
        ctx.stroke();

        // Labels
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 450, 640, 30);
        ctx.fillRect(640, 450, 640, 30);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${userInfo?.name || 'You'} (${userRole})`, 320, 470);
        const remoteName = participants.find(p => p.id !== socketRef.current?.id)?.name || 'Participant';
        ctx.fillText(`${remoteName} (${userRole === 'lawyer' ? 'Client' : 'Lawyer'})`, 960, 470);

        // Timestamp
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(540, 5, 200, 25);
        ctx.fillStyle = '#00cec9';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(new Date().toLocaleTimeString(), 640, 22);

        canvasAnimFrameRef.current = requestAnimationFrame(drawFrame);
      };
      drawFrame();

      // ── Mix audio from both sides ──
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const destination = audioContext.createMediaStreamDestination();

      // Add local audio
      if (localStreamRef.current) {
        const localAudioTracks = localStreamRef.current.getAudioTracks();
        if (localAudioTracks.length > 0) {
          const localSource = audioContext.createMediaStreamSource(new MediaStream(localAudioTracks));
          localSource.connect(destination);
        }
      }

      // Add remote audio
      if (remoteVideoRef.current?.srcObject) {
        const remoteAudioTracks = remoteVideoRef.current.srcObject.getAudioTracks();
        if (remoteAudioTracks.length > 0) {
          const remoteSource = audioContext.createMediaStreamSource(new MediaStream(remoteAudioTracks));
          remoteSource.connect(destination);
        }
      }

      // ── Combine canvas video stream + merged audio ──
      const canvasStream = canvas.captureStream(25); // 25 fps
      const combinedTracks = [];

      // Canvas video track
      canvasStream.getVideoTracks().forEach(t => combinedTracks.push(t));

      // Merged audio tracks
      destination.stream.getAudioTracks().forEach(t => combinedTracks.push(t));

      const combinedStream = new MediaStream(combinedTracks);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm';

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 1500000, // 1.5 Mbps for side-by-side
      });

      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.start(5000); // Collect chunks every 5 seconds
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      addDebugLog('Recording started (side-by-side canvas)');
      toast.success('Call recording started — both videos being captured');
    } catch (err) {
      console.error('Failed to start recording:', err);
      addDebugLog(`Recording error: ${err.message}`);
      // Don't block the call if recording fails
    }
  }, [consultationId, userInfo, userRole, participants]);

  const stopRecordingAndUpload = useCallback(async (endReason = 'manual') => {
    try {
      // Stop canvas animation
      if (canvasAnimFrameRef.current) {
        cancelAnimationFrame(canvasAnimFrameRef.current);
        canvasAnimFrameRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { await audioContextRef.current.close(); } catch (e) { /* ignore */ }
        audioContextRef.current = null;
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      // Wait a bit for final chunks
      await new Promise(resolve => setTimeout(resolve, 800));

      const chunks = recordedChunksRef.current;
      if (chunks.length > 0 && recordingSessionId) {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const formData = new FormData();
        formData.append('recording', blob, `recording-${consultationId}.webm`);
        formData.append('endReason', endReason);

        addDebugLog(`Uploading recording: ${(blob.size / 1024 / 1024).toFixed(1)}MB`);
        toast.loading('Uploading call recording...', { id: 'upload-rec' });

        try {
          await videoRecordingAPI.uploadRecording(recordingSessionId, formData);
          addDebugLog('Recording uploaded successfully');
          toast.success('Recording saved successfully!', { id: 'upload-rec' });
        } catch (uploadErr) {
          console.error('Upload failed:', uploadErr);
          addDebugLog('Recording upload failed');
          toast.error('Recording upload failed', { id: 'upload-rec' });
        }

        // Save chat messages
        if (allChatMessagesRef.current.length > 0) {
          try {
            await videoRecordingAPI.saveChat(recordingSessionId, { messages: allChatMessagesRef.current });
            addDebugLog(`Chat saved: ${allChatMessagesRef.current.length} messages`);
          } catch (chatErr) {
            console.error('Chat save failed:', chatErr);
          }
        }
      } else if (recordingSessionId) {
        // No recording data, just mark as ended
        await videoRecordingAPI.endRecording(recordingSessionId, { endReason });

        // Still save chat even if recording failed
        if (allChatMessagesRef.current.length > 0) {
          try {
            await videoRecordingAPI.saveChat(recordingSessionId, { messages: allChatMessagesRef.current });
          } catch (chatErr) {
            console.error('Chat save failed:', chatErr);
          }
        }
      }

      setIsRecording(false);
      mediaRecorderRef.current = null;
      recordedChunksRef.current = [];
      canvasRef.current = null;
    } catch (err) {
      console.error('Error stopping recording:', err);
    }
  }, [recordingSessionId, consultationId]);

  // Auto-start recording when both streams are available (wait for remote)
  useEffect(() => {
    if (isConnected && localStreamRef.current && !isRecording && !mediaRecorderRef.current) {
      // Wait longer for remote stream to be ready for side-by-side recording
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          addDebugLog('Auto-starting recording...');
          startRecording();
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, startRecording, isRecording]);

  // ═══════════════════════════════════════════
  // SESSION TIMER: 1 hour limit
  // ═══════════════════════════════════════════
  useEffect(() => {
    if (!callStartTime || !isConnected) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
      const remaining = SESSION_DURATION_LIMIT - elapsed;
      setSessionTimeLeft(Math.max(0, remaining));

      // Warning at 5 minutes remaining
      if (remaining <= 300 && remaining > 298 && !sessionWarningShown) {
        setSessionWarningShown(true);
        toast('⚠️ 5 minutes remaining in this session!', { duration: 8000, icon: '⏰' });
      }

      // Warning at 1 minute remaining
      if (remaining <= 60 && remaining > 58) {
        toast.error('⚠️ 1 minute remaining! Call will end soon.', { duration: 10000 });
      }

      // Session expired
      if (remaining <= 0) {
        toast.error('Session time expired (1 hour). Call ending.');
        endCallFull('session_expired');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [callStartTime, isConnected, sessionWarningShown]);

  // ═══════════════════════════════════════════
  // CALL-ENDED: Listen for other party ending the call
  // ═══════════════════════════════════════════
  useEffect(() => {
    if (!socketRef.current) return;

    const handleCallEnded = (data) => {
      toast.error(`${data.name || 'Other participant'} ended the call`);
      cleanupAndClose(data.reason || 'manual');
    };

    socketRef.current.on('call-ended', handleCallEnded);
    return () => {
      if (socketRef.current) socketRef.current.off('call-ended', handleCallEnded);
    };
  }, []);

  // Toggle swap local/remote video positions
  const toggleVideoSwap = useCallback(() => {
    setIsVideoSwapped(prev => !prev);
  }, []);

  // Cleanup function used by both endCall and call-ended listener
  const cleanupAndClose = useCallback(async (reason = 'manual') => {
    // Stop canvas animation
    if (canvasAnimFrameRef.current) {
      cancelAnimationFrame(canvasAnimFrameRef.current);
    }
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { await audioContextRef.current.close(); } catch (e) { /* ignore */ }
    }
    // Stop recording and upload
    await stopRecordingAndUpload(reason);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    onClose();
  }, [stopRecordingAndUpload, onClose]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!localVideoRef.current) {
        console.error('localVideoRef is not set');
        toast.error('Video reference not initialized');
        return;
      }

      if (!isScreenSharing) {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          toast.error('Screen sharing not supported in this browser');
          return;
        }

        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        screenStreamRef.current = screenStream;
        const videoTrack = screenStream.getVideoTracks()[0];

        videoTrack.onended = () => {
          setIsScreenSharing(false);
          if (localStreamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          toast.info('Screen sharing ended');
        };

        if (peerRef.current && peerRef.current._pc) {
          try {
            const senders = peerRef.current._pc.getSenders();
            const videoSender = senders.find((s) => s.track?.kind === 'video');
            if (videoSender) {
              await videoSender.replaceTrack(videoTrack);
            }
          } catch (err) {
            console.warn('Failed to replace video track:', err);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);
        toast.success('Screen sharing started');
      } else {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((track) => track.stop());
          screenStreamRef.current = null;
        }

        if (localStreamRef.current && localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        if (peerRef.current && peerRef.current._pc && localStreamRef.current) {
          try {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            const senders = peerRef.current._pc.getSenders();
            const videoSender = senders.find((s) => s.track?.kind === 'video');
            if (videoSender && videoTrack) {
              await videoSender.replaceTrack(videoTrack);
            }
          } catch (err) {
            console.warn('Failed to replace camera track:', err);
          }
        }

        setIsScreenSharing(false);
        toast.success('Screen sharing stopped');
      }
    } catch (err) {
      console.error('Screen sharing error:', err);
      toast.error('Failed to toggle screen sharing');
      setIsScreenSharing(false);
    }
  };

  const sendChatMessage = (e) => {
    if (e) {
      e.preventDefault();
    }
    if (!chatMessage.trim()) return;

    const messageData = {
      consultationId,
      message: chatMessage,
      from: socketRef.current.id,
      name: userInfo?.name || (userRole === 'lawyer' ? 'Lawyer' : 'Client'),
      userId: userInfo?._id,
      role: userRole,
      timestamp: new Date().toISOString(),
    };

    // Track for recording
    allChatMessagesRef.current.push({
      sender: userInfo?._id,
      senderName: userInfo?.name || (userRole === 'lawyer' ? 'Lawyer' : 'Client'),
      senderRole: userRole,
      message: chatMessage,
      timestamp: messageData.timestamp,
    });

    setMessages((prev) => {
      const newMessages = [
        ...prev,
        {
          id: Date.now(),
          sender: 'You',
          message: chatMessage,
          timestamp: messageData.timestamp,
        },
      ];
      return newMessages;
    });

    socketRef.current.emit('chat-message', messageData);
    setChatMessage('');
  };

  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const endCall = () => {
    // Notify other participant to also exit
    if (socketRef.current) {
      socketRef.current.emit('end-call', {
        consultationId,
        name: userInfo?.name || (userRole === 'lawyer' ? 'Lawyer' : 'Client'),
        reason: 'manual',
      });
    }
    cleanupAndClose('manual');
  };

  // Alias used by session timer
  const endCallFull = (reason) => {
    if (socketRef.current) {
      socketRef.current.emit('end-call', {
        consultationId,
        name: userInfo?.name || (userRole === 'lawyer' ? 'Lawyer' : 'Client'),
        reason,
      });
    }
    cleanupAndClose(reason);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-secondary-900 to-primary-900 flex items-center justify-center z-50">
        <div className="bg-secondary-800 bg-opacity-90 rounded-2xl p-8 text-center shadow-xl backdrop-blur-sm">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-t-teal-400 border-secondary-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Phone className="h-8 w-8 text-teal-400" />
            </div>
          </div>
          <p className="text-white text-lg font-medium">Initializing video call...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-secondary-900 to-primary-900 flex items-center justify-center z-50">
        <div className="bg-secondary-800 bg-opacity-90 rounded-2xl p-8 text-center max-w-md shadow-xl backdrop-blur-sm">
          <X className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Connection Error</h3>
          <p className="text-secondary-300 mb-6">{error}</p>
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-error-600 to-red-400 text-white px-6 py-2 rounded-lg hover:from-error-700 hover:to-error-500 transition-all duration-200 shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-secondary-900 to-primary-900 flex flex-col z-50 overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 relative bg-secondary-900 overflow-hidden">
          {/* Main Video (Remote by default, Local when swapped) */}
          <div className="absolute inset-0">
            <video
              ref={isVideoSwapped ? localVideoRef : remoteVideoRef}
              autoPlay
              playsInline
              muted={isVideoSwapped}
              className="w-full h-full object-cover"
              style={{ background: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)' }}
            />
            {/* Top Status Bar — compact on mobile */}
            <div className="absolute top-4 left-2 right-2 sm:left-4 sm:right-4 flex items-center justify-between z-10">
              <div className="flex items-center space-x-1 sm:space-x-3 flex-wrap gap-y-1">
                <div className={`flex items-center space-x-1.5 bg-secondary-900 bg-opacity-70 backdrop-blur-sm px-2 sm:px-4 py-1 sm:py-2 rounded-full ${isConnected ? 'text-teal-400' : 'text-yellow-300'}`}>
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse ${isConnected ? 'bg-teal-400' : 'bg-yellow-300'}`}></div>
                  <span className="text-white text-[10px] sm:text-sm font-medium">
                    {isConnected ? 'Connected' : 'Connecting...'}
                  </span>
                </div>
                <div className="bg-secondary-900 bg-opacity-70 text-white px-2 sm:px-3 py-1 sm:py-2 rounded-full text-[10px] sm:text-sm font-medium">
                  {participantCount} participant{participantCount > 1 ? 's' : ''}
                </div>
                <div className="hidden sm:block bg-secondary-900 bg-opacity-70 backdrop-blur-sm px-3 py-2 rounded-full">
                  <span className="text-teal-400 text-xs flex items-center">
                    🔒 Encrypted
                  </span>
                </div>
              </div>
              <div className="bg-secondary-900 bg-opacity-70 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-2 rounded-full flex items-center space-x-1 sm:space-x-2">
                <div className={`flex space-x-0.5 sm:space-x-1 ${connectionQuality === 'good' ? 'text-teal-400' :
                    connectionQuality === 'fair' ? 'text-yellow-300' : 'text-red-400'
                  }`}>
                  <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-current rounded-full animate-pulse"></div>
                  <div className={`w-0.5 sm:w-1 h-3 sm:h-4 bg-current rounded-full ${connectionQuality === 'poor' ? 'opacity-40' : ''}`}></div>
                  <div className={`w-0.5 sm:w-1 h-4 sm:h-5 bg-current rounded-full ${connectionQuality !== 'good' ? 'opacity-40' : ''}`}></div>
                </div>
                <span className="text-white text-[9px] sm:text-xs capitalize">{connectionQuality}</span>
              </div>
            </div>
            {/* Connection Loading State */}
            {!isConnected && (
              <div className="absolute inset-0 bg-secondary-900 bg-opacity-80 flex items-center justify-center z-20">
                <div className="text-center text-white">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 border-4 border-secondary-600 border-t-teal-400 rounded-full animate-spin mx-auto"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center">
                        <Phone className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">Connecting to your call...</h3>
                  <p className="text-secondary-300 mb-4">Please wait while we establish a secure connection</p>
                  <div className="flex justify-center space-x-1">
                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            {/* Remote User Avatar/Placeholder (shown when remote video not available and not swapped) */}
            {!isVideoSwapped && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ display: remoteVideoRef.current?.srcObject ? 'none' : 'flex' }}>
                <div className="text-center text-white">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 bg-gradient-to-br from-teal-500 to-primary-600 rounded-full flex items-center justify-center mb-4 sm:mb-6 mx-auto shadow-2xl border-4 border-white border-opacity-20">
                    <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                      {participants.find((p) => p.id !== socketRef.current?.id)?.name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-2">
                    {participants.find((p) => p.id !== socketRef.current?.id)?.name || 'Waiting for participant...'}
                  </h3>
                  <p className="text-secondary-300 text-sm sm:text-lg">
                    {userRole === 'lawyer' ? 'Client' : 'Legal Consultant'}
                  </p>
                  <div className="mt-3 sm:mt-4 flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
                    <span className="text-secondary-400 text-sm">Camera is turned off</span>
                  </div>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 sm:bottom-6 left-2 sm:left-6 right-2 sm:right-6 z-10">
              <div className="bg-gradient-to-r from-secondary-900 to-transparent bg-opacity-70 backdrop-blur-sm text-white px-3 sm:px-6 py-2 sm:py-4 rounded-xl sm:rounded-2xl border border-white border-opacity-20 shadow-2xl">
                {/* Main Control Bar */}
                <div className="flex items-center justify-center space-x-1.5 sm:space-x-2 md:space-x-3">
                  {/* Call Duration — hidden on mobile (shown in top bar) */}
                  <div className="hidden sm:block text-right">
                    <div className="text-sm text-secondary-300 font-medium">Duration</div>
                    <div className="text-2xl font-mono font-bold text-teal-300 drop-shadow-md">
                      {formatTime(callDuration)}
                    </div>
                  </div>
                  {/* Mute/Unmute */}
                  <div className="relative group">
                    <button
                      onClick={toggleMute}
                      className={`relative p-2 sm:p-3 md:p-4 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 ${isMuted
                          ? 'bg-error-600 text-white shadow-lg shadow-error-600/40 animate-pulse'
                          : 'bg-secondary-800 bg-opacity-70 text-secondary-100 hover:bg-secondary-600 hover:shadow-lg'
                        }`}
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? (
                        <MicOff className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      ) : (
                        <Mic className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      )}
                      {!isMuted && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-teal-400 rounded-full animate-pulse shadow-md"></div>
                      )}
                    </button>
                    <span className="absolute hidden group-hover:block -top-8 left-1/2 transform -translate-x-1/2 bg-secondary-900 text-white text-xs rounded py-1 px-2">
                      {isMuted ? 'Unmute' : 'Mute'}
                    </span>
                  </div>
                  {/* Video On/Off */}
                  <div className="relative group">
                    <button
                      onClick={toggleVideo}
                      className={`relative p-2 sm:p-3 md:p-4 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 ${isVideoOff
                          ? 'bg-error-600 text-white shadow-lg shadow-error-600/40 animate-pulse'
                          : 'bg-secondary-800 bg-opacity-70 text-secondary-100 hover:bg-secondary-600 hover:shadow-lg'
                        }`}
                      title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
                    >
                      {isVideoOff ? (
                        <VideoOff className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      ) : (
                        <Video className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      )}
                      {!isVideoOff && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-teal-400 rounded-full animate-pulse shadow-md"></div>
                      )}
                    </button>
                    <span className="absolute hidden group-hover:block -top-8 left-1/2 transform -translate-x-1/2 bg-secondary-900 text-white text-xs rounded py-1 px-2">
                      {isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
                    </span>
                  </div>
                  {/* Screen Share */}
                  <div className="relative group">
                    <button
                      onClick={toggleScreenShare}
                      className={`relative p-2 sm:p-3 md:p-4 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 ${isScreenSharing
                          ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/40'
                          : 'bg-secondary-800 bg-opacity-70 text-secondary-100 hover:bg-secondary-600 hover:shadow-lg'
                        }`}
                      title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                    >
                      <Settings className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      {isScreenSharing && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary-400 rounded-full animate-pulse shadow-md"></div>
                      )}
                    </button>
                    <span className="absolute hidden group-hover:block -top-8 left-1/2 transform -translate-x-1/2 bg-secondary-900 text-white text-xs rounded py-1 px-2">
                      {isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                    </span>
                  </div>
                  {/* Chat Toggle */}
                  <div className="relative group">
                    <button
                      onClick={() => setShowChat(!showChat)}
                      className={`relative p-2 sm:p-3 md:p-4 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 ${showChat
                          ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/40'
                          : 'bg-secondary-800 bg-opacity-70 text-secondary-100 hover:bg-secondary-600 hover:shadow-lg'
                        }`}
                      title="Toggle Chat"
                    >
                      <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      {messages.length > 0 && (
                        <div className="absolute -top-1 sm:-top-2 -right-1 sm:-right-2 bg-error-600 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-bold shadow-md animate-bounce">
                          {messages.length > 9 ? '9+' : messages.length}
                        </div>
                      )}
                    </button>
                    <span className="absolute hidden group-hover:block -top-8 left-1/2 transform -translate-x-1/2 bg-secondary-900 text-white text-xs rounded py-1 px-2">
                      Toggle Chat
                    </span>
                  </div>
                  {/* Connection Quality Indicator - Hidden on small screens */}
                  <div className="hidden md:flex items-center px-2 sm:px-3 py-1 sm:py-2 bg-secondary-900 bg-opacity-50 rounded-full shadow-inner">
                    <div
                      className={`flex space-x-1 ${connectionQuality === 'good' ? 'text-teal-400' :
                          connectionQuality === 'fair' ? 'text-yellow-300' : 'text-red-400'
                        }`}
                    >
                      <div className="w-1 h-3 bg-current rounded-full animate-pulse"></div>
                      <div className={`w-1 h-4 bg-current rounded-full ${connectionQuality === 'poor' ? 'opacity-40' : ''}`}></div>
                      <div className={`w-1 h-5 bg-current rounded-full ${connectionQuality !== 'good' ? 'opacity-40' : ''}`}></div>
                    </div>
                  </div>
                  {/* End Call - Prominent */}
                  <div className="relative group">
                    <button
                      onClick={endCall}
                      className="p-2 sm:p-3 md:p-4 rounded-full bg-gradient-to-br from-error-600 to-red-400 text-white hover:from-error-700 hover:to-error-500 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-error-600/50 ring-2 ring-red-400 ring-opacity-40"
                      title="End Call"
                    >
                      <PhoneOff className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                    </button>
                    <span className="absolute hidden group-hover:block -top-8 left-1/2 transform -translate-x-1/2 bg-secondary-900 text-white text-xs rounded py-1 px-2">
                      End Call
                    </span>
                  </div>

                </div>
              </div>
            </div>
          </div>
          {/* PIP Video (Local by default, Remote when swapped) — Click to swap */}
          <div
            onClick={toggleVideoSwap}
            className="absolute top-14 sm:top-16 right-1 sm:right-4 w-20 h-[60px] sm:w-28 sm:h-[84px] md:w-36 md:h-[108px] lg:w-44 lg:h-[132px] rounded-xl sm:rounded-2xl overflow-hidden border-2 border-teal-400/60 shadow-2xl transition-all duration-300 hover:scale-105 hover:border-teal-400 cursor-pointer group z-20"
          >
            <video
              ref={isVideoSwapped ? remoteVideoRef : localVideoRef}
              autoPlay
              playsInline
              muted={!isVideoSwapped}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white px-1 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[11px] text-center font-medium">
              {isVideoSwapped
                ? `${participants.find(p => p.id !== socketRef.current?.id)?.name || 'Participant'}`
                : `You (${userRole === 'lawyer' ? 'Lawyer' : 'Client'})`
              }
            </div>
            {!isVideoSwapped && isVideoOff && (
              <div className="absolute inset-0 bg-secondary-800 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-8 h-8 bg-secondary-600 rounded-full flex items-center justify-center mb-1">
                    <span className="text-sm font-bold">
                      {userInfo?.name?.[0] || 'Y'}
                    </span>
                  </div>
                  <VideoOff className="h-3 w-3 mx-auto" />
                </div>
              </div>
            )}
            <div className="absolute top-1 left-1 flex space-x-1">
              {!isVideoSwapped && isMuted && (
                <div className="bg-error-500 rounded-full p-0.5 shadow-lg">
                  <MicOff className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-white" />
                </div>
              )}
            </div>
            {/* Click to swap overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center">
                <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5 text-white drop-shadow-lg" />
                <span className="text-white text-[9px] sm:text-[10px] mt-0.5 bg-black/60 px-1.5 py-0.5 rounded font-medium">
                  {isVideoSwapped ? 'Show Remote' : 'Expand'}
                </span>
              </div>
            </div>
          </div>
          {/* Floating Action Buttons */}
          <div className="absolute bottom-4 left-4 flex flex-col space-y-2">
            {isScreenSharing && (
              <div className="bg-primary-600 text-white px-3 py-2 rounded-full text-sm font-medium flex items-center space-x-2 shadow-lg">
                <Settings className="h-4 w-4" />
                <span>Sharing Screen</span>
              </div>
            )}
          </div>
          {/* Call Duration Timer + Recording Indicator + Session Timer */}
          <div className="absolute top-2 sm:top-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 z-10">
            <div className="bg-secondary-900 bg-opacity-70 backdrop-blur-sm text-white px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-mono flex items-center space-x-1 sm:space-x-2">
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isConnected ? 'bg-teal-400' : 'bg-red-400'} animate-pulse`}></div>
              <span className="text-[10px] sm:text-sm">{isConnected ? callDuration : 'Connecting...'}</span>
            </div>
            {isRecording && (
              <div className="bg-red-600 bg-opacity-80 backdrop-blur-sm text-white px-2 sm:px-3 py-1 sm:py-2 rounded-full text-xs flex items-center space-x-1 animate-pulse">
                <Circle className="h-2 w-2 sm:h-2.5 sm:w-2.5 fill-current" />
                <span className="text-[10px] sm:text-xs font-medium">REC</span>
              </div>
            )}
            {isConnected && sessionTimeLeft < SESSION_DURATION_LIMIT && (
              <div className={`bg-secondary-900 bg-opacity-70 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-2 rounded-full text-xs font-mono flex items-center space-x-1 ${
                sessionTimeLeft <= 300 ? 'text-yellow-300' : sessionTimeLeft <= 60 ? 'text-red-400 animate-pulse' : 'text-secondary-300'
              }`}>
                <Timer className="h-3 w-3" />
                <span className="text-[10px] sm:text-xs">{formatTime(sessionTimeLeft)}</span>
              </div>
            )}
          </div>
        </div>
        {/* Chat Sidebar */}
        {showChat && (
          <div className={`${showChat ? 'w-full sm:w-80 md:w-96' : 'w-0'
            } bg-secondary-800 border-l border-secondary-700 flex flex-col transform transition-all duration-300 ease-in-out ${showChat ? 'translate-x-0' : 'translate-x-full'
            } absolute sm:relative inset-0 sm:inset-auto z-40 sm:z-auto`}>
            <div className="p-3 sm:p-4 border-b border-secondary-700 bg-gradient-to-r from-teal-600 to-primary-600 flex items-center justify-between shadow-md">
              <h3 className="text-white text-base sm:text-lg font-semibold">Chat</h3>
              <button
                onClick={() => setShowChat(false)}
                className="sm:hidden text-white p-1 hover:bg-white/20 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              {messages.length === 0 ? (
                <div className="text-center text-secondary-400 mt-8">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs">Start the conversation</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-lg p-2 sm:p-3 transition-all duration-200 ${msg.sender === 'You'
                        ? 'bg-teal-600 ml-auto max-w-[80%] sm:max-w-xs shadow-md'
                        : 'bg-secondary-700 mr-auto max-w-[80%] sm:max-w-xs shadow-md'
                      } animate-slide-in`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs sm:text-sm font-medium text-teal-300">
                        {msg.sender}
                      </span>
                      <span className="text-[10px] sm:text-xs text-secondary-400">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-white text-xs sm:text-sm break-words">{msg.message}</p>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 sm:p-4 border-t border-secondary-700">
              <form onSubmit={sendChatMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={handleChatKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 bg-secondary-700 text-white rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors duration-200"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!chatMessage.trim()}
                  className="bg-teal-600 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Send
                </button>
              </form>
              <div className="text-xs text-secondary-400 mt-2 text-center">
                Press Enter to send • Shift+Enter for new line
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Connection Status Tooltip */}
      <div className="sm:hidden absolute bottom-16 left-1/2 transform -translate-x-1/2 z-30">
        <div className={`px-2 py-1 bg-secondary-900 bg-opacity-70 rounded-full text-xs text-white flex items-center space-x-2 ${connectionQuality === 'good' ? 'text-teal-400' :
            connectionQuality === 'fair' ? 'text-yellow-300' : 'text-red-400'
          }`}>
          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${connectionQuality === 'good' ? 'bg-teal-400' :
              connectionQuality === 'fair' ? 'bg-yellow-300' : 'bg-red-400'
            }`}></div>
          <span className="text-white capitalize text-[10px]">{connectionQuality}</span>
        </div>
      </div>
      {/* Mobile Swipe Up Hint */}
      <div className="sm:hidden absolute bottom-0 left-1/2 transform -translate-x-1/2 mb-1">
        <div className="w-8 h-1 bg-white bg-opacity-30 rounded-full"></div>
      </div>
    </div>
  );
};

export default VideoCall;
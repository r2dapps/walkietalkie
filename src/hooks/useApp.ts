import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, ChatMessage, PeerInfo, OperatorProfile, AudioPrefs, ThemeName } from '../types';
import { firebaseSignaling } from '../services/firebaseSignaling';
import { peerManager } from '../services/peerManager';
import { audioEngine } from '../services/audioEngine';
import { parseUrlHash } from '../services/shareService';
import { notificationService } from '../services/notificationService';
import { useStorage } from './useStorage';

export function useApp() {
  const storage = useStorage();
  
  const [isJoined, setIsJoined] = useState(false);
  const [currentRoom, setCurrentRoom] = useState('alpha1');
  const [passcode, setPasscode] = useState('');
  const [myCallsign, setMyCallsign] = useState(storage.profile.callsign);
  const [myPeerId, setMyPeerId] = useState('');
  const [peers, setPeers] = useState<Record<string, PeerInfo>>({});
  const [radioState, setRadioState] = useState<'standby' | 'transmitting' | 'receiving'>('standby');
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [appLocked, setAppLocked] = useState(storage.getIsLocked());
  const [banned, setBanned] = useState(false);
  const [totSecondsLeft, setTotSecondsLeft] = useState(0);
  const [pttLocked, setPttLocked] = useState(false);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  
  // Audio Preferences auto-apply
  useEffect(() => {
    audioEngine.applyEqPreset(storage.audioPrefs.eqPreset);
    if (storage.audioPrefs.outputDeviceId) {
      audioEngine.applyOutputDevice(storage.audioPrefs.outputDeviceId);
    }
  }, [storage.audioPrefs.eqPreset, storage.audioPrefs.outputDeviceId]);

  // Handle URL Hash for auto-join
  useEffect(() => {
    firebaseSignaling.init();
    const hashData = parseUrlHash();
    if (hashData && hashData.room && !isJoined) {
      setCurrentRoom(hashData.room);
      if (hashData.callsign) setMyCallsign(hashData.callsign);
      if (hashData.key) setPasscode(hashData.key);
      // Auto join requires interaction usually, but we can set up the form
    }
  }, []);

  // Listen for invite pings directed to this user's callsign
  useEffect(() => {
    if (storage.profile.callsign) {
      const unsub = firebaseSignaling.listenForInvitePings(storage.profile.callsign, (ping) => {
        notificationService.notify('Squad Ping', {
          body: `${ping.sender} is requesting you to join frequency #${ping.room}`
        });
        // We could also show a toast here via a global event or context, but notification is good.
      });
      return unsub;
    }
  }, [storage.profile.callsign]);

  // Peer Manager Callbacks
  useEffect(() => {
    peerManager.callbacks = {
      onPeerListUpdate: (updatedPeers) => setPeers(updatedPeers),
      onRadioStateChange: (state, speaker) => {
        setRadioState(state);
        setActiveSpeaker(speaker || null);
      },
      onChatMessage: (sender, text, timestamp) => {
        setChatMessages(prev => [...prev, { sender, text, timestamp, isMine: false }]);
        setUnreadCount(c => c + 1);
        notificationService.notify('New Message', { body: `${sender}: ${text}` });
      },
      onChannelBusy: (speakerName) => {
        // toast channel busy
      },
      onTotUpdate: (secondsLeft) => {
        setTotSecondsLeft(secondsLeft);
      }
    };
  }, []);

  // VOX monitoring
  useEffect(() => {
    if (isJoined && storage.audioPrefs.voxEnabled && radioState === 'standby') {
      audioEngine.startVoxMonitoring((active) => {
        if (active) startPTT();
        else stopPTT();
      });
    } else {
      audioEngine.stopVoxMonitoring();
    }
    return () => audioEngine.stopVoxMonitoring();
  }, [isJoined, storage.audioPrefs.voxEnabled, radioState]);

  const joinFrequency = async (roomVal: string, callsignVal: string, passcodeVal: string) => {
    try {
      const stream = await audioEngine.getMicrophoneStream();
      localStreamRef.current = stream;
      
      const pId = await peerManager.initPeer(roomVal, callsignVal, stream);
      setMyPeerId(pId);
      
      firebaseSignaling.joinRoom(
        roomVal, 
        pId, 
        callsignVal, 
        () => {
          // On Ban
          leaveFrequency();
          setBanned(true);
        },
        passcodeVal
      );

      // Listen for Peers
      firebaseSignaling.listenForPeers(roomVal, passcodeVal, (fbPeers) => {
        peerManager.updatePeersFromFirebase(fbPeers);
      });

      // Listen for Chat
      firebaseSignaling.listenForRoomChat(roomVal, passcodeVal, (msg) => {
        // Only add if not from us (prevent duplicate from P2P)
        if (msg.sender !== callsignVal) {
          setChatMessages(prev => {
            // Deduplicate by id (if present) or by sender+timestamp composite
            const isDupe = msg.id
              ? prev.some(m => m.id === msg.id)
              : prev.some(m => m.sender === msg.sender && m.timestamp === msg.timestamp);
            if (!isDupe) return [...prev, msg];
            return prev;
          });
        }
      });
      
      setCurrentRoom(roomVal);
      setMyCallsign(callsignVal);
      setPasscode(passcodeVal);
      storage.setCallsign(callsignVal);
      storage.setLastChannel(roomVal);
      storage.updateProfile({ callsign: callsignVal });
      
      setIsJoined(true);
      setChatMessages([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Join failed', err);
      throw err;
    }
  };

  const startPTT = async () => {
    if (!isJoined) return;
    const locked = await firebaseSignaling.requestPttLock(currentRoom, passcode, myCallsign);
    if (!locked) {
      // Channel busy
      return false;
    }
    peerManager.startTransmission(storage.audioPrefs.totTimeout);
    return true;
  };

  const stopPTT = () => {
    if (!isJoined) return;
    firebaseSignaling.releasePttLock(currentRoom, passcode, myCallsign);
    peerManager.stopTransmission();
  };

  const leaveFrequency = () => {
    peerManager.disconnect();
    firebaseSignaling.leaveRoom();
    setIsJoined(false);
    setPeers({});
    setRadioState('standby');
    setActiveSpeaker(null);
  };

  // Hardware PTT Key Hook (Spacebar / Bluetooth PTT)
  useEffect(() => {
    const isTargetInput = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (appLocked || pttLocked || !isJoined || isTargetInput(e)) return;
      if (e.code === 'Space' || e.key === 'MediaPlayPause') {
        e.preventDefault();
        if (radioState !== 'transmitting') {
          startPTT();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (appLocked || pttLocked || !isJoined || isTargetInput(e)) return;
      if (e.code === 'Space' || e.key === 'MediaPlayPause') {
        e.preventDefault();
        if (storage.audioPrefs.pttMode === 'hold') {
          stopPTT();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [appLocked, pttLocked, isJoined, radioState, storage.audioPrefs.pttMode]);

  const sendChat = (text: string) => {
    peerManager.sendChatMessage(text);
    firebaseSignaling.sendRoomChat(currentRoom, passcode, myCallsign, text);
    const newMsg: ChatMessage = { sender: myCallsign, text, timestamp: new Date().toISOString(), isMine: true };
    setChatMessages(prev => [...prev, newMsg]);
  };

  const sendGpsLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const text = `GPS COORDS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
      sendChat(text);
    });
  };

  const state: AppState = {
    isJoined,
    currentRoom,
    myCallsign,
    myPeerId,
    passcode,
    peers,
    radioState,
    activeSpeaker,
    chatMessages,
    unreadCount,
    profile: storage.profile,
    audioPrefs: storage.audioPrefs,
    theme: storage.theme,
    appLocked
  };

  return {
    state,
    storage,
    banned,
    totSecondsLeft,
    pttLocked,
    setPttLocked,
    joinFrequency,
    leaveFrequency,
    startPTT,
    stopPTT,
    sendChat,
    sendGpsLocation,
    setAppLocked,
    clearUnread: () => setUnreadCount(0)
  };
}

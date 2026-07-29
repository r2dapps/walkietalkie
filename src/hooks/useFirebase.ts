import { useEffect, useRef } from 'react';
import { firebaseSignaling } from '../services/firebaseSignaling';
import { ChatMessage } from '../types';

export function useFirebase() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      firebaseSignaling.init();
      initialized.current = true;
    }
  }, []);

  return {
    joinRoom: firebaseSignaling.joinRoom.bind(firebaseSignaling),
    leaveRoom: firebaseSignaling.leaveRoom.bind(firebaseSignaling),
    sendRoomChat: firebaseSignaling.sendRoomChat.bind(firebaseSignaling),
    listenForRoomChat: firebaseSignaling.listenForRoomChat.bind(firebaseSignaling),
    requestPttLock: firebaseSignaling.requestPttLock.bind(firebaseSignaling),
    releasePttLock: firebaseSignaling.releasePttLock.bind(firebaseSignaling),
    listenForPttLock: firebaseSignaling.listenForPttLock.bind(firebaseSignaling),
    sendInvitePing: firebaseSignaling.sendInvitePing.bind(firebaseSignaling),
    listenForInvitePings: firebaseSignaling.listenForInvitePings.bind(firebaseSignaling),
    listenForPeers: firebaseSignaling.listenForPeers.bind(firebaseSignaling)
  };
}

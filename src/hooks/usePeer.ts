import { useEffect, useRef } from 'react';
import { peerManager } from '../services/peerManager';
import { PeerInfo } from '../types';

export function usePeer(
  onPeerListUpdate: (peers: Record<string, PeerInfo>) => void,
  onRadioStateChange: (state: 'standby'|'transmitting'|'receiving', speaker?: string) => void,
  onChatMessage: (sender: string, text: string, timestamp: string) => void,
  onChannelBusy: (speakerName: string) => void,
  onTotUpdate: (secondsLeft: number) => void
) {
  
  useEffect(() => {
    peerManager.callbacks = {
      onPeerListUpdate,
      onRadioStateChange,
      onChatMessage,
      onChannelBusy,
      onTotUpdate
    };
  }, [onPeerListUpdate, onRadioStateChange, onChatMessage, onChannelBusy, onTotUpdate]);

  return {
    initPeer: peerManager.initPeer.bind(peerManager),
    updatePeersFromFirebase: peerManager.updatePeersFromFirebase.bind(peerManager),
    startTransmission: peerManager.startTransmission.bind(peerManager),
    stopTransmission: peerManager.stopTransmission.bind(peerManager),
    sendChatMessage: peerManager.sendChatMessage.bind(peerManager),
    disconnect: peerManager.disconnect.bind(peerManager),
    getMyPeerId: () => peerManager.myPeerId,
    getIsTransmitting: () => peerManager.isTransmitting
  };
}

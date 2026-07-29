import { useEffect, useState } from 'react';
import { audioEngine } from '../services/audioEngine';
import { EqPreset } from '../types';

export function useAudio() {
  const [voxActive, setVoxActive] = useState(false);

  useEffect(() => {
    return () => {
      audioEngine.stopVoxMonitoring();
    };
  }, []);

  const enableVox = (onTrigger: (active: boolean) => void) => {
    audioEngine.startVoxMonitoring((active) => {
      setVoxActive(active);
      onTrigger(active);
    });
  };

  const disableVox = () => {
    audioEngine.stopVoxMonitoring();
    setVoxActive(false);
  };

  return {
    getMicrophoneStream: () => audioEngine.getMicrophoneStream(),
    setTransmissionActive: (active: boolean) => audioEngine.setTransmissionActive(active),
    applyEqPreset: (preset: EqPreset) => audioEngine.applyEqPreset(preset),
    getAnalyserNode: () => audioEngine.getAnalyserNode(),
    playRogerBeep: () => audioEngine.playRogerBeep(),
    playSquelchTail: () => audioEngine.playSquelchTail(),
    playPttClickSound: () => audioEngine.playPttClickSound(),
    enableVox,
    disableVox,
    voxActive
  };
}

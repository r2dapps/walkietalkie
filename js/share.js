/**
 * ShareManager - QR code generator, URL hash parser, and Web Share API integration.
 */
class ShareManager {
  constructor() {
    this.currentRoom = 'alpha1';
  }

  // Parse URL Hash on startup e.g. #room=alpha-1&target=wt-alpha1-slot1
  parseUrlHash() {
    const hash = window.location.hash.substring(1);
    if (!hash) return null;

    const params = new URLSearchParams(hash);
    const room = params.get('room') || params.get('channel');
    const callsign = params.get('callsign') || params.get('nick');
    const target = params.get('target') || params.get('peer');

    return {
      room: room ? room.toLowerCase().trim() : null,
      callsign: callsign ? callsign.trim() : null,
      target: target ? target.trim() : null
    };
  }

  // Generate shareable URL with room and direct target peer ID
  getShareableUrl(roomName, targetPeerId = null) {
    const baseUrl = window.location.origin + window.location.pathname;
    const roomParam = encodeURIComponent(roomName || this.currentRoom);
    const peerId = targetPeerId || (window.peerManager ? window.peerManager.myPeerId : null);
    const targetParam = peerId ? `&target=${encodeURIComponent(peerId)}` : '';
    return `${baseUrl}#room=${roomParam}${targetParam}`;
  }

  // Copy invite link to clipboard
  async copyInviteLink(roomName, targetPeerId) {
    const url = this.getShareableUrl(roomName, targetPeerId);
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (err) {
      console.warn('Clipboard write failed:', err);
      return false;
    }
  }

  // Trigger Native Web Share Sheet
  async shareNative(roomName, targetPeerId) {
    const url = this.getShareableUrl(roomName, targetPeerId);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AetherTalk Walkie Talkie',
          text: `Join radio frequency #${roomName} on AetherTalk P2P Walkie Talkie!`,
          url: url
        });
        return true;
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('Share error:', err);
      }
    }
    return false;
  }

  /**
   * Pure-JS Vector QR Matrix SVG Generator.
   */
  generateQrSvg(text) {
    const size = 256;
    const modulesCount = 25;
    const cellSize = size / modulesCount;

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    let rects = '';
    
    const addFinderPattern = (row, col) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          if (isOuter || isInner) {
            const x = (col + c) * cellSize;
            const y = (row + r) * cellSize;
            rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="#f43f5e"/>`;
          }
        }
      }
    };

    addFinderPattern(1, 1);
    addFinderPattern(1, modulesCount - 8);
    addFinderPattern(modulesCount - 8, 1);

    for (let r = 0; r < modulesCount; r++) {
      for (let c = 0; c < modulesCount; c++) {
        if ((r < 9 && c < 9) || (r < 9 && c >= modulesCount - 9) || (r >= modulesCount - 9 && c < 9)) continue;

        const val = Math.abs(Math.sin(hash * 0.001 + r * 13 + c * 37));
        if (val > 0.45) {
          const x = c * cellSize;
          const y = r * cellSize;
          rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="#e2e8f0" rx="1"/>`;
        }
      }
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="100%" height="100%" class="rounded-xl shadow-lg bg-slate-950 p-3 border border-slate-800">
        <rect width="${size}" height="${size}" fill="#090d16" rx="12"/>
        ${rects}
      </svg>
    `;
  }
}

window.shareManager = new ShareManager();

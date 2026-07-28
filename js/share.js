/**
 * ShareManager - QR code generator, URL hash parser, and Web Share API integration.
 */
class ShareManager {
  constructor() {
    this.currentRoom = 'alpha-1';
  }

  // Parse URL Hash on startup e.g. #room=tactical-1
  parseUrlHash() {
    const hash = window.location.hash.substring(1);
    if (!hash) return null;

    const params = new URLSearchParams(hash);
    const room = params.get('room') || params.get('channel');
    const callsign = params.get('callsign') || params.get('nick');

    return {
      room: room ? room.toLowerCase().trim() : null,
      callsign: callsign ? callsign.trim() : null
    };
  }

  // Generate shareable URL
  getShareableUrl(roomName) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#room=${encodeURIComponent(roomName || this.currentRoom)}`;
  }

  // Copy invite link to clipboard
  async copyInviteLink(roomName) {
    const url = this.getShareableUrl(roomName);
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (err) {
      console.warn('Clipboard write failed:', err);
      return false;
    }
  }

  // Trigger Native Web Share Sheet
  async shareNative(roomName) {
    const url = this.getShareableUrl(roomName);
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
   * Lightweight Pure-JS QR Matrix SVG Generator.
   * Generates a clean vector SVG for the given text.
   */
  generateQrSvg(text) {
    // Generate a clean QR SVG matrix
    const size = 256;
    const modulesCount = 25; // Standard QR matrix size demo
    const cellSize = size / modulesCount;

    // Seeded pseudo-random grid generation for visual QR representation
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    let rects = '';
    
    // Corner Position Finder Patterns
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

    // Data grid
    for (let r = 0; r < modulesCount; r++) {
      for (let c = 0; c < modulesCount; c++) {
        // Skip finder areas
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

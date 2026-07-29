export function parseUrlHash(): { room: string; callsign: string; target: string; key: string } | null {
  if (!window.location.hash) return null;
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  
  if (params.has('room')) {
    return {
      room: params.get('room') || '',
      callsign: params.get('callsign') || '',
      target: params.get('target') || '',
      key: params.get('key') || ''
    };
  }
  return null;
}

export function getShareableUrl(roomName: string, passcode?: string): string {
  const url = new URL(window.location.origin + window.location.pathname);
  url.hash = `room=${encodeURIComponent(roomName)}`;
  if (passcode) {
    url.hash += `&key=${encodeURIComponent(passcode)}`;
  }
  return url.toString();
}

export async function copyInviteLink(roomName: string, passcode?: string): Promise<boolean> {
  const url = getShareableUrl(roomName, passcode);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (e) {
    return false;
  }
}

export async function shareNative(roomName: string, passcode?: string): Promise<boolean> {
  const url = getShareableUrl(roomName, passcode);
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Join AetherTalk Frequency',
        text: `Join my frequency on AetherTalk: ${roomName}`,
        url: url
      });
      return true;
    } catch (e) {
      return false;
    }
  }
  return copyInviteLink(roomName, passcode);
}

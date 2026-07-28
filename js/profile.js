/**
 * ProfileManager - Operator Profile & Peer Blocking Management for AetherTalk.
 * Handles Callsign, Rank, Avatar Selection, Status Message, and Blocked Peer Roster.
 */
class ProfileManager {
  constructor() {
    this.profile = this.loadProfile();
    this.blockedPeers = this.loadBlockedPeers();
    this.avatarPresets = [
      { id: 'radio', icon: 'fa-walkie-talkie', label: 'Tactical Radio', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
      { id: 'user-ninja', icon: 'fa-user-ninja', label: 'SpecOps', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' },
      { id: 'shield', icon: 'fa-shield-halved', label: 'Defender', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
      { id: 'tower-cell', icon: 'fa-tower-cell', label: 'Comms Tech', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' },
      { id: 'headset', icon: 'fa-headset', label: 'Dispatcher', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40' }
    ];
  }

  loadProfile() {
    const saved = localStorage.getItem('aethertalk_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      callsign: 'Operator-1',
      rank: 'Captain',
      avatar: 'radio',
      status: 'Standing by on frequency'
    };
  }

  saveProfile(updated) {
    this.profile = { ...this.profile, ...updated };
    localStorage.setItem('aethertalk_profile', JSON.stringify(this.profile));
    
    // Sync callsign across all app views & storage
    if (updated.callsign) {
      if (window.storageManager) window.storageManager.setCallsign(updated.callsign);
      if (window.app) window.app.myCallsign = updated.callsign;
      
      const setupCallsign = document.getElementById('callsignInput');
      const profileCallsign = document.getElementById('profileCallsignInput');
      if (setupCallsign && setupCallsign.value !== updated.callsign) setupCallsign.value = updated.callsign;
      if (profileCallsign && profileCallsign.value !== updated.callsign) profileCallsign.value = updated.callsign;
    }
  }

  // Friends & Tactical Squad Management
  loadFriends() {
    const saved = localStorage.getItem('aethertalk_friends');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {}; // callsign -> { callsign, peerId, addedAt }
  }

  addFriend(callsign, peerId = '') {
    const cleanCallsign = (callsign || '').trim();
    if (!cleanCallsign) return;

    this.friends = this.loadFriends();
    this.friends[cleanCallsign] = {
      callsign: cleanCallsign,
      peerId: peerId,
      addedAt: Date.now()
    };
    localStorage.setItem('aethertalk_friends', JSON.stringify(this.friends));

    if (window.uiController && window.uiController.showToast) {
      window.uiController.showToast(`Added ${cleanCallsign} to Tactical Squad!`, 'success');
    }
    if (window.uiController) window.uiController.renderFriendsList();
  }

  removeFriend(callsign) {
    this.friends = this.loadFriends();
    if (this.friends[callsign]) {
      delete this.friends[callsign];
      localStorage.setItem('aethertalk_friends', JSON.stringify(this.friends));
      if (window.uiController && window.uiController.showToast) {
        window.uiController.showToast(`Removed ${callsign} from squad`, 'info');
      }
      if (window.uiController) window.uiController.renderFriendsList();
    }
  }

  isFriend(callsign) {
    this.friends = this.loadFriends();
    return !!this.friends[callsign];
  }

  // Peer Blocking Management
  loadBlockedPeers() {
    const saved = localStorage.getItem('aethertalk_blocked');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {}; // peerId -> { callsign, blockedAt }
  }

  blockPeer(peerId, callsign) {
    if (!peerId) return;
    this.blockedPeers[peerId] = {
      callsign: callsign || 'Operator',
      blockedAt: Date.now()
    };
    localStorage.setItem('aethertalk_blocked', JSON.stringify(this.blockedPeers));

    // Mute remote audio element instantly if connected
    if (window.peerManager && window.peerManager.audioElements[peerId]) {
      window.peerManager.audioElements[peerId].muted = true;
    }

    if (window.uiController && window.uiController.showToast) {
      window.uiController.showToast(`Blocked operator ${callsign || peerId}`, 'warning');
    }
    if (window.uiController) window.uiController.renderBlockedPeersList();
  }

  unblockPeer(peerId) {
    if (!peerId || !this.blockedPeers[peerId]) return;
    delete this.blockedPeers[peerId];
    localStorage.setItem('aethertalk_blocked', JSON.stringify(this.blockedPeers));

    // Unmute audio element if connected
    if (window.peerManager && window.peerManager.audioElements[peerId]) {
      window.peerManager.audioElements[peerId].muted = false;
    }

    if (window.uiController && window.uiController.showToast) {
      window.uiController.showToast(`Unblocked operator ${peerId}`, 'success');
    }
    if (window.uiController) window.uiController.renderBlockedPeersList();
  }

  isPeerBlocked(peerId) {
    return !!this.blockedPeers[peerId];
  }
}

window.profileManager = new ProfileManager();

// Production-Ready WebRTC & Firebase Signaling Logic for Doctor VR App

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ]
};

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const startScreen = document.getElementById('startScreen');
  const callScreen = document.getElementById('callScreen');
  const roomInput = document.getElementById('roomInput');
  const firebaseUrlInput = document.getElementById('firebaseUrlInput');
  const btnGenerateKey = document.getElementById('btnGenerateKey');
  const btnJoinRoom = document.getElementById('btnJoinRoom');
  const expiryTimeText = document.getElementById('expiryTimeText');
  const displayRoomKey = document.getElementById('displayRoomKey');
  const activeRoomTag = document.getElementById('activeRoomTag');
  const btnCopyLink = document.getElementById('btnCopyLink');
  
  const localDoctorVideo = document.getElementById('localDoctorVideo');
  const remoteVrVideo = document.getElementById('remoteVrVideo');
  const vrConnectingOverlay = document.getElementById('vrConnectingOverlay');

  const btnToggleMic = document.getElementById('btnToggleMic');
  const btnToggleCam = document.getElementById('btnToggleCam');
  const btnFlipCam = document.getElementById('btnFlipCam');
  const btnEndSession = document.getElementById('btnEndSession');

  // State
  let pc = null;
  let firebaseDb = null;
  let localStream = null;
  let currentRoomId = '';
  let isAudioMuted = false;
  let isVideoOff = false;
  let facingMode = 'user'; // 'user' or 'environment'

  // 1. Expiry Time Calculation (12:00 AM IST)
  function updateExpiryDisplay() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istDate = new Date(utcTime + istOffset);
    
    const tomorrowIST = new Date(istDate);
    tomorrowIST.setDate(tomorrowIST.getDate() + 1);
    tomorrowIST.setHours(0, 0, 0, 0);

    expiryTimeText.textContent = tomorrowIST.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST';
  }
  updateExpiryDisplay();

  // 2. Generate Random Room Key
  btnGenerateKey.addEventListener('click', () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    roomInput.value = `DOC-${rand}`;
  });

  // 3. Copy Room Key
  btnCopyLink.addEventListener('click', () => {
    navigator.clipboard.writeText(currentRoomId);
    btnCopyLink.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
    setTimeout(() => btnCopyLink.innerHTML = '<i class="fa-solid fa-copy"></i> Copy Key', 2000);
  });

  // 4. Start Doctor Session & WebRTC Setup
  btnJoinRoom.addEventListener('click', async () => {
    currentRoomId = roomInput.value.trim().toUpperCase() || 'DOC-8921';
    const firebaseUrl = firebaseUrlInput.value.trim();

    if (!firebaseUrl) {
      alert('Please provide a Firebase Database URL!');
      return;
    }

    displayRoomKey.textContent = currentRoomId;
    activeRoomTag.textContent = currentRoomId;

    // Initialize Firebase
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp({ databaseURL: firebaseUrl });
      }
      firebaseDb = firebase.database();
    } catch (e) {
      console.warn("Firebase Init fallback:", e);
    }

    // Switch to Full Screen Call UI
    startScreen.style.display = 'none';
    callScreen.style.display = 'flex';

    // Start WebRTC Connection
    await initWebRTC();
  });

  async function initWebRTC() {
    pc = new RTCPeerConnection(ICE_SERVERS);

    // Get Doctor Camera & Mic Stream
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      localDoctorVideo.srcObject = localStream;
      
      // Add local tracks to WebRTC
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    } catch (err) {
      console.error("Camera access failed", err);
      alert("Could not access camera/mic: " + err.message);
    }

    // Listen for Incoming VR Stream from Unity/Quest 3
    pc.ontrack = (event) => {
      console.log("Remote VR Video Track Received!", event.streams);
      if (event.streams && event.streams[0]) {
        remoteVrVideo.srcObject = event.streams[0];
        vrConnectingOverlay.style.display = 'none'; // Hide waiting spinner
      }
    };

    // Firebase Signaling Setup
    const roomRef = firebaseDb.ref(`telemedicine_rooms/${currentRoomId}`);
    const doctorOffersRef = roomRef.child('offers');
    const vrAnswersRef = roomRef.child('answers');
    const doctorCandidatesRef = roomRef.child('doctor_candidates');
    const vrCandidatesRef = roomRef.child('vr_candidates');

    // Send Local ICE Candidates to Firebase for Unity to pick up
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        doctorCandidatesRef.push(event.candidate.toJSON());
      }
    };

    // Create SDP Offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Save Offer to Firebase
    await doctorOffersRef.set({
      sdp: offer.sdp,
      type: offer.type,
      timestamp: Date.now()
    });

    // Listen for Unity VR's Answer from Firebase
    vrAnswersRef.on('value', async (snapshot) => {
      const data = snapshot.val();
      if (data && data.sdp && !pc.currentRemoteDescription) {
        console.log("Received Answer from Unity VR!");
        const rsd = new RTCSessionDescription(data);
        await pc.setRemoteDescription(rsd);
      }
    });

    // Listen for Unity VR's ICE Candidates from Firebase
    vrCandidatesRef.on('child_added', async (snapshot) => {
      const candidateData = snapshot.val();
      if (candidateData) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidateData));
        } catch (e) {
          console.error("Error adding VR ICE candidate:", e);
        }
      }
    });
  }

  // 5. Controls Logic
  btnToggleMic.addEventListener('click', () => {
    if (!localStream) return;
    isAudioMuted = !isAudioMuted;
    localStream.getAudioTracks().forEach(t => t.enabled = !isAudioMuted);
    btnToggleMic.classList.toggle('off', isAudioMuted);
    btnToggleMic.innerHTML = `<i class="fa-solid ${isAudioMuted ? 'fa-microphone-slash' : 'fa-microphone'}"></i>`;
  });

  btnToggleCam.addEventListener('click', () => {
    if (!localStream) return;
    isVideoOff = !isVideoOff;
    localStream.getVideoTracks().forEach(t => t.enabled = !isVideoOff);
    btnToggleCam.classList.toggle('off', isVideoOff);
    btnToggleCam.innerHTML = `<i class="fa-solid ${isVideoOff ? 'fa-video-slash' : 'fa-video'}"></i>`;
  });

  btnFlipCam.addEventListener('click', async () => {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    await initWebRTC();
  });

  btnEndSession.addEventListener('click', () => {
    if (pc) pc.close();
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    location.reload();
  });
});

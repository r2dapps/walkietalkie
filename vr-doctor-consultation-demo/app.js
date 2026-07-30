// Mobile-Responsive WebRTC & VR Consultation Logic

document.addEventListener('DOMContentLoaded', () => {
  const roomKeyDisplay = document.getElementById('roomKeyDisplay');
  const expiryTime = document.getElementById('expiryTime');
  const waitRoomKey = document.getElementById('waitRoomKey');
  const btnGenKey = document.getElementById('btnGenKey');
  const btnStartCamera = document.getElementById('btnStartCamera');
  const btnStartConsultation = document.getElementById('btnStartConsultation');
  const btnEndConsultation = document.getElementById('btnEndConsultation');
  const doctorVideo = document.getElementById('doctorVideo');
  const doctorPlaceholder = document.getElementById('doctorPlaceholder');
  const doctorLiveBadge = document.getElementById('doctorLiveBadge');
  const vrCanvas = document.getElementById('vrCanvas');
  const vrPlaceholder = document.getElementById('vrPlaceholder');
  const vrStatusBadge = document.getElementById('vrStatusBadge');
  const modeCase1 = document.getElementById('modeCase1');
  const modeCase2 = document.getElementById('modeCase2');
  const leftCardTitle = document.getElementById('leftCardTitle');
  const rightCardTitle = document.getElementById('rightCardTitle');

  let localStream = null;
  let isConsultationActive = false;
  let currentMode = 'case1'; // 'case1' or 'case2'
  let animId = null;

  // 1. Calculate Midnight IST (12:00 AM IST) Expiration
  function getMidnightISTString() {
    const now = new Date();
    // Convert to IST (UTC + 5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istDate = new Date(utcTime + istOffset);
    
    // Tomorrow 12:00 AM IST
    const tomorrowIST = new Date(istDate);
    tomorrowIST.setDate(tomorrowIST.getDate() + 1);
    tomorrowIST.setHours(0, 0, 0, 0);

    return tomorrowIST.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST';
  }

  // 2. Generate Random Room Key
  function generateRoomKey() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const key = `DOC-${randomNum}`;
    roomKeyDisplay.textContent = key;
    waitRoomKey.textContent = key;
    expiryTime.textContent = `12:00 AM IST (${getMidnightISTString()})`;
  }

  btnGenKey.addEventListener('click', generateRoomKey);
  generateRoomKey(); // Init on load

  // 3. Camera Control
  btnStartCamera.addEventListener('click', async () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
      doctorVideo.style.display = 'none';
      doctorPlaceholder.style.display = 'flex';
      doctorLiveBadge.textContent = 'OFFLINE';
      doctorLiveBadge.style.color = 'var(--text-secondary)';
      btnStartCamera.innerHTML = '<i class="fa-solid fa-camera"></i> Enable Camera';
      return;
    }

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: 30 },
        audio: true
      });
      doctorVideo.srcObject = localStream;
      doctorVideo.style.display = 'block';
      doctorPlaceholder.style.display = 'none';
      doctorLiveBadge.textContent = '● LIVE';
      doctorLiveBadge.style.color = 'var(--accent-emerald)';
      btnStartCamera.innerHTML = '<i class="fa-solid fa-video-slash"></i> Stop Camera';
    } catch (err) {
      alert('Camera access failed: ' + err.message);
    }
  });

  // 4. Session Start / End Controllers
  btnStartConsultation.addEventListener('click', () => {
    isConsultationActive = true;
    vrPlaceholder.style.display = 'none';
    vrCanvas.style.display = 'block';
    vrStatusBadge.textContent = '● IN CONSULTATION';
    vrStatusBadge.style.color = 'var(--accent-emerald)';

    startVRCanvasStream();
  });

  btnEndConsultation.addEventListener('click', () => {
    isConsultationActive = false;
    vrCanvas.style.display = 'none';
    vrPlaceholder.style.display = 'flex';
    vrStatusBadge.textContent = 'Patient Switched / Reset';
    vrStatusBadge.style.color = 'var(--accent-amber)';

    if (animId) cancelAnimationFrame(animId);
  });

  // 5. Case 1 vs Case 2 Mode Switcher
  modeCase1.addEventListener('click', () => {
    currentMode = 'case1';
    modeCase1.classList.add('active');
    modeCase2.classList.remove('active');
    leftCardTitle.textContent = 'Doctor Camera Stream (1080p)';
    rightCardTitle.textContent = 'Patient Meta Quest 3 VR View';
  });

  modeCase2.addEventListener('click', () => {
    currentMode = 'case2';
    modeCase2.classList.add('active');
    modeCase1.classList.remove('active');
    leftCardTitle.textContent = 'VR Headset 1 (Doctor VR View)';
    rightCardTitle.textContent = 'VR Headset 2 (Patient VR View)';
  });

  // 6. Canvas VR Stream Simulation
  function startVRCanvasStream() {
    const ctx = vrCanvas.getContext('2d');
    vrCanvas.width = 640;
    vrCanvas.height = 360;

    let angle = 0;
    function render() {
      angle += 0.02;
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, vrCanvas.width, vrCanvas.height);

      // Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < vrCanvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, vrCanvas.height);
        ctx.stroke();
      }

      // Floating Video Quad inside Quest 3 VR
      const qX = 200 + Math.sin(angle) * 15;
      const qY = 70 + Math.cos(angle) * 10;
      const qW = 240;
      const qH = 150;

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(qX + 8, qY + 8, qW, qH);

      if (localStream) {
        ctx.drawImage(doctorVideo, qX, qY, qW, qH);
      } else {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(qX, qY, qW, qH);
        ctx.fillStyle = '#ffffff';
        ctx.font = '13px sans-serif';
        ctx.fillText(currentMode === 'case1' ? 'Doctor Stream' : 'VR Peer Stream', qX + 50, qY + 80);
      }

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.strokeRect(qX, qY, qW, qH);

      if (isConsultationActive) {
        animId = requestAnimationFrame(render);
      }
    }

    render();
  }
});

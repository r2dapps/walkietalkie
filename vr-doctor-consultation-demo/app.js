// Vanilla JS WebRTC & VR Demonstration Logic

document.addEventListener('DOMContentLoaded', () => {
  const btnStartCamera = document.getElementById('btnStartCamera');
  const btnSimulateVR = document.getElementById('btnSimulateVR');
  const doctorVideo = document.getElementById('doctorVideo');
  const doctorPlaceholder = document.getElementById('doctorPlaceholder');
  const vrCanvas = document.getElementById('vrCanvas');
  const vrPlaceholder = document.getElementById('vrPlaceholder');
  const vrStatusText = document.getElementById('vrStatusText');
  const sessionStatus = document.getElementById('sessionStatus');

  let localStream = null;
  let animId = null;

  // 1. Enable Doctor Camera Stream
  btnStartCamera.addEventListener('click', async () => {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: 30 },
        audio: true
      });

      doctorVideo.srcObject = localStream;
      doctorVideo.style.display = 'block';
      doctorPlaceholder.style.display = 'none';
      btnStartCamera.innerHTML = '<i class="fa-solid fa-circle-check"></i> Camera Active';
      btnStartCamera.style.background = '#10b981';
    } catch (err) {
      alert('Camera access error or permission denied: ' + err.message);
    }
  });

  // 2. Simulate VR Meta Quest 3 Live Video Stream Receiver
  btnSimulateVR.addEventListener('click', () => {
    if (vrCanvas.style.display === 'block') {
      // Toggle off
      vrCanvas.style.display = 'none';
      vrPlaceholder.style.display = 'flex';
      vrStatusText.textContent = 'Disconnected';
      btnSimulateVR.innerHTML = '<i class="fa-solid fa-headset"></i> Connect VR Headset Test';
      cancelAnimationFrame(animId);
      return;
    }

    vrCanvas.style.display = 'block';
    vrPlaceholder.style.display = 'none';
    vrStatusText.textContent = '● CONNECTED (Meta Quest 3)';
    vrStatusText.style.color = '#10b981';
    btnSimulateVR.innerHTML = '<i class="fa-solid fa-power-off"></i> Disconnect VR';

    // Render 3D Simulated Quest 3 Room Canvas
    const ctx = vrCanvas.getContext('2d');
    vrCanvas.width = 640;
    vrCanvas.height = 360;

    let angle = 0;
    function renderVRFrame() {
      angle += 0.02;

      // Dark VR Grid environment
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, vrCanvas.width, vrCanvas.height);

      // Grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < vrCanvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, vrCanvas.height);
        ctx.stroke();
      }

      // Simulated Floating 3D Doctor Video Quad inside VR
      const quadX = 200 + Math.sin(angle) * 15;
      const quadY = 70 + Math.cos(angle) * 10;
      const quadW = 240;
      const quadH = 150;

      // Draw shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(quadX + 10, quadY + 10, quadW, quadH);

      // Draw Doctor Video or Screen
      if (localStream) {
        ctx.drawImage(doctorVideo, quadX, quadY, quadW, quadH);
      } else {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(quadX, quadY, quadW, quadH);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.fillText('Doctor Live Video Quad', quadX + 45, quadY + 80);
      }

      // Draw Cyan border around floating 3D screen
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.strokeRect(quadX, quadY, quadW, quadH);

      // VR Reticle / Target Center
      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(vrCanvas.width / 2, vrCanvas.height / 2, 8, 0, Math.PI * 2);
      ctx.stroke();

      animId = requestAnimationFrame(renderVRFrame);
    }

    renderVRFrame();
  });
});

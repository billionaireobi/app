/**
 * camera_capture.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a reusable camera-capture modal.
 * • Forces CAMERA only — no gallery/upload picker on mobile.
 * • Stamps every captured photo with: Username | GPS coords | Timestamp.
 * • Returns the result as a base64 JPEG data-URL stored in a hidden form field.
 *
 * Usage:
 *   CameraCapture.init({
 *     triggerBtn   : '#takephoto-btn',      // Button that opens the modal
 *     previewImg   : '#photo-preview',      // <img> that shows the taken photo
 *     hiddenInput  : '#photo_base64',       // <input type="hidden"> for the data-url
 *     username     : 'John Doe',            // Logged-in user's display name
 *     latInput     : '#id_latitude',        // (optional) lat hidden input
 *     lngInput     : '#id_longitude',       // (optional) lng hidden input
 *   });
 */

const CameraCapture = (() => {

  /* ── state ────────────────────────────────────────────────────────── */
  let stream = null;
  let userLat = null, userLng = null;
  let cfg = {};

  /* ── HTML template injected once ─────────────────────────────────── */
  const MODAL_ID = 'cc-camera-modal';

  function injectModal() {
    if (document.getElementById(MODAL_ID)) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="${MODAL_ID}" class="cc-overlay" role="dialog" aria-modal="true">
        <div class="cc-box">
          <div class="cc-header">
            <span class="cc-title">📷 Take Photo</span>
            <button id="cc-close" class="cc-close-btn" aria-label="Close">&times;</button>
          </div>
          <div class="cc-body">
            <video id="cc-video" autoplay playsinline muted></video>
            <canvas id="cc-canvas" style="display:none;"></canvas>
          </div>
          <div class="cc-footer">
            <button id="cc-capture-btn" class="cc-btn cc-btn-primary">
              <i class="bi bi-camera-fill"></i> Capture
            </button>
            <button id="cc-retake-btn" class="cc-btn cc-btn-secondary" style="display:none;">
              <i class="bi bi-arrow-counterclockwise"></i> Retake
            </button>
            <button id="cc-use-btn" class="cc-btn cc-btn-success" style="display:none;">
              <i class="bi bi-check-circle-fill"></i> Use Photo
            </button>
          </div>
          <p id="cc-status" class="cc-status"></p>
        </div>
      </div>

      <style>
        .cc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:none;align-items:center;justify-content:center;}
        .cc-overlay.active{display:flex;}
        .cc-box{background:#1e293b;border-radius:12px;width:min(480px,96vw);overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.5);}
        .cc-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#0f172a;}
        .cc-title{color:#f1f5f9;font-weight:700;font-size:1rem;}
        .cc-close-btn{background:none;border:none;color:#94a3b8;font-size:1.5rem;cursor:pointer;line-height:1;}
        .cc-body{position:relative;background:#000;}
        #cc-video,#cc-canvas{width:100%;max-height:55vh;object-fit:cover;display:block;}
        .cc-footer{display:flex;gap:8px;padding:12px 16px;justify-content:center;background:#0f172a;}
        .cc-btn{padding:8px 18px;border:none;border-radius:8px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:.9rem;}
        .cc-btn-primary{background:#6366f1;color:#fff;}
        .cc-btn-secondary{background:#475569;color:#fff;}
        .cc-btn-success{background:#10b981;color:#fff;}
        .cc-status{text-align:center;color:#94a3b8;font-size:.8rem;margin:4px 0 8px;padding:0 12px;}
      </style>
    `);
  }

  /* ── geolocation ──────────────────────────────────────────────────── */
  function getLocation(callback) {
    if (!navigator.geolocation) { callback(null, null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => callback(pos.coords.latitude, pos.coords.longitude),
      ()  => callback(null, null),
      { timeout: 8000, enableHighAccuracy: true }
    );
  }

  /* ── watermark drawing ────────────────────────────────────────────── */
  function drawWatermark(ctx, canvas, username, lat, lng) {
    const W = canvas.width, H = canvas.height;
    const now = new Date().toLocaleString('en-KE', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const gps = (lat && lng) ? `${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}` : 'GPS unavailable';

    const lines = [
      `👤 ${username}`,
      `📍 ${gps}`,
      `🕐 ${now}`,
    ];

    const fontSize = Math.max(12, Math.min(18, W / 28));
    ctx.font = `bold ${fontSize}px monospace`;
    const pad = 10;
    const lineH = fontSize + 4;
    const boxH = lines.length * lineH + pad * 2;
    const boxW = Math.max(...lines.map(l => ctx.measureText(l).width)) + pad * 2;

    // Semi-transparent background strip at bottom
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, H - boxH, W, boxH);

    // Text
    ctx.fillStyle = '#ffffff';
    lines.forEach((line, i) => {
      ctx.fillText(line, pad, H - boxH + pad + lineH * i + fontSize);
    });
  }

  /* ── open camera ──────────────────────────────────────────────────── */
  function openCamera() {
    setStatus('Requesting camera access...');
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    })
    .then(s => {
      stream = s;
      const video = document.getElementById('cc-video');
      const canvas = document.getElementById('cc-canvas');
      video.srcObject = s;
      canvas.style.display = 'none';
      video.style.display = 'block';
      document.getElementById('cc-capture-btn').style.display = '';
      document.getElementById('cc-retake-btn').style.display  = 'none';
      document.getElementById('cc-use-btn').style.display     = 'none';
      setStatus('Camera ready. Press Capture.');
    })
    .catch(err => {
      setStatus('Camera access denied. ' + err.message);
    });
  }

  /* ── capture frame ────────────────────────────────────────────────── */
  function captureFrame() {
    const video  = document.getElementById('cc-video');
    const canvas = document.getElementById('cc-canvas');
    const ctx    = canvas.getContext('2d');

    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Add watermark
    drawWatermark(ctx, canvas, cfg.username || 'User', userLat, userLng);

    // Hide video, show canvas preview
    video.style.display  = 'none';
    canvas.style.display = 'block';
    document.getElementById('cc-capture-btn').style.display = 'none';
    document.getElementById('cc-retake-btn').style.display  = '';
    document.getElementById('cc-use-btn').style.display     = '';
    setStatus('Photo captured. Use or Retake.');
  }

  /* ── use photo ────────────────────────────────────────────────────── */
  function usePhoto() {
    const canvas = document.getElementById('cc-canvas');
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    // Set hidden field
    const hiddenField = document.querySelector(cfg.hiddenInput);
    if (hiddenField) hiddenField.value = dataUrl;

    // Set preview image
    const preview = document.querySelector(cfg.previewImg);
    if (preview) {
      preview.src = dataUrl;
      preview.style.display = 'block';
    }

    // Set lat/lng fields if configured
    if (cfg.latInput && userLat !== null)
      document.querySelector(cfg.latInput).value = userLat;
    if (cfg.lngInput && userLng !== null)
      document.querySelector(cfg.lngInput).value = userLng;

    closeModal();
  }

  /* ── helpers ──────────────────────────────────────────────────────── */
  function setStatus(txt) {
    const el = document.getElementById('cc-status');
    if (el) el.textContent = txt;
  }

  function stopStream() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  function openModal() {
    document.getElementById(MODAL_ID).classList.add('active');
    openCamera();
  }

  function closeModal() {
    stopStream();
    document.getElementById(MODAL_ID).classList.remove('active');
    const video  = document.getElementById('cc-video');
    const canvas = document.getElementById('cc-canvas');
    if (video)  { video.srcObject  = null; video.style.display  = 'block'; }
    if (canvas) { canvas.style.display = 'none'; }
  }

  /* ── public API ───────────────────────────────────────────────────── */
  function init(options) {
    cfg = Object.assign({
      triggerBtn : '#take-photo-btn',
      previewImg : '#photo-preview',
      hiddenInput: '#photo_base64',
      username   : 'User',
      latInput   : null,
      lngInput   : null,
    }, options);

    injectModal();

    // Acquire GPS early (so it's ready when photo is taken)
    getLocation((lat, lng) => {
      userLat = lat;
      userLng = lng;
    });

    // Wire up trigger button
    document.addEventListener('click', e => {
      if (e.target.closest(cfg.triggerBtn)) { e.preventDefault(); openModal(); }
      if (e.target.closest('#cc-close'))     { closeModal(); }
      if (e.target.closest('#cc-capture-btn')) { captureFrame(); }
      if (e.target.closest('#cc-retake-btn'))  { openCamera(); }
      if (e.target.closest('#cc-use-btn'))     { usePhoto(); }
    });

    // Close on backdrop click
    document.getElementById(MODAL_ID).addEventListener('click', e => {
      if (e.target.id === MODAL_ID) closeModal();
    });
  }

  return { init, getLocation, drawWatermark };
})();

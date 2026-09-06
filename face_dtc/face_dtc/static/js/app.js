/**
 * Missing Persons AI Finder Main Script
 * Handles live video frame processing, facial similarity candidate matching,
 * side-by-side candidate comparison rendering, registration, and sighting reports.
 */
const API_BASE = (window.location.protocol === 'file:') ? 'http://localhost:8000' : '';

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const scanVideo = document.getElementById('scanVideo');
  const scanCanvas = document.getElementById('scanCanvas');
  const searchPhotoPreview = document.getElementById('searchPhotoPreview');
  const cameraSelect = document.getElementById('cameraSelect');
  const btnToggleFacing = document.getElementById('btnToggleFacing');
  const btnTriggerSearch = document.getElementById('btnTriggerSearch');
  const fileUploadSearch = document.getElementById('fileUploadSearch');
  const fpsCounter = document.getElementById('fpsCounter');
  const matchCountBadge = document.getElementById('matchCountBadge');
  const candidatesList = document.getElementById('candidatesList');
  const statusActiveCount = document.getElementById('statusActiveCount');
  const statusFoundCount = document.getElementById('statusFoundCount');

  const connectionBanner = document.getElementById('connectionBanner');
  const connectionText = document.getElementById('connectionText');

  // Register Elements
  const regVideo = document.getElementById('regVideo');
  const regCanvas = document.getElementById('regCanvas');
  const btnSnapRegister = document.getElementById('btnSnapRegister');
  const fileUploadRegister = document.getElementById('fileUploadRegister');
  const regPreviewImg = document.getElementById('regPreviewImg');
  const formRegisterCase = document.getElementById('formRegisterCase');
  const regName = document.getElementById('regName');
  const regAge = document.getElementById('regAge');
  const regGender = document.getElementById('regGender');
  const regMissingSince = document.getElementById('regMissingSince');
  const regContact = document.getElementById('regContact');
  const regLocation = document.getElementById('regLocation');
  const regNotes = document.getElementById('regNotes');
  const btnSubmitCase = document.getElementById('btnSubmitCase');

  // Directory Elements
  const casesGrid = document.getElementById('casesGrid');
  const filterStatus = document.getElementById('filterStatus');
  const searchCasesInput = document.getElementById('searchCasesInput');

  // Modal Elements
  const sightingModal = document.getElementById('sightingModal');
  const formSightingReport = document.getElementById('formSightingReport');
  const sightingCaseId = document.getElementById('sightingCaseId');
  const sightingTargetName = document.getElementById('sightingTargetName');
  const sightingLocation = document.getElementById('sightingLocation');
  const sightingReporterContact = document.getElementById('sightingReporterContact');
  const sightingNotes = document.getElementById('sightingNotes');

  // Camera Controllers
  const scanCam = new CameraController(scanVideo, scanCanvas);
  const regCam = new CameraController(regVideo, regCanvas);

  let activeTab = 'tab-search';
  let isFrameProcessing = false;
  let lastFrameTime = Date.now();
  let frameCount = 0;
  let capturedSnapBase64 = null;
  let currentScannedImageBase64 = null;

  // 1. Health Check & Case Counters
  async function checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (data.active_missing !== undefined) statusActiveCount.innerText = data.active_missing;
      if (data.found_cases !== undefined) statusFoundCount.innerText = data.found_cases;
      
      connectionBanner.style.display = 'none';
      return true;
    } catch (e) {
      connectionBanner.style.display = 'block';
      connectionText.innerHTML = `AI Backend Server is offline. Please launch server in terminal: <code>python app.py</code> (Target: ${API_BASE || 'http://localhost:8000'})`;
      return false;
    }
  }
  checkHealth();
  setInterval(checkHealth, 5000);

  // Populate Cameras
  async function initCameras(camController) {
    const devices = await camController.getDevices();
    cameraSelect.innerHTML = '<option value="">Default Camera</option>';
    devices.forEach((d, idx) => {
      const opt = document.createElement('option');
      opt.value = d.deviceId;
      opt.text = d.label || `Camera ${idx + 1}`;
      cameraSelect.appendChild(opt);
    });
  }

  await scanCam.startStream();
  initCameras(scanCam);

  // 2. Tab Navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      document.getElementById(activeTab).classList.add('active');

      scanCam.stopStream();
      regCam.stopStream();

      if (activeTab === 'tab-search') {
        searchPhotoPreview.style.display = 'none';
        scanVideo.style.display = 'block';
        await scanCam.startStream();
      } else if (activeTab === 'tab-register') {
        await regCam.startStream();
      } else if (activeTab === 'tab-directory') {
        await loadCases();
      }
    });
  });

  // Controls
  cameraSelect.addEventListener('change', () => {
    const deviceId = cameraSelect.value;
    if (activeTab === 'tab-search') {
      searchPhotoPreview.style.display = 'none';
      scanVideo.style.display = 'block';
      scanCam.startStream(deviceId);
    } else if (activeTab === 'tab-register') {
      regCam.startStream(deviceId);
    }
  });

  btnToggleFacing.addEventListener('click', () => {
    if (activeTab === 'tab-search') {
      searchPhotoPreview.style.display = 'none';
      scanVideo.style.display = 'block';
      scanCam.toggleCameraFacing();
    } else if (activeTab === 'tab-register') {
      regCam.toggleCameraFacing();
    }
  });

  // Manual Trigger Search Button
  btnTriggerSearch.addEventListener('click', async () => {
    let base64Img = currentScannedImageBase64;
    if (!base64Img && scanCam.isStreaming) {
      base64Img = scanCam.captureFrameBase64(0.85);
    }
    if (!base64Img) {
      alert('Please position your face in the camera or click "Upload Photo" first.');
      return;
    }
    btnTriggerSearch.disabled = true;
    btnTriggerSearch.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Searching...';
    await executeSearch(base64Img);
    btnTriggerSearch.disabled = false;
    btnTriggerSearch.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> AI Search Match';
  });

  // File Upload Search
  fileUploadSearch.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const base64Img = evt.target.result;
        currentScannedImageBase64 = base64Img;
        
        // Show uploaded image preview over video box
        searchPhotoPreview.src = base64Img;
        searchPhotoPreview.style.display = 'block';
        scanVideo.style.display = 'none';
        scanCam.stopStream();

        btnTriggerSearch.disabled = true;
        btnTriggerSearch.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Searching...';
        await executeSearch(base64Img);
        btnTriggerSearch.disabled = false;
        btnTriggerSearch.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> AI Search Match';
      };
      reader.readAsDataURL(file);
    }
  });

  // 3. Real-Time Search Frame Loop
  async function processLiveFrame() {
    if (activeTab === 'tab-search' && scanCam.isStreaming && !isFrameProcessing) {
      isFrameProcessing = true;
      const base64Img = scanCam.captureFrameBase64(0.8);

      if (base64Img) {
        currentScannedImageBase64 = base64Img;
        await executeSearch(base64Img);

        frameCount++;
        const now = Date.now();
        if (now - lastFrameTime >= 1000) {
          fpsCounter.innerText = `${frameCount} FPS`;
          frameCount = 0;
          lastFrameTime = now;
        }
      }
      isFrameProcessing = false;
    }
    requestAnimationFrame(processLiveFrame);
  }
  requestAnimationFrame(processLiveFrame);

  async function executeSearch(base64Img) {
    try {
      const response = await fetch(`${API_BASE}/api/missing/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Img, top_k: 5, threshold: 0.30 })
      });
      const data = await response.json();

      if (data.success && data.results && data.results.length > 0) {
        const primaryResult = data.results[0];
        const candidates = primaryResult.candidates || [];
        
        // Draw overlay if camera is playing
        if (scanCam.isStreaming) {
          scanCam.drawDetections([{
            bbox: primaryResult.bbox,
            identity: {
              is_known: candidates.length > 0,
              name: candidates.length > 0 ? candidates[0].name : 'Scanning...',
              confidence: candidates.length > 0 ? candidates[0].match_percentage : 0
            }
          }]);
        }

        renderCandidateMatches(candidates, base64Img);
        matchCountBadge.innerText = `${candidates.length} Matches Found`;
      }
    } catch (err) {
      console.error('[App] Search API error:', err);
    }
  }

  // Render Side-by-Side Candidate Cards
  function renderCandidateMatches(candidates, scannedBase64) {
    if (!candidates || candidates.length === 0) {
      candidatesList.innerHTML = `
        <div class="match-card">
          <div>
            <div class="match-person-name" style="color: var(--text-muted);">No Matches Found</div>
            <div class="card-subtitle">No missing person records matched the scanned facial features above the threshold.</div>
          </div>
        </div>`;
      return;
    }

    candidatesList.innerHTML = candidates.map(c => {
      const barColor = c.tier_code === 'high' ? '#ef4444' : (c.tier_code === 'medium' ? '#f59e0b' : '#94a3b8');
      const imgPath = c.image_path.startsWith('/') ? `${API_BASE}${c.image_path}` : c.image_path;

      return `
        <div class="match-card tier-${c.tier_code}">
          <div class="match-card-header">
            <div>
              <div class="match-person-name">${c.name} ${c.age ? `(${c.age} yrs)` : ''}</div>
              <div style="font-size: 0.78rem; color: var(--accent-red); font-weight: 600;">Case ID: ${c.id}</div>
            </div>
            <div class="match-badge ${c.tier_code}">${c.match_percentage}% ${c.confidence_tier.toUpperCase()}</div>
          </div>

          <!-- Progress Bar -->
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${c.match_percentage}%; background: ${barColor};"></div>
          </div>

          <!-- Side by Side Photo Comparison -->
          <div class="side-by-side">
            <div style="text-align: center;">
              <img src="${scannedBase64}" class="side-img" alt="Scanned Frame">
              <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 2px;">Scanned Input</div>
            </div>
            <div style="font-size: 1.2rem; color: var(--text-muted);"><i class="fa-solid fa-right-left"></i></div>
            <div style="text-align: center;">
              <img src="${imgPath}" class="side-img" alt="${c.name}" onerror="this.src='https://via.placeholder.com/90?text=DB+Photo'">
              <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 2px;">Database Photo</div>
            </div>
            
            <div style="flex: 1; margin-left: 0.5rem; font-size: 0.8rem; color: var(--text-secondary);">
              <div><i class="fa-solid fa-location-dot" style="color: var(--accent-red);"></i> <strong>Last Seen:</strong> ${c.last_seen_location}</div>
              <div><i class="fa-solid fa-calendar-day"></i> <strong>Missing Since:</strong> ${c.missing_since || 'Recently'}</div>
              <div><i class="fa-solid fa-phone"></i> <strong>Contact:</strong> ${c.contact_number}</div>
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem; margin-top: 0.4rem;">
            <button class="btn btn-primary" style="flex: 1; padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="openSightingModal('${c.id}', '${c.name.replace(/'/g, "\\'")}')">
              <i class="fa-solid fa-bullhorn"></i> Report Sighting
            </button>
            <a href="tel:${c.contact_number}" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">
              <i class="fa-solid fa-phone"></i> Call Emergency
            </a>
          </div>
        </div>`;
    }).join('');
  }

  // 4. Registration Form Handlers
  btnSnapRegister.addEventListener('click', () => {
    const base64Img = regCam.captureFrameBase64(0.9);
    if (base64Img) {
      capturedSnapBase64 = base64Img;
      regPreviewImg.src = base64Img;
      regPreviewImg.style.display = 'block';
      btnSubmitCase.disabled = false;
    }
  });

  fileUploadRegister.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        capturedSnapBase64 = evt.target.result;
        regPreviewImg.src = capturedSnapBase64;
        regPreviewImg.style.display = 'block';
        btnSubmitCase.disabled = false;
      };
      reader.readAsDataURL(file);
    }
  });

  formRegisterCase.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!capturedSnapBase64) {
      alert('Please upload a photo or take a camera snapshot first.');
      return;
    }

    btnSubmitCase.disabled = true;
    btnSubmitCase.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Indexing Case Vector...';

    try {
      const response = await fetch(`${API_BASE}/api/missing/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.value,
          age: regAge.value ? parseInt(regAge.value) : null,
          gender: regGender.value,
          missing_since: regMissingSince.value,
          last_seen_location: regLocation.value,
          contact_number: regContact.value,
          notes: regNotes.value,
          image: capturedSnapBase64
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Missing Person Case published for '${regName.value}'!`);
        formRegisterCase.reset();
        regPreviewImg.style.display = 'none';
        capturedSnapBase64 = null;
        checkHealth();
      } else {
        alert(`Registration Error: ${data.detail || data.message}`);
      }
    } catch (err) {
      alert(`Error publishing case: ${err.message}`);
    } finally {
      btnSubmitCase.innerHTML = '<i class="fa-solid fa-bullhorn"></i> Publish Missing Case & Face Vector';
    }
  });

  // 5. Directory Gallery Handlers
  async function loadCases() {
    casesGrid.innerHTML = '<div style="color: var(--text-muted); grid-column: 1/-1;">Loading missing persons cases...</div>';
    const statusVal = filterStatus.value;
    const queryVal = searchCasesInput.value;

    try {
      const res = await fetch(`${API_BASE}/api/missing/cases?status=${encodeURIComponent(statusVal)}&q=${encodeURIComponent(queryVal)}`);
      const data = await res.json();

      if (!data.cases || data.cases.length === 0) {
        casesGrid.innerHTML = '<div style="color: var(--text-muted); grid-column: 1/-1;">No missing person records found matching filters.</div>';
        return;
      }

      casesGrid.innerHTML = data.cases.map(c => {
        const isFound = c.status === 'Found';
        const sightingsCount = c.sightings ? c.sightings.length : 0;
        const imgPath = c.image_path.startsWith('/') ? `${API_BASE}${c.image_path}` : c.image_path;

        return `
          <div class="case-card">
            <img src="${imgPath}" class="case-img" alt="${c.name}" onerror="this.src='https://via.placeholder.com/260x200?text=No+Photo'">
            <div class="case-body">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span class="status-tag ${isFound ? 'found' : 'missing'}">${c.status.toUpperCase()}</span>
                <span style="font-size: 0.72rem; color: var(--text-muted);">Case ID: ${c.id}</span>
              </div>

              <div style="font-weight: 700; font-size: 1.05rem; margin-top: 0.2rem;">${c.name} ${c.age ? `(${c.age})` : ''}</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary);"><i class="fa-solid fa-location-dot" style="color: var(--accent-red);"></i> ${c.last_seen_location}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-solid fa-phone"></i> ${c.contact_number}</div>

              ${sightingsCount > 0 ? `
                <div style="font-size: 0.75rem; color: var(--accent-amber); font-weight: 600; margin-top: 0.3rem;">
                  <i class="fa-solid fa-eye"></i> ${sightingsCount} Reported Sighting(s)
                </div>` : ''}

              <div style="display: flex; gap: 0.5rem; margin-top: 0.6rem;">
                <button class="btn btn-secondary" style="flex: 1; padding: 0.35rem 0.6rem; font-size: 0.75rem;" onclick="toggleCaseStatus('${c.id}', '${isFound ? 'Missing' : 'Found'}')">
                  <i class="fa-solid ${isFound ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i> Mark ${isFound ? 'Missing' : 'Found'}
                </button>
                <button class="btn btn-primary" style="padding: 0.35rem 0.6rem; font-size: 0.75rem;" onclick="openSightingModal('${c.id}', '${c.name.replace(/'/g, "\\'")}')">
                  <i class="fa-solid fa-bullhorn"></i>
                </button>
              </div>
            </div>
          </div>`;
      }).join('');
      checkHealth();
    } catch (err) {
      casesGrid.innerHTML = `<div style="color: var(--accent-red); grid-column: 1/-1;">Error loading cases: ${err.message}</div>`;
    }
  }

  filterStatus.addEventListener('change', loadCases);
  searchCasesInput.addEventListener('input', loadCases);

  window.toggleCaseStatus = async (caseId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/missing/cases/${caseId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) loadCases();
    } catch (err) {
      alert(`Error updating case status: ${err.message}`);
    }
  };

  // 6. Sighting Modal Handlers
  window.openSightingModal = (caseId, personName) => {
    sightingCaseId.value = caseId;
    sightingTargetName.innerText = `Case: ${personName} (${caseId})`;
    sightingModal.classList.add('active');
  };

  window.closeSightingModal = () => {
    sightingModal.classList.remove('active');
    formSightingReport.reset();
  };

  formSightingReport.addEventListener('submit', async (e) => {
    e.preventDefault();
    const caseId = sightingCaseId.value;

    try {
      const response = await fetch(`${API_BASE}/api/missing/sighting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          location: sightingLocation.value,
          reporter_contact: sightingReporterContact.value,
          notes: sightingNotes.value,
          image: currentScannedImageBase64
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Emergency Sighting Report submitted! Authorities and case contacts notified.');
        closeSightingModal();
        if (activeTab === 'tab-directory') loadCases();
      } else {
        alert(`Error submitting sighting: ${data.detail || data.message}`);
      }
    } catch (err) {
      alert(`Network error submitting sighting: ${err.message}`);
    }
  });
});

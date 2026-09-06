/**
 * Camera API Controller
 * Provides camera streaming, mobile front/back camera selection,
 * frame snapshot capture, and canvas overlay rendering.
 */
class CameraController {
  constructor(videoElement, canvasElement) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.stream = null;
    this.currentDeviceId = null;
    this.facingMode = 'user';
    this.isStreaming = false;
  }

  async getDevices() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === 'videoinput');
    } catch (err) {
      console.warn('[Camera] Error enumerating devices:', err);
      return [];
    }
  }

  async startStream(deviceId = null, facingMode = null) {
    this.stopStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('[Camera] getUserMedia not supported on this origin/browser');
      return false;
    }

    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    if (deviceId) {
      constraints.video.deviceId = { exact: deviceId };
    } else if (facingMode) {
      constraints.video.facingMode = facingMode;
    } else {
      constraints.video.facingMode = this.facingMode;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      
      const playPromise = this.video.play();
      if (playPromise !== undefined) {
        await playPromise.catch(e => console.warn('[Camera] Play warning:', e));
      }

      this.isStreaming = true;

      this.video.addEventListener('loadedmetadata', () => {
        if (this.canvas) {
          this.canvas.width = this.video.videoWidth || 640;
          this.canvas.height = this.video.videoHeight || 480;
        }
      });

      console.log('[Camera] Stream started successfully');
      return true;
    } catch (err) {
      console.warn('[Camera] Stream start error:', err);
      this.isStreaming = false;
      return false;
    }
  }

  stopStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.isStreaming = false;
    this.clearCanvas();
  }

  toggleCameraFacing() {
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    return this.startStream(null, this.facingMode);
  }

  captureFrameBase64(quality = 0.85) {
    if (!this.video) return null;
    
    const w = this.video.videoWidth || this.canvas.width || 640;
    const h = this.video.videoHeight || this.canvas.height || 480;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    
    try {
      tempCtx.drawImage(this.video, 0, 0, w, h);
      return tempCanvas.toDataURL('image/jpeg', quality);
    } catch (e) {
      console.error('[Camera] Canvas draw error:', e);
      return null;
    }
  }

  clearCanvas() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  drawDetections(results) {
    this.clearCanvas();
    if (!results || results.length === 0 || !this.canvas) return;

    const vw = this.video.videoWidth || this.canvas.width || 640;
    const vh = this.video.videoHeight || this.canvas.height || 480;

    const scaleX = this.canvas.width / vw;
    const scaleY = this.canvas.height / vh;

    results.forEach(res => {
      const bbox = res.bbox;
      const identity = res.identity;

      const x = bbox.x * scaleX;
      const y = bbox.y * scaleY;
      const w = bbox.w * scaleX;
      const h = bbox.h * scaleY;

      const isKnown = identity && identity.is_known;
      const strokeColor = isKnown ? '#ef4444' : '#00f2fe';
      const nameText = isKnown ? `${identity.name} (${identity.confidence}%)` : 'Scanning Face...';

      this.ctx.shadowColor = strokeColor;
      this.ctx.shadowBlur = 10;
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(x, y, w, h);

      this.ctx.shadowBlur = 0;
      this.ctx.font = '600 14px "Outfit", sans-serif';
      const textWidth = this.ctx.measureText(nameText).width;
      
      this.ctx.fillStyle = isKnown ? 'rgba(239, 68, 68, 0.88)' : 'rgba(0, 242, 254, 0.88)';
      this.ctx.fillRect(x, y - 28 > 0 ? y - 28 : y, textWidth + 16, 24);

      this.ctx.fillStyle = '#fff';
      this.ctx.fillText(nameText, x + 8, y - 28 > 0 ? y - 11 : y + 17);
    });
  }
}

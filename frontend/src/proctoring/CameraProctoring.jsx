import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, AlertTriangle, Eye, EyeOff, Activity, CheckCircle, XCircle } from 'lucide-react';

export default function CameraProctoring({ 
  onViolation,
  onStatusChange,
  isActive = true 
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const prevFrameRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [violations, setViolations] = useState([]);
  const [metrics, setMetrics] = useState({
    faceDetected: true,
    lookingAway: false,
    multipleFaces: false,
    excessiveMovement: false,
    attentionScore: 100
  });
  
  const analysisIntervalRef = useRef(null);
  const movementHistoryRef = useRef([]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setCameraError(null);
        onStatusChange?.({ cameraActive: true });
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Camera access required for proctoring. Please allow camera access.');
      onStatusChange?.({ cameraActive: false, error: err.message });
    }
  }, [onStatusChange]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Analyze frame for proctoring
  const analyzeFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Calculate frame brightness and movement
    let totalBrightness = 0;
    let movementScore = 0;
    const prevFrame = prevFrameRef.current;

    for (let i = 0; i < data.length; i += 16) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      totalBrightness += brightness;

      if (prevFrame) {
        const diff = Math.abs(brightness - prevFrame[i / 16]);
        movementScore += diff;
      }
    }

    const avgBrightness = totalBrightness / (data.length / 16);
    movementScore = movementScore / (data.length / 16);

    // Store current frame for next comparison
    const frameData = [];
    for (let i = 0; i < data.length; i += 16) {
      frameData.push((data[i] + data[i + 1] + data[i + 2]) / 3);
    }
    prevFrameRef.current = frameData;

    // Movement history for detecting sustained movement
    movementHistoryRef.current.push(movementScore);
    if (movementHistoryRef.current.length > 30) {
      movementHistoryRef.current.shift();
    }

    const avgMovement = movementHistoryRef.current.reduce((a, b) => a + b, 0) / movementHistoryRef.current.length;

    // Analyze face region (center of frame)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const faceRegionSize = canvas.width * 0.4;

    let faceRegionBrightness = 0;
    let facePixelCount = 0;
    let skinTonePixels = 0;

    for (let y = centerY - faceRegionSize/2; y < centerY + faceRegionSize/2; y += 4) {
      for (let x = centerX - faceRegionSize/2; x < centerX + faceRegionSize/2; x += 4) {
        if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
          const idx = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          faceRegionBrightness += (r + g + b) / 3;
          facePixelCount++;

          // Simple skin tone detection
          if (r > 95 && g > 40 && b > 20 && 
              r > g && r > b && 
              Math.abs(r - g) > 15 && 
              r - b > 15) {
            skinTonePixels++;
          }
        }
      }
    }

    const skinToneRatio = skinTonePixels / facePixelCount;
    const faceDetected = skinToneRatio > 0.15;

    // Detect if looking away (based on face region brightness variance)
    const lookingAway = skinToneRatio < 0.1 && faceDetected === false;

    // Excessive movement detection
    const excessiveMovement = avgMovement > 8;

    // Calculate attention score
    let attentionScore = 100;
    if (!faceDetected) attentionScore -= 40;
    if (lookingAway) attentionScore -= 30;
    if (excessiveMovement) attentionScore -= 20;
    attentionScore = Math.max(0, Math.min(100, attentionScore));

    const newMetrics = {
      faceDetected,
      lookingAway,
      multipleFaces: false,
      excessiveMovement,
      attentionScore
    };

    setMetrics(newMetrics);

    // Record violations
    const newViolations = [];
    
    if (!faceDetected) {
      newViolations.push({ type: 'no_face', message: 'Face not detected', severity: 'high' });
    }
    if (lookingAway) {
      newViolations.push({ type: 'looking_away', message: 'Not looking at screen', severity: 'medium' });
    }
    if (excessiveMovement) {
      newViolations.push({ type: 'movement', message: 'Excessive movement detected', severity: 'low' });
    }

    if (newViolations.length > 0) {
      setViolations(prev => [...prev.slice(-9), ...newViolations.map(v => ({ ...v, time: Date.now() }))]);
      onViolation?.(newViolations);
    }

  }, [cameraActive, onViolation]);

  // Start analysis loop
  useEffect(() => {
    let mounted = true;
    
    if (isActive && mounted) {
      startCamera();
    }
    
    return () => {
      mounted = false;
      stopCamera();
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
    };
  }, [isActive, startCamera, stopCamera]);

  useEffect(() => {
    if (cameraActive) {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
      analysisIntervalRef.current = setInterval(analyzeFrame, 500);
    }
    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
    };
  }, [cameraActive, analyzeFrame]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-500/20 border-green-500/30';
    if (score >= 50) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Camera feed */}
      <div className="relative flex-1 bg-slate-900 rounded-2xl overflow-hidden">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/20 p-4">
            <Camera className="w-16 h-16 text-red-400 mb-4" />
            <p className="text-red-300 text-center text-sm mb-4">{cameraError}</p>
            <button
              onClick={startCamera}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Enable Camera
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
            
            {/* Hidden canvas for analysis */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Proctoring overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Face detection frame */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div 
                  className={`w-40 h-48 border-2 rounded-2xl ${
                    metrics.faceDetected 
                      ? 'border-green-500/50' 
                      : 'border-red-500/50'
                  }`}
                  animate={{
                    borderColor: metrics.faceDetected 
                      ? ['rgba(34,197,94,0.5)', 'rgba(34,197,94,0.8)', 'rgba(34,197,94,0.5)']
                      : ['rgba(239,68,68,0.5)', 'rgba(239,68,68,0.8)', 'rgba(239,68,68,0.5)']
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              </div>

              {/* Status indicators */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                  metrics.faceDetected ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {metrics.faceDetected ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {metrics.faceDetected ? 'Face OK' : 'No Face'}
                </div>
                
                {metrics.excessiveMovement && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-300">
                    <Activity className="w-3 h-3" />
                    Movement
                  </div>
                )}
              </div>

              {/* Attention score */}
              <div className={`absolute top-2 right-2 px-3 py-1 rounded-full border ${getScoreBg(metrics.attentionScore)}`}>
                <span className={`text-sm font-bold ${getScoreColor(metrics.attentionScore)}`}>
                  {metrics.attentionScore}%
                </span>
              </div>
            </div>

            {/* Violation alerts */}
            <AnimatePresence>
              {violations.length > 0 && violations[violations.length - 1].time > Date.now() - 3000 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute bottom-2 left-2 right-2 bg-red-500/90 backdrop-blur-sm rounded-lg p-2 flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-white flex-shrink-0" />
                  <span className="text-white text-xs font-medium">
                    {violations[violations.length - 1].message}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Proctoring status bar */}
      <div className="mt-2 p-2 bg-slate-800/50 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-slate-400">
            {cameraActive ? 'Proctoring Active' : 'Camera Off'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Violations:</span>
          <span className={violations.length > 5 ? 'text-red-400' : 'text-slate-300'}>
            {violations.length}
          </span>
        </div>
      </div>
    </div>
  );
}
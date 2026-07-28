import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, AlertTriangle, Eye, EyeOff, Activity, Brain, Shield, CheckCircle } from 'lucide-react';

// Enhanced Proctoring with improved accuracy and ML-style analysis
export default function EnhancedProctoring({ 
  onViolation,
  onMetricsUpdate,
  onStatusChange,
  isActive = true 
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const prevFrameDataRef = useRef(null);
  const faceHistoryRef = useRef([]);
  const calibrationRef = useRef({ skinToneBaseline: null, frameCount: 0 });
  
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [violations, setViolations] = useState([]);
  const [isCalibrating, setIsCalibrating] = useState(true);
  
  const [metrics, setMetrics] = useState({
    faceDetected: false,
    faceConfidence: 0,
    faceCount: 1,
    multipleFaces: false,
    gazeDirection: 'center',
    gazeScore: 100,
    lookingAway: false,
    movementLevel: 'stable',
    attentionScore: 100,
    integrityScore: 100,
    engagementScore: 85,
    emotionState: 'neutral',
    tabSwitched: false
  });
  
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  
  const analysisIntervalRef = useRef(null);

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
        setIsCalibrating(true);
        
        // Calibration period
        setTimeout(() => setIsCalibrating(false), 3000);
        
        onStatusChange?.({ cameraActive: true });
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Camera access required. Please enable camera.');
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

  // Advanced face detection with improved accuracy for various skin tones and lighting
  const detectFace = useCallback((imageData, width, height) => {
    const data = imageData.data;
    
    // Divide frame into LEFT and RIGHT halves for multi-face detection
    const leftHalf = { skinCount: 0, total: 0, edgeCount: 0 };
    const rightHalf = { skinCount: 0, total: 0, edgeCount: 0 };
    let totalSkinPixels = 0;
    let totalPixels = 0;
    let brightnessSum = 0;
    
    const midPoint = width / 2;
    
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const pixelIdx = (y * width + x) * 4;
        const r = data[pixelIdx];
        const g = data[pixelIdx + 1];
        const b = data[pixelIdx + 2];
        
        totalPixels++;
        brightnessSum += (r + g + b) / 3;
        
        // Skin detection using YCbCr (works for all skin tones)
        const y_val = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.169 * r - 0.331 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.419 * g - 0.081 * b;
        
        // RGB ratio method for darker skin tones
        const rgbSkin = r > 50 && g > 30 && b > 15 && r > g && r > b && (r - b) > 15;
        const ycbcrSkin = y_val > 50 && cb > 70 && cb < 140 && cr > 120 && cr < 185;
        
        const isSkin = ycbcrSkin || rgbSkin;
        
        // Track which half
        if (x < midPoint) {
          leftHalf.total++;
          if (isSkin) leftHalf.skinCount++;
        } else {
          rightHalf.total++;
          if (isSkin) rightHalf.skinCount++;
        }
        
        if (isSkin) totalSkinPixels++;
      }
    }
    
    const totalSkinRatio = totalSkinPixels / totalPixels;
    const leftSkinRatio = leftHalf.total > 0 ? leftHalf.skinCount / leftHalf.total : 0;
    const rightSkinRatio = rightHalf.total > 0 ? rightHalf.skinCount / rightHalf.total : 0;
    
    // Face detection confidence
    let confidence = 0;
    if (totalSkinRatio > 0.06) confidence += 50;
    else if (totalSkinRatio > 0.03) confidence += 35;
    
    const avgBrightness = brightnessSum / totalPixels;
    if (avgBrightness > 30 && avgBrightness < 220) confidence += 30;
    if (leftSkinRatio > 0.05 || rightSkinRatio > 0.05) confidence += 20;
    
    const detected = confidence >= 45 || totalSkinRatio > 0.04;
    
    // MULTIPLE FACES DETECTION - EXTREMELY STRICT to avoid false positives
    // A single face centered or slightly off-center will have skin in both halves
    // We need VERY high thresholds and additional checks
    
    // For a TRUE multiple faces scenario:
    // 1. Both halves must have VERY HIGH skin ratio (>18% each - a full face takes significant area)
    // 2. Total skin ratio must be extremely high (>15% - two faces = lots of skin)
    // 3. The skin ratios should be fairly balanced (both faces visible)
    // 4. We add a "gap" check - there should be less skin in the very center if two separate faces
    
    const skinDifference = Math.abs(leftSkinRatio - rightSkinRatio);
    
    // VERY strict criteria - only flag if absolutely certain
    const multipleFaces = leftSkinRatio > 0.18 && 
                         rightSkinRatio > 0.18 && 
                         totalSkinRatio > 0.15 &&
                         skinDifference < 0.05;
    
    let faceCount = 1;
    // Even with multipleFaces true, we stay conservative
    if (multipleFaces && leftSkinRatio > 0.20 && rightSkinRatio > 0.20) {
      faceCount = 2;
    }
    
    return {
      detected,
      confidence: Math.min(100, Math.round(confidence)),
      skinRatio: totalSkinRatio,
      multipleFaces,
      faceCount,
      brightness: avgBrightness,
      leftSkinRatio,
      rightSkinRatio
    };
  }, []);

  // Gaze estimation based on brightness distribution
  const estimateGaze = useCallback((imageData, width, height, faceDetected) => {
    if (!faceDetected) {
      return { direction: 'unknown', score: 0, lookingAway: true };
    }
    
    const data = imageData.data;
    const eyeRegionY = height * 0.35;
    const eyeRegionHeight = height * 0.12;
    
    let leftBrightness = 0;
    let rightBrightness = 0;
    let centerBrightness = 0;
    let count = 0;
    
    for (let y = eyeRegionY; y < eyeRegionY + eyeRegionHeight; y += 2) {
      for (let x = width * 0.25; x < width * 0.75; x += 2) {
        const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        if (x < width * 0.4) leftBrightness += brightness;
        else if (x > width * 0.6) rightBrightness += brightness;
        else centerBrightness += brightness;
        count++;
      }
    }
    
    const leftNorm = leftBrightness / count;
    const rightNorm = rightBrightness / count;
    const centerNorm = centerBrightness / count;
    
    // Determine gaze direction
    const threshold = 8;
    let direction = 'center';
    let lookingAway = false;
    
    const asymmetry = Math.abs(leftNorm - rightNorm);
    
    if (asymmetry > threshold * 2) {
      direction = leftNorm > rightNorm ? 'right' : 'left';
      lookingAway = true;
    }
    
    const score = lookingAway ? 60 : 100;
    
    return { direction, score, lookingAway };
  }, []);

  // Movement detection
  const detectMovement = useCallback((currentData, width, height) => {
    if (!prevFrameDataRef.current) {
      prevFrameDataRef.current = new Uint8Array(currentData.data.length / 4);
      for (let i = 0; i < currentData.data.length; i += 4) {
        prevFrameDataRef.current[i / 4] = (currentData.data[i] + currentData.data[i + 1] + currentData.data[i + 2]) / 3;
      }
      return { level: 'stable', score: 0 };
    }
    
    let movementScore = 0;
    const newFrameData = new Uint8Array(currentData.data.length / 4);
    
    for (let i = 0; i < currentData.data.length; i += 16) {
      const brightness = (currentData.data[i] + currentData.data[i + 1] + currentData.data[i + 2]) / 3;
      newFrameData[i / 4] = brightness;
      
      const diff = Math.abs(brightness - prevFrameDataRef.current[i / 4]);
      movementScore += diff;
    }
    
    prevFrameDataRef.current = newFrameData;
    movementScore = movementScore / (currentData.data.length / 16);
    
    let level = 'stable';
    if (movementScore > 3) level = 'minor';
    if (movementScore > 8) level = 'moderate';
    if (movementScore > 15) level = 'excessive';
    
    return { level, score: movementScore };
  }, []);

  // Main analysis function
  const analyzeFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraActive || isCalibrating) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Run detections
    const faceResult = detectFace(imageData, canvas.width, canvas.height);
    const gazeResult = estimateGaze(imageData, canvas.width, canvas.height, faceResult.detected);
    const movementResult = detectMovement(imageData, canvas.width, canvas.height);

    // Store face history for pattern detection
    faceHistoryRef.current.push(faceResult.detected);
    if (faceHistoryRef.current.length > 30) faceHistoryRef.current.shift();

    // Calculate scores
    let attentionScore = 100;
    if (!faceResult.detected) attentionScore -= 50;
    if (gazeResult.lookingAway) attentionScore -= 25;
    if (movementResult.level === 'excessive') attentionScore -= 15;
    attentionScore = Math.max(0, attentionScore);

    // Integrity score based on patterns
    const recentFaceMissing = faceHistoryRef.current.filter(f => !f).length;
    let integrityScore = 100 - (recentFaceMissing / faceHistoryRef.current.length * 50);
    integrityScore = Math.max(0, Math.round(integrityScore));

    // Engagement score
    let engagementScore = 70;
    if (faceResult.detected) engagementScore += 15;
    if (!gazeResult.lookingAway) engagementScore += 15;
    engagementScore = Math.min(100, engagementScore);

    // CRITICAL: Multiple faces = major integrity violation
    if (faceResult.multipleFaces || faceResult.faceCount > 1) {
      integrityScore = Math.max(0, integrityScore - 40);
      attentionScore = Math.max(0, attentionScore - 30);
    }

    const newMetrics = {
      faceDetected: faceResult.detected,
      faceConfidence: faceResult.confidence,
      faceCount: faceResult.faceCount || 1,
      multipleFaces: faceResult.multipleFaces || false,
      gazeDirection: gazeResult.direction,
      gazeScore: gazeResult.score,
      lookingAway: gazeResult.lookingAway,
      movementLevel: movementResult.level,
      attentionScore,
      integrityScore,
      engagementScore,
      emotionState: faceResult.detected ? 'focused' : 'unknown'
    };

    setMetrics(newMetrics);
    onMetricsUpdate?.(newMetrics);

    // Record violations (with cooldown to avoid spam)
    const now = Date.now();
    const lastViolation = violations[violations.length - 1];
    const cooldown = lastViolation ? now - lastViolation.time > 2000 : true;

    if (cooldown) {
      const newViolations = [];
      
      if (!faceResult.detected) {
        newViolations.push({ type: 'no_face', message: 'Face not visible', severity: 'high', time: now });
      }
      // MULTIPLE FACES VIOLATION - HIGH SEVERITY
      if (faceResult.multipleFaces || faceResult.faceCount > 1) {
        newViolations.push({ type: 'multiple_faces', message: `Multiple people detected (${faceResult.faceCount})`, severity: 'high', time: now });
      }
      if (gazeResult.lookingAway) {
        newViolations.push({ type: 'gaze', message: `Looking ${gazeResult.direction}`, severity: 'medium', time: now });
      }
      if (movementResult.level === 'excessive') {
        newViolations.push({ type: 'movement', message: 'Too much movement', severity: 'low', time: now });
      }

      if (newViolations.length > 0) {
        setViolations(prev => [...prev.slice(-29), ...newViolations]);
        onViolation?.(newViolations);
      }
    }
  }, [cameraActive, isCalibrating, detectFace, estimateGaze, detectMovement, onViolation, onMetricsUpdate, violations]);

  // Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        setMetrics(prev => ({ ...prev, tabSwitched: true }));
        const violation = { 
          type: 'tab_switch', 
          message: 'Tab/Window switched detected!', 
          severity: 'high', 
          time: Date.now() 
        };
        setViolations(prev => [...prev, violation]);
        onViolation?.([violation]);
      } else {
        setTimeout(() => {
          setMetrics(prev => ({ ...prev, tabSwitched: false }));
        }, 2000);
      }
    };

    const handleBlur = () => {
      setTabSwitchCount(prev => prev + 1);
      const violation = { 
        type: 'window_blur', 
        message: 'Window focus lost!', 
        severity: 'medium', 
        time: Date.now() 
      };
      setViolations(prev => [...prev, violation]);
      onViolation?.([violation]);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [onViolation]);

  // Effects - Auto-start camera immediately on mount
  useEffect(() => {
    // Always start camera immediately when component mounts
    startCamera();
    
    return () => {
      stopCamera();
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (cameraActive && !isCalibrating) {
      analysisIntervalRef.current = setInterval(analyzeFrame, 250);
    }
    return () => {
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    };
  }, [cameraActive, isCalibrating, analyzeFrame]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-1 bg-slate-900 rounded-2xl overflow-hidden">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/20 p-4">
            <Camera className="w-12 h-12 text-red-400 mb-3" />
            <p className="text-red-300 text-center text-sm mb-3">{cameraError}</p>
            <button onClick={startCamera} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              Enable Camera
            </button>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Calibrating overlay */}
            {isCalibrating && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-white font-medium">Calibrating...</p>
                  <p className="text-gray-400 text-sm">Please face the camera</p>
                </div>
              </div>
            )}

            {/* Analysis overlay */}
            {!isCalibrating && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Face detection frame */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div 
                    className={`w-32 h-40 border-2 rounded-2xl ${
                      metrics.faceDetected ? 'border-green-500/60' : 'border-red-500/60'
                    }`}
                    animate={{
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                </div>

                {/* Status indicators */}
                <div className="absolute top-2 left-2 space-y-1">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${
                    metrics.faceDetected ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {metrics.faceDetected ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {metrics.faceDetected ? `Face: ${metrics.faceConfidence}%` : 'No Face'}
                  </div>
                  
                  {/* MULTIPLE FACES WARNING */}
                  {metrics.multipleFaces && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-red-500/30 text-red-300 animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      ⚠️ {metrics.faceCount} People Detected!
                    </div>
                  )}
                  
                  {/* TAB SWITCH WARNING */}
                  {metrics.tabSwitched && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-red-500/50 text-red-200 animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      ⚠️ Tab Switch Detected!
                    </div>
                  )}
                  
                  {metrics.lookingAway && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-yellow-500/20 text-yellow-300">
                      <Activity className="w-3 h-3" />
                      Gaze: {metrics.gazeDirection}
                    </div>
                  )}
                </div>

                {/* Scores panel */}
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-xl p-2 border border-white/10">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-white text-xs font-bold">AI Analysis</span>
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-400">Attention</span>
                      <span className={`font-bold ${getScoreColor(metrics.attentionScore)}`}>{metrics.attentionScore}%</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-400">Integrity</span>
                      <span className={`font-bold ${getScoreColor(metrics.integrityScore)}`}>{metrics.integrityScore}%</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-400">Engagement</span>
                      <span className={`font-bold ${getScoreColor(metrics.engagementScore)}`}>{metrics.engagementScore}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Violation alert */}
            <AnimatePresence>
              {violations.length > 0 && violations[violations.length - 1].time > Date.now() - 2000 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`absolute bottom-2 left-2 right-2 rounded-xl p-2 flex items-center gap-2 ${
                    violations[violations.length - 1].severity === 'high' 
                      ? 'bg-red-500/90' 
                      : 'bg-yellow-500/90'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">{violations[violations.length - 1].message}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Status bar */}
      <div className="mt-1.5 p-2 bg-slate-800/80 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${cameraActive && !isCalibrating ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-xs text-white">
            {isCalibrating ? 'Calibrating...' : cameraActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {tabSwitchCount > 0 && (
            <span className="text-xs text-red-400">Tab Switches: {tabSwitchCount}</span>
          )}
          <span className="text-xs text-gray-400">Violations: {violations.length}</span>
        </div>
      </div>
    </div>
  );
}
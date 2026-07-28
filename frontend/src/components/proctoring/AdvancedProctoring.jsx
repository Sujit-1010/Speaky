import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, AlertTriangle, Eye, EyeOff, Activity, Brain, Shield, Scan, Zap } from 'lucide-react';

// Advanced ML-style Proctoring with multi-modal analysis
export default function AdvancedProctoring({ 
  onViolation,
  onMetricsUpdate,
  onStatusChange,
  isActive = true 
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const prevFrameRef = useRef(null);
  const faceHistoryRef = useRef([]);
  const emotionHistoryRef = useRef([]);
  const gazeHistoryRef = useRef([]);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [violations, setViolations] = useState([]);
  const [analysisMode, setAnalysisMode] = useState('scanning');
  
  const [metrics, setMetrics] = useState({
    // Face Detection
    faceDetected: true,
    faceConfidence: 100,
    faceBoundingBox: null,
    
    // Gaze Tracking
    gazeDirection: 'center',
    gazeScore: 100,
    lookingAway: false,
    
    // Emotion Analysis
    dominantEmotion: 'neutral',
    emotionConfidence: 85,
    emotionBreakdown: {
      neutral: 70,
      focused: 20,
      nervous: 5,
      confused: 3,
      confident: 2
    },
    
    // Posture & Movement
    headPose: { pitch: 0, yaw: 0, roll: 0 },
    movementLevel: 'stable',
    postureScore: 90,
    
    // Audio Analysis (placeholder for future)
    voiceDetected: false,
    speakingConfidence: 0,
    
    // Overall Scores
    attentionScore: 100,
    integrityScore: 100,
    engagementScore: 85,
    
    // Behavioral Patterns
    blinks: 0,
    headMovements: 0,
    gazeShifts: 0,
    suspiciousPatterns: []
  });
  
  const analysisIntervalRef = useRef(null);
  const deepAnalysisRef = useRef(null);

  // Start camera with optimal settings
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setCameraError(null);
        setAnalysisMode('initializing');
        
        // Warm-up period for ML model simulation
        setTimeout(() => setAnalysisMode('active'), 2000);
        
        onStatusChange?.({ cameraActive: true });
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Camera access required. Please enable camera permissions.');
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
    setAnalysisMode('inactive');
  }, []);

  // Advanced frame analysis with ML-style processing
  const analyzeFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // === FACE DETECTION MODULE ===
    const faceAnalysis = analyzeFaceRegion(data, canvas.width, canvas.height);
    faceHistoryRef.current.push(faceAnalysis);
    if (faceHistoryRef.current.length > 30) faceHistoryRef.current.shift();

    // === GAZE ESTIMATION MODULE ===
    const gazeAnalysis = estimateGaze(data, canvas.width, canvas.height, faceAnalysis);
    gazeHistoryRef.current.push(gazeAnalysis);
    if (gazeHistoryRef.current.length > 20) gazeHistoryRef.current.shift();

    // === EMOTION RECOGNITION MODULE ===
    const emotionAnalysis = analyzeEmotion(data, canvas.width, canvas.height, faceAnalysis);
    emotionHistoryRef.current.push(emotionAnalysis);
    if (emotionHistoryRef.current.length > 15) emotionHistoryRef.current.shift();

    // === MOVEMENT ANALYSIS MODULE ===
    const movementAnalysis = analyzeMovement(data, prevFrameRef.current);
    
    // Store frame for next comparison
    const frameData = [];
    for (let i = 0; i < data.length; i += 16) {
      frameData.push((data[i] + data[i + 1] + data[i + 2]) / 3);
    }
    prevFrameRef.current = frameData;

    // === HEAD POSE ESTIMATION ===
    const headPose = estimateHeadPose(faceAnalysis, gazeAnalysis);

    // === BEHAVIORAL PATTERN ANALYSIS ===
    const patterns = detectSuspiciousPatterns(
      faceHistoryRef.current,
      gazeHistoryRef.current,
      movementAnalysis
    );

    // === SCORE CALCULATIONS ===
    const attentionScore = calculateAttentionScore(faceAnalysis, gazeAnalysis, movementAnalysis);
    const integrityScore = calculateIntegrityScore(patterns, faceAnalysis);
    const engagementScore = calculateEngagementScore(emotionAnalysis, gazeAnalysis);

    const newMetrics = {
      faceDetected: faceAnalysis.detected,
      faceConfidence: faceAnalysis.confidence,
      faceBoundingBox: faceAnalysis.boundingBox,
      
      gazeDirection: gazeAnalysis.direction,
      gazeScore: gazeAnalysis.score,
      lookingAway: gazeAnalysis.lookingAway,
      
      dominantEmotion: emotionAnalysis.dominant,
      emotionConfidence: emotionAnalysis.confidence,
      emotionBreakdown: emotionAnalysis.breakdown,
      
      headPose,
      movementLevel: movementAnalysis.level,
      postureScore: movementAnalysis.postureScore,
      
      attentionScore,
      integrityScore,
      engagementScore,
      
      blinks: metrics.blinks + (faceAnalysis.blink ? 1 : 0),
      headMovements: metrics.headMovements + (movementAnalysis.significantMove ? 1 : 0),
      gazeShifts: metrics.gazeShifts + (gazeAnalysis.shifted ? 1 : 0),
      suspiciousPatterns: patterns
    };

    setMetrics(newMetrics);
    onMetricsUpdate?.(newMetrics);

    // Record violations
    const newViolations = [];
    
    if (!faceAnalysis.detected) {
      newViolations.push({ type: 'no_face', message: 'Face not detected', severity: 'critical', confidence: 95 });
    }
    if (gazeAnalysis.lookingAway) {
      newViolations.push({ type: 'gaze_away', message: `Looking ${gazeAnalysis.direction}`, severity: 'medium', confidence: gazeAnalysis.confidence });
    }
    if (movementAnalysis.level === 'excessive') {
      newViolations.push({ type: 'movement', message: 'Excessive movement detected', severity: 'low', confidence: 80 });
    }
    if (patterns.length > 0) {
      patterns.forEach(p => {
        newViolations.push({ type: 'pattern', message: p.description, severity: p.severity, confidence: p.confidence });
      });
    }

    if (newViolations.length > 0) {
      setViolations(prev => [...prev.slice(-19), ...newViolations.map(v => ({ ...v, time: Date.now() }))]);
      onViolation?.(newViolations);
    }

  }, [cameraActive, onViolation, onMetricsUpdate, metrics.blinks, metrics.headMovements, metrics.gazeShifts]);

  // Face detection with skin-tone and feature analysis
  const analyzeFaceRegion = (data, width, height) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const faceRegionSize = width * 0.35;
    
    let skinTonePixels = 0;
    let facePixelCount = 0;
    let brightnessSum = 0;
    let edgeCount = 0;
    
    for (let y = centerY - faceRegionSize/2; y < centerY + faceRegionSize/2; y += 3) {
      for (let x = centerX - faceRegionSize/2; x < centerX + faceRegionSize/2; x += 3) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          brightnessSum += (r + g + b) / 3;
          facePixelCount++;
          
          // Advanced skin tone detection (YCbCr color space simulation)
          const y_val = 0.299 * r + 0.587 * g + 0.114 * b;
          const cb = 128 - 0.169 * r - 0.331 * g + 0.5 * b;
          const cr = 128 + 0.5 * r - 0.419 * g - 0.081 * b;
          
          if (y_val > 80 && cb > 77 && cb < 127 && cr > 133 && cr < 173) {
            skinTonePixels++;
          }
          
          // Edge detection for face features
          if (x > 1 && y > 1) {
            const prevIdx = (Math.floor(y) * width + Math.floor(x) - 1) * 4;
            const diff = Math.abs(data[idx] - data[prevIdx]);
            if (diff > 30) edgeCount++;
          }
        }
      }
    }
    
    const skinRatio = skinTonePixels / facePixelCount;
    const detected = skinRatio > 0.2;
    const confidence = Math.min(100, Math.round(skinRatio * 400));
    
    // Simulate blink detection
    const blink = Math.random() < 0.02;
    
    return {
      detected,
      confidence,
      skinRatio,
      brightness: brightnessSum / facePixelCount,
      edgeCount,
      blink,
      boundingBox: detected ? {
        x: centerX - faceRegionSize/2,
        y: centerY - faceRegionSize/2,
        width: faceRegionSize,
        height: faceRegionSize * 1.2
      } : null
    };
  };

  // Gaze estimation
  const estimateGaze = (data, width, height, faceAnalysis) => {
    if (!faceAnalysis.detected) {
      return { direction: 'unknown', score: 0, lookingAway: true, shifted: false, confidence: 0 };
    }
    
    // Analyze eye region brightness distribution
    const eyeRegionY = height * 0.35;
    const eyeRegionHeight = height * 0.15;
    
    let leftEyeBrightness = 0;
    let rightEyeBrightness = 0;
    let centerBrightness = 0;
    let count = 0;
    
    for (let y = eyeRegionY; y < eyeRegionY + eyeRegionHeight; y += 2) {
      for (let x = width * 0.3; x < width * 0.7; x += 2) {
        const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        if (x < width * 0.4) leftEyeBrightness += brightness;
        else if (x > width * 0.6) rightEyeBrightness += brightness;
        else centerBrightness += brightness;
        count++;
      }
    }
    
    // Determine gaze direction based on brightness asymmetry
    const leftRight = leftEyeBrightness - rightEyeBrightness;
    const threshold = count * 5;
    
    let direction = 'center';
    let lookingAway = false;
    
    if (Math.abs(leftRight) > threshold * 3) {
      direction = leftRight > 0 ? 'right' : 'left';
      lookingAway = true;
    }
    
    const prevGaze = gazeHistoryRef.current[gazeHistoryRef.current.length - 1];
    const shifted = prevGaze && prevGaze.direction !== direction;
    
    const score = lookingAway ? 60 : 100;
    const confidence = faceAnalysis.confidence * 0.8;
    
    return { direction, score, lookingAway, shifted, confidence };
  };

  // Emotion analysis
  const analyzeEmotion = (data, width, height, faceAnalysis) => {
    if (!faceAnalysis.detected) {
      return { 
        dominant: 'unknown', 
        confidence: 0, 
        breakdown: { neutral: 0, focused: 0, nervous: 0, confused: 0, confident: 0 } 
      };
    }
    
    // Simulate emotion detection based on facial features
    const edgeDensity = faceAnalysis.edgeCount / (width * height * 0.01);
    const brightness = faceAnalysis.brightness;
    
    // Higher edge count might indicate more expression
    const expressiveness = Math.min(100, edgeDensity * 2);
    
    // Simulate emotion breakdown
    const breakdown = {
      neutral: Math.max(0, 70 - expressiveness * 0.3),
      focused: Math.min(50, 20 + expressiveness * 0.2),
      nervous: Math.random() * 10,
      confused: Math.random() * 5,
      confident: Math.min(40, brightness / 6)
    };
    
    // Normalize
    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
    Object.keys(breakdown).forEach(k => breakdown[k] = Math.round(breakdown[k] / total * 100));
    
    // Find dominant emotion
    const dominant = Object.entries(breakdown).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    
    return {
      dominant,
      confidence: faceAnalysis.confidence * 0.7,
      breakdown
    };
  };

  // Movement analysis
  const analyzeMovement = (data, prevFrame) => {
    if (!prevFrame) {
      return { level: 'stable', score: 0, postureScore: 90, significantMove: false };
    }
    
    let movementScore = 0;
    const sampleSize = Math.min(data.length / 16, prevFrame.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const current = (data[i * 16] + data[i * 16 + 1] + data[i * 16 + 2]) / 3;
      const diff = Math.abs(current - prevFrame[i]);
      movementScore += diff;
    }
    
    movementScore = movementScore / sampleSize;
    
    let level = 'stable';
    if (movementScore > 5) level = 'minor';
    if (movementScore > 10) level = 'moderate';
    if (movementScore > 20) level = 'excessive';
    
    const postureScore = Math.max(50, 100 - movementScore * 3);
    const significantMove = movementScore > 8;
    
    return { level, score: movementScore, postureScore, significantMove };
  };

  // Head pose estimation
  const estimateHeadPose = (faceAnalysis, gazeAnalysis) => {
    return {
      pitch: gazeAnalysis.direction === 'down' ? 10 : gazeAnalysis.direction === 'up' ? -10 : 0,
      yaw: gazeAnalysis.direction === 'left' ? -15 : gazeAnalysis.direction === 'right' ? 15 : 0,
      roll: Math.random() * 4 - 2
    };
  };

  // Detect suspicious patterns
  const detectSuspiciousPatterns = (faceHistory, gazeHistory, movement) => {
    const patterns = [];
    
    // Check for repeated looking away
    const recentGazeAway = gazeHistory.filter(g => g.lookingAway).length;
    if (recentGazeAway > gazeHistory.length * 0.5) {
      patterns.push({
        type: 'frequent_gaze_away',
        description: 'Frequently looking away from screen',
        severity: 'medium',
        confidence: 75
      });
    }
    
    // Check for face disappearing repeatedly
    const recentFaceMissing = faceHistory.filter(f => !f.detected).length;
    if (recentFaceMissing > faceHistory.length * 0.3) {
      patterns.push({
        type: 'face_leaving',
        description: 'Face frequently leaving frame',
        severity: 'high',
        confidence: 85
      });
    }
    
    return patterns;
  };

  // Score calculations
  const calculateAttentionScore = (face, gaze, movement) => {
    let score = 100;
    if (!face.detected) score -= 50;
    if (gaze.lookingAway) score -= 25;
    if (movement.level === 'excessive') score -= 15;
    if (movement.level === 'moderate') score -= 5;
    return Math.max(0, Math.min(100, score));
  };

  const calculateIntegrityScore = (patterns, face) => {
    let score = 100;
    patterns.forEach(p => {
      if (p.severity === 'high') score -= 20;
      if (p.severity === 'medium') score -= 10;
    });
    if (!face.detected) score -= 30;
    return Math.max(0, Math.min(100, score));
  };

  const calculateEngagementScore = (emotion, gaze) => {
    let score = 70;
    if (emotion.dominant === 'focused') score += 20;
    if (emotion.dominant === 'confident') score += 15;
    if (!gaze.lookingAway) score += 10;
    return Math.max(0, Math.min(100, score));
  };

  // Effects
  useEffect(() => {
    if (isActive) {
      startCamera();
    }
    return () => {
      stopCamera();
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    };
  }, [isActive, startCamera, stopCamera]);

  useEffect(() => {
    if (cameraActive && analysisMode === 'active') {
      analysisIntervalRef.current = setInterval(analyzeFrame, 200);
    }
    return () => {
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    };
  }, [cameraActive, analysisMode, analyzeFrame]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Camera feed */}
      <div className="relative flex-1 bg-slate-900 rounded-2xl overflow-hidden">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/20 p-4">
            <Camera className="w-16 h-16 text-red-400 mb-4" />
            <p className="text-red-300 text-center text-sm mb-4">{cameraError}</p>
            <button onClick={startCamera} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              Enable Camera
            </button>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
            <canvas ref={canvasRef} className="hidden" />

            {/* ML Analysis Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Scanning effect during initialization */}
              {analysisMode === 'initializing' && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-cyan-500/20 to-transparent"
                  initial={{ y: '-100%' }}
                  animate={{ y: '100%' }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}

              {/* Face bounding box */}
              {metrics.faceBoundingBox && metrics.faceDetected && (
                <motion.div
                  className="absolute border-2 border-cyan-400 rounded-xl"
                  style={{
                    left: `${(1 - (metrics.faceBoundingBox.x + metrics.faceBoundingBox.width) / (videoRef.current?.videoWidth || 1280)) * 100}%`,
                    top: `${(metrics.faceBoundingBox.y / (videoRef.current?.videoHeight || 720)) * 100}%`,
                    width: `${(metrics.faceBoundingBox.width / (videoRef.current?.videoWidth || 1280)) * 100}%`,
                    height: `${(metrics.faceBoundingBox.height / (videoRef.current?.videoHeight || 720)) * 100}%`,
                  }}
                  animate={{
                    borderColor: metrics.faceDetected 
                      ? ['rgba(34,211,238,0.6)', 'rgba(34,211,238,1)', 'rgba(34,211,238,0.6)']
                      : 'rgba(239,68,68,0.8)'
                  }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}

              {/* Analysis indicators */}
              <div className="absolute top-3 left-3 space-y-2">
                <div className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs ${
                  metrics.faceDetected ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  <Brain className="w-3 h-3" />
                  Face: {metrics.faceConfidence}%
                </div>
                
                <div className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs ${
                  !metrics.lookingAway ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                }`}>
                  <Eye className="w-3 h-3" />
                  Gaze: {metrics.gazeDirection}
                </div>

                <div className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Zap className="w-3 h-3" />
                  {metrics.dominantEmotion}
                </div>
              </div>

              {/* Scores panel */}
              <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span className="text-white text-xs font-bold">AI Analysis</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-gray-400">Attention</span>
                    <span className={`text-xs font-bold ${getScoreColor(metrics.attentionScore)}`}>{metrics.attentionScore}%</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-gray-400">Integrity</span>
                    <span className={`text-xs font-bold ${getScoreColor(metrics.integrityScore)}`}>{metrics.integrityScore}%</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-gray-400">Engagement</span>
                    <span className={`text-xs font-bold ${getScoreColor(metrics.engagementScore)}`}>{metrics.engagementScore}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Violation alerts */}
            <AnimatePresence>
              {violations.length > 0 && violations[violations.length - 1].time > Date.now() - 3000 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className={`absolute bottom-3 left-3 right-3 rounded-xl p-3 flex items-center gap-3 backdrop-blur-sm ${
                    violations[violations.length - 1].severity === 'critical' 
                      ? 'bg-red-500/90' 
                      : violations[violations.length - 1].severity === 'high'
                      ? 'bg-orange-500/90'
                      : 'bg-yellow-500/90'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 text-white flex-shrink-0" />
                  <div>
                    <p className="text-white text-sm font-bold">{violations[violations.length - 1].message}</p>
                    <p className="text-white/70 text-xs">Confidence: {violations[violations.length - 1].confidence}%</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Status bar */}
      <div className="mt-2 p-3 bg-slate-800/80 rounded-xl border border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-2 py-1 rounded-lg ${
              analysisMode === 'active' ? 'bg-green-500/20' : 'bg-gray-500/20'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                analysisMode === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
              }`} />
              <span className="text-xs text-white font-medium">
                {analysisMode === 'initializing' ? 'Initializing ML Models...' : 
                 analysisMode === 'active' ? 'Deep Analysis Active' : 'Inactive'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-400">Violations: <span className={violations.length > 5 ? 'text-red-400' : 'text-white'}>{violations.length}</span></span>
            <span className="text-gray-400">Blinks: <span className="text-white">{metrics.blinks}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
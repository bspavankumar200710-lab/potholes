import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DEMO_SAMPLES, DemoSample } from '../utils/demoData';
import { geminiDetectionService } from '../services/geminiDetectionService';
import { locationService } from '../services/locationService';
import { detectionService } from '../services/detectionService';
import { audioAlertService } from '../services/audioAlertService';
import { DetectionResult, DetectedObject, DetectionMode } from '../types/detection';
import { modalOverlayVariants, modalDialogVariants, buttonPressProps } from '../utils/motion';
import {
  Zap,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Play,
  RotateCcw,
  Sparkles,
  MapPin,
  Eye,
  Info,
  Car,
  Layers,
} from 'lucide-react';

interface DemoModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetectionAdded?: (detectionId: string) => void;
}

export const DemoModeModal: React.FC<DemoModeModalProps> = ({
  isOpen,
  onClose,
  onDetectionAdded,
}) => {
  const [selectedSample, setSelectedSample] = useState<DemoSample>(DEMO_SAMPLES[0]);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isCustomUpload, setIsCustomUpload] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<DetectionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [targetMode, setTargetMode] = useState<DetectionMode>('both');

  useEffect(() => {
    if (!isCustomUpload) {
      setPreviewImage(selectedSample.generateImage());
      setAnalysisResult(null);
      setErrorMsg(null);
      setSavedSuccessId(null);
    }
  }, [selectedSample, isCustomUpload]);

  const handleSelectSample = (sample: DemoSample) => {
    setIsCustomUpload(false);
    setSelectedSample(sample);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPreviewImage(base64);
      setIsCustomUpload(true);
      setAnalysisResult(null);
      setErrorMsg(null);
      setSavedSuccessId(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!previewImage) return;

    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      setAnalysisResult(null);
      setSavedSuccessId(null);

      // Call AI Vision Service with chosen target mode
      const result = await geminiDetectionService.detectRoadProblems(previewImage, 'image/jpeg', targetMode);
      setAnalysisResult(result);

      if (result.detected && result.objects.length > 0) {
        let coords = locationService.getCurrentCoordinates();
        if (!coords) {
          coords = {
            latitude: 12.9716 + (Math.random() - 0.5) * 0.04,
            longitude: 77.5946 + (Math.random() - 0.5) * 0.04,
          };
        }

        let lastId = '';
        for (const obj of result.objects) {
          const locHint = `${coords.latitude.toFixed(4)}°, ${coords.longitude.toFixed(4)}°`;
          if (obj.type === 'vehicle_speed') {
            audioAlertService.announceDetection(
              'vehicle_speed',
              obj.severity,
              `${obj.vehicleType || 'vehicle'} at ${obj.estimatedSpeedKmh || 50} km/h`
            );
          } else {
            audioAlertService.announceDetection(obj.type, obj.severity, locHint);
          }

          const saved = await detectionService.addDetection({
            type: obj.type,
            confidence: obj.confidence,
            severity: obj.severity,
            description: obj.description,
            latitude: coords.latitude,
            longitude: coords.longitude,
            locationName: `${locHint} (Karnataka, India)`,
            imageUrl: previewImage,
            box2d: obj.box2d,
            vehicleType: obj.vehicleType,
            estimatedSpeedKmh: obj.estimatedSpeedKmh,
            speedLimitKmh: obj.speedLimitKmh,
            isOverSpeed: obj.isOverSpeed,
          });
          lastId = saved.id;
        }

        setSavedSuccessId(lastId);
        if (onDetectionAdded && lastId) {
          onDetectionAdded(lastId);
        }
      }
    } catch (err: any) {
      console.error('Demo analysis error:', err);
      setErrorMsg(err.message || 'Detection failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          <motion.div
            variants={modalDialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
          >
            {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-white/20">
              <Zap className="w-5 h-5 text-white" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight">AI ROAD TEST LAB</h3>
                <span className="text-[10px] font-bold bg-white text-blue-700 px-2 py-0.5 rounded-full uppercase">
                  Potholes & Speed
                </span>
              </div>
              <p className="text-[11px] text-blue-100">
                Test precision detection for potholes and moving car/scooter speeds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Target mode filter */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Select Detection Target:
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setTargetMode('both')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  targetMode === 'both' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                All (Potholes & Speed)
              </button>
              <button
                onClick={() => setTargetMode('potholes')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  targetMode === 'potholes' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                🕳️ Potholes Only
              </button>
              <button
                onClick={() => setTargetMode('speed')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  targetMode === 'speed' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                🏎️ Vehicle Speed Only
              </button>
            </div>
          </div>

          {/* Preset Samples */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Select Road Condition Sample:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  className={`p-2.5 rounded-xl text-left border transition-all text-xs flex flex-col gap-1 ${
                    !isCustomUpload && selectedSample.id === sample.id
                      ? 'border-blue-500 bg-blue-50/70 text-blue-950 font-bold shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="capitalize">{sample.badge}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${
                        sample.severity === 'high'
                          ? 'bg-red-100 text-red-700'
                          : sample.severity === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {sample.severity}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal line-clamp-1">
                    {sample.expectedHazard}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Or Upload Custom Image */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-500 font-medium">Or upload custom photo:</span>
            <label className="cursor-pointer py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Choose Photo</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Preview Image Frame */}
          <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-900 aspect-video flex items-center justify-center">
            {previewImage ? (
              <img
                src={previewImage}
                alt="Demo road snapshot"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-slate-400">No image selected</span>
            )}

            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-mono text-white flex items-center gap-1">
              <Eye className="w-3 h-3 text-cyan-400" />
              {isCustomUpload ? 'Custom Upload' : selectedSample.name}
            </div>
          </div>

          {/* AI Detection Result Display */}
          {analysisResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-2 animate-in fade-in duration-200 ${
                analysisResult.detected
                  ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold flex items-center gap-1.5 text-sm">
                  {analysisResult.detected ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Detected Objects ({analysisResult.objects.length})
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Clean Road Surface (No Object Detected)
                    </>
                  )}
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  {analysisResult.latencyMs}ms • {analysisResult.modelUsed}
                </span>
              </div>

              {analysisResult.objects.map((obj, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-white/90 border border-slate-200 text-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase text-slate-900 flex items-center gap-1">
                      {obj.type === 'vehicle_speed' ? '🏎️ Vehicle Speed' : obj.type === 'pothole' ? '🕳️ Pothole' : '⚡ Road Crack'}
                    </span>
                    {obj.estimatedSpeedKmh ? (
                      <span className="text-xs font-mono font-bold text-blue-600">
                        {obj.estimatedSpeedKmh} km/h
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {Math.round(obj.confidence * 100)}% conf
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">{obj.description}</p>
                </div>
              ))}

              {savedSuccessId && (
                <div className="p-2 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Saved to Cloud Firestore & IndexedDB with photo snapshot</span>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl text-slate-600 hover:bg-slate-200 font-semibold text-xs transition-colors"
          >
            Close
          </button>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !previewImage}
            className="flex-1 py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Analyzing Image with AI...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run AI Detection Test</span>
              </>
            )}
          </button>
        </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

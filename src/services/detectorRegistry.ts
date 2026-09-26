import { IAIDetectionService } from './aiDetectionService';
import { geminiDetectionService } from './geminiDetectionService';
import { yoloV8DetectionService } from './yoloV8DetectionService';

export function getActiveDetector(modelType: 'gemini-vision' | 'yolov8-nano' = 'gemini-vision'): IAIDetectionService {
  if (modelType === 'yolov8-nano' && yoloV8DetectionService.isReady) {
    return yoloV8DetectionService;
  }
  return geminiDetectionService;
}

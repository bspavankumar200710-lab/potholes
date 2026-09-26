import { DetectionResult } from '../types/detection';

/**
 * Common AI Detection Service Contract
 * Designed so detection backends (Gemini Vision, future YOLOv8-nano, etc.)
 * can be swapped interchangeably without altering camera, dashboard, or map UI.
 */
export interface IAIDetectionService {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly isReady: boolean;
  detectRoadProblems(imageBase64: string, mimeType?: string): Promise<DetectionResult>;
}

export type SupportedDetectorModel = 'gemini-vision' | 'yolov8-nano';

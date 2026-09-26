import { IAIDetectionService } from './aiDetectionService';
import { DetectionResult } from '../types/detection';

/**
 * =========================================================================
 * FUTURE INTEGRATION: YOLOv8-nano Edge Detector
 * =========================================================================
 *
 * This module is reserved for on-device inference using YOLOv8-nano via ONNX
 * Runtime Web (WebAssembly / WebGL / WebGPU).
 *
 * Steps required for integration:
 * 1. Train YOLOv8-nano on road surface datasets (e.g. RDD2022 / CRDDC2022):
 *    Classes: [0: 'pothole', 1: 'road_crack', 2: 'broken_sign']
 * 2. Export model:
 *    yolo export model=yolov8n-road.pt format=onnx imgsz=640 opset=12 simplify=True
 * 3. Add 'onnxruntime-web' dependency:
 *    npm i onnxruntime-web
 * 4. Load the session:
 *    const session = await ort.InferenceSession.create('/models/yolov8n-road.onnx', {
 *      executionProviders: ['webgpu', 'wasm']
 *    });
 * 5. Preprocess video frames into Float32Array tensor [1, 3, 640, 640].
 * 6. Run session.run({ images: tensor }) and apply Non-Maximum Suppression (NMS).
 *
 * Note: Per project guidelines, we explicitly flag this as not yet loaded
 * and do not simulate fake detection to maintain integrity.
 */
export class YOLOv8DetectionService implements IAIDetectionService {
  public readonly id = 'yolov8-nano';
  public readonly name = 'YOLOv8-nano (Edge ONNX - Coming Soon)';
  public readonly version = 'v0.9-draft';
  public readonly isReady = false; // Not integrated yet

  public async detectRoadProblems(
    _imageBase64: string,
    _mimeType?: string
  ): Promise<DetectionResult> {
    throw new Error(
      'YOLOv8-nano is scheduled for the on-device edge release. Please use the active Gemini Vision detector.'
    );
  }
}

export const yoloV8DetectionService = new YOLOv8DetectionService();

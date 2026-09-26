export type DetectionMode = 'both' | 'potholes' | 'speed';

export type HazardType = 'pothole' | 'road_crack' | 'broken_sign' | 'vehicle_speed';
export type SeverityLevel = 'low' | 'medium' | 'high';
export type VehicleType = 'car' | 'scooter' | 'motorcycle' | 'auto' | 'truck' | 'bus';

export interface DetectedObject {
  type: HazardType;
  confidence: number;
  severity: SeverityLevel;
  description: string;
  box2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
  // Vehicle / Scooter speed estimation properties
  vehicleType?: VehicleType;
  estimatedSpeedKmh?: number;
  speedLimitKmh?: number;
  isOverSpeed?: boolean;
}

export interface DetectionResult {
  detected: boolean;
  objects: DetectedObject[];
  latencyMs?: number;
  modelUsed?: string;
  rawResponse?: string;
}

export interface RoadHazardRecord {
  id: string;
  userId?: string;
  type: HazardType;
  confidence: number;
  severity: SeverityLevel;
  description: string;
  latitude: number | null;
  longitude: number | null;
  locationName?: string;
  timestamp: string;
  imageUrl?: string;
  box2d?: [number, number, number, number];
  // Vehicle / Scooter speed estimation
  vehicleType?: VehicleType;
  estimatedSpeedKmh?: number;
  speedLimitKmh?: number;
  isOverSpeed?: boolean;
}

export type GPSStatus = 'prompt' | 'requesting' | 'connected' | 'denied' | 'unavailable' | 'demo';
export type CameraStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'error' | 'demo';

export interface MonitoringStats {
  total: number;
  potholes: number;
  roadCracks: number;
  brokenSigns: number;
  speedDetections: number;
  highSeverity: number;
  today: number;
}

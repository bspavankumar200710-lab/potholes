import { RoadHazardRecord, MonitoringStats, AILearningStats, HazardType } from '../types/detection';
import { indexedDBService } from './indexedDBService';
import { db, auth } from './firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { agentLearningService } from './agentLearningService';

const STORAGE_KEY = 'roadguard_detection_records';
const AI_STATS_KEY = 'roadguard_ai_learning_stats';

type DetectionListener = (records: RoadHazardRecord[]) => void;
type AILearningListener = (stats: AILearningStats) => void;

class DetectionService {
  private cache: RoadHazardRecord[] = [];
  private listeners: Set<DetectionListener> = new Set();
  private learningListeners: Set<AILearningListener> = new Set();
  private isInitialized = false;
  private unsubscribeFirestore: (() => void) | null = null;

  // AI Learning Loop State
  private aiStats: AILearningStats = {
    totalFeedbackCount: 0,
    confirmedCount: 0,
    disputedCount: 0,
    modelAccuracy: 95.2,
    modelIteration: 'Gemini-3.8-Flash-RLHF-v2.6',
    lastFeedbackTime: null,
    typeWeights: {
      pothole: 1.0,
      road_crack: 0.95,
      broken_sign: 0.92,
      vehicle_speed: 0.98,
      other_hazard: 0.88,
    },
  };

  constructor() {
    this.loadAiStats();
    this.init();
    this.setupNetworkListeners();
    this.setupFirestoreListener();
  }

  private loadAiStats() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(AI_STATS_KEY);
        if (stored) {
          this.aiStats = { ...this.aiStats, ...JSON.parse(stored) };
        }
      } catch (e) {
        console.warn('Could not read AI learning stats:', e);
      }
    }
  }

  private saveAiStats() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(AI_STATS_KEY, JSON.stringify(this.aiStats));
      } catch (e) {}
    }
    this.notifyLearning();
  }

  private notifyLearning() {
    for (const listener of this.learningListeners) {
      listener({ ...this.aiStats });
    }
  }

  public subscribeLearning(listener: AILearningListener): () => void {
    this.learningListeners.add(listener);
    listener({ ...this.aiStats });
    return () => this.learningListeners.delete(listener);
  }

  public getAILearningStats(): AILearningStats {
    return { ...this.aiStats };
  }

  private setupFirestoreListener() {
    try {
      const detectionsCol = collection(db, 'detections');
      const q = query(detectionsCol, orderBy('timestamp', 'desc'), limit(150));
      this.unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const firestoreRecords: RoadHazardRecord[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as RoadHazardRecord;
              firestoreRecords.push(data);
            });

            // Merge with local records
            const idMap = new Map<string, RoadHazardRecord>();
            for (const item of firestoreRecords) idMap.set(item.id, item);
            for (const item of this.cache) {
              if (!idMap.has(item.id)) idMap.set(item.id, item);
            }
            this.cache = Array.from(idMap.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            indexedDBService.saveBulk(this.cache);
            this.saveToLocalStorage();
            this.notify();
          }
        },
        (error) => {
          console.warn('Firestore live detections sync note:', error.message);
        }
      );
    } catch (e) {
      console.warn('Could not initialize Firestore realtime listener:', e);
    }
  }

  private setupNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        indexedDBService.flushSyncQueue();
        this.fetchFromServer();
      });
    }
  }

  private async init() {
    // 1. First priority: Load from IndexedDB
    try {
      const idbRecords = await indexedDBService.getAll();
      if (idbRecords && idbRecords.length > 0) {
        this.cache = idbRecords;
        this.notify();
      }
    } catch (e) {
      console.warn('Could not read IndexedDB on init:', e);
    }

    // 2. Second priority: LocalStorage
    if (this.cache.length === 0 && typeof window !== 'undefined') {
      try {
        const localData = localStorage.getItem(STORAGE_KEY);
        if (localData) {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.cache = parsed;
            this.notify();
            await indexedDBService.saveBulk(parsed);
          }
        }
      } catch (err) {
        console.warn('LocalStorage initialization warning:', err);
      }
    }

    // 3. Third priority: Cloud database or Server seed
    await this.fetchFromServer();
    this.isInitialized = true;
  }

  public subscribe(listener: DetectionListener): () => void {
    this.listeners.add(listener);
    listener([...this.cache]);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener([...this.cache]);
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  public async fetchFromServer(): Promise<RoadHazardRecord[]> {
    // Attempt Firestore first
    try {
      const detectionsCol = collection(db, 'detections');
      const snap = await getDocs(query(detectionsCol, orderBy('timestamp', 'desc'), limit(100)));
      if (!snap.empty) {
        const firestoreList: RoadHazardRecord[] = [];
        snap.forEach((docSnap) => firestoreList.push(docSnap.data() as RoadHazardRecord));
        const idMap = new Map<string, RoadHazardRecord>();
        for (const item of firestoreList) idMap.set(item.id, item);
        for (const item of this.cache) {
          if (!idMap.has(item.id)) idMap.set(item.id, item);
        }
        this.cache = Array.from(idMap.values());
        await indexedDBService.saveBulk(this.cache);
        this.saveToLocalStorage();
        return this.cache;
      }
    } catch (fsErr) {
      console.warn('Firestore fetch fallback to Express API:', fsErr);
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return this.cache;
    }

    try {
      const res = await fetch('/api/detections');
      if (res.ok) {
        const serverRecords: RoadHazardRecord[] = await res.json();
        if (Array.isArray(serverRecords) && serverRecords.length > 0) {
          const idMap = new Map<string, RoadHazardRecord>();
          for (const item of serverRecords) idMap.set(item.id, item);
          for (const item of this.cache) {
            if (!idMap.has(item.id)) idMap.set(item.id, item);
          }
          this.cache = Array.from(idMap.values()).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          await indexedDBService.saveBulk(this.cache);
          this.saveToLocalStorage();
        }
      }
    } catch (err) {
      console.warn('Could not fetch server detections:', err);
    }

    return this.cache;
  }

  public async addDetection(recordData: Omit<RoadHazardRecord, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): Promise<RoadHazardRecord> {
    const id = recordData.id || `hazard_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const userId = auth.currentUser?.uid || undefined;

    const record: RoadHazardRecord = {
      id,
      userId,
      type: recordData.type,
      confidence: recordData.confidence,
      severity: recordData.severity,
      description: recordData.description,
      latitude: recordData.latitude,
      longitude: recordData.longitude,
      locationName: recordData.locationName,
      timestamp: recordData.timestamp || new Date().toISOString(),
      imageUrl: recordData.imageUrl,
      box2d: recordData.box2d,
      vehicleType: recordData.vehicleType,
      estimatedSpeedKmh: recordData.estimatedSpeedKmh,
      speedLimitKmh: recordData.speedLimitKmh,
      isOverSpeed: recordData.isOverSpeed,
      verifiedStatus: recordData.verifiedStatus || 'unverified',
      learnedAccuracyScore: recordData.learnedAccuracyScore || recordData.confidence,
    };

    // 1. Immediately insert into in-memory cache
    this.cache.unshift(record);

    // 2. Persist to IndexedDB and LocalStorage
    await indexedDBService.save(record);
    this.saveToLocalStorage();
    this.notify();

    // 3. Persist to Firestore database
    try {
      const docRef = doc(db, 'detections', record.id);
      await setDoc(docRef, record);
    } catch (fsErr) {
      console.warn('Failed to save to Firestore immediately, trying fallback or queue:', fsErr);
    }

    // 4. Sync to Express backend as additional redundancy
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      fetch('/api/detections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      }).catch((err) => {
        indexedDBService.queueSync('add', record);
      });
    } else {
      indexedDBService.queueSync('add', record);
    }

    return record;
  }

  // ============================================================
  // AI LEARNING LOOP MECHANISM: CONFIRM / DISPUTE HAZARD
  // ============================================================

  /**
   * Confirms a detected hazard (User says: "Yes, this is real").
   * Updates local metadata, reinforces model confidence, and sends simulated feedback telemetry to backend.
   */
  public async confirmHazard(id: string, userNotes?: string): Promise<RoadHazardRecord | null> {
    const record = this.cache.find((r) => r.id === id);
    if (!record) return null;

    const userIdentifier = auth.currentUser?.email || auth.currentUser?.displayName || 'Active Driver';
    const now = new Date().toISOString();

    // 1. Update record fields
    record.verifiedStatus = 'confirmed';
    record.verifiedAt = now;
    record.verifiedBy = userIdentifier;
    record.learnedAccuracyScore = Math.min(0.998, Math.round(((record.confidence || 0.90) + 0.05) * 1000) / 1000);
    record.aiLearningFeedbackSent = true;

    // 2. Update AI Learning Loop Stats
    this.aiStats.confirmedCount += 1;
    this.aiStats.totalFeedbackCount += 1;
    this.aiStats.lastFeedbackTime = now;
    this.aiStats.modelAccuracy = Math.min(
      99.7,
      Math.round((95.0 + this.aiStats.confirmedCount * 0.35 - this.aiStats.disputedCount * 0.45) * 10) / 10
    );

    const currentWeight = this.aiStats.typeWeights[record.type] || 1.0;
    this.aiStats.typeWeights[record.type] = Math.min(1.25, Math.round((currentWeight + 0.04) * 100) / 100);
    this.saveAiStats();

    // 3. Persist updated record locally
    await indexedDBService.save(record);
    this.saveToLocalStorage();
    this.notify();

    // 4. Update in Firestore
    try {
      const docRef = doc(db, 'detections', record.id);
      await setDoc(docRef, record, { merge: true });
    } catch (e) {
      console.warn('Firestore confirm update note:', e);
    }

    // 5. Send simulated feedback telemetry to AI Learning Loop endpoint
    try {
      fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detectionId: record.id,
          action: 'confirm',
          hazardType: record.type,
          notes: userNotes || 'Driver verified hazard presence on road',
          timestamp: now,
          driver: userIdentifier,
        }),
      }).catch(() => {});
    } catch (e) {}

    return { ...record };
  }

  /**
   * Disputes a detected hazard (User says: "No, this was a false positive / mistake").
   * Updates local metadata, applies suppression penalty, teaches the visual agent, and sends telemetry.
   */
  public async disputeHazard(
    id: string,
    reason: string,
    actualCategory?: 'shadow' | 'manhole' | 'water_puddle' | 'paint_marking' | 'speed_breaker' | 'normal_road' | 'other_hazard'
  ): Promise<RoadHazardRecord | null> {
    const record = this.cache.find((r) => r.id === id);
    if (!record) return null;

    const userIdentifier = auth.currentUser?.email || auth.currentUser?.displayName || 'Active Driver';
    const now = new Date().toISOString();

    // 1. Update record fields
    record.verifiedStatus = 'disputed';
    record.verifiedAt = now;
    record.verifiedBy = userIdentifier;
    record.disputeReason = reason || actualCategory || 'False positive';
    record.learnedAccuracyScore = Math.max(0.12, Math.round(((record.confidence || 0.90) - 0.45) * 1000) / 1000);
    record.aiLearningFeedbackSent = true;

    // 2. Update AI Learning Loop Stats
    this.aiStats.disputedCount += 1;
    this.aiStats.totalFeedbackCount += 1;
    this.aiStats.lastFeedbackTime = now;
    this.aiStats.modelAccuracy = Math.max(
      88.5,
      Math.round((95.0 + this.aiStats.confirmedCount * 0.35 - this.aiStats.disputedCount * 0.45) * 10) / 10
    );

    const currentWeight = this.aiStats.typeWeights[record.type] || 1.0;
    this.aiStats.typeWeights[record.type] = Math.max(0.60, Math.round((currentWeight - 0.08) * 100) / 100);
    this.saveAiStats();

    // 3. Feed into agentLearningService so prompt directives automatically update
    if (actualCategory) {
      agentLearningService.teachMistake(
        record.type,
        actualCategory,
        `Disputed by driver: ${reason || actualCategory}. Adjusted model bias.`
      );
    }

    // 4. Persist updated record locally
    await indexedDBService.save(record);
    this.saveToLocalStorage();
    this.notify();

    // 5. Update in Firestore
    try {
      const docRef = doc(db, 'detections', record.id);
      await setDoc(docRef, record, { merge: true });
    } catch (e) {
      console.warn('Firestore dispute update note:', e);
    }

    // 6. Send simulated feedback telemetry to AI Learning Loop endpoint
    try {
      fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detectionId: record.id,
          action: 'dispute',
          hazardType: record.type,
          reason,
          actualCategory,
          timestamp: now,
          driver: userIdentifier,
        }),
      }).catch(() => {});
    } catch (e) {}

    return { ...record };
  }

  public async deleteDetection(id: string): Promise<boolean> {
    this.cache = this.cache.filter((item) => item.id !== id);
    await indexedDBService.delete(id);
    this.saveToLocalStorage();
    this.notify();

    // Delete in Firestore
    try {
      await deleteDoc(doc(db, 'detections', id));
    } catch (fsErr) {
      console.warn('Firestore delete error:', fsErr);
    }

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      fetch(`/api/detections/${id}`, { method: 'DELETE' }).catch(() => {
        indexedDBService.queueSync('delete', undefined, id);
      });
    } else {
      indexedDBService.queueSync('delete', undefined, id);
    }

    return true;
  }

  public async clearAll(): Promise<void> {
    const idsToDelete = this.cache.map((c) => c.id);
    this.cache = [];
    await indexedDBService.clearAll();
    this.saveToLocalStorage();
    this.notify();

    for (const id of idsToDelete) {
      deleteDoc(doc(db, 'detections', id)).catch(() => {});
    }

    try {
      fetch('/api/detections', { method: 'DELETE' }).catch(() => {});
    } catch (e) {}
  }

  public getAll(): RoadHazardRecord[] {
    return [...this.cache];
  }

  public getStats(): MonitoringStats {
    const total = this.cache.length;
    const potholes = this.cache.filter((d) => d.type === 'pothole').length;
    const cracks = this.cache.filter((d) => d.type === 'road_crack').length;
    const brokenSigns = this.cache.filter((d) => d.type === 'broken_sign').length;
    const speedDetections = this.cache.filter((d) => d.type === 'vehicle_speed').length;
    const highSeverity = this.cache.filter((d) => d.severity === 'high').length;
    const today = this.cache.filter((d) => {
      const date = new Date(d.timestamp);
      const now = new Date();
      return (
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }).length;

    return {
      total,
      potholes,
      roadCracks: cracks,
      brokenSigns,
      speedDetections,
      highSeverity,
      today,
    };
  }
}

export const detectionService = new DetectionService();

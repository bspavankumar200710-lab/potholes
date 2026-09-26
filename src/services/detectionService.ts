import { RoadHazardRecord, MonitoringStats } from '../types/detection';
import { indexedDBService } from './indexedDBService';
import { db, auth } from './firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';

const STORAGE_KEY = 'roadguard_detection_records';

type DetectionListener = (records: RoadHazardRecord[]) => void;

class DetectionService {
  private cache: RoadHazardRecord[] = [];
  private listeners: Set<DetectionListener> = new Set();
  private isInitialized = false;
  private unsubscribeFirestore: (() => void) | null = null;

  constructor() {
    this.init();
    this.setupNetworkListeners();
    this.setupFirestoreListener();
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

    // 2. Fallback check: localStorage
    if (this.cache.length === 0) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          this.cache = JSON.parse(stored);
          indexedDBService.saveBulk(this.cache);
          this.notify();
        }
      } catch (e) {
        console.warn('Could not read localStorage for roadguard detections:', e);
      }
    }

    // 3. Fetch from Firestore / server API
    await this.fetchFromServer();
    this.isInitialized = true;
    this.notify();

    // 4. Flush offline changes
    indexedDBService.flushSyncQueue();
  }

  public subscribe(listener: DetectionListener): () => void {
    this.listeners.add(listener);
    listener([...this.cache]);
    return () => {
      this.listeners.delete(listener);
    };
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
      locationName:
        recordData.locationName ||
        (recordData.latitude && recordData.longitude
          ? `${recordData.latitude.toFixed(4)}°, ${recordData.longitude.toFixed(4)}°`
          : 'Location unavailable'),
      timestamp: recordData.timestamp || new Date().toISOString(),
      imageUrl: recordData.imageUrl,
      box2d: recordData.box2d,
      vehicleType: recordData.vehicleType,
      estimatedSpeedKmh: recordData.estimatedSpeedKmh,
      speedLimitKmh: recordData.speedLimitKmh,
      isOverSpeed: recordData.isOverSpeed,
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

import React, { useState, useEffect } from 'react';
import { Navigation, NavigationTab } from './components/Navigation';
import { DashboardPage } from './pages/DashboardPage';
import { MonitorPage } from './pages/MonitorPage';
import { MapPage } from './pages/MapPage';
import { HistoryPage } from './pages/HistoryPage';
import { DemoModeModal } from './components/DemoModeModal';
import { UserAuthButton } from './components/UserAuthButton';
import { AuthProvider } from './contexts/AuthContext';
import { detectionService } from './services/detectionService';
import { locationService, LocationCoordinates } from './services/locationService';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { RoadHazardRecord, MonitoringStats } from './types/detection';
import { WebsiteFooter } from './components/WebsiteFooter';
import {
  Zap,
  WifiOff,
  Database,
  LayoutDashboard,
  Camera,
  MapPin,
  History,
  ShieldAlert,
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [detections, setDetections] = useState<RoadHazardRecord[]>([]);
  const [stats, setStats] = useState<MonitoringStats>({
    total: 0,
    potholes: 0,
    roadCracks: 0,
    brokenSigns: 0,
    speedDetections: 0,
    highSeverity: 0,
    today: 0,
  });
  const [userCoords, setUserCoords] = useState<LocationCoordinates | null>(null);
  const [selectedMapHazardId, setSelectedMapHazardId] = useState<string | null>(null);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);
  const isOnline = useNetworkStatus();

  // Subscribe to detection records (backed by Cloud Firestore & IndexedDB)
  useEffect(() => {
    const unsub = detectionService.subscribe((records) => {
      setDetections(records);
      setStats(detectionService.getStats());
    });
    return unsub;
  }, []);

  // Subscribe to GPS coordinates and auto-initiate tracking
  useEffect(() => {
    const unsub = locationService.subscribe((coords) => {
      setUserCoords(coords);
    });
    locationService.startTracking().catch(() => {});
    return unsub;
  }, []);

  const handleStartMonitoring = () => {
    setIsMonitoring(true);
    setCurrentTab('monitor');
  };

  const handleToggleMonitoring = (start: boolean) => {
    setIsMonitoring(start);
  };

  const handleNavigateToMap = (hazardId?: string) => {
    if (hazardId) {
      setSelectedMapHazardId(hazardId);
    }
    setCurrentTab('map');
  };

  const handleNavigateToHistory = () => {
    setCurrentTab('history');
  };

  return (
    <AuthProvider>
      <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-blue-500 selection:text-white">
        {/* Offline / Poor Cellular Connectivity Status Banner */}
        {!isOnline && (
          <div className="bg-amber-600 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-between z-50 sticky top-0 shadow-md">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 animate-pulse" />
              <span>Offline Mode: Poor cellular connectivity</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] bg-amber-700/60 px-2 py-0.5 rounded-full font-mono">
              <Database className="w-3 h-3" />
              <span>IndexedDB Cache</span>
            </div>
          </div>
        )}

        {/* Global Responsive Top Navigation Header (Desktop and Mobile) */}
        {(
          <header className={`bg-white/95 backdrop-blur-md px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3 border-b border-slate-200/90 sticky top-0 z-40 shadow-sm transition-all ${
            currentTab === 'monitor' ? 'hidden' : 'block'
          }`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              {/* App Brand Logo & Title */}
              <div
                onClick={() => setCurrentTab('dashboard')}
                className="flex items-center gap-2 cursor-pointer group select-none shrink-0"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <span className="text-sm sm:text-base leading-none">🛡️</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm sm:text-base tracking-tight text-slate-900">
                      ROADGUARD
                    </span>
                    <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                      AI Vision & Radar
                    </span>
                  </div>
                  <p className="hidden md:block text-[10px] text-slate-400 font-medium">
                    Road Hazard & Speed Detection Platform
                  </p>
                </div>
              </div>

              {/* Desktop Centered Nav Links (Hidden on small mobile screens) */}
              <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80">
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    currentTab === 'dashboard'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => setCurrentTab('monitor')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    currentTab === 'monitor'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <div className="relative">
                    <Camera className="w-3.5 h-3.5" />
                    {isMonitoring && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    )}
                  </div>
                  <span>Monitor</span>
                  {isMonitoring && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded font-mono">
                      LIVE
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setCurrentTab('map')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    currentTab === 'map'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Map</span>
                </button>

                <button
                  onClick={() => setCurrentTab('history')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    currentTab === 'history'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>History</span>
                  {detections.length > 0 && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full font-bold">
                      {detections.length}
                    </span>
                  )}
                </button>
              </nav>

              {/* Right Side Actions: Test Lab & Auth */}
              <div className="flex items-center gap-1.5 sm:gap-3">
                {/* Lab Button */}
                <button
                  onClick={() => setIsDemoModalOpen(true)}
                  className="py-1 px-2.5 sm:px-3 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs flex items-center gap-1 transition-all shadow-sm active:scale-95 shrink-0"
                  title="Open AI Detection Test Lab"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500 shrink-0" />
                  <span className="hidden sm:inline">AI Test </span>
                  <span>Lab</span>
                </button>

                {/* Google Account Authentication Button */}
                <UserAuthButton />
              </div>
            </div>
          </header>
        )}

        {/* Responsive Content Container */}
        <main className="flex-1 flex flex-col w-full mx-auto relative bg-slate-50 min-h-0">
          {currentTab === 'dashboard' && (
            <div className="w-full flex-1 flex flex-col">
              <DashboardPage
                stats={stats}
                recentDetections={detections}
                isMonitoring={isMonitoring}
                onStartMonitoring={handleStartMonitoring}
                onNavigateToMap={handleNavigateToMap}
                onNavigateToHistory={handleNavigateToHistory}
                onOpenDemo={() => setIsDemoModalOpen(true)}
              />
            </div>
          )}

          {currentTab === 'monitor' && (
            <div className="w-full h-[100dvh] max-w-5xl mx-auto flex flex-col flex-1">
              <MonitorPage
                isMonitoring={isMonitoring}
                onToggleMonitoring={handleToggleMonitoring}
                onOpenDemo={() => setIsDemoModalOpen(true)}
              />
            </div>
          )}

          {currentTab === 'map' && (
            <div className="w-full flex-1 flex flex-col h-[calc(100dvh-55px)] md:h-[calc(100vh-65px)]">
              <MapPage
                detections={detections}
                userCoords={userCoords}
                selectedDetectionId={selectedMapHazardId}
                onOpenDemo={() => setIsDemoModalOpen(true)}
              />
            </div>
          )}

          {currentTab === 'history' && (
            <div className="w-full flex-1 flex flex-col">
              <HistoryPage
                detections={detections}
                onNavigateToMap={handleNavigateToMap}
                onOpenDemo={() => setIsDemoModalOpen(true)}
              />
            </div>
          )}
        </main>

        {/* Global Website Footer (Shown on Desktop md: screens, hidden on mobile for clean app experience) */}
        {currentTab !== 'monitor' && currentTab !== 'map' && (
          <div className="hidden md:block">
            <WebsiteFooter
              onNavigate={(tab) => {
                setCurrentTab(tab);
                if (tab !== 'map') setSelectedMapHazardId(null);
              }}
              onOpenDemo={() => setIsDemoModalOpen(true)}
            />
          </div>
        )}

        {/* Persistent Bottom Mobile Navigation (Hidden on desktop md:) */}
        <Navigation
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'map') {
              setSelectedMapHazardId(null);
            }
          }}
          isMonitoring={isMonitoring}
          unreadCount={detections.length}
        />

        {/* Development Demo Mode Modal */}
        <DemoModeModal
          isOpen={isDemoModalOpen}
          onClose={() => setIsDemoModalOpen(false)}
          onDetectionAdded={(hazardId) => {
            setSelectedMapHazardId(hazardId);
          }}
        />
      </div>
    </AuthProvider>
  );
}

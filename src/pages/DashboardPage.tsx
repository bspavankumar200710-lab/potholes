import React from 'react';
import { RoadHazardRecord, MonitoringStats } from '../types/detection';
import {
  AlertTriangle,
  Camera,
  MapPin,
  TrendingUp,
  Activity,
  Flame,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Gauge,
  Layers,
  Car,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { HazardTrendLineChart } from '../components/HazardTrendLineChart';
import { WebsiteFeatureSection } from '../components/WebsiteFeatureSection';

interface DashboardPageProps {
  stats: MonitoringStats;
  recentDetections: RoadHazardRecord[];
  isMonitoring: boolean;
  onStartMonitoring: () => void;
  onNavigateToMap: (detectionId?: string) => void;
  onNavigateToHistory: () => void;
  onOpenDemo: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  recentDetections,
  isMonitoring,
  onStartMonitoring,
  onNavigateToMap,
  onNavigateToHistory,
  onOpenDemo,
}) => {
  const { userProfile, updatePreferredMode } = useAuth();
  const potholePercent = stats.total > 0 ? Math.round((stats.potholes / stats.total) * 100) : 0;
  const speedPercent = stats.total > 0 ? Math.round((stats.speedDetections / stats.total) * 100) : 0;
  const crackPercent = stats.total > 0 ? Math.round((stats.roadCracks / stats.total) * 100) : 0;
  const signPercent = stats.total > 0 ? Math.round((stats.brokenSigns / stats.total) * 100) : 0;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pothole':
        return { emoji: '🕳️', label: 'Pothole', color: 'text-rose-600 bg-rose-50' };
      case 'vehicle_speed':
        return { emoji: '🏎️', label: 'Vehicle Speed', color: 'text-blue-600 bg-blue-50' };
      case 'road_crack':
        return { emoji: '⚡', label: 'Road Crack', color: 'text-amber-600 bg-amber-50' };
      case 'broken_sign':
        return { emoji: '🛑', label: 'Broken Sign', color: 'text-purple-600 bg-purple-50' };
      default:
        return { emoji: '⚠️', label: 'Road Issue', color: 'text-blue-600 bg-blue-50' };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-5 max-w-7xl mx-auto w-full pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-12 space-y-4 sm:space-y-6">
      {/* Hero Welcome Card */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-4.5 sm:p-6 lg:p-8 shadow-xl border border-slate-700/80">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[11px] sm:text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                Autonomous Road Safety AI
              </span>
              <span className="text-[11px] sm:text-xs font-mono text-slate-300">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black mt-2.5 sm:mt-3 tracking-tight">
              Road Hazard & Speed Monitor
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 sm:mt-2 leading-relaxed">
              Real-time computer vision detecting asphalt potholes, road surface fractures, and tracking car/scooter speeds with Google Account sync.
            </p>

            {/* Target Mode Quick Preference */}
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-slate-400 pt-2.5 sm:pt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px]">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold text-slate-300">Target Focus:</span>
              </div>
              <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
                <button
                  onClick={() => updatePreferredMode('both')}
                  className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all text-center ${
                    userProfile?.preferredMode === 'both' || !userProfile?.preferredMode
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="hidden sm:inline">All (Potholes & Speed)</span>
                  <span className="sm:hidden">All</span>
                </button>
                <button
                  onClick={() => updatePreferredMode('potholes')}
                  className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all text-center ${
                    userProfile?.preferredMode === 'potholes'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="hidden sm:inline">🕳️ Potholes Only</span>
                  <span className="sm:hidden">🕳️ Potholes</span>
                </button>
                <button
                  onClick={() => updatePreferredMode('speed')}
                  className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all text-center ${
                    userProfile?.preferredMode === 'speed'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="hidden sm:inline">🏎️ Car/Scooter Speed</span>
                  <span className="sm:hidden">🏎️ Speeds</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-row md:flex-col gap-2.5 sm:gap-3 w-full md:w-auto md:min-w-[200px] shrink-0">
            <button
              onClick={onStartMonitoring}
              className="flex-1 py-3 px-4 sm:px-5 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-98 font-bold text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 text-xs sm:text-sm transition-all"
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>{isMonitoring ? 'Open Camera' : 'Start Monitoring'}</span>
            </button>
            <button
              onClick={() => onNavigateToMap()}
              className="flex-1 py-3 px-4 sm:px-5 rounded-xl sm:rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:scale-98 font-semibold text-white border border-slate-700/80 flex items-center justify-center gap-2 text-xs sm:text-sm transition-all"
            >
              <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>View Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Metric Cards Grid (2 cols on mobile, 4 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Issues */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/90 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Records</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-blue-600">{stats.today}</span> logged today
          </div>
        </div>

        {/* Potholes */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/90 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">Potholes</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 text-lg leading-none">
              🕳️
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.potholes}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {potholePercent}% of road issues
          </div>
        </div>

        {/* Vehicle Speeds */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/90 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">Vehicle Speeds</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600 text-lg leading-none">
              🏎️
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.speedDetections}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {speedPercent}% cars/scooters
          </div>
        </div>

        {/* Road Cracks */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/90 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">Road Cracks</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 text-lg leading-none">
              ⚡
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.roadCracks}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {crackPercent}% surface fractures
          </div>
        </div>
      </div>

      {/* Two Column Section on Desktop / Stack on Mobile: Trend Chart & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 7-Day Trend Chart (Takes 2 columns on desktop) */}
        <div className="lg:col-span-2">
          <HazardTrendLineChart detections={recentDetections} />
        </div>

        {/* Breakdown Progress Bars (Takes 1 column on desktop) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/90 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Detection Ratio
              </h3>
              <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Flame className="w-3 h-3" /> {stats.highSeverity} High Severity
              </span>
            </div>

            <div className="space-y-4 pt-1">
              {/* Potholes Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    🕳️ Potholes
                  </span>
                  <span className="font-mono text-slate-500">{stats.potholes} ({potholePercent}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(stats.potholes > 0 ? 5 : 0, potholePercent)}%` }}
                  />
                </div>
              </div>

              {/* Vehicle Speeds Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    🏎️ Vehicle Speeds
                  </span>
                  <span className="font-mono text-slate-500">{stats.speedDetections} ({speedPercent}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(stats.speedDetections > 0 ? 5 : 0, speedPercent)}%` }}
                  />
                </div>
              </div>

              {/* Cracks Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    ⚡ Road Cracks
                  </span>
                  <span className="font-mono text-slate-500">{stats.roadCracks} ({crackPercent}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(stats.roadCracks > 0 ? 5 : 0, crackPercent)}%` }}
                  />
                </div>
              </div>

              {/* Signs Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    🛑 Broken Signs
                  </span>
                  <span className="font-mono text-slate-500">{stats.brokenSigns} ({signPercent}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(stats.brokenSigns > 0 ? 5 : 0, signPercent)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Real-time safety coverage</span>
            <button
              onClick={() => onNavigateToHistory()}
              className="text-blue-600 font-semibold hover:underline"
            >
              Inspect all
            </button>
          </div>
        </div>
      </div>

      {/* Recent Detections Grid */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Recent Road Hazards & Speed Radar Detections
            </h3>
            <p className="text-xs text-slate-500">
              Live captures saved with high-res camera snapshots and GPS coordinates
            </p>
          </div>
          {recentDetections.length > 0 && (
            <button
              onClick={onNavigateToHistory}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <span>View All History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentDetections.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/90 shadow-sm max-w-lg mx-auto">
            <span className="text-4xl block mb-2">🚗</span>
            <h4 className="font-bold text-slate-800 text-base mb-1">No Road Hazards Logged Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Mount your phone on the dashboard or motorcycle handle and start monitoring to log potholes and vehicle speeds automatically.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={onStartMonitoring}
                className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
              >
                Start Camera Detection
              </button>
              <button
                onClick={onOpenDemo}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
              >
                Run Test Sample
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {recentDetections.slice(0, 6).map((item) => {
              const iconInfo = getTypeIcon(item.type);
              const dateObj = new Date(item.timestamp);
              const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

              return (
                <div
                  key={item.id}
                  onClick={() => onNavigateToMap(item.id)}
                  className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-2xl p-2.5 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                      {iconInfo.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {iconInfo.label}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${getSeverityBadge(
                            item.severity
                          )}`}
                        >
                          {item.severity}
                        </span>
                        {item.estimatedSpeedKmh && (
                          <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {item.estimatedSpeedKmh} km/h
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{item.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                        <span className="font-mono flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          {item.locationName || `${item.latitude?.toFixed(3)}°, ${item.longitude?.toFixed(3)}°`}
                        </span>
                        <span>•</span>
                        <span className="shrink-0">{dateStr}, {timeStr}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt="Hazard thumbnail"
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                      />
                    )}
                    <span className="p-2 rounded-xl bg-slate-50 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-600 transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Website Feature Showcase Section */}
      <WebsiteFeatureSection
        onStartMonitoring={onStartMonitoring}
        onNavigateToMap={() => onNavigateToMap()}
        onOpenDemo={onOpenDemo}
      />
    </div>
  );
};

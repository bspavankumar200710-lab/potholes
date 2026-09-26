import React, { useState, useMemo } from 'react';
import { RoadMap, MapLayerView } from '../components/RoadMap';
import { MapFilterComponent } from '../components/MapFilterComponent';
import { RoadHazardRecord, HazardType, SeverityLevel } from '../types/detection';
import {
  MapPin,
  Zap,
  Car,
  Layers,
  Mountain,
  Map,
} from 'lucide-react';

interface MapPageProps {
  detections: RoadHazardRecord[];
  userCoords: { latitude: number; longitude: number } | null;
  selectedDetectionId?: string | null;
  onOpenDemo: () => void;
}

const ALL_TYPES: HazardType[] = ['pothole', 'road_crack', 'broken_sign', 'vehicle_speed'];
const ALL_SEVERITIES: SeverityLevel[] = ['high', 'medium', 'low'];

export const MapPage: React.FC<MapPageProps> = ({
  detections,
  userCoords,
  selectedDetectionId,
  onOpenDemo,
}) => {
  // Layer view mode: 'traffic' | 'satellite' | 'terrain' | 'roadmap'
  const [activeLayer, setActiveLayer] = useState<MapLayerView>('traffic');

  // Filter state for hazard types and severity levels
  const [selectedTypes, setSelectedTypes] = useState<HazardType[]>(ALL_TYPES);
  const [selectedSeverities, setSelectedSeverities] = useState<SeverityLevel[]>(ALL_SEVERITIES);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);

  // Toggle individual hazard type
  const handleToggleType = (type: HazardType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        // Prevent unselecting all (keep at least none, but user can click select all)
        return prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleSelectAllTypes = () => {
    setSelectedTypes(ALL_TYPES);
  };

  // Toggle individual severity level
  const handleToggleSeverity = (severity: SeverityLevel) => {
    setSelectedSeverities((prev) => {
      if (prev.includes(severity)) {
        return prev.filter((s) => s !== severity);
      } else {
        return [...prev, severity];
      }
    });
  };

  const handleSelectAllSeverities = () => {
    setSelectedSeverities(ALL_SEVERITIES);
  };

  // Reset all filters to show everything
  const handleResetAllFilters = () => {
    setSelectedTypes(ALL_TYPES);
    setSelectedSeverities(ALL_SEVERITIES);
  };

  // Dynamically determine location label
  const getLocationLabel = () => {
    if (userCoords?.latitude && userCoords?.longitude) {
      return `GPS: ${userCoords.latitude.toFixed(3)}°, ${userCoords.longitude.toFixed(3)}°`;
    }
    const withLocation = detections.find((d) => d.locationName);
    if (withLocation?.locationName) {
      const parts = withLocation.locationName.split(',');
      return parts.slice(-2).join(',').trim() || withLocation.locationName;
    }
    return 'Road Safety Coverage Network';
  };

  const highSeverityCount = detections.filter((d) => d.severity === 'high').length;

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-900">
      {/* Top Header: Location status, Layer Toggle & Sample Trigger */}
      <div className="bg-slate-900 text-white px-3 sm:px-4 py-2 flex items-center justify-between text-xs z-30 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
          <span className="font-bold text-slate-200 truncate">{getLocationLabel()}</span>
          <span className="hidden sm:inline text-slate-400">
            • {detections.length} recorded hazards
          </span>
          {highSeverityCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold shrink-0">
              {highSeverityCount} High
            </span>
          )}
        </div>

        {/* Layer View Mode Segmented Switcher & Sample Button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Layer View Mode Pill Bar (Google Maps API layers) */}
          <div className="flex items-center bg-slate-950 p-0.5 sm:p-1 rounded-xl border border-slate-800 shadow-inner">
            {/* Standard Traffic View Button */}
            <button
              onClick={() => setActiveLayer('traffic')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeLayer === 'traffic'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Google Maps: Standard Road Map with Live Traffic Flow"
            >
              <Car className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">Traffic</span>
              {activeLayer === 'traffic' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse"></span>
              )}
            </button>

            {/* Satellite Imagery Button */}
            <button
              onClick={() => setActiveLayer('satellite')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeLayer === 'satellite'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Google Maps: High-Resolution Satellite & Aerial Imagery"
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">Satellite</span>
            </button>

            {/* Topographical Terrain Button */}
            <button
              onClick={() => setActiveLayer('terrain')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeLayer === 'terrain'
                  ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Google Maps: Topographical Terrain, Elevation & Relief"
            >
              <Mountain className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">Terrain</span>
            </button>

            {/* Standard Clean Road Map Button */}
            <button
              onClick={() => setActiveLayer('roadmap')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeLayer === 'roadmap'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Google Maps: Standard Clean Road Map"
            >
              <Map className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">Road</span>
            </button>
          </div>

          <button
            onClick={onOpenDemo}
            className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 text-[11px] bg-slate-800/90 px-2.5 py-1.5 rounded-lg border border-slate-700 shrink-0"
            title="Inject simulated road hazard"
          >
            <Zap className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Add Sample</span>
          </button>
        </div>
      </div>

      {/* Filter Component: Hazard Types (Potholes, Cracks, Signs, Speeds) & Severity (Low, Med, High) */}
      <MapFilterComponent
        detections={detections}
        selectedTypes={selectedTypes}
        onToggleType={handleToggleType}
        onSelectAllTypes={handleSelectAllTypes}
        selectedSeverities={selectedSeverities}
        onToggleSeverity={handleToggleSeverity}
        onSelectAllSeverities={handleSelectAllSeverities}
        onResetAllFilters={handleResetAllFilters}
        isExpanded={isFilterExpanded}
        onToggleExpand={() => setIsFilterExpanded(!isFilterExpanded)}
      />

      {/* Main Interactive Map Canvas */}
      <div className="flex-1 relative min-h-0">
        <RoadMap
          detections={detections}
          userCoords={userCoords}
          selectedDetectionId={selectedDetectionId}
          activeLayer={activeLayer}
          onLayerChange={setActiveLayer}
          selectedTypes={selectedTypes}
          selectedSeverities={selectedSeverities}
          onResetFilters={handleResetAllFilters}
        />
      </div>
    </div>
  );
};

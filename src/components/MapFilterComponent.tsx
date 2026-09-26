import React from 'react';
import { HazardType, SeverityLevel, RoadHazardRecord } from '../types/detection';
import { Filter, SlidersHorizontal, Check, X, RotateCcw, ShieldAlert, AlertTriangle, Eye, EyeOff } from 'lucide-react';

export interface MapFilterState {
  types: HazardType[];
  severities: SeverityLevel[];
}

interface MapFilterComponentProps {
  detections: RoadHazardRecord[];
  selectedTypes: HazardType[];
  onToggleType: (type: HazardType) => void;
  onSelectAllTypes: () => void;
  selectedSeverities: SeverityLevel[];
  onToggleSeverity: (severity: SeverityLevel) => void;
  onSelectAllSeverities: () => void;
  onResetAllFilters: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const MapFilterComponent: React.FC<MapFilterComponentProps> = ({
  detections,
  selectedTypes,
  onToggleType,
  onSelectAllTypes,
  selectedSeverities,
  onToggleSeverity,
  onSelectAllSeverities,
  onResetAllFilters,
  isExpanded,
  onToggleExpand,
}) => {
  // Compute counts for each category
  const counts = {
    total: detections.length,
    pothole: detections.filter((d) => d.type === 'pothole').length,
    road_crack: detections.filter((d) => d.type === 'road_crack').length,
    broken_sign: detections.filter((d) => d.type === 'broken_sign').length,
    vehicle_speed: detections.filter((d) => d.type === 'vehicle_speed').length,
    high: detections.filter((d) => d.severity === 'high').length,
    medium: detections.filter((d) => d.severity === 'medium').length,
    low: detections.filter((d) => d.severity === 'low').length,
  };

  // Filtered matching count
  const matchingCount = detections.filter(
    (d) => selectedTypes.includes(d.type) && selectedSeverities.includes(d.severity)
  ).length;

  const allTypes: HazardType[] = ['pothole', 'road_crack', 'broken_sign', 'vehicle_speed'];
  const allSeverities: SeverityLevel[] = ['high', 'medium', 'low'];

  const isAllTypesSelected = allTypes.every((t) => selectedTypes.includes(t));
  const isAllSeveritiesSelected = allSeverities.every((s) => selectedSeverities.includes(s));
  const isFiltered = !isAllTypesSelected || !isAllSeveritiesSelected;

  return (
    <div className="relative z-20 bg-slate-900/95 border-b border-slate-800 text-white backdrop-blur-md transition-all">
      {/* Primary Compact Filter Row */}
      <div className="px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none text-xs">
        {/* Left Side: Filter Trigger & Quick Type Toggles */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Main Filter Expand Button */}
          <button
            onClick={onToggleExpand}
            className={`py-1 px-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs border ${
              isExpanded
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/30'
                : isFiltered
                ? 'bg-blue-500/20 text-blue-300 border-blue-400/40 hover:bg-blue-500/30'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
            title="Open comprehensive hazard & severity filter panel"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span>Filter</span>
            {isFiltered && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            )}
          </button>

          {/* Quick Hazard Type Toggles */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
            {/* Potholes Toggle */}
            <button
              onClick={() => onToggleType('pothole')}
              className={`py-1 px-2 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-all ${
                selectedTypes.includes('pothole')
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900 opacity-60'
              }`}
              title="Toggle Pothole visibility"
            >
              <span>🕳️</span>
              <span className="hidden xs:inline">Potholes</span>
              <span className="text-[10px] opacity-80">({counts.pothole})</span>
            </button>

            {/* Cracks Toggle */}
            <button
              onClick={() => onToggleType('road_crack')}
              className={`py-1 px-2 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-all ${
                selectedTypes.includes('road_crack')
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900 opacity-60'
              }`}
              title="Toggle Road Crack visibility"
            >
              <span>⚡</span>
              <span className="hidden xs:inline">Cracks</span>
              <span className="text-[10px] opacity-80">({counts.road_crack})</span>
            </button>

            {/* Signs Toggle */}
            <button
              onClick={() => onToggleType('broken_sign')}
              className={`py-1 px-2 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-all ${
                selectedTypes.includes('broken_sign')
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900 opacity-60'
              }`}
              title="Toggle Broken Sign visibility"
            >
              <span>🛑</span>
              <span className="hidden xs:inline">Signs</span>
              <span className="text-[10px] opacity-80">({counts.broken_sign})</span>
            </button>

            {/* Vehicle Speed Toggle */}
            <button
              onClick={() => onToggleType('vehicle_speed')}
              className={`py-1 px-2 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-all ${
                selectedTypes.includes('vehicle_speed')
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900 opacity-60'
              }`}
              title="Toggle Vehicle Speed visibility"
            >
              <span>🏎️</span>
              <span className="hidden xs:inline">Speeds</span>
              <span className="text-[10px] opacity-80">({counts.vehicle_speed})</span>
            </button>
          </div>
        </div>

        {/* Right Side: Quick Severity Toggles & Status */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
            {/* High Severity */}
            <button
              onClick={() => onToggleSeverity('high')}
              className={`py-1 px-2 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-all ${
                selectedSeverities.includes('high')
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900 opacity-60'
              }`}
              title="Toggle High severity hazards"
            >
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              <span className="hidden sm:inline">High</span>
              <span className="text-[10px]">({counts.high})</span>
            </button>

            {/* Medium Severity */}
            <button
              onClick={() => onToggleSeverity('medium')}
              className={`py-1 px-2 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-all ${
                selectedSeverities.includes('medium')
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900 opacity-60'
              }`}
              title="Toggle Medium severity hazards"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="hidden sm:inline">Med</span>
              <span className="text-[10px]">({counts.medium})</span>
            </button>

            {/* Low Severity */}
            <button
              onClick={() => onToggleSeverity('low')}
              className={`py-1 px-2 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-all ${
                selectedSeverities.includes('low')
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900 opacity-60'
              }`}
              title="Toggle Low severity hazards"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="hidden sm:inline">Low</span>
              <span className="text-[10px]">({counts.low})</span>
            </button>
          </div>

          {/* Result Count / Reset Button */}
          {isFiltered && (
            <button
              onClick={onResetAllFilters}
              className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-all"
              title="Reset all filters to visible"
            >
              <RotateCcw className="w-3 h-3 text-cyan-400" />
              <span className="hidden md:inline">Reset</span>
            </button>
          )}

          <div className="hidden lg:flex items-center text-[11px] text-slate-400 pl-1 font-mono">
            <span>{matchingCount}/{counts.total} shown</span>
          </div>
        </div>
      </div>

      {/* Expanded Detailed Filter Drawer / Panel */}
      {isExpanded && (
        <div className="p-4 bg-slate-950/95 border-t border-slate-800/90 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-start justify-between gap-5">
            {/* Column 1: Hazard Types Visibility Toggle */}
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span>Hazard Types Visibility</span>
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    onClick={onSelectAllTypes}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    Select All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Potholes */}
                <button
                  onClick={() => onToggleType('pothole')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                    selectedTypes.includes('pothole')
                      ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🕳️</span>
                    <div>
                      <div className="font-bold">Potholes</div>
                      <div className="text-[10px] text-slate-400">Deep road cavities</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold">{counts.pothole}</span>
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${selectedTypes.includes('pothole') ? 'bg-rose-600 text-white' : 'border border-slate-700'}`}>
                      {selectedTypes.includes('pothole') && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </button>

                {/* Road Cracks */}
                <button
                  onClick={() => onToggleType('road_crack')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                    selectedTypes.includes('road_crack')
                      ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚡</span>
                    <div>
                      <div className="font-bold">Road Cracks</div>
                      <div className="text-[10px] text-slate-400">Asphalt fractures</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold">{counts.road_crack}</span>
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${selectedTypes.includes('road_crack') ? 'bg-amber-600 text-white' : 'border border-slate-700'}`}>
                      {selectedTypes.includes('road_crack') && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </button>

                {/* Broken Signs */}
                <button
                  onClick={() => onToggleType('broken_sign')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                    selectedTypes.includes('broken_sign')
                      ? 'bg-purple-950/60 border-purple-500/50 text-purple-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🛑</span>
                    <div>
                      <div className="font-bold">Broken Signs</div>
                      <div className="text-[10px] text-slate-400">Damaged road signs</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold">{counts.broken_sign}</span>
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${selectedTypes.includes('broken_sign') ? 'bg-purple-600 text-white' : 'border border-slate-700'}`}>
                      {selectedTypes.includes('broken_sign') && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </button>

                {/* Vehicle Speeds */}
                <button
                  onClick={() => onToggleType('vehicle_speed')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                    selectedTypes.includes('vehicle_speed')
                      ? 'bg-blue-950/60 border-blue-500/50 text-blue-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏎️</span>
                    <div>
                      <div className="font-bold">Vehicle Speeds</div>
                      <div className="text-[10px] text-slate-400">Tracked velocity</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold">{counts.vehicle_speed}</span>
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${selectedTypes.includes('vehicle_speed') ? 'bg-blue-600 text-white' : 'border border-slate-700'}`}>
                      {selectedTypes.includes('vehicle_speed') && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Column 2: Severity Level Filter */}
            <div className="w-full md:w-80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span>Severity Level Filter</span>
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    onClick={onSelectAllSeverities}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    Select All
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                {/* High Severity */}
                <button
                  onClick={() => onToggleSeverity('high')}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                    selectedSeverities.includes('high')
                      ? 'bg-red-950/60 border-red-500/50 text-red-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></span>
                    <div>
                      <div className="font-bold">High Severity</div>
                      <div className="text-[10px] text-slate-400">Immediate tire damage / hazard</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold">{counts.high}</span>
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${selectedSeverities.includes('high') ? 'bg-red-600 text-white' : 'border border-slate-700'}`}>
                      {selectedSeverities.includes('high') && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </button>

                {/* Medium Severity */}
                <button
                  onClick={() => onToggleSeverity('medium')}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                    selectedSeverities.includes('medium')
                      ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                    <div>
                      <div className="font-bold">Medium Severity</div>
                      <div className="text-[10px] text-slate-400">Noticeable road degradation</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold">{counts.medium}</span>
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${selectedSeverities.includes('medium') ? 'bg-amber-600 text-white' : 'border border-slate-700'}`}>
                      {selectedSeverities.includes('medium') && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </button>

                {/* Low Severity */}
                <button
                  onClick={() => onToggleSeverity('low')}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                    selectedSeverities.includes('low')
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                    <div>
                      <div className="font-bold">Low Severity</div>
                      <div className="text-[10px] text-slate-400">Early surface cracking / minor</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold">{counts.low}</span>
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${selectedSeverities.includes('low') ? 'bg-emerald-600 text-white' : 'border border-slate-700'}`}>
                      {selectedSeverities.includes('low') && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Footer of Expanded Panel: Summary & Close */}
          <div className="max-w-4xl mx-auto mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <div className="text-slate-400">
              Displaying <span className="font-bold text-white">{matchingCount}</span> of <span className="font-bold text-white">{counts.total}</span> hazards matching active filters.
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onResetAllFilters}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                Reset All
              </button>
              <button
                onClick={onToggleExpand}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

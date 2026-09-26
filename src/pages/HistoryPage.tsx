import React, { useState, useMemo } from 'react';
import { RoadHazardRecord, HazardType, SeverityLevel } from '../types/detection';
import { detectionService } from '../services/detectionService';
import {
  Clock,
  ArrowUpDown,
  MapPin,
  Trash2,
  Download,
  Gauge,
  Car,
  Maximize2,
  X,
  Search,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface HistoryPageProps {
  detections: RoadHazardRecord[];
  onNavigateToMap: (detectionId: string) => void;
  onOpenDemo: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  detections,
  onNavigateToMap,
  onOpenDemo,
}) => {
  const [filterType, setFilterType] = useState<'all' | HazardType>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'severity'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedImage, setExpandedImage] = useState<{ url: string; title: string } | null>(null);

  // Filtering and sorting logic
  const filteredAndSortedRecords = useMemo(() => {
    let result = detections.filter((item) => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const descMatch = item.description?.toLowerCase().includes(query);
        const locMatch = item.locationName?.toLowerCase().includes(query);
        const typeMatch = item.type.toLowerCase().includes(query);
        const vehicleMatch = item.vehicleType?.toLowerCase().includes(query);
        if (!descMatch && !locMatch && !typeMatch && !vehicleMatch) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else if (sortBy === 'severity') {
        const order: Record<SeverityLevel, number> = { high: 3, medium: 2, low: 1 };
        return order[b.severity] - order[a.severity];
      }
      return 0;
    });

    return result;
  }, [detections, filterType, sortBy, searchQuery]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this road record?')) {
      await detectionService.deleteDetection(id);
    }
  };

  const handleClearAll = async () => {
    if (detections.length === 0) return;
    if (confirm('Are you sure you want to clear all history records? This cannot be undone.')) {
      await detectionService.clearAll();
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(detections, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `roadguard_records_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  const getTypeDetails = (type: HazardType) => {
    switch (type) {
      case 'pothole':
        return { emoji: '🕳️', label: 'Pothole', color: 'text-rose-600' };
      case 'road_crack':
        return { emoji: '⚡', label: 'Road Crack', color: 'text-amber-600' };
      case 'broken_sign':
        return { emoji: '🛑', label: 'Broken Sign', color: 'text-purple-600' };
      case 'vehicle_speed':
        return { emoji: '🏎️', label: 'Vehicle Speed', color: 'text-blue-600' };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-5 max-w-7xl mx-auto w-full pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-16 space-y-3.5 sm:space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Detection History</h2>
            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Cloud Database & IndexedDB
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {detections.length} road hazards and vehicle speeds recorded with high-resolution photos & GPS
          </p>
        </div>

        <div className="flex items-center gap-2">
          {detections.length > 0 && (
            <>
              <button
                onClick={handleExportJSON}
                className="p-2 rounded-xl text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm text-xs font-semibold flex items-center gap-1.5"
                title="Export JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={handleClearAll}
                className="p-2 rounded-xl text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 shadow-sm text-xs font-semibold flex items-center gap-1"
                title="Clear All"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200/90 space-y-2.5 sticky top-0 z-10">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search potholes, scooter speeds, cracks, GPS coordinates..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Type Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterType('all')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({detections.length})
          </button>
          <button
            onClick={() => setFilterType('pothole')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterType === 'pothole'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🕳️ Potholes ({detections.filter((d) => d.type === 'pothole').length})
          </button>
          <button
            onClick={() => setFilterType('vehicle_speed')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterType === 'vehicle_speed'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🏎️ Speeds ({detections.filter((d) => d.type === 'vehicle_speed').length})
          </button>
          <button
            onClick={() => setFilterType('road_crack')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterType === 'road_crack'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ⚡ Cracks ({detections.filter((d) => d.type === 'road_crack').length})
          </button>
          <button
            onClick={() => setFilterType('broken_sign')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterType === 'broken_sign'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🛑 Signs ({detections.filter((d) => d.type === 'broken_sign').length})
          </button>
        </div>

        {/* Sort & Count Controls */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="font-medium text-slate-600">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-100 text-slate-700 font-semibold py-1 px-2 rounded-lg border-none focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="severity">Highest Severity</option>
            </select>
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            Showing {filteredAndSortedRecords.length} records
          </span>
        </div>
      </div>

      {/* Record Cards List (Scrollable smoothly down) */}
      {filteredAndSortedRecords.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-sm">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="font-bold text-slate-800 text-base mb-1">No Records Found</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
            {filterType !== 'all'
              ? `No ${filterType.replace('_', ' ')} records found with current filters.`
              : 'You have not recorded any road hazards or vehicle speeds yet. Start monitoring to log road events.'}
          </p>
          <button
            onClick={onOpenDemo}
            className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
          >
            Generate Test Detection Sample
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAndSortedRecords.map((item) => {
            const typeInfo = getTypeDetails(item.type);
            const dateObj = new Date(item.timestamp);
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 hover:shadow-md transition-all flex flex-col gap-3 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      {typeInfo.emoji}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{typeInfo.label}</h4>
                        <span
                          className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${getSeverityBadge(
                            item.severity
                          )}`}
                        >
                          {item.severity}
                        </span>
                        {item.type === 'vehicle_speed' && item.estimatedSpeedKmh && (
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                              item.isOverSpeed
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {item.estimatedSpeedKmh} km/h
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-blue-600">
                          {Math.round(item.confidence * 100)}% Confidence
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {dateStr} at {timeStr}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onNavigateToMap(item.id)}
                      className="py-1.5 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="View location on map"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">View Map</span>
                    </button>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {item.description}
                </p>

                {/* Location and Info Row */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    {item.locationName || (item.latitude && item.longitude
                      ? `${item.latitude.toFixed(4)}°, ${item.longitude.toFixed(4)}°`
                      : 'Location saved')}
                  </span>

                  {item.type === 'vehicle_speed' && item.vehicleType && (
                    <span className="text-[11px] font-semibold text-slate-600 capitalize flex items-center gap-1">
                      <Car className="w-3 h-3 text-blue-500" /> {item.vehicleType}
                    </span>
                  )}
                </div>

                {/* High-Resolution Photo Snapshot Preview */}
                {item.imageUrl ? (
                  <div className="relative group/img overflow-hidden rounded-xl border border-slate-200 bg-slate-900 mt-1 max-h-56">
                    <img
                      src={item.imageUrl}
                      alt={item.description}
                      className="w-full h-44 object-cover cursor-pointer transition-transform group-hover/img:scale-102"
                      onClick={() => setExpandedImage({ url: item.imageUrl!, title: item.description })}
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <button
                        onClick={() => setExpandedImage({ url: item.imageUrl!, title: item.description })}
                        className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm text-xs flex items-center gap-1"
                        title="Expand high-res photo"
                      >
                        <Maximize2 className="w-3.5 h-3.5" /> Full Photo
                      </button>
                    </div>
                    {item.box2d && (
                      <div className="absolute bottom-2 left-2 bg-black/70 text-cyan-300 font-mono text-[10px] px-2 py-0.5 rounded backdrop-blur-sm">
                        AI Bounding Box Marked
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-3 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No image snapshot recorded for this entry
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full Screen Image Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] flex flex-col items-center">
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={expandedImage.url}
              alt="High resolution hazard photo"
              className="max-w-full max-h-[75vh] object-contain rounded-xl border border-slate-700 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-white text-xs text-center mt-3 max-w-lg bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-700">
              {expandedImage.title}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

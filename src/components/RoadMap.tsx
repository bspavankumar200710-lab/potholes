import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RoadHazardRecord, HazardType, SeverityLevel } from '../types/detection';
import { loadGoogleMaps } from '../services/googleMapsService';
import { locationService } from '../services/locationService';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  AlertTriangle,
  Layers,
  Car,
  ShieldAlert,
  Compass,
  Map as MapIcon,
  Maximize2,
  Loader2,
  RefreshCw,
  Globe,
  Mountain,
  Map,
  Activity,
  Filter,
} from 'lucide-react';

export type MapLayerView = 'traffic' | 'satellite' | 'terrain' | 'roadmap';

interface RoadMapProps {
  detections: RoadHazardRecord[];
  userCoords: { latitude: number; longitude: number } | null;
  onSelectDetection?: (detection: RoadHazardRecord) => void;
  selectedDetectionId?: string | null;
  activeLayer?: MapLayerView;
  onLayerChange?: (layer: MapLayerView) => void;
  selectedTypes?: HazardType[];
  selectedSeverities?: SeverityLevel[];
  onResetFilters?: () => void;
}

// Default regional center & bounds (Karnataka, India)
const REGION_BOUNDS = {
  north: 18.50,
  south: 11.50,
  west: 74.00,
  east: 78.60,
};

const DEFAULT_CENTER = {
  lat: 12.9716, // Bengaluru center
  lng: 77.5946,
};

export const RoadMap: React.FC<RoadMapProps> = ({
  detections,
  userCoords,
  onSelectDetection,
  selectedDetectionId,
  activeLayer: externalActiveLayer,
  onLayerChange,
  selectedTypes,
  selectedSeverities,
  onResetFilters,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // Layer state (controlled by prop or internal state)
  const [internalLayer, setInternalLayer] = useState<MapLayerView>('traffic');
  const activeLayer = externalActiveLayer || internalLayer;

  const handleLayerSwitch = (layer: MapLayerView) => {
    setInternalLayer(layer);
    if (onLayerChange) {
      onLayerChange(layer);
    }
    const layerNames = {
      traffic: 'Standard Traffic View (Live Congestion Flow)',
      satellite: 'Satellite & Aerial Imagery View',
      terrain: 'Topographical Terrain & Elevation View',
      roadmap: 'Clean Standard Road View',
    };
    showToast(`Google Maps: ${layerNames[layer]}`);
  };

  // Google Maps state & refs
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const googleMarkersRef = useRef<google.maps.Marker[]>([]);
  const googleUserMarkerRef = useRef<google.maps.Marker | null>(null);
  const googleUserCircleRef = useRef<google.maps.Circle | null>(null);
  const googleTrafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  // Leaflet state & refs
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkersRef = useRef<L.LayerGroup | null>(null);
  const leafletUserMarkerRef = useRef<L.Marker | null>(null);
  const leafletUserCircleRef = useRef<L.Circle | null>(null);
  const leafletTileLayerRef = useRef<L.TileLayer | null>(null);

  // Engine: 'google' | 'leaflet'
  const [mapEngine, setMapEngine] = useState<'google' | 'leaflet'>('google');
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [selectedHazard, setSelectedHazard] = useState<RoadHazardRecord | null>(null);
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  }, []);

  // Filter detections based on external filter criteria
  const getFilteredDetections = useCallback(() => {
    return detections.filter((d) => {
      const matchType = selectedTypes ? selectedTypes.includes(d.type) : true;
      const matchSeverity = selectedSeverities ? selectedSeverities.includes(d.severity) : true;
      return matchType && matchSeverity;
    });
  }, [detections, selectedTypes, selectedSeverities]);

  const filteredDetections = getFilteredDetections();

  // Compute bounding box for filtered detections
  const getDetectionsBounds = useCallback(() => {
    const listToFit = filteredDetections.length > 0 ? filteredDetections : detections;
    const validDetections = listToFit.filter(
      (d) => typeof d.latitude === 'number' && typeof d.longitude === 'number'
    );
    if (validDetections.length === 0) return null;

    let minLat = validDetections[0].latitude!;
    let maxLat = validDetections[0].latitude!;
    let minLng = validDetections[0].longitude!;
    let maxLng = validDetections[0].longitude!;

    validDetections.forEach((d) => {
      minLat = Math.min(minLat, d.latitude!);
      maxLat = Math.max(maxLat, d.latitude!);
      minLng = Math.min(minLng, d.longitude!);
      maxLng = Math.max(maxLng, d.longitude!);
    });

    return { minLat, maxLat, minLng, maxLng, count: validDetections.length };
  }, [detections, filteredDetections]);

  // Fit all hazards in current map view
  const fitAllHazards = useCallback(() => {
    const bounds = getDetectionsBounds();
    if (!bounds) {
      showToast('No hazard GPS coordinates available to fit');
      return;
    }

    if (mapEngine === 'google' && googleMapRef.current && window.google?.maps) {
      const gBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(bounds.minLat, bounds.minLng),
        new google.maps.LatLng(bounds.maxLat, bounds.maxLng)
      );
      googleMapRef.current.fitBounds(gBounds, { top: 80, right: 30, bottom: 100, left: 30 });
      showToast(`Showing ${bounds.count} hazards on Google Maps`);
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.fitBounds(
        [
          [bounds.minLat, bounds.minLng],
          [bounds.maxLat, bounds.maxLng],
        ],
        { padding: [50, 50] }
      );
      showToast(`Showing ${bounds.count} hazards on OpenStreetMap`);
    }
  }, [getDetectionsBounds, mapEngine, showToast]);

  // Fit Region View
  const fitRegionView = useCallback(() => {
    if (mapEngine === 'google' && googleMapRef.current && window.google?.maps) {
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(REGION_BOUNDS.south, REGION_BOUNDS.west),
        new google.maps.LatLng(REGION_BOUNDS.north, REGION_BOUNDS.east)
      );
      googleMapRef.current.fitBounds(bounds, { top: 70, right: 20, bottom: 90, left: 20 });
      showToast('Centered on Regional Network');
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.fitBounds(
        [
          [REGION_BOUNDS.south, REGION_BOUNDS.west],
          [REGION_BOUNDS.north, REGION_BOUNDS.east],
        ],
        { padding: [40, 40] }
      );
      showToast('Centered on Regional Network');
    }
  }, [mapEngine, showToast]);

  // Clean up Leaflet instance
  const destroyLeaflet = () => {
    if (leafletMapRef.current) {
      try {
        leafletMapRef.current.remove();
      } catch (e) {
        console.warn('Leaflet cleanup warning:', e);
      }
      leafletMapRef.current = null;
      leafletMarkersRef.current = null;
      leafletUserMarkerRef.current = null;
      leafletUserCircleRef.current = null;
    }
  };

  // Clean up Google Maps instance
  const destroyGoogle = () => {
    if (googleMarkersRef.current) {
      googleMarkersRef.current.forEach((m) => m.setMap(null));
      googleMarkersRef.current = [];
    }
    if (googleUserMarkerRef.current) {
      googleUserMarkerRef.current.setMap(null);
      googleUserMarkerRef.current = null;
    }
    if (googleUserCircleRef.current) {
      googleUserCircleRef.current.setMap(null);
      googleUserCircleRef.current = null;
    }
    if (googleTrafficLayerRef.current) {
      googleTrafficLayerRef.current.setMap(null);
      googleTrafficLayerRef.current = null;
    }
    googleMapRef.current = null;
  };

  // Get tile configuration for Leaflet based on active layer
  const getLeafletTileConfig = useCallback((layer: MapLayerView) => {
    if (layer === 'satellite') {
      return {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        subdomains: [] as string[],
      };
    }
    if (layer === 'terrain') {
      return {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        maxZoom: 17,
        subdomains: ['a', 'b', 'c'],
      };
    }
    return {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    };
  }, []);

  // Initialize Leaflet Map
  const initLeafletMap = useCallback(() => {
    if (!mapContainerRef.current) return;
    destroyGoogle();
    destroyLeaflet();

    let initialLat = DEFAULT_CENTER.lat;
    let initialLng = DEFAULT_CENTER.lng;
    let initialZoom = 12;

    if (userCoords?.latitude && userCoords?.longitude) {
      initialLat = userCoords.latitude;
      initialLng = userCoords.longitude;
      initialZoom = 15;
    } else {
      const bounds = getDetectionsBounds();
      if (bounds) {
        initialLat = (bounds.minLat + bounds.maxLat) / 2;
        initialLng = (bounds.minLng + bounds.maxLng) / 2;
        initialZoom = 10;
      }
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: initialZoom,
        zoomControl: false,
        attributionControl: false,
      });

      const tileConfig = getLeafletTileConfig(activeLayer);
      const tileLayer = L.tileLayer(tileConfig.url, {
        maxZoom: tileConfig.maxZoom,
        subdomains: tileConfig.subdomains,
      }).addTo(map);

      leafletTileLayerRef.current = tileLayer;
      leafletMarkersRef.current = L.layerGroup().addTo(map);
      leafletMapRef.current = map;
      setMapLoaded(true);
    } catch (err) {
      console.error('Failed to initialize Leaflet map:', err);
    }
  }, [activeLayer, getDetectionsBounds, getLeafletTileConfig, userCoords]);

  // Initialize Google Maps
  const initGoogleMap = useCallback(async () => {
    if (!mapContainerRef.current) return;
    destroyLeaflet();
    destroyGoogle();

    (window as any).gm_authFailure = () => {
      console.warn('Google Maps authentication failure detected. Gracefully switching to OpenStreetMap engine.');
      setMapEngine('leaflet');
      showToast('Switched to OpenStreetMap (Google Maps API Key not active for this domain)');
    };

    try {
      const googleInstance = await loadGoogleMaps();
      if (!mapContainerRef.current) return;

      let initialLat = DEFAULT_CENTER.lat;
      let initialLng = DEFAULT_CENTER.lng;
      let initialZoom = 12;

      if (userCoords?.latitude && userCoords?.longitude) {
        initialLat = userCoords.latitude;
        initialLng = userCoords.longitude;
        initialZoom = 15;
      } else {
        const bounds = getDetectionsBounds();
        if (bounds) {
          initialLat = (bounds.minLat + bounds.maxLat) / 2;
          initialLng = (bounds.minLng + bounds.maxLng) / 2;
          initialZoom = 10;
        }
      }

      let initialMapTypeId = 'roadmap';
      if (activeLayer === 'satellite') initialMapTypeId = 'hybrid';
      else if (activeLayer === 'terrain') initialMapTypeId = 'terrain';

      const map = new googleInstance.maps.Map(mapContainerRef.current, {
        center: { lat: initialLat, lng: initialLng },
        zoom: initialZoom,
        mapTypeId: initialMapTypeId,
        disableDefaultUI: true,
        zoomControl: false,
        gestureHandling: 'greedy',
        clickableIcons: false,
      });

      const trafficLayer = new googleInstance.maps.TrafficLayer();
      if (activeLayer === 'traffic') {
        trafficLayer.setMap(map);
      }
      googleTrafficLayerRef.current = trafficLayer;
      googleMapRef.current = map;
      setMapLoaded(true);

      if (!userCoords) {
        const bounds = getDetectionsBounds();
        if (bounds && bounds.count > 0) {
          const gBounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(bounds.minLat, bounds.minLng),
            new google.maps.LatLng(bounds.maxLat, bounds.maxLng)
          );
          map.fitBounds(gBounds, { top: 80, right: 30, bottom: 90, left: 30 });
        }
      }
    } catch (err: any) {
      console.warn('Google Maps loader failed. Falling back to Leaflet OpenStreetMap:', err);
      setMapEngine('leaflet');
      showToast('Loaded OpenStreetMap fallback engine');
    }
  }, [activeLayer, getDetectionsBounds, showToast, userCoords]);

  // Mount active map engine
  useEffect(() => {
    setMapLoaded(false);
    if (mapEngine === 'google') {
      initGoogleMap();
    } else {
      initLeafletMap();
    }

    return () => {
      destroyGoogle();
      destroyLeaflet();
    };
  }, [mapEngine, initGoogleMap, initLeafletMap]);

  // React to Layer View Toggle (Satellite, Terrain, Traffic, Roadmap)
  useEffect(() => {
    if (mapEngine === 'google' && googleMapRef.current && window.google?.maps) {
      const map = googleMapRef.current;
      const trafficLayer = googleTrafficLayerRef.current;

      if (activeLayer === 'satellite') {
        map.setMapTypeId('hybrid');
        if (trafficLayer) trafficLayer.setMap(null);
      } else if (activeLayer === 'terrain') {
        map.setMapTypeId('terrain');
        if (trafficLayer) trafficLayer.setMap(null);
      } else if (activeLayer === 'traffic') {
        map.setMapTypeId('roadmap');
        if (trafficLayer) trafficLayer.setMap(map);
      } else if (activeLayer === 'roadmap') {
        map.setMapTypeId('roadmap');
        if (trafficLayer) trafficLayer.setMap(null);
      }
    } else if (mapEngine === 'leaflet' && leafletMapRef.current && leafletTileLayerRef.current) {
      const tileConfig = getLeafletTileConfig(activeLayer);
      leafletTileLayerRef.current.setUrl(tileConfig.url);
    }
  }, [activeLayer, mapEngine, mapLoaded, getLeafletTileConfig]);

  // Update User Location Marker (Google & Leaflet)
  useEffect(() => {
    if (!userCoords?.latitude || !userCoords?.longitude) return;
    const { latitude, longitude } = userCoords;

    if (mapEngine === 'google' && googleMapRef.current && window.google?.maps) {
      const pos = { lat: latitude, lng: longitude };

      if (!googleUserCircleRef.current) {
        googleUserCircleRef.current = new google.maps.Circle({
          map: googleMapRef.current,
          center: pos,
          radius: 35,
          fillColor: '#38bdf8',
          fillOpacity: 0.25,
          strokeColor: '#0284c7',
          strokeOpacity: 0.7,
          strokeWeight: 1.5,
          clickable: false,
          zIndex: 990,
        });
      } else {
        googleUserCircleRef.current.setCenter(pos);
      }

      if (!googleUserMarkerRef.current) {
        googleUserMarkerRef.current = new google.maps.Marker({
          position: pos,
          map: googleMapRef.current,
          title: 'My Current Location',
          zIndex: 1000,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#0284c7',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3.5,
          },
        });
      } else {
        googleUserMarkerRef.current.setPosition(pos);
      }
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      const latlng: L.LatLngTuple = [latitude, longitude];

      if (!leafletUserCircleRef.current) {
        leafletUserCircleRef.current = L.circle(latlng, {
          radius: 35,
          color: '#0284c7',
          fillColor: '#38bdf8',
          fillOpacity: 0.25,
          weight: 1.5,
        }).addTo(leafletMapRef.current);
      } else {
        leafletUserCircleRef.current.setLatLng(latlng);
      }

      if (!leafletUserMarkerRef.current) {
        const userIcon = L.divIcon({
          className: 'leaflet-user-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-blue-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-lg"></span>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        leafletUserMarkerRef.current = L.marker(latlng, {
          icon: userIcon,
          zIndexOffset: 1000,
        }).addTo(leafletMapRef.current);
      } else {
        leafletUserMarkerRef.current.setLatLng(latlng);
      }
    }
  }, [userCoords, mapEngine, mapLoaded]);

  // Helper colors & icons for hazards
  const getHazardStyling = (detection: RoadHazardRecord) => {
    let color = '#ef4444';
    let iconEmoji = '🕳️';

    switch (detection.type) {
      case 'pothole':
        color = detection.severity === 'high' ? '#dc2626' : detection.severity === 'medium' ? '#ea580c' : '#16a34a';
        iconEmoji = '🕳️';
        break;
      case 'road_crack':
        color = detection.severity === 'high' ? '#e11d48' : detection.severity === 'medium' ? '#d97706' : '#22c55e';
        iconEmoji = '⚡';
        break;
      case 'broken_sign':
        color = detection.severity === 'high' ? '#9333ea' : detection.severity === 'medium' ? '#4f46e5' : '#0891b2';
        iconEmoji = '🛑';
        break;
      case 'vehicle_speed':
        color = detection.isOverSpeed ? '#dc2626' : '#0284c7';
        iconEmoji = '🏎️';
        break;
    }

    return { color, iconEmoji };
  };

  // Render Filtered Hazard Markers
  useEffect(() => {
    const listToRender = filteredDetections;

    if (mapEngine === 'google' && googleMapRef.current && window.google?.maps) {
      googleMarkersRef.current.forEach((m) => m.setMap(null));
      googleMarkersRef.current = [];

      listToRender.forEach((detection) => {
        if (!detection.latitude || !detection.longitude) return;
        const position = { lat: detection.latitude, lng: detection.longitude };
        const isSelected = selectedDetectionId === detection.id;
        const { color } = getHazardStyling(detection);

        const marker = new google.maps.Marker({
          position,
          map: googleMapRef.current,
          title: `${detection.type.toUpperCase()}: ${detection.description}`,
          zIndex: isSelected ? 500 : 100,
          icon: {
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: isSelected ? 1.8 : 1.4,
            anchor: new google.maps.Point(12, 22),
          },
        });

        marker.addListener('click', () => {
          setSelectedHazard(detection);
          if (onSelectDetection) onSelectDetection(detection);
          if (googleMapRef.current) {
            googleMapRef.current.panTo(position);
          }
        });

        googleMarkersRef.current.push(marker);
      });
    } else if (mapEngine === 'leaflet' && leafletMapRef.current && leafletMarkersRef.current) {
      leafletMarkersRef.current.clearLayers();

      listToRender.forEach((detection) => {
        if (!detection.latitude || !detection.longitude) return;
        const isSelected = selectedDetectionId === detection.id;
        const { color, iconEmoji } = getHazardStyling(detection);

        const iconHtml = `
          <div class="cursor-pointer group transform transition-transform ${isSelected ? 'scale-125 -translate-y-1' : 'hover:scale-110'}">
            <div style="background-color: ${color};" class="w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-sm shadow-black/30">
              ${iconEmoji}
            </div>
            <div style="border-top-color: ${color};" class="w-0 h-0 border-l-4 border-r-4 border-t-6 border-transparent mx-auto"></div>
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'hazard-marker-pin',
          html: iconHtml,
          iconSize: [32, 38],
          iconAnchor: [16, 38],
        });

        const marker = L.marker([detection.latitude, detection.longitude], {
          icon: customIcon,
          zIndexOffset: isSelected ? 500 : 100,
        });

        marker.on('click', () => {
          setSelectedHazard(detection);
          if (onSelectDetection) onSelectDetection(detection);
          if (leafletMapRef.current) {
            leafletMapRef.current.panTo([detection.latitude!, detection.longitude!]);
          }
        });

        leafletMarkersRef.current?.addLayer(marker);
      });
    }

    if (selectedDetectionId) {
      const match = detections.find((d) => d.id === selectedDetectionId);
      if (match?.latitude && match?.longitude) {
        setSelectedHazard(match);
        if (mapEngine === 'google' && googleMapRef.current) {
          googleMapRef.current.panTo({ lat: match.latitude, lng: match.longitude });
          googleMapRef.current.setZoom(16);
        } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
          leafletMapRef.current.setView([match.latitude, match.longitude], 16);
        }
      }
    }
  }, [filteredDetections, selectedDetectionId, mapEngine, mapLoaded, onSelectDetection, detections]);

  // Center on current user location
  const handleCenterOnUser = async () => {
    setIsLocating(true);

    try {
      if (userCoords?.latitude && userCoords?.longitude) {
        if (mapEngine === 'google' && googleMapRef.current) {
          googleMapRef.current.panTo({ lat: userCoords.latitude, lng: userCoords.longitude });
          googleMapRef.current.setZoom(16);
        } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
          leafletMapRef.current.setView([userCoords.latitude, userCoords.longitude], 16);
        }
        showToast('Centered on your GPS location');
      }

      const freshCoords = await locationService.startTracking();
      if (freshCoords) {
        if (mapEngine === 'google' && googleMapRef.current) {
          googleMapRef.current.panTo({ lat: freshCoords.latitude, lng: freshCoords.longitude });
          googleMapRef.current.setZoom(16);
        } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
          leafletMapRef.current.setView([freshCoords.latitude, freshCoords.longitude], 16);
        }
        showToast(`GPS: ${freshCoords.latitude.toFixed(4)}°, ${freshCoords.longitude.toFixed(4)}°`);
      } else if (!userCoords) {
        locationService.enableDemoCoordinates();
        showToast('Simulating vehicle GPS (Demo trajectory enabled)');
      }
    } catch (e) {
      console.warn('Locate error:', e);
      showToast('Could not access GPS. Check browser permissions.');
    } finally {
      setIsLocating(false);
    }
  };

  const toggleEngine = () => {
    const nextEngine = mapEngine === 'google' ? 'leaflet' : 'google';
    setMapEngine(nextEngine);
    showToast(`Switched map provider to ${nextEngine === 'google' ? 'Google Maps' : 'OpenStreetMap'}`);
  };

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

  const getTypeLabel = (type: HazardType) => {
    switch (type) {
      case 'pothole':
        return { label: 'Pothole', emoji: '🕳️' };
      case 'road_crack':
        return { label: 'Road Crack', emoji: '⚡' };
      case 'broken_sign':
        return { label: 'Broken Sign', emoji: '🛑' };
      case 'vehicle_speed':
        return { label: 'Vehicle Speed', emoji: '🏎️' };
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-900">
      {/* Main Map Viewport Container */}
      <div ref={mapContainerRef} className="w-full flex-1 z-0 bg-slate-900" />

      {/* Loading state indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 text-white p-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-bold">Initializing Interactive Road Map...</p>
          <p className="text-xs text-slate-400 mt-1">
            {mapEngine === 'google' ? 'Google Maps Platform • Live Traffic & Topography' : 'OpenStreetMap Vector Pipeline'}
          </p>
        </div>
      )}

      {/* No matching hazards empty notification banner */}
      {mapLoaded && filteredDetections.length === 0 && detections.length > 0 && (
        <div className="absolute top-4 inset-x-4 max-w-md mx-auto z-20 pointer-events-auto">
          <div className="bg-slate-900/95 text-white p-3 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-300">
              <Filter className="w-4 h-4 shrink-0 text-amber-400" />
              <span>No hazards match active filters ({detections.length} total hidden).</span>
            </div>
            {onResetFilters && (
              <button
                onClick={onResetFilters}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shrink-0 text-[11px]"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Status Notification Toast */}
      {toastMessage && (
        <div className="absolute top-4 inset-x-4 z-30 flex justify-center pointer-events-none">
          <div className="bg-slate-900/90 text-white text-xs font-semibold py-2 px-4 rounded-full shadow-2xl border border-slate-700 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
            {toastMessage}
          </div>
        </div>
      )}

      {/* Top Left Tools: Fit All Hazards & Regional Overview */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 pointer-events-auto">
        <button
          onClick={fitAllHazards}
          className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 shadow-lg backdrop-blur-md transition-all active:scale-95"
          title="Zoom to fit visible hazards"
        >
          <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Fit ({filteredDetections.length})</span>
        </button>

        <button
          onClick={fitRegionView}
          className="hidden sm:flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 shadow-lg backdrop-blur-md transition-all active:scale-95"
          title="Show regional network overview"
        >
          <MapIcon className="w-3.5 h-3.5 text-amber-400" />
          <span>Region</span>
        </button>
      </div>

      {/* Top Right Tools: Provider Engine Toggle */}
      <div className="absolute top-3 right-3 z-10 pointer-events-auto flex items-center gap-2">
        <button
          onClick={toggleEngine}
          className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow backdrop-blur-md transition-all active:scale-95"
          title="Click to switch map engine provider"
        >
          <Globe className="w-3 h-3 text-blue-400" />
          <span>{mapEngine === 'google' ? 'Google Maps' : 'OpenStreetMap'}</span>
          <RefreshCw className="w-2.5 h-2.5 text-slate-400 ml-0.5" />
        </button>
      </div>

      {/* Floating Action Controls on Right */}
      <div className="absolute bottom-20 md:bottom-6 right-3 sm:right-4 z-20 flex flex-col gap-2.5 items-end">
        {/* Layer Selector Popover Menu */}
        {showLayerMenu && (
          <div className="bg-slate-900/95 backdrop-blur-lg p-2 rounded-2xl border border-slate-700/90 shadow-2xl flex flex-col gap-1 w-44 animate-in fade-in slide-in-from-bottom-2 duration-150 mb-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between border-b border-slate-800 mb-1">
              <span>Google Maps Layer</span>
              <button
                onClick={() => setShowLayerMenu(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Traffic View Button */}
            <button
              onClick={() => {
                handleLayerSwitch('traffic');
                setShowLayerMenu(false);
              }}
              className={`w-full py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeLayer === 'traffic'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-400" />
                <span>Traffic Flow</span>
              </div>
              {activeLayer === 'traffic' && <span className="text-[10px]">Active</span>}
            </button>

            {/* Satellite View Button */}
            <button
              onClick={() => {
                handleLayerSwitch('satellite');
                setShowLayerMenu(false);
              }}
              className={`w-full py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeLayer === 'satellite'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Satellite</span>
              </div>
              {activeLayer === 'satellite' && <span className="text-[10px]">Active</span>}
            </button>

            {/* Terrain View Button */}
            <button
              onClick={() => {
                handleLayerSwitch('terrain');
                setShowLayerMenu(false);
              }}
              className={`w-full py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeLayer === 'terrain'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Mountain className="w-4 h-4 text-amber-400" />
                <span>Terrain</span>
              </div>
              {activeLayer === 'terrain' && <span className="text-[10px]">Active</span>}
            </button>

            {/* Clean Roadmap Button */}
            <button
              onClick={() => {
                handleLayerSwitch('roadmap');
                setShowLayerMenu(false);
              }}
              className={`w-full py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeLayer === 'roadmap'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Map className="w-4 h-4 text-blue-400" />
                <span>Standard Road</span>
              </div>
              {activeLayer === 'roadmap' && <span className="text-[10px]">Active</span>}
            </button>
          </div>
        )}

        {/* Layer Selector Trigger Button */}
        <button
          onClick={() => setShowLayerMenu(!showLayerMenu)}
          className={`p-3 rounded-2xl shadow-xl border flex items-center justify-center transition-all active:scale-95 ${
            showLayerMenu || activeLayer !== 'roadmap'
              ? activeLayer === 'traffic'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30'
                : activeLayer === 'satellite'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/30'
                : 'bg-amber-600 text-white border-amber-500 shadow-amber-600/30'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
          title="Google Maps Layer: Traffic, Satellite, Terrain, Roadmap"
        >
          {activeLayer === 'traffic' && <Car className="w-5 h-5" />}
          {activeLayer === 'satellite' && <Layers className="w-5 h-5" />}
          {activeLayer === 'terrain' && <Mountain className="w-5 h-5" />}
          {activeLayer === 'roadmap' && <Map className="w-5 h-5" />}
        </button>

        {/* Center on My Location Button */}
        <button
          onClick={handleCenterOnUser}
          className="p-3.5 rounded-2xl shadow-2xl flex items-center justify-center transition-all bg-blue-600 hover:bg-blue-700 text-white active:scale-90 shadow-blue-500/40 ring-4 ring-blue-500/20"
          title="Center on My GPS Location"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Navigation className="w-5 h-5 fill-current" />
          )}
        </button>
      </div>

      {/* Selected Hazard Detail Sheet / Modal */}
      {selectedHazard && (
        <div className="absolute bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-3 left-3 right-3 max-w-lg mx-auto z-30 bg-white rounded-2xl p-4 shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl p-2 bg-slate-100 rounded-xl">
                {getTypeLabel(selectedHazard.type).emoji}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-base">
                    {getTypeLabel(selectedHazard.type).label}
                  </h4>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getSeverityBadge(
                      selectedHazard.severity
                    )}`}
                  >
                    {selectedHazard.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confidence: {Math.round(selectedHazard.confidence * 100)}% •{' '}
                  {new Date(selectedHazard.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedHazard(null)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-slate-600 mt-2.5 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            {selectedHazard.description}
          </p>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              {selectedHazard.locationName || `${selectedHazard.latitude?.toFixed(4)}°, ${selectedHazard.longitude?.toFixed(4)}°`}
            </span>
            {selectedHazard.estimatedSpeedKmh ? (
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Speed: {selectedHazard.estimatedSpeedKmh} km/h
              </span>
            ) : (
              <span className="text-[11px]">
                {new Date(selectedHazard.timestamp).toLocaleDateString()}
              </span>
            )}
          </div>

          {selectedHazard.imageUrl && (
            <div className="mt-2.5 overflow-hidden rounded-xl border border-slate-200 h-36 w-full bg-slate-900 relative group">
              <img
                src={selectedHazard.imageUrl}
                alt="Captured hazard"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-sm text-white text-[10px] font-mono">
                Auto-Saved Photo
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

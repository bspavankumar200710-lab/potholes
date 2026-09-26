import React from 'react';
import { LayoutDashboard, Camera, MapPin, History } from 'lucide-react';

export type NavigationTab = 'dashboard' | 'monitor' | 'map' | 'history';

interface NavigationProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  isMonitoring: boolean;
  unreadCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  isMonitoring,
  unreadCount = 0,
}) => {
  return (
    <>
      {/* Mobile Bottom Navigation Bar (Hidden on desktop md:) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-lg px-2 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {/* Dashboard Tab */}
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex-1 py-1.5 flex flex-col items-center gap-1 rounded-xl transition-all ${
              currentTab === 'dashboard'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className="relative">
              <LayoutDashboard className={`w-5 h-5 ${currentTab === 'dashboard' ? 'stroke-[2.5]' : ''}`} />
            </div>
            <span className="text-[11px] leading-tight">Dashboard</span>
          </button>

          {/* Monitor Tab */}
          <button
            onClick={() => onTabChange('monitor')}
            className={`flex-1 py-1.5 flex flex-col items-center gap-1 rounded-xl transition-all relative ${
              currentTab === 'monitor'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className="relative">
              <div
                className={`p-1.5 rounded-full transition-all ${
                  isMonitoring
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 animate-pulse'
                    : currentTab === 'monitor'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Camera className="w-5 h-5" />
              </div>
              {isMonitoring && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              )}
            </div>
            <span className="text-[11px] leading-tight">Monitor</span>
          </button>

          {/* Map Tab */}
          <button
            onClick={() => onTabChange('map')}
            className={`flex-1 py-1.5 flex flex-col items-center gap-1 rounded-xl transition-all ${
              currentTab === 'map'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className="relative">
              <MapPin className={`w-5 h-5 ${currentTab === 'map' ? 'stroke-[2.5]' : ''}`} />
            </div>
            <span className="text-[11px] leading-tight">Map</span>
          </button>

          {/* History Tab */}
          <button
            onClick={() => onTabChange('history')}
            className={`flex-1 py-1.5 flex flex-col items-center gap-1 rounded-xl transition-all ${
              currentTab === 'history'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className="relative">
              <History className={`w-5 h-5 ${currentTab === 'history' ? 'stroke-[2.5]' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[9px] font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-[11px] leading-tight">History</span>
          </button>
        </div>
      </nav>
    </>
  );
};

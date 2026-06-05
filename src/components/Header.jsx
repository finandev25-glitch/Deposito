import React from "react";
import { Menu, Bell, Search, User } from "lucide-react";
import ConnectionIndicator from "./ConnectionIndicator";
import DailyAttendanceSummary from "./DailyAttendanceSummary";

const Header = ({
  onMenuClick,
  connectionStatus = {
    supabaseConnected: false,
    realtimeStatus: null,
    realtimeErrors: 0,
  },
  selectedDate = null,
  attendanceSummary = [],
}) => {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            <Menu size={20} />
          </button>
          <DailyAttendanceSummary
            selectedDate={selectedDate}
            items={attendanceSummary}
            className="hidden xl:block"
          />
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          </div>

          {/* Indicador de estado de conexión */}
          <ConnectionIndicator
            supabaseConnected={connectionStatus.supabaseConnected}
            realtimeStatus={connectionStatus.realtimeStatus}
            realtimeErrors={connectionStatus.realtimeErrors}
            className="hidden sm:flex"
          />

          <button className="p-2 rounded-lg hover:bg-gray-100 relative">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <button className="p-2 rounded-lg hover:bg-gray-100">
            <User size={20} className="text-gray-600" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

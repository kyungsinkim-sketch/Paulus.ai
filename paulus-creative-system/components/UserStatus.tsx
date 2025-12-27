import React, { useState, useEffect } from 'react';
import { User, UserWorkStatus } from '../types';
import { Clock, Coffee, Dumbbell, LogOut, ChevronUp, CheckCircle, PauseCircle, MapPin, Loader2 } from 'lucide-react';

interface UserStatusProps {
  user: User;
  onStatusChange: (status: UserWorkStatus, location?: { lat: number; lng: number }) => void;
  onLogout: () => void;
}

const UserStatus: React.FC<UserStatusProps> = ({ user, onStatusChange, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLocating, setIsLocating] = useState(false);

  // Simple timer logic simulation
  useEffect(() => {
    let interval: any;
    if (user.workStatus === 'CHECKED_IN') {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [user.workStatus]);

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const getStatusColor = (status: UserWorkStatus) => {
    switch(status) {
      case 'CHECKED_IN': return 'bg-green-500';
      case 'LUNCH': return 'bg-orange-400';
      case 'WORKOUT': return 'bg-blue-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: UserWorkStatus) => {
    switch(status) {
        case 'CHECKED_IN': return 'Checked In';
        case 'LUNCH': return 'Lunch Break';
        case 'WORKOUT': return 'Workout';
        case 'CHECKED_OUT': return 'Checked Out';
    }
  };

  const handleCheckIn = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                onStatusChange('CHECKED_IN', { lat: latitude, lng: longitude });
                setIsLocating(false);
                setIsOpen(false);
            },
            (error) => {
                console.error("Geolocation error:", error.message);
                // Fallback: Check in without location
                onStatusChange('CHECKED_IN');
                setIsLocating(false);
                setIsOpen(false);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    } else {
        // Fallback for browsers without geo support
        console.warn("Geolocation not supported");
        onStatusChange('CHECKED_IN');
        setIsLocating(false);
        setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-3 w-64 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
           <div className="p-3 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Set Status</p>
              <div className="grid grid-cols-2 gap-2">
                 <button 
                    onClick={handleCheckIn}
                    disabled={isLocating}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium transition-colors ${user.workStatus === 'CHECKED_IN' ? 'bg-green-50 text-green-700 border border-green-200' : 'hover:bg-gray-100 text-gray-700'}`}
                 >
                    {isLocating ? <Loader2 size={14} className="animate-spin text-green-600"/> : <CheckCircle size={14} className={user.workStatus === 'CHECKED_IN' ? 'text-green-500' : 'text-gray-400'}/>}
                    {isLocating ? 'Locating...' : 'Check In'}
                 </button>
                 <button 
                    onClick={() => { onStatusChange('LUNCH'); setIsOpen(false); }}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium transition-colors ${user.workStatus === 'LUNCH' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'hover:bg-gray-100 text-gray-700'}`}
                 >
                    <Coffee size={14} className={user.workStatus === 'LUNCH' ? 'text-orange-500' : 'text-gray-400'}/>
                    Lunch
                 </button>
                 <button 
                    onClick={() => { onStatusChange('WORKOUT'); setIsOpen(false); }}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium transition-colors ${user.workStatus === 'WORKOUT' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'hover:bg-gray-100 text-gray-700'}`}
                 >
                    <Dumbbell size={14} className={user.workStatus === 'WORKOUT' ? 'text-blue-500' : 'text-gray-400'}/>
                    Workout
                 </button>
                 <button 
                    onClick={() => { onStatusChange('CHECKED_OUT'); onLogout(); }}
                    className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium hover:bg-red-50 text-gray-700 hover:text-red-600 transition-colors"
                 >
                    <LogOut size={14}/>
                    Logout
                 </button>
              </div>
           </div>
           <div className="p-3">
              <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                  <span>Work Time Today</span>
                  <span className="font-mono font-medium text-gray-900">{formatTime(elapsedSeconds)}</span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-2">
                  <div className="bg-gray-900 h-full rounded-full" style={{ width: '45%' }}></div>
              </div>
              {user.lastLocation && user.workStatus === 'CHECKED_IN' && (
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                      <MapPin size={10} className="text-gray-300"/>
                      <span>Checked in at {user.lastLocation.lat.toFixed(4)}, {user.lastLocation.lng.toFixed(4)}</span>
                  </div>
              )}
           </div>
        </div>
      )}

      {/* Persistent Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors group"
      >
        <div className="relative">
            <img 
                src={user.avatar} 
                alt={user.name} 
                className="w-9 h-9 rounded-full border border-gray-700 object-cover"
            />
            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-950 ${getStatusColor(user.workStatus)}`}></div>
        </div>
        
        <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">{user.name}</p>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
               {user.workStatus === 'CHECKED_IN' ? (
                   <>
                     <span className="text-green-500 flex items-center gap-1"><Clock size={10} className="animate-pulse"/> {formatTime(elapsedSeconds)}</span>
                   </>
               ) : (
                   <span className="flex items-center gap-1"><PauseCircle size={10}/> {getStatusLabel(user.workStatus)}</span>
               )}
            </div>
        </div>
        
        <ChevronUp size={14} className={`text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}/>
      </button>
    </div>
  );
};

export default UserStatus;
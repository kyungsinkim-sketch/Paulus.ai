
import React, { useState } from 'react';
import { User, UserWorkStatus } from '../types';
import {
  CheckCircle,
  Coffee,
  Dumbbell,
  LogOut,
  X,
  Clock,
  Loader2,
  MapPin
} from 'lucide-react';

interface SetStatusPopoverProps {
  user: User;
  onStatusChange: (status: UserWorkStatus, location?: { lat: number; lng: number }) => void;
  onClose: () => void;
  onProfileClick?: () => void;
}

const SetStatusPopover: React.FC<SetStatusPopoverProps> = ({ user, onStatusChange, onClose, onProfileClick }) => {
  const [isLocating, setIsLocating] = useState(false);

  const handleAction = (status: UserWorkStatus) => {
    if (status === 'CHECKED_IN' && navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onStatusChange(status, { lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsLocating(false);
          onClose();
        },
        (err) => {
          console.warn('[Presence] Geolocation failed', err);
          onStatusChange(status);
          setIsLocating(false);
          onClose();
        },
        { timeout: 5000 }
      );
    } else {
      onStatusChange(status);
      onClose();
    }
  };

  return (
    <div className="absolute bottom-full left-0 mb-3 w-[260px] bg-white border border-gray-200 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden z-[110] animate-in slide-in-from-bottom-2 fade-in duration-200">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Set Status</h3>
        <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="p-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => handleAction('CHECKED_IN')}
          disabled={isLocating}
          className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all border ${user.workStatus === 'CHECKED_IN' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-600 hover:border-gray-200'} disabled:opacity-50`}
        >
          {isLocating ? <Loader2 size={20} className="animate-spin text-blue-500" /> : <CheckCircle size={20} className={user.workStatus === 'CHECKED_IN' ? 'text-green-500' : 'text-gray-300'} />}
          <span className="text-[10px] font-black uppercase tracking-widest">{isLocating ? 'Locating...' : 'Check In'}</span>
        </button>

        <button
          onClick={() => handleAction('LUNCH')}
          className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all border ${user.workStatus === 'LUNCH' ? 'bg-orange-50 border-orange-100 text-orange-700' : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-600 hover:border-gray-200'}`}
        >
          <Coffee size={20} className={user.workStatus === 'LUNCH' ? 'text-orange-500' : 'text-gray-300'} />
          <span className="text-[10px] font-black uppercase tracking-widest">Lunch</span>
        </button>

        <button
          onClick={() => handleAction('WORKOUT')}
          className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all border ${user.workStatus === 'WORKOUT' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-600 hover:border-gray-200'}`}
        >
          <Dumbbell size={20} className={user.workStatus === 'WORKOUT' ? 'text-blue-500' : 'text-gray-300'} />
          <span className="text-[10px] font-black uppercase tracking-widest">Workout</span>
        </button>

        <button
          onClick={() => handleAction('CHECKED_OUT')}
          className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all border bg-white border-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 hover:border-red-100 group"
        >
          <LogOut size={20} className="text-gray-300 group-hover:text-red-400" />
          <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>
        </button>
      </div>



      <div className="px-5 py-5 border-t border-gray-50 bg-gray-50/30 font-sans">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <Clock size={12} /> Work Time Today
          </span>
          <span className="text-[11px] font-black text-gray-900 font-mono tracking-tighter">0h 0m</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gray-900 rounded-full" style={{ width: '0%' }}></div>
        </div>
        <p className="text-[9px] text-gray-400 font-medium mt-2 leading-tight flex items-center gap-1">
          <MapPin size={10} /> Net work hours synced via realtime presence.
        </p>
      </div>
    </div >
  );
};

export default SetStatusPopover;

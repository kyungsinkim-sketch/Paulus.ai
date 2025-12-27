
import React, { useState } from 'react';
import { User, UserWorkStatus } from '../types';
import { ChevronUp, Clock, PauseCircle } from 'lucide-react';
import SetStatusPopover from './SetStatusPopover';

interface GlobalUserAreaProps {
  user: User;
  onStatusChange: (status: UserWorkStatus, location?: { lat: number; lng: number }) => void;
  onProfileClick?: () => void;
}

const GlobalUserArea: React.FC<GlobalUserAreaProps> = ({ user, onStatusChange, onProfileClick }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const getStatusColor = (status: UserWorkStatus) => {
    switch (status) {
      case 'CHECKED_IN': return 'bg-green-500';
      case 'LUNCH': return 'bg-orange-400';
      case 'WORKOUT': return 'bg-blue-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: UserWorkStatus) => {
    switch (status) {
      case 'CHECKED_IN': return 'Working';
      case 'LUNCH': return 'Lunch Break';
      case 'WORKOUT': return 'Workout';
      case 'CHECKED_OUT': return 'Logged Out';
      default: return 'Idle';
    }
  };

  return (
    <div className="relative px-5 py-3">
      {isPopoverOpen && (
        <SetStatusPopover
          user={user}
          onStatusChange={onStatusChange}
          onProfileClick={onProfileClick}
          onClose={() => setIsPopoverOpen(false)}
        />
      )}

      <button
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        className="w-full flex items-center gap-3 group transition-all"
        aria-expanded={isPopoverOpen}
        aria-haspopup="true"
      >
        <div className="relative shrink-0">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-9 h-9 rounded-xl border border-white/10 object-cover shadow-sm group-hover:border-blue-500 transition-colors"
          />
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0B0F14] ${getStatusColor(user.workStatus)}`}></div>
        </div>

        <div className="flex-1 min-w-0 text-left">
          <p className="nav-user-name truncate leading-tight group-hover:text-blue-400 transition-colors">{user.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {user.workStatus === 'CHECKED_IN' ? (
              <span className="nav-user-status flex items-center gap-1"><Clock size={10} className="animate-pulse" /> Working</span>
            ) : (
              <span className="text-[10px] text-white/30 uppercase font-bold flex items-center gap-1"><PauseCircle size={10} /> {getStatusLabel(user.workStatus)}</span>
            )}
          </div>
        </div>

        <ChevronUp size={14} className={`text-white/20 transition-transform duration-300 ${isPopoverOpen ? 'rotate-180 text-blue-500' : 'group-hover:text-white/40'}`} />
      </button>
    </div>
  );
};

export default GlobalUserArea;

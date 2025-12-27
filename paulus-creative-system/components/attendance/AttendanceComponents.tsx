
import React from 'react';
import { DailyAttendanceStats, AttendanceEvent } from '../../types';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const AttendanceTimeline: React.FC<{
    date: string;
    events: AttendanceEvent[];
    stats: DailyAttendanceStats;
}> = ({ date, events, stats }) => {
    // Canvas: 08:00 to 22:00 (14 hours = 840 mins)
    const startHour = 8;
    const totalMinutes = 14 * 60;

    const getPosition = (iso: string) => {
        const d = new Date(iso);
        const mins = (d.getHours() - startHour) * 60 + d.getMinutes();
        return Math.max(0, Math.min(100, (mins / totalMinutes) * 100));
    };

    // Sort events
    const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Build segments
    const segments: React.ReactElement[] = [];
    
    // Work Segment (Base)
    if (stats.firstLogin && stats.lastLogout) {
        const start = getPosition(stats.firstLogin);
        const end = getPosition(stats.lastLogout);
        segments.push(
            <div 
                key="work-base" 
                className="absolute h-4 top-2 bg-blue-200 rounded-sm"
                style={{ left: `${start}%`, width: `${end - start}%` }}
                title={`Work: ${new Date(stats.firstLogin).toLocaleTimeString()} - ${new Date(stats.lastLogout).toLocaleTimeString()}`}
            />
        );
    }

    // Break Segments (Overlay)
    let breakStart: string | null = null;
    let breakType = '';
    sorted.forEach(e => {
        if (e.type.includes('START')) {
            breakStart = e.timestamp;
            breakType = e.type.includes('LUNCH') ? 'LUNCH' : 'EXERCISE';
        } else if (e.type.includes('END') && breakStart) {
            const start = getPosition(breakStart);
            const end = getPosition(e.timestamp);
            const color = breakType === 'LUNCH' ? 'bg-orange-300' : 'bg-purple-300';
            segments.push(
                <div 
                    key={e.id} 
                    className={`absolute h-4 top-2 ${color} z-10 rounded-sm`}
                    style={{ left: `${start}%`, width: `${end - start}%` }}
                    title={`${breakType}`}
                />
            );
            breakStart = null;
        }
    });

    // 11:00 Marker
    const lateMarkerPos = ((11 - startHour) * 60 / totalMinutes) * 100;

    return (
        <div className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0">
            <div className="w-24 text-xs font-bold text-gray-500">{date.slice(5)}</div>
            <div className="flex-1 relative h-8 bg-gray-50 rounded border border-gray-200 overflow-hidden">
                {/* Grid Lines */}
                {[9, 12, 15, 18, 21].map(h => (
                    <div 
                        key={h} 
                        className="absolute top-0 bottom-0 border-l border-gray-200 text-[9px] text-gray-300 pl-1"
                        style={{ left: `${((h - startHour) * 60 / totalMinutes) * 100}%` }}
                    >
                        {h}
                    </div>
                ))}
                
                {/* Late Line */}
                <div className="absolute top-0 bottom-0 w-px bg-red-400 z-20 dashed" style={{ left: `${lateMarkerPos}%` }} title="11:00 Late Limit"/>

                {segments}
            </div>
            <div className="w-48 flex items-center justify-end gap-2 text-xs">
                <span className="font-mono font-bold text-gray-700">{(stats.netWorkMinutes / 60).toFixed(1)}h</span>
                {stats.isLate && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">LATE</span>}
                {stats.isInsufficient && stats.status === 'PRESENT' && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-bold">SHORT</span>}
                {stats.status === 'ABSENT' && <span className="text-gray-400">Absent</span>}
            </div>
        </div>
    );
};

export const ComplianceBadge: React.FC<{ level: 'NONE' | 'LOW' | 'HIGH' }> = ({ level }) => {
    if (level === 'NONE') return <span className="flex items-center gap-1 text-green-600 text-xs font-bold"><CheckCircle2 size={12}/> Good</span>;
    if (level === 'LOW') return <span className="flex items-center gap-1 text-yellow-600 text-xs font-bold"><AlertTriangle size={12}/> Watch</span>;
    return <span className="flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded"><AlertTriangle size={12}/> Risk</span>;
};

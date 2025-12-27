
import { AttendanceEvent, DailyAttendanceStats, MonthlyAttendanceSummary, AttendanceEventType } from '../types';

// --- HELPERS ---

const getMinutes = (iso: string) => {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
};

const diffMinutes = (start: string, end: string) => {
    return Math.max(0, getMinutes(end) - getMinutes(start));
};

const isLate = (firstLogin: string) => {
    const d = new Date(firstLogin);
    // Late Rule: 11:00 AM or later
    return d.getHours() >= 11;
};

export const getWeekDateRange = (dateString: string): string[] => {
    const date = new Date(dateString);
    const day = date.getDay(); // 0 (Sun) to 6 (Sat)
    
    // Adjust to Monday
    // If Sunday (0), subtract 6 days. If Mon-Sat, subtract (day - 1)
    const diff = date.getDate() - (day === 0 ? 6 : day - 1);
    
    const monday = new Date(date.setDate(diff));
    const weekDates: string[] = [];

    for (let i = 0; i < 5; i++) {
        const nextDay = new Date(monday);
        nextDay.setDate(monday.getDate() + i);
        weekDates.push(nextDay.toISOString().split('T')[0]);
    }
    return weekDates;
};

// --- CORE LOGIC ---

export const calculateDailyStats = (events: AttendanceEvent[], date: string, userId: string): DailyAttendanceStats => {
    // 1. Sort events for the day
    const dayEvents = events
        .filter(e => e.timestamp.startsWith(date))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // 2. Find boundary events
    const login = dayEvents.find(e => e.type === 'LOGIN');
    // If no logout, assume active or end of day (for historic) - For now use last event or null
    // In a real system, active sessions are handled differently. Here we assume closed day logic.
    const logout = dayEvents.reverse().find(e => e.type === 'LOGOUT');
    
    // Reset sort
    dayEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (!login) {
        // Absent
        return {
            date,
            userId,
            firstLogin: null,
            lastLogout: null,
            netWorkMinutes: 0,
            breakMinutes: 0,
            isLate: false,
            isInsufficient: false,
            status: 'ABSENT'
        };
    }

    // 3. Calculate Gross Duration
    const endTimeStr = logout ? logout.timestamp : new Date().toISOString(); // Real-time calc if no logout
    const grossMinutes = diffMinutes(login.timestamp, endTimeStr);

    // 4. Calculate Breaks (Lunch / Exercise)
    // Logic: Sum of (END - START) pairs
    let breakMinutes = 0;
    let breakStart: AttendanceEvent | null = null;

    dayEvents.forEach(e => {
        if (e.type === 'LUNCH_START' || e.type === 'EXERCISE_START') {
            if (!breakStart) breakStart = e;
        } else if ((e.type === 'LUNCH_END' || e.type === 'EXERCISE_END') && breakStart) {
            breakMinutes += diffMinutes(breakStart.timestamp, e.timestamp);
            breakStart = null;
        }
    });

    // 5. Net Work
    const netWorkMinutes = Math.max(0, grossMinutes - breakMinutes);

    return {
        date,
        userId,
        firstLogin: login.timestamp,
        lastLogout: logout ? logout.timestamp : null,
        netWorkMinutes,
        breakMinutes,
        isLate: isLate(login.timestamp),
        isInsufficient: netWorkMinutes < 420, // 7 hours * 60
        status: 'PRESENT'
    };
};

export const generateMockEvents = (userId: string, date: string): AttendanceEvent[] => {
    // Generate a realistic day
    const base = new Date(date);
    const r = Math.random();
    
    // 10% Absent/Leave
    if (r < 0.1) return [];

    // 20% Late
    const startHour = r < 0.3 ? 11 : (9 + Math.floor(Math.random() * 2)); // 9, 10, or 11
    const startMin = Math.floor(Math.random() * 30);
    
    const loginTime = new Date(base);
    loginTime.setHours(startHour, startMin);

    const logoutTime = new Date(base);
    logoutTime.setHours(19 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 59));

    const events: AttendanceEvent[] = [
        { id: `evt-${Date.now()}-1`, userId, type: 'LOGIN', timestamp: loginTime.toISOString() },
        { id: `evt-${Date.now()}-4`, userId, type: 'LOGOUT', timestamp: logoutTime.toISOString() }
    ];

    // Lunch
    const lunchStart = new Date(base);
    lunchStart.setHours(12, 30);
    const lunchEnd = new Date(base);
    lunchEnd.setHours(13, 30);
    
    events.push({ id: `evt-${Date.now()}-2`, userId, type: 'LUNCH_START', timestamp: lunchStart.toISOString() });
    events.push({ id: `evt-${Date.now()}-3`, userId, type: 'LUNCH_END', timestamp: lunchEnd.toISOString() });

    return events;
};

export const aggregateWeeklyStats = (dailyStats: DailyAttendanceStats[], userId: string, userName: string): MonthlyAttendanceSummary => {
    let totalWorkMinutes = 0;
    let lateCount = 0;
    let insufficientCount = 0;

    dailyStats.forEach(d => {
        totalWorkMinutes += d.netWorkMinutes;
        if (d.isLate) lateCount++;
        if (d.isInsufficient && d.status === 'PRESENT') insufficientCount++;
    });

    const weeklyRisk = totalWorkMinutes > (52 * 60);
    
    let riskLevel: 'NONE' | 'LOW' | 'HIGH' = 'NONE';
    if (lateCount >= 3 || insufficientCount >= 3) riskLevel = 'HIGH';
    else if (lateCount > 0 || insufficientCount > 0) riskLevel = 'LOW';

    return {
        userId,
        userName,
        totalWorkMinutes,
        lateCount,
        insufficientCount,
        riskLevel,
        weekly52hRisk: weeklyRisk,
        productivityScore: Math.floor(Math.random() * 100) // Mock for now
    };
};

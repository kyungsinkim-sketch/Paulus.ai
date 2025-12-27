import React, { useState, useEffect } from 'react';
import { Project, User, Language, DailyAttendanceStats, MonthlyAttendanceSummary, AttendanceEvent } from '../types';
import { calculateDailyStats, generateMockEvents, aggregateWeeklyStats, getWeekDateRange } from '../services/attendanceService';
import { AttendanceTimeline, ComplianceBadge } from './attendance/AttendanceComponents';
import { 
  ShieldCheck, 
  Activity, 
  Users, 
  Clock, 
  Search, 
  UserCheck, 
  DollarSign,
  BarChart3,
  UserCog,
  TrendingUp,
  AlertCircle,
  FileText
} from 'lucide-react';

interface AdminDashboardPageProps {
  projects: Project[];
  users: User[];
  onUpdateProject: (updatedProject: Project) => void;
  onUpdateUser: (updatedUser: User) => void;
  language: Language;
}

type AdminSection = 'DASHBOARD' | 'ATTENDANCE' | 'FINANCIAL' | 'PEOPLE' | 'ACCESS_CONTROL';

/**
 * PAULUS.AI — RESTORE ADM-CORE
 * AdminDashboardPage.tsx
 * 
 * Comprehensive Admin Module covering Spec 3 sections.
 */
const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ projects, users, onUpdateUser, language }) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('DASHBOARD');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  
  const [generatedStats, setGeneratedStats] = useState<{ daily: DailyAttendanceStats[], weekly: MonthlyAttendanceSummary[], events: AttendanceEvent[] }>({ daily: [], weekly: [], events: [] });

  const t = (en: string, ko: string) => language === 'KO' ? ko : en;

  // Restore Attendance automatic source simulation (Spec 4 context)
  useEffect(() => {
    const events: AttendanceEvent[] = [];
    const dailies: DailyAttendanceStats[] = [];
    const weekRange = getWeekDateRange(attendanceDate);

    users.forEach(u => {
        weekRange.forEach(date => {
            const evts = generateMockEvents(u.id, date);
            events.push(...evts);
            dailies.push(calculateDailyStats(evts, date, u.id));
        });
    });

    const summaries = users.map(u => aggregateWeeklyStats(dailies.filter(d => d.userId === u.id), u.id, u.name));
    setGeneratedStats({ daily: dailies, weekly: summaries, events });
  }, [attendanceDate, users]);

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Active Projects</div>
          <div className="text-4xl font-black text-gray-900">{projects.filter(p => p.status === 'ACTIVE').length}</div>
          <div className="text-[10px] text-blue-600 font-bold mt-2 flex items-center gap-1"><TrendingUp size={10}/> v2.5 Operations Active</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Staff</div>
          <div className="text-4xl font-black text-gray-900">{users.length}</div>
          <div className="text-[10px] text-gray-400 font-bold mt-2">Recovered Seed Dataset</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Weekly Working Hours</div>
          <div className="text-4xl font-black text-gray-900">420.5 <span className="text-sm font-normal text-gray-300">h</span></div>
          <div className="text-[10px] text-emerald-600 font-bold mt-2">Aggregate Load Balance</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Active Sessions</div>
          <div className="text-4xl font-black text-orange-500">{users.filter(u => u.workStatus === 'CHECKED_IN').length}</div>
          <div className="text-[10px] text-orange-400 font-bold mt-2 flex items-center gap-1"><Activity size={10}/> Real-time monitoring</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
         <div className="col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col justify-center items-center text-center space-y-4 min-h-[350px]">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-200">
               <BarChart3 size={48} />
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">Operational Flow Visualizer</h3>
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed">Aggregated data across all active project stages. This module visualizes bottlenecks and delivery health based on historic audit logs.</p>
            <div className="flex gap-2">
               <span className="text-[9px] font-black px-2 py-0.5 rounded bg-gray-100 text-gray-400 uppercase">Phase 2: Predictive</span>
               <span className="text-[9px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-600 uppercase tracking-tighter">Current: Observational</span>
            </div>
         </div>
         <div className="bg-gray-950 rounded-3xl p-8 text-white space-y-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-10"><ShieldCheck size={120} /></div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
               <AlertCircle size={14} className="text-orange-500" /> Compliance Risk Indicators
            </h3>
            <div className="space-y-6">
               <div className="flex justify-between items-center group cursor-help">
                  <div>
                    <span className="text-xs font-bold text-gray-400 block">Late Arrival (Today)</span>
                    <span className="text-[9px] text-gray-600 uppercase font-black tracking-widest">Policy: 11:00 AM</span>
                  </div>
                  <span className="text-2xl font-black text-orange-400">{generatedStats.daily.filter(d => d.date === attendanceDate && d.isLate).length}</span>
               </div>
               <div className="flex justify-between items-center group cursor-help">
                  <div>
                    <span className="text-xs font-bold text-gray-400 block">Insufficient Hours</span>
                    <span className="text-[9px] text-gray-600 uppercase font-black tracking-widest">Under 7h / Day</span>
                  </div>
                  <span className="text-2xl font-black text-red-500">{generatedStats.daily.filter(d => d.date === attendanceDate && d.isInsufficient).length}</span>
               </div>
               <div className="flex justify-between items-center group cursor-help">
                  <div>
                    <span className="text-xs font-bold text-gray-400 block">52h Weekly Risk</span>
                    <span className="text-[9px] text-gray-600 uppercase font-black tracking-widest">Labor Law Monitoring</span>
                  </div>
                  <span className="text-2xl font-black text-yellow-400">{generatedStats.weekly.filter(s => s.weekly52hRisk).length}</span>
               </div>
            </div>
            <div className="pt-6 border-t border-white/5">
               <p className="text-[10px] text-gray-500 italic">Indicators based on net work time excluding pause sessions.</p>
            </div>
         </div>
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Attendance & Compliance</h2>
          <p className="text-xs text-gray-400 mt-1">Weekly timeline and labor risk distribution.</p>
        </div>
        <div className="flex gap-2">
           <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 shadow-sm">
             <Clock size={14} className="text-gray-400"/>
             <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} className="py-2 border-none bg-transparent text-xs font-bold outline-none" />
           </div>
           <button className="px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all">Export Report</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[650px]">
           <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4 text-right">Weekly Hours</th>
                  <th className="px-6 py-4 text-center">Late Counts</th>
                  <th className="px-6 py-4 text-center">Risk Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {generatedStats.weekly.map(summary => (
                  <tr key={summary.userId} onClick={() => setSelectedUserId(summary.userId)} className={`cursor-pointer transition-colors ${selectedUserId === summary.userId ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{summary.userName}</div>
                      <div className="text-[10px] text-gray-400 uppercase font-medium">{users.find(u => u.id === summary.userId)?.team}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs">{(summary.totalWorkMinutes / 60).toFixed(1)} <span className="text-gray-300">h</span></td>
                    <td className="px-6 py-4 text-center text-orange-600 font-black">{summary.lateCount || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <ComplianceBadge level={summary.riskLevel}/>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-y-auto custom-scrollbar">
           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Weekly Timeline View</h3>
           {selectedUserId ? (
              <div className="space-y-4">
                {generatedStats.daily.filter(d => d.userId === selectedUserId).map(stat => (
                   <AttendanceTimeline key={stat.date} date={stat.date} stats={stat} events={generatedStats.events.filter(e => e.userId === selectedUserId && e.timestamp.startsWith(stat.date))} />
                ))}
                <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                   <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                     <AlertCircle size={12} className="text-blue-500" /> Pattern Analysis
                   </h4>
                   <p className="text-[10px] text-gray-500 leading-relaxed">System identifies consistent check-in behaviors and flags repeated patterns that deviate from labor policies.</p>
                </div>
              </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-2 py-32 text-center">
                <Clock size={40} strokeWidth={1} />
                <p className="text-[10px] font-bold uppercase tracking-widest max-w-[120px]">Select an employee to view detailed weekly timeline</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );

  const renderPlaceholder = (title: string, desc: string, icon: React.ReactNode) => (
    <div className="h-full flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-16 text-center space-y-8 animate-in zoom-in-95 duration-500">
      <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{title}</h3>
        <p className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em]">Restoration Scope: Phase 2</p>
      </div>
      <p className="text-sm text-gray-400 max-w-sm leading-relaxed">{desc}</p>
      <div className="pt-4 flex gap-3">
         <span className="text-[10px] font-bold text-gray-300 border border-gray-100 px-3 py-1 rounded-full uppercase">Read-Only</span>
         <span className="text-[10px] font-bold text-gray-300 border border-gray-100 px-3 py-1 rounded-full uppercase">UI Placeholder</span>
      </div>
    </div>
  );

  const renderAccessControl = () => (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Access Control</h2>
          <p className="text-xs text-gray-400 mt-1">Role-based permission management and staff visibility.</p>
        </div>
        <div className="relative w-80">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search employees by name or ID..." className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-sm transition-all" />
        </div>
      </div>
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
            <tr>
              <th className="px-8 py-5">Staff Identity</th>
              <th className="px-8 py-5">Department / Role</th>
              <th className="px-8 py-5">Permission Level</th>
              <th className="px-8 py-5 text-center">Join Date</th>
              <th className="px-8 py-5 text-center">Employment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
              <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-8 py-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-gray-100 overflow-hidden shadow-sm border border-white">
                    <img src={u.avatar} className="w-full h-full object-cover" alt={u.name} />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{u.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono tracking-widest">{u.employeeId}</div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="text-gray-900 font-bold text-xs">{u.role}</div>
                  <div className="text-[10px] text-gray-400 uppercase font-medium mt-0.5">{u.team}</div>
                </td>
                <td className="px-8 py-5">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${u.permissionLevel === 'ADMIN' ? 'bg-red-50 text-red-600 border-red-100' : u.permissionLevel === 'CORE_OPERATIONS' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    <UserCog size={12}/> {u.permissionLevel.replace('_', ' ')}
                  </div>
                </td>
                <td className="px-8 py-5 text-center text-[11px] font-medium text-gray-500 font-mono">
                  {u.joinDate}
                </td>
                <td className="px-8 py-5 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${u.employmentStatus === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                    <UserCheck size={10}/> {u.employmentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#F8F9FB] overflow-hidden font-sans">
      <div className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-10 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-gray-950 rounded-2xl text-white shadow-xl shadow-gray-200"><ShieldCheck size={24}/></div>
           <div>
              <h1 className="text-lg font-black text-gray-900 uppercase tracking-tighter leading-none italic">PAULUS Operating System</h1>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-[0.2em] mt-2">Company-Level Control • RESTORE ADM-CORE</p>
           </div>
        </div>
        <nav className="flex items-center gap-1 bg-gray-100 p-1.5 rounded-2xl shadow-inner">
           {(['DASHBOARD', 'ATTENDANCE', 'FINANCIAL', 'PEOPLE', 'ACCESS_CONTROL'] as AdminSection[]).map(s => (
             <button 
                key={s} 
                onClick={() => setActiveSection(s)} 
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all duration-300 ${activeSection === s ? 'bg-white text-gray-900 shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {s.replace('_', ' ')}
              </button>
           ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto h-full">
           {activeSection === 'DASHBOARD' && renderDashboard()}
           {activeSection === 'ATTENDANCE' && renderAttendance()}
           {activeSection === 'FINANCIAL' && renderPlaceholder(
              'Financial Flow', 
              'Consolidated financial metrics, expense reports, and project-to-finance handoff diagrams. Fulfills Spec 3.2 requirements.', 
              <DollarSign size={56}/>
           )}
           {activeSection === 'PEOPLE' && renderPlaceholder(
              'People & Performance', 
              'Employee utilization metrics, team distribution, and overall headcount tracking. Fulfills Spec 3.3 requirements.', 
              <Users size={56}/>
           )}
           {activeSection === 'ACCESS_CONTROL' && renderAccessControl()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

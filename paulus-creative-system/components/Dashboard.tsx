
import React, { useState } from 'react';
import { Project, Language } from '../types';
import { Search, Plus, Quote, Sun, ArrowRight } from 'lucide-react';

interface DashboardProps {
  projects: Project[];
  onCreateProject: () => void;
  onOpenProject: (projectId: string) => void;
  onShareProject: (projectId: string) => void;
  onUpdateProject: (project: Project) => void;
  language: Language;
}

const Dashboard: React.FC<DashboardProps> = ({ projects, onCreateProject, onOpenProject, onShareProject, onUpdateProject, language }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.client.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'KO' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' });
  };

  const getTimelineStats = (project: Project) => {
      const start = new Date(project.startDate).getTime();
      const end = new Date(project.endDate).getTime();
      const now = new Date().getTime();
      const total = end - start;
      const elapsed = now - start;
      const progressPct = Math.min(100, Math.max(0, (elapsed / total) * 100));
      return { progressPct };
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#F8F9FB] animate-in fade-in duration-500">
        <div className="max-w-7xl mx-auto px-8 py-10">
            
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-[24px] font-semibold text-[#0F172A] tracking-tight">My Projects</h1>
                    <p className="text-[#667085] mt-1 text-[13px]">Manage your active creative workflows</p>
                </div>
                <button 
                    onClick={onCreateProject}
                    className="bg-[#0F172A] hover:bg-black text-white px-5 py-2.5 rounded-lg text-[13px] font-semibold shadow-sm flex items-center gap-2 transition-all"
                >
                    <Plus size={18}/> Create Project
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-[0.7] min-w-0">
                    <div className="bg-white p-2 rounded-xl border border-[#E6E8EC] mb-6 flex items-center shadow-sm">
                        <Search size={18} className="ml-3 text-[#98A2B3]"/>
                        <input 
                            type="text" 
                            placeholder="Search projects..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 px-3 py-2 bg-transparent text-[14px] text-[#0F172A] outline-none placeholder-[#98A2B3]"
                        />
                    </div>

                    <div className="space-y-4">
                        {filteredProjects.map(project => {
                            const { progressPct } = getTimelineStats(project);
                            const isStrategy = project.phase === 'STRATEGY';
                            const phaseLabel = isStrategy ? 'Strategy + Creative' : 'Production';
                            const statusColor = isStrategy ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#ECFDF5] text-[#10B981]';

                            return (
                                <div 
                                    key={project.id}
                                    className="group bg-white rounded-xl p-5 border border-[#E6E8EC] hover:border-[#2563EB] hover:bg-[#FAFBFF] transition-all flex flex-col md:flex-row items-center gap-6 relative shadow-sm"
                                >
                                    <div 
                                        className="absolute inset-0 z-0 cursor-pointer" 
                                        onClick={() => onOpenProject(project.id)}
                                    />

                                    <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-[#F8F9FB] border border-[#E6E8EC] overflow-hidden relative z-10">
                                        {project.thumbnailUrl ? (
                                            <img src={project.thumbnailUrl} className="w-full h-full object-cover" alt=""/>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#98A2B3] font-bold text-lg">{project.client[0]}</div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 pointer-events-none">
                                        <h3 className="text-[16px] font-semibold text-[#0F172A] truncate">{project.title}</h3>
                                        <p className="text-[13px] text-[#667085] mt-0.5">{project.client}</p>
                                        <div className="mt-2 flex">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-medium ${statusColor}`}>
                                                {phaseLabel}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="w-full md:w-56 flex flex-col gap-2 pointer-events-none">
                                        <div className="flex justify-between text-[11px] font-medium text-[#98A2B3]">
                                            <span>{formatDate(project.startDate)}</span>
                                            <span>{formatDate(project.endDate)}</span>
                                        </div>
                                        <div className="relative h-1.5 w-full bg-[#EEF2F6] rounded-full overflow-hidden">
                                            <div style={{ width: `${progressPct}%` }} className="bg-[#2563EB] h-full transition-all duration-1000"/>
                                        </div>
                                    </div>

                                    <div className="flex-shrink-0 z-20">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onOpenProject(project.id); }}
                                            className="w-10 h-10 rounded-full bg-white border border-[#E6E8EC] flex items-center justify-center text-[#667085] hover:text-[#2563EB] hover:border-[#2563EB] transition-all"
                                        >
                                            <ArrowRight size={18}/>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredProjects.length === 0 && (
                            <div className="text-center py-20 text-[#98A2B3] bg-white rounded-xl border border-dashed border-[#E6E8EC]">
                                <p className="text-[13px]">No projects found.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-[0.3] flex flex-col gap-6">
                    <div className="bg-white p-5 rounded-xl border border-[#E6E8EC] shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <Sun size={16} className="text-[#667085]"/>
                            <span className="text-[13px] font-semibold text-[#667085]">Today's Weather</span>
                        </div>
                        <p className="text-[14px] text-[#0F172A] font-medium">Bright, crisp, calm.</p>
                        <p className="text-[#667085] text-[12px] mt-1">Perfect day for deep work.</p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-[#E6E8EC] shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <Quote size={16} className="text-[#667085]"/>
                            <span className="text-[13px] font-semibold text-[#667085]">Inspiration</span>
                        </div>
                        <p className="text-[14px] text-[#0F172A] italic leading-relaxed">
                            "Creativity is intelligence having fun."
                        </p>
                        <p className="text-[12px] text-[#98A2B3] mt-2 font-medium">— Albert Einstein</p>
                    </div>

                    <div className="bg-[#0F172A] p-6 rounded-[16px] shadow-lg text-white relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"/>
                        <h4 className="text-[13px] font-semibold text-[#98A2B3] mb-4">Project Overview</h4>
                        <div className="flex items-baseline gap-1 mb-4">
                            <span className="text-4xl font-bold tracking-tighter">{projects.filter(p => p.status === 'ACTIVE').length}</span>
                            <span className="text-sm text-[#98A2B3] font-medium">Active</span>
                        </div>
                        <p className="text-[12px] text-[#98A2B3] leading-relaxed">
                            System status is <span className="text-emerald-400 font-bold">Stable</span>. All creative modules operational.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;

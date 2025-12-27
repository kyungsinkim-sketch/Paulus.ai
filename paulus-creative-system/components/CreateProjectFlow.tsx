
import React, { useState, useEffect } from 'react';
import { User, Project } from '../types';
import { StaffSeedService } from '../services/staffSeedService';
import {
    X,
    Calendar,
    Users,
    CheckCircle2,
    Layout,
    Clapperboard,
    ArrowRight,
    Search,
    Check
} from 'lucide-react';

interface CreateProjectFlowProps {
    currentUser: User;
    onCancel: () => void;
    onCreate: (project: Partial<Project>) => void;
    mode?: 'CREATE' | 'EDIT';
    initialProject?: Project;
}

type PhaseConfig = 'STRATEGY_ONLY' | 'DIRECTION_ONLY' | 'FULL_CYCLE';

const CreateProjectFlow: React.FC<CreateProjectFlowProps> = ({
    currentUser,
    onCancel,
    onCreate,
    mode = 'CREATE',
    initialProject
}) => {
    const isEdit = mode === 'EDIT';

    // --- Form State ---
    const [clientName, setClientName] = useState(initialProject?.client || '');
    const [projectName, setProjectName] = useState(initialProject?.title || '');

    const [selectedMembers, setSelectedMembers] = useState<User[]>(initialProject?.members || [currentUser]);
    const [searchMemberQuery, setSearchMemberQuery] = useState('');

    const [phaseConfig, setPhaseConfig] = useState<PhaseConfig>(() => {
        if (!initialProject) return 'FULL_CYCLE';
        if (initialProject.phase === 'STRATEGY' && initialProject.directionStartDate === initialProject.endDate) return 'STRATEGY_ONLY';
        if (initialProject.phase === 'DIRECTION') return 'DIRECTION_ONLY';
        return 'FULL_CYCLE';
    });

    // Default dates: Start today, End in 3 months
    const today = new Date().toISOString().split('T')[0];
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    const [startDate, setStartDate] = useState(initialProject?.startDate || today);
    const [endDate, setEndDate] = useState(initialProject?.endDate || threeMonthsLater.toISOString().split('T')[0]);

    // Milestone dates (calculated or manual)
    const [strategyEndDate, setStrategyEndDate] = useState(initialProject?.strategyEndDate || '');
    const [directionStartDate, setDirectionStartDate] = useState(initialProject?.directionStartDate || '');

    // --- Search Logic ---
    const allUsers = StaffSeedService.getAllStaff();
    const filteredUsers = allUsers.filter(u =>
        !selectedMembers.find(m => m.id === u.id) &&
        (u.name.toLowerCase().includes(searchMemberQuery.toLowerCase()) || u.email.toLowerCase().includes(searchMemberQuery.toLowerCase()))
    );

    // --- Schedule Calculation Logic ---
    useEffect(() => {
        if (!startDate || !endDate) return;
        // Do not auto-recalculate in edit mode if values already exist
        if (isEdit && strategyEndDate && directionStartDate) return;

        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (phaseConfig === 'FULL_CYCLE') {
            const strategyDays = Math.floor(diffDays * 0.4);
            const sEnd = new Date(start);
            sEnd.setDate(start.getDate() + strategyDays);
            setStrategyEndDate(sEnd.toISOString().split('T')[0]);

            const pStart = new Date(sEnd);
            pStart.setDate(sEnd.getDate() + 1);
            setDirectionStartDate(pStart.toISOString().split('T')[0]);

        } else if (phaseConfig === 'STRATEGY_ONLY') {
            setStrategyEndDate(endDate);
            setDirectionStartDate(endDate);
        } else if (phaseConfig === 'DIRECTION_ONLY') {
            setStrategyEndDate(startDate);
            setDirectionStartDate(startDate);
        }
    }, [startDate, endDate, phaseConfig, isEdit]);

    const handleStrategyEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setStrategyEndDate(newDate);
        if (newDate && phaseConfig === 'FULL_CYCLE') {
            const nextDay = new Date(newDate);
            nextDay.setDate(nextDay.getDate() + 1);
            setDirectionStartDate(nextDay.toISOString().split('T')[0]);
        }
    };

    const handleSubmit = () => {
        if (!clientName.trim() || !projectName.trim() || selectedMembers.length === 0) return;

        const newProjectData: Partial<Project> = {
            title: projectName,
            client: clientName,
            members: selectedMembers,
            startDate,
            endDate,
            strategyEndDate: strategyEndDate || endDate,
            directionStartDate: directionStartDate || startDate,
            phase: phaseConfig === 'DIRECTION_ONLY' ? 'DIRECTION' : 'STRATEGY',
            status: 'ACTIVE'
        };

        onCreate(newProjectData);
    };

    const isValid = clientName.trim().length > 0 && projectName.trim().length > 0 && selectedMembers.length > 0 && startDate && endDate;

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-gray-50 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between sticky top-0 z-10">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Project Information' : 'Create New Project'}</h1>
                    <p className="text-gray-500 text-sm mt-1">{isEdit ? 'Modify project identity, team, and high-level schedule.' : 'Define project identity, team, and high-level schedule.'}</p>
                </div>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                    <X size={24} />
                </button>
            </div>

            <div className="max-w-3xl mx-auto w-full p-8 pb-32 space-y-12">
                <section className="space-y-6">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-l-4 border-gray-900 pl-3">1. Basic Information</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Client Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="e.g. Acme Corp"
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                autoFocus={!isEdit}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Project Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                placeholder="e.g. Winter Campaign 2025"
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-l-4 border-gray-900 pl-3">2. Participants</h3>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="mb-4">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Add Team Members</label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchMemberQuery}
                                    onChange={(e) => setSearchMemberQuery(e.target.value)}
                                    placeholder="Search by name or email..."
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            {searchMemberQuery && filteredUsers.length > 0 && (
                                <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto bg-white shadow-lg">
                                    {filteredUsers.map(u => (
                                        <div
                                            key={u.id}
                                            onClick={() => { setSelectedMembers([...selectedMembers, u]); setSearchMemberQuery(''); }}
                                            className="p-2 flex items-center gap-3 hover:bg-gray-50 cursor-pointer"
                                        >
                                            <img src={u.avatar} className="w-6 h-6 rounded-full" />
                                            <div className="text-sm text-gray-700">{u.name}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            {selectedMembers.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <img src={member.avatar} className="w-8 h-8 rounded-full border border-gray-200" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{member.name} {member.id === currentUser.id && <span className="text-xs text-gray-400">(You)</span>}</p>
                                            <p className="text-xs text-gray-500">{member.email}</p>
                                        </div>
                                    </div>
                                    {member.id !== currentUser.id && (
                                        <button onClick={() => setSelectedMembers(selectedMembers.filter(m => m.id !== member.id))} className="text-gray-400 hover:text-red-500 p-1">
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-l-4 border-gray-900 pl-3">3. Phase Configuration</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div
                            onClick={() => setPhaseConfig('STRATEGY_ONLY')}
                            className={`cursor-pointer border rounded-xl p-4 flex flex-col gap-3 transition-all ${phaseConfig === 'STRATEGY_ONLY' ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                        >
                            <div className="flex justify-between items-start">
                                <Layout className={phaseConfig === 'STRATEGY_ONLY' ? 'text-blue-600' : 'text-gray-400'} size={24} />
                                {phaseConfig === 'STRATEGY_ONLY' && <CheckCircle2 size={18} className="text-blue-600" />}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm">Strategy & Creative</h4>
                                <p className="text-xs text-gray-500 mt-1">Focus on ideation, mind mapping, and deck creation only.</p>
                            </div>
                        </div>

                        <div
                            onClick={() => setPhaseConfig('DIRECTION_ONLY')}
                            className={`cursor-pointer border rounded-xl p-4 flex flex-col gap-3 transition-all ${phaseConfig === 'DIRECTION_ONLY' ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                        >
                            <div className="flex justify-between items-start">
                                <Clapperboard className={phaseConfig === 'DIRECTION_ONLY' ? 'text-purple-600' : 'text-gray-400'} size={24} />
                                {phaseConfig === 'DIRECTION_ONLY' && <CheckCircle2 size={18} className="text-purple-600" />}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm">Direction Only</h4>
                                <p className="text-xs text-gray-500 mt-1">Focus on storyboard, shooting, and direction assets.</p>
                            </div>
                        </div>

                        <div
                            onClick={() => setPhaseConfig('FULL_CYCLE')}
                            className={`cursor-pointer border rounded-xl p-4 flex flex-col gap-3 transition-all ${phaseConfig === 'FULL_CYCLE' ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex gap-1">
                                    <Layout className={phaseConfig === 'FULL_CYCLE' ? 'text-gray-900' : 'text-gray-400'} size={24} />
                                    <Clapperboard className={phaseConfig === 'FULL_CYCLE' ? 'text-gray-900' : 'text-gray-400'} size={24} />
                                </div>
                                {phaseConfig === 'FULL_CYCLE' && <CheckCircle2 size={18} className="text-gray-900" />}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm">Full Cycle</h4>
                                <p className="text-xs text-gray-500 mt-1">End-to-end workflow from Strategy to Direction.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-l-4 border-gray-900 pl-3">4. Schedule</h3>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Project Start</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm font-medium"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Project End</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm font-medium"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-4 text-sm">
                                {phaseConfig !== 'DIRECTION_ONLY' && (
                                    <div className="flex-1 p-3 bg-blue-50 rounded border border-blue-100">
                                        <span className="text-blue-700 font-bold block mb-1">Creative Phase</span>
                                        <div className="flex justify-between text-xs text-blue-600">
                                            <span>{startDate}</span>
                                            <ArrowRight size={12} />
                                            <input
                                                type="date"
                                                value={strategyEndDate}
                                                onChange={handleStrategyEndDateChange}
                                                className="bg-transparent border-b border-blue-200 focus:border-blue-500 outline-none w-24 text-right"
                                            />
                                        </div>
                                    </div>
                                )}

                                {phaseConfig === 'FULL_CYCLE' && <ArrowRight className="text-gray-300" />}

                                {phaseConfig !== 'STRATEGY_ONLY' && (
                                    <div className="flex-1 p-3 bg-purple-50 rounded border border-purple-100">
                                        <span className="text-purple-700 font-bold block mb-1">Direction Phase</span>
                                        <div className="flex justify-between text-xs text-purple-600">
                                            <input
                                                type="date"
                                                value={directionStartDate}
                                                onChange={(e) => setDirectionStartDate(e.target.value)}
                                                className="bg-transparent border-b border-purple-200 focus:border-purple-500 outline-none w-24"
                                            />
                                            <ArrowRight size={12} />
                                            <span>{endDate}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <div className="bg-white border-t border-gray-200 p-6 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="max-w-3xl mx-auto flex justify-end gap-4">
                    <button
                        onClick={onCancel}
                        className="px-6 py-3 rounded-lg text-gray-600 font-medium hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!isValid}
                        className="px-8 py-3 bg-gray-900 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <Check size={18} />
                        {isEdit ? 'Save Changes' : 'Create Project'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateProjectFlow;

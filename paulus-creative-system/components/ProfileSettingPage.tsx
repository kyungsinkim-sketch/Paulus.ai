import React, { useState, useEffect } from 'react';
import { User, Project } from '../types';
import { User as UserIcon, Briefcase, FileText, Download, Save, MapPin, GraduationCap, Phone, Mail } from 'lucide-react';
import { exportToExcel } from '../services/export/exportExcel';

interface ProfileSettingPageProps {
    user: User;
    projects: Project[];
    onUpdateUser: (updatedUser: User) => void;
    language: 'EN' | 'KO';
}

const ProfileSettingPage: React.FC<ProfileSettingPageProps> = ({ user, projects, onUpdateUser, language }) => {
    const [formData, setFormData] = useState<User>(user);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData(user);
    }, [user]);

    const handleChange = (field: keyof User, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        setIsSaving(true);
        // Simulate API call
        setTimeout(() => {
            onUpdateUser(formData);
            setIsSaving(false);
            alert('Profile updated successfully!');
        }, 800);
    };

    // Filter projects where the user is a member
    const myProjects = projects.filter(p => p.members.some(m => m.id === user.id));

    // Export Career History to CSV
    const handleExportCareer = () => {
        const headers = [
            'Project Name',
            'Client',
            'Role',
            'Period',
            'Status',
            'Phase'
        ];

        const rows = myProjects.map(p => [
            p.title,
            p.client,
            user.role, // In a real app, role might be project-specific
            `${p.startDate} ~ ${p.endDate}`,
            p.status,
            p.phase
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(c => `"${c}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${user.name}_career_history.csv`;
        link.click();
    };

    return (
        <div className="flex flex-col h-full bg-[#F8F9FB] overflow-hidden font-sans text-[#0F172A]">
            {/* Header */}
            <div className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-10 shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200"><UserIcon size={24} /></div>
                    <div>
                        <h1 className="text-lg font-black text-gray-900 uppercase tracking-tighter leading-none">My Profile</h1>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-[0.2em] mt-2">Manage your identity & career portfolio</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all flex items-center gap-2"
                >
                    {isSaving ? 'Saving...' : <><Save size={14} /> Save Changes</>}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-10">

                    {/* Section 1: Personal Info */}
                    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3 mb-8 border-b border-gray-50 pb-4">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <UserIcon size={16} />
                            </div>
                            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Personal Information</h2>
                        </div>

                        <div className="grid grid-cols-12 gap-8">
                            {/* Avatar Area */}
                            <div className="col-span-3 flex flex-col items-center gap-4">
                                <div className="w-32 h-32 rounded-3xl bg-gray-100 border-[4px] border-white shadow-lg overflow-hidden relative group">
                                    <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                        <span className="text-white text-xs font-bold uppercase">Change</span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs font-black uppercase tracking-widest text-gray-400">Employee ID</div>
                                    <div className="font-mono font-bold text-gray-900">{formData.employeeId || 'N/A'}</div>
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="col-span-9 grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Name</label>
                                    <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Korean Name</label>
                                    <input type="text" value={formData.koreanName || ''} onChange={(e) => handleChange('koreanName', e.target.value)} className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                </div>

                                <div className="relative">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block flex items-center gap-1"><Mail size={10} /> Email</label>
                                    <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                </div>
                                <div className="relative">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block flex items-center gap-1"><Phone size={10} /> Phone</label>
                                    <input type="text" value={formData.phoneNumber || ''} onChange={(e) => handleChange('phoneNumber', e.target.value)} className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                </div>

                                <div className="col-span-2 relative">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block flex items-center gap-1"><MapPin size={10} /> Address</label>
                                    <input type="text" value={formData.address || ''} onChange={(e) => handleChange('address', e.target.value)} className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block flex items-center gap-1"><GraduationCap size={10} /> University</label>
                                    <input type="text" value={formData.university || ''} onChange={(e) => handleChange('university', e.target.value)} className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Major</label>
                                    <input type="text" value={formData.major || ''} onChange={(e) => handleChange('major', e.target.value)} className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Career History */}
                    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-8 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-50 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <Briefcase size={16} />
                                </div>
                                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Career History & Projects</h2>
                            </div>
                            <button
                                onClick={handleExportCareer}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-emerald-700 transition-all flex items-center gap-2"
                            >
                                <Download size={12} /> Export CSV
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[800px]">
                                <thead className="bg-[#EBF1F8] text-[10px] font-black text-gray-500 uppercase tracking-widest border-y border-[#DCE4EE]">
                                    <tr>
                                        <th className="px-6 py-4 border-r border-[#DCE4EE]">Project Name</th>
                                        <th className="px-6 py-4 border-r border-[#DCE4EE]">Project Summary</th>
                                        <th className="px-4 py-4 border-r border-[#DCE4EE]">Period</th>
                                        <th className="px-4 py-4 border-r border-[#DCE4EE]">Client</th>
                                        <th className="px-4 py-4 text-center border-r border-[#DCE4EE]" colSpan={2}>Affiliation / Role</th>
                                        <th className="px-4 py-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-xs">
                                    {myProjects.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-10 text-gray-400 italic">No project history found.</td>
                                        </tr>
                                    ) : myProjects.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900 border-r border-gray-100">{p.title}</td>
                                            <td className="px-6 py-4 text-gray-600 border-r border-gray-100 max-w-[200px] truncate">{p.brief?.problemDefinition?.statement || '-'}</td>
                                            <td className="px-4 py-4 font-mono text-gray-500 border-r border-gray-100 text-[10px]">
                                                {p.startDate} ~ <br /> {p.endDate}
                                            </td>
                                            <td className="px-4 py-4 text-gray-700 border-r border-gray-100">{p.client}</td>
                                            <td className="px-2 py-4 text-center border-r border-gray-100">
                                                <span className="block font-bold text-gray-900">Paulus</span>
                                                <span className="text-[9px] text-gray-400">Company</span>
                                            </td>
                                            <td className="px-2 py-4 text-center border-r border-gray-100">
                                                <span className="block font-bold text-blue-600">{user.role}</span>
                                                <span className="text-[9px] text-gray-400">{user.position}</span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`inline-block px-2 py-1 rounded-full text-[9px] font-black border ${p.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettingPage;

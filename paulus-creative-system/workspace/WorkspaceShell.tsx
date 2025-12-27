import React from 'react';
import { Sparkles, ArrowRight, FolderOpen, PlusCircle, Download } from 'lucide-react';

interface WorkspaceShellProps {
  onEnterWorkspace: () => void;
}

/**
 * WorkspaceShell
 * Restored dashboard-style entry screen for PAULUS.AI.
 * Pure UI component providing placeholders for system rehydration.
 */
const WorkspaceShell: React.FC<WorkspaceShellProps> = ({ onEnterWorkspace }) => {
  return (
    <div className="min-h-screen w-full bg-[#fcfcfc] flex flex-col items-center justify-center p-8 font-sans select-none">
      
      {/* 1. Header & Branding */}
      <div className="text-center mb-16 space-y-4 animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl rotate-3 hover:rotate-0 transition-transform duration-500">
          <Sparkles size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">PAULUS.AI</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em] mt-1">Creative & Narrative System</p>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="max-w-xl w-full space-y-8 animate-in fade-in zoom-in-95 duration-1000 delay-200">
        
        {/* Placeholder Card: Recent Projects */}
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] text-center space-y-6">
          <div className="flex items-center justify-between border-b border-gray-50 pb-4 px-2">
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
               <FolderOpen size={14}/> Recent Projects
             </span>
          </div>
          
          <div className="py-12 flex flex-col items-center gap-2 text-gray-300">
             <p className="text-xs font-bold uppercase tracking-widest">No projects yet</p>
             <p className="text-[10px] opacity-60 font-medium">System state is currently idle</p>
          </div>

          {/* Functional Entry Button */}
          <button
            onClick={onEnterWorkspace}
            className="w-full py-5 bg-gray-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-black transition-all shadow-xl hover:shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3 group"
          >
            Open Workspace
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 3. Secondary Actions Row (Placeholders) */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            disabled 
            className="py-4 px-6 border border-gray-100 bg-white/50 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center justify-center gap-2 cursor-not-allowed opacity-60 hover:bg-white transition-colors"
          >
            <PlusCircle size={14}/> Create New <span className="opacity-40 italic lowercase font-medium">soon</span>
          </button>
          <button 
            disabled 
            className="py-4 px-6 border border-gray-100 bg-white/50 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center justify-center gap-2 cursor-not-allowed opacity-60 hover:bg-white transition-colors"
          >
            <Download size={14}/> Import Project <span className="opacity-40 italic lowercase font-medium">soon</span>
          </button>
        </div>

      </div>

      {/* 4. Footer */}
      <footer className="mt-20 text-center space-y-1 animate-in fade-in duration-1000 delay-500">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          Internal Production Environment
        </p>
        <p className="text-[9px] text-gray-300 font-medium">
          v2.5.0-Banana • Security Level: Core Operations
        </p>
      </footer>

    </div>
  );
};

export default WorkspaceShell;

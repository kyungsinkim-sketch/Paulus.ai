import React, { useState, useMemo } from 'react';
import { Project, DeckVersion, User, Role, IntegrationAuditEntry, IntegrationSystem } from '../types';
import { GoogleSlidesBridge } from '../services/googleSlidesBridge';
import { PptxExportEngine } from '../services/pptxExportService';
import { 
  CloudUpload, 
  CloudDownload, 
  ExternalLink, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  FileBox,
  Share2,
  X,
  RefreshCw,
  FilePlus,
  Lock,
  Download,
  FileText
} from 'lucide-react';

interface GoogleSlidesBridgeUIProps {
  project: Project;
  currentUser: User;
  onImport: (deck: any, externalMeta: any) => void;
  onUpdateVersionMeta: (versionId: string, meta: any) => void;
  onLogAudit: (entry: Partial<IntegrationAuditEntry>) => void;
  onClose: () => void;
}

const GoogleSlidesBridgeUI: React.FC<GoogleSlidesBridgeUIProps> = ({ 
  project, 
  currentUser,
  onImport, 
  onUpdateVersionMeta, 
  onLogAudit,
  onClose 
}) => {
  const [isLinking, setIsLinking] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const pptxEngine = useMemo(() => new PptxExportEngine(), []);

  // PHASE Z: PERMISSION CONTROL
  // Only Admin, CD, Producer, or Strategist can push/pull data or export official files.
  const hasExportPermission = [
    Role.ADMIN, 
    Role.CREATIVE_DIRECTOR, 
    Role.PRODUCER, 
    Role.STRATEGIST
  ].includes(currentUser.role as Role);

  // Policy: Only approved versions for export
  const approvedVersions = project.versions.filter(v => v.status === 'approved');

  const handleLinkAccount = () => {
    setIsLinking(true);
    setTimeout(() => {
      setIsLinked(true);
      setIsLinking(false);
    }, 1500);
  };

  const handleExportPPTX = async (version: DeckVersion) => {
    if (!hasExportPermission) return;
    setIsProcessing(true);
    setStatusMsg(`Generating PPTX for "${version.name}"...`);
    
    try {
        await pptxEngine.exportDeck(version.deckSnapshot);
        
        // PHASE Z: AUDIT LOGGING (Append Only)
        onLogAudit({
          system: 'PPTX_LOCAL',
          action: 'EXPORT_NEW',
          versionId: version.id,
          versionName: version.name,
          details: 'Local PPTX Download'
        });

        setIsProcessing(false);
        setStatusMsg(`Successfully generated PPTX.`);
    } catch (err) {
        console.error("PPTX Export Error:", err);
        setIsProcessing(false);
        setStatusMsg(`Failed to generate PPTX.`);
    }
  };

  const handleExport = async (version: DeckVersion, forceNew: boolean = false) => {
    if (!hasExportPermission) return;
    setIsProcessing(true);
    const existingId = version.meta?.externalPresentationId;
    const isUpdate = (existingId && !forceNew);
    const targetAction = isUpdate ? `Updating Presentation (${existingId})...` : 'Creating new Google Slides...';
    
    setStatusMsg(targetAction);
    
    // Transform logic (Stateless)
    const requests = GoogleSlidesBridge.exportToGoogleSlides(version.deckSnapshot);
    
    // Simulate API logic
    setTimeout(() => {
        const newId = existingId && !forceNew ? existingId : `gs_file_${Date.now()}`;
        
        onUpdateVersionMeta(version.id, {
            ...version.meta,
            externalPresentationId: newId,
            exportedAt: new Date().toISOString(),
            origin: 'INTERNAL'
        });

        // PHASE Z: AUDIT LOGGING (Append Only)
        onLogAudit({
          system: 'GOOGLE_SLIDES',
          action: isUpdate ? 'UPDATE_EXISTING' : 'EXPORT_NEW',
          versionId: version.id,
          versionName: version.name,
          externalId: newId
        });

        setIsProcessing(false);
        setStatusMsg(`Successfully ${isUpdate ? 'updated' : 'exported'} to Google Drive.`);
    }, 2000);
  };

  const handleImport = async () => {
    if (!hasExportPermission) return;
    setIsProcessing(true);
    setStatusMsg(`Polling Google Workspace...`);
    
    setTimeout(() => {
        const mockResponse = {
            presentationId: 'gs_presentation_abc_123',
            pageSize: { width: { magnitude: 720 }, height: { magnitude: 405 } },
            slides: [
                { objectId: 's1', pageElements: [{ shape: { shapeType: 'TEXT_BOX', text: { textElements: [{ textRun: { content: 'Imported Brand Strategy' } }] } } }] }
            ]
        };

        const { deck, externalMeta } = GoogleSlidesBridge.importFromGoogleSlides(mockResponse);
        onImport(deck, externalMeta);
        
        // PHASE Z: AUDIT LOGGING (Append Only)
        onLogAudit({
          system: 'GOOGLE_SLIDES',
          action: 'IMPORT',
          externalId: externalMeta.presentationId
        });

        setIsProcessing(false);
        setStatusMsg(`Imported "${externalMeta.presentationId}" as new version.`);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans overflow-hidden border-l border-gray-200 shadow-2xl animate-in slide-in-from-right duration-300">
      <div className="h-14 border-b border-gray-100 bg-gray-50 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-yellow-100 flex items-center justify-center">
                <FileBox size={18} className="text-yellow-600" />
            </div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter">Delivery Integrations</h3>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-10">
        
        {!isLinked ? (
            <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl text-center space-y-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <ExternalLink size={24} className="text-blue-500"/>
                </div>
                <div>
                    <h4 className="font-bold text-blue-900">Workspace Not Linked</h4>
                    <p className="text-xs text-blue-600 mt-1">Connect your account for cloud delivery and sync.</p>
                </div>
                <button 
                    onClick={handleLinkAccount}
                    disabled={isLinking}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                >
                    {isLinking ? <Loader2 size={16} className="animate-spin"/> : <Share2 size={16}/>}
                    Link Google Account
                </button>
            </div>
        ) : (
            <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-green-200">
                        <CheckCircle2 size={16} className="text-green-500" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-green-900">Workspace Connected</p>
                        <p className="text-[10px] text-green-600">Audit logs active.</p>
                    </div>
                </div>
                {!hasExportPermission && (
                  <div className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100 flex items-center gap-1">
                    <Lock size={10}/> Read-Only
                  </div>
                )}
            </div>
        )}

        <div className="space-y-4">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <CloudUpload size={12}/> Export Approved Snapshots
            </h4>
            
            <div className="space-y-4">
                {approvedVersions.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                        <p className="text-xs text-gray-400 font-medium leading-relaxed">No approved versions available for delivery. Mark a version as approved in the viewer to enable export.</p>
                    </div>
                ) : (
                    approvedVersions.map(v => (
                        <div key={v.id} className="p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-all space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h5 className="text-sm font-bold text-gray-800">{v.name}</h5>
                                    {v.meta?.externalPresentationId && (
                                        <p className="text-[9px] text-blue-500 font-mono mt-0.5 flex items-center gap-1">
                                            <ExternalLink size={8}/> G-Slides: {v.meta.externalPresentationId}
                                        </p>
                                    )}
                                </div>
                                <span className="text-[10px] text-gray-400">{new Date(v.createdAt).toLocaleDateString()}</span>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleExport(v)}
                                        disabled={!isLinked || isProcessing || !hasExportPermission}
                                        className="flex-1 py-1.5 bg-gray-900 text-white rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-black disabled:opacity-30 flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        {v.meta?.externalPresentationId ? <RefreshCw size={10}/> : <CloudUpload size={10}/>}
                                        {v.meta?.externalPresentationId ? 'Update G-Slides' : 'Push to G-Slides'}
                                    </button>
                                    {v.meta?.externalPresentationId && (
                                        <button 
                                            onClick={() => handleExport(v, true)}
                                            disabled={!isLinked || isProcessing || !hasExportPermission}
                                            className="p-1.5 border border-gray-200 text-gray-400 hover:text-gray-900 rounded hover:bg-gray-50 disabled:opacity-30 transition-colors"
                                            title="Export as new G-Slides file"
                                        >
                                            <FilePlus size={14}/>
                                        </button>
                                    )}
                                </div>
                                <button 
                                    onClick={() => handleExportPPTX(v)}
                                    disabled={isProcessing || !hasExportPermission}
                                    className="w-full py-1.5 bg-white border border-gray-200 text-gray-700 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-gray-50 disabled:opacity-30 flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <FileText size={10}/> Export Local PPTX
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        <div className="space-y-4">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <CloudDownload size={12}/> Import Presentation
            </h4>
            <button 
                onClick={handleImport}
                disabled={!isLinked || isProcessing || !hasExportPermission}
                className="w-full py-6 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50/30 transition-all disabled:opacity-30"
            >
                <CloudDownload size={24}/>
                <span className="text-xs font-bold uppercase tracking-tighter">Pull from Drive</span>
            </button>
        </div>

      </div>

      {statusMsg && (
        <div className="p-4 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-3">
            {isProcessing ? <Loader2 size={12} className="animate-spin text-blue-400" /> : <CheckCircle2 size={12} className="text-green-400" />}
            {statusMsg}
        </div>
      )}
    </div>
  );
};

export default GoogleSlidesBridgeUI;
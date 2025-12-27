import React from 'react';
import { IntegrationAuditEntry, Language } from '../types';
import { 
  FileCheck, 
  ExternalLink, 
  CloudUpload, 
  CloudDownload, 
  RefreshCw, 
  User, 
  Clock,
  Shield,
  FileBox
} from 'lucide-react';

interface DeliveryHistoryProps {
  logs: IntegrationAuditEntry[];
  language: Language;
}

const DeliveryHistory: React.FC<DeliveryHistoryProps> = ({ logs, language }) => {
  const t = (en: string, ko: string) => language === 'KO' ? ko : en;

  const getActionIcon = (action: IntegrationAuditEntry['action']) => {
    switch (action) {
      case 'EXPORT_NEW': return <CloudUpload size={16} className="text-blue-500" />;
      case 'UPDATE_EXISTING': return <RefreshCw size={16} className="text-emerald-500" />;
      case 'IMPORT': return <CloudDownload size={16} className="text-purple-500" />;
      default: return <FileCheck size={16} className="text-gray-400" />;
    }
  };

  const getSystemBadge = (system: IntegrationAuditEntry['system']) => {
    const isGS = system === 'GOOGLE_SLIDES';
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${isGS ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
        {system.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans overflow-hidden">
      <div className="h-12 border-b border-gray-100 bg-gray-50 flex items-center px-4 shrink-0">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Shield size={14}/> {t('External Delivery Audit Log', '외부 전달 및 감사 기록')}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-center opacity-30">
             <FileBox size={48} strokeWidth={1} className="mb-2"/>
             <p className="text-xs font-bold uppercase tracking-tight">{t('No History Found', '전달 기록 없음')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.slice().reverse().map((entry) => (
              <div key={entry.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {getActionIcon(entry.action)}
                    <span className="text-xs font-bold text-gray-900">
                      {entry.action === 'EXPORT_NEW' ? t('Export to New File', '신규 내보내기') : 
                       entry.action === 'UPDATE_EXISTING' ? t('Updated Existing File', '기존 파일 업데이트') : 
                       t('Imported Content', '가져오기')}
                    </span>
                    {getSystemBadge(entry.system)}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                    <Clock size={10}/>
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>

                <div className="space-y-1.5 ml-6">
                  <div className="flex items-center gap-1.5">
                    <User size={12} className="text-gray-400"/>
                    <span className="text-[11px] text-gray-600 font-bold">{entry.userName}</span>
                  </div>
                  
                  {entry.versionName && (
                    <div className="flex items-center gap-1.5">
                      <FileCheck size={12} className="text-gray-400"/>
                      <span className="text-[11px] text-gray-500">
                        {t('Version', '버전')}: <span className="font-semibold text-gray-700">{entry.versionName}</span>
                      </span>
                    </div>
                  )}

                  {entry.externalId && (
                    <div className="flex items-center gap-1.5">
                      <ExternalLink size={12} className="text-gray-400"/>
                      <span className="text-[10px] font-mono text-blue-500 truncate max-w-[200px]">
                        ID: {entry.externalId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 bg-gray-50 border-t border-gray-100">
         <p className="text-[9px] text-gray-400 leading-tight flex items-center gap-1.5">
           <Shield size={10}/> {t('Audit records are immutable and append-only for delivery hardening.', '감사 기록은 변조가 불가능하며 배포 보증을 위해 추가만 가능합니다.')}
         </p>
      </div>
    </div>
  );
};

export default DeliveryHistory;
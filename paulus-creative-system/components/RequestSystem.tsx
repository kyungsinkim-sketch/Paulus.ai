import React, { useState, useEffect, useRef } from 'react';
import { Project, User, Request, Role, Language } from '../types';
import { Bell, CheckCircle2, Clock, Plus, X, ArrowRight, MessageSquare, Check } from 'lucide-react';

// --- CONTEXT MENU ---
export const RequestContextMenu: React.FC<{
    position: { x: number, y: number } | null;
    onClose: () => void;
    onRequestCreate: () => void;
}> = ({ position, onClose, onRequestCreate }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    if (!position) return null;

    return (
        <div 
            ref={menuRef}
            className="fixed z-[100] bg-white border border-gray-200 shadow-xl rounded-lg py-1 w-48 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: position.y, left: position.x }}
        >
            <button 
                onClick={() => { onRequestCreate(); onClose(); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
                <Plus size={14} className="text-blue-600"/>
                Create Request
            </button>
        </div>
    );
};

// --- REQUEST CREATION MODAL ---
export const CreateRequestModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (request: Partial<Request>) => void;
    projectMembers: User[];
    contextLabel: string;
    language: Language;
}> = ({ isOpen, onClose, onSubmit, projectMembers, contextLabel, language }) => {
    const [message, setMessage] = useState('');
    const [assigneeId, setAssigneeId] = useState('');

    if (!isOpen) return null;

    const t = (en: string, ko: string) => language === 'KO' ? ko : en;

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-900">{t('New Request', '새 요청')}</h3>
                    <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 inline-block">
                        Context: {contextLabel}
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('Assign To', '담당자')}</label>
                        <select 
                            value={assigneeId} 
                            onChange={(e) => setAssigneeId(e.target.value)}
                            className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                        >
                            <option value="">{t('Select Member', '멤버 선택')}</option>
                            {projectMembers.map(m => (
                                <option key={m.id} value={m.id}>{m.name} ({m.role.split('/')[0]})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('Message', '메시지')}</label>
                        <textarea 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-lg text-sm h-32 resize-none outline-none focus:border-blue-500"
                            placeholder={t('Describe what needs to be done...', '요청 사항을 입력하세요...')}
                        />
                    </div>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 font-medium hover:bg-gray-200 rounded-lg">{t('Cancel', '취소')}</button>
                    <button 
                        onClick={() => {
                            if (assigneeId && message) {
                                onSubmit({ assigneeId, message, context: contextLabel });
                                onClose();
                                setMessage('');
                                setAssigneeId('');
                            }
                        }}
                        disabled={!assigneeId || !message}
                        className="px-4 py-2 text-sm bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-700 disabled:opacity-50"
                    >
                        {t('Send Request', '요청 보내기')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- NOTIFICATION SYSTEM ---
export const RequestNotifications: React.FC<{
    requests: Request[];
    projectMembers: User[];
    currentUserId: string;
    onUpdateRequest: (reqId: string, status: Request['status'], comment?: string) => void;
    language: Language;
}> = ({ requests, projectMembers, currentUserId, onUpdateRequest, language }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [completingRequestId, setCompletingRequestId] = useState<string | null>(null);
    const [completionComment, setCompletionComment] = useState('');
    
    // Filter requests relevant to me (assigned to me OR created by me)
    const myRequests = requests.filter(r => r.assigneeId === currentUserId || r.requesterId === currentUserId).reverse();
    const pendingCount = myRequests.filter(r => r.assigneeId === currentUserId && r.status === 'PENDING').length;

    const t = (en: string, ko: string) => language === 'KO' ? ko : en;

    const getStatusIcon = (status: Request['status']) => {
        switch(status) {
            case 'PENDING': return <Clock size={14} className="text-orange-500"/>;
            case 'IN_PROGRESS': return <Clock size={14} className="text-blue-500"/>;
            case 'COMPLETED': return <CheckCircle2 size={14} className="text-green-500"/>;
        }
    };

    const handleComplete = (reqId: string) => {
        onUpdateRequest(reqId, 'COMPLETED', completionComment);
        setCompletingRequestId(null);
        setCompletionComment('');
    };

    return (
        <div className="relative">
            {isOpen && (
                <div className="absolute bottom-14 left-0 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200 flex flex-col max-h-[400px]">
                    <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h4 className="font-bold text-sm text-gray-800">{t('Requests', '요청 목록')}</h4>
                        <button onClick={() => setIsOpen(false)}><X size={14} className="text-gray-400 hover:text-gray-600"/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {myRequests.length === 0 && (
                            <div className="text-center py-8 text-xs text-gray-400">
                                {t('No requests found.', '요청이 없습니다.')}
                            </div>
                        )}
                        {myRequests.map(req => {
                            const isAssignedToMe = req.assigneeId === currentUserId;
                            const otherUser = projectMembers.find(m => m.id === (isAssignedToMe ? req.requesterId : req.assigneeId));
                            const isCompleting = completingRequestId === req.id;
                            
                            return (
                                <div key={req.id} className="p-3 bg-white border border-gray-100 rounded-lg hover:border-blue-200 transition-colors shadow-sm">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                                            {isAssignedToMe ? t('From', '보낸이') : t('To', '담당자')}: {otherUser?.name}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px]">
                                            {getStatusIcon(req.status)}
                                            <span>{req.status}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-800 font-medium line-clamp-2 mb-2">{req.message}</p>
                                    
                                    {req.status === 'COMPLETED' && req.completionComment && (
                                        <div className="mb-2 p-2 bg-green-50 text-green-800 text-[10px] rounded border border-green-100 italic">
                                            "{req.completionComment}"
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{req.context}</span>
                                        
                                        {isAssignedToMe && req.status !== 'COMPLETED' && (
                                            !isCompleting ? (
                                                <div className="flex gap-2">
                                                    {req.status === 'PENDING' && (
                                                        <button 
                                                            onClick={() => onUpdateRequest(req.id, 'IN_PROGRESS')}
                                                            className="text-[10px] font-bold text-blue-600 hover:underline"
                                                        >
                                                            {t('Start', '시작')}
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => setCompletingRequestId(req.id)}
                                                        className="text-[10px] font-bold text-green-600 hover:underline"
                                                    >
                                                        {t('Done', '완료')}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex-1 ml-2 flex gap-1 items-center animate-in fade-in">
                                                    <input 
                                                        value={completionComment}
                                                        onChange={(e) => setCompletionComment(e.target.value)}
                                                        placeholder="Comment (optional)"
                                                        className="flex-1 text-[10px] border border-gray-300 rounded px-1 py-0.5 outline-none"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleComplete(req.id)} className="bg-green-600 text-white p-1 rounded hover:bg-green-700">
                                                        <Check size={10}/>
                                                    </button>
                                                    <button onClick={() => setCompletingRequestId(null)} className="text-gray-400 p-1 hover:text-gray-600">
                                                        <X size={10}/>
                                                    </button>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-300 rounded-full shadow-lg flex items-center justify-center transition-all relative group"
            >
                <Bell size={18}/>
                {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full shadow-sm">
                        {pendingCount}
                    </span>
                )}
                {/* Tooltip */}
                <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {t('Requests', '요청 확인')}
                </span>
            </button>
        </div>
    );
};
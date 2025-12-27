
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Bot, User as UserIcon, File as FileIcon, Download, Loader2, X } from 'lucide-react';
import { ChatMessage, User } from '../types';
import { projectChatService } from '../services/projectChatService';

interface ChatPanelProps {
  currentUser: User;
  projectId: string;
  onClose: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ currentUser, projectId, onClose }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize with persistent backend session
  useEffect(() => {
    let active = true;
    
    projectChatService.connect(projectId).then(history => {
        if (active) setMessages(history);
    });

    const unsubscribe = projectChatService.subscribe(projectId, (msg) => {
        if (active) setMessages(prev => [...prev, msg]);
    });

    return () => {
        active = false;
        unsubscribe();
    };
  }, [projectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      projectId,
      userId: currentUser.id,
      text: input,
      timestamp: new Date().toISOString(),
      type: 'TEXT'
    };

    await projectChatService.sendMessage(projectId, newMsg);
    setInput("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
        const { url, name } = await projectChatService.uploadFile(projectId, file);
        
        const fileMsg: ChatMessage = {
            id: `file-${Date.now()}`,
            projectId,
            userId: currentUser.id,
            fileName: name,
            fileUrl: url,
            timestamp: new Date().toISOString(),
            type: 'FILE'
        };
        
        await projectChatService.sendMessage(projectId, fileMsg);
    } catch (err) {
        console.error("Upload failed", err);
    } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-full shadow-2xl overflow-hidden">
      {/* Header with explicit close button (R14-3) */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
        <div>
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                Project Team Chat
            </h3>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Realtime Production Sync</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Connected"></span>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-900 transition-colors"
            title="Close Chat"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Responsive Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fcfcfc] custom-scrollbar" ref={scrollRef}>
        {messages.map((msg) => {
          const isMe = msg.userId === currentUser.id;
          const isAI = msg.type === 'AI_GENERATED';
          const isFile = msg.type === 'FILE';
          
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[90%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-start gap-2`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isAI ? 'bg-purple-100' : 'bg-gray-100 shadow-sm border border-gray-200'}`}>
                    {isAI ? <Bot size={14} className="text-purple-600" /> : <UserIcon size={14} className="text-gray-500" />}
                </div>
                <div className={`p-3 rounded-2xl text-[12px] leading-relaxed shadow-sm ${
                  isMe ? 'bg-blue-600 text-white rounded-tr-none' : 
                  isAI ? 'bg-purple-50 border border-purple-100 text-gray-800 rounded-tl-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                }`}>
                  {isFile ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 font-black uppercase text-[10px]">
                            <FileIcon size={14} />
                            <span className="truncate max-w-[140px]">{msg.fileName}</span>
                        </div>
                        <a 
                            href={msg.fileUrl} 
                            download={msg.fileName}
                            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-colors ${isMe ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'}`}
                        >
                            <Download size={10}/> Download
                        </a>
                    </div>
                  ) : (
                    <p>{msg.text}</p>
                  )}
                  <span className={`text-[8px] font-bold block mt-1 uppercase tracking-tighter opacity-50`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {isProcessing && (
             <div className="flex justify-start">
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
                    <Loader2 size={12} className="animate-spin" /> Processing Asset...
                </div>
             </div>
        )}
      </div>

      {/* Input Area anchored at bottom */}
      <div className="p-4 border-t border-gray-100 bg-white shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-2 border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 ring-offset-2 transition-all">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload}
          />
          <button 
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
            onClick={() => fileInputRef.current?.click()}
            title="Attach File"
          >
            <Paperclip size={18} />
          </button>
          <input
            type="text"
            className="flex-1 bg-transparent outline-none text-xs font-medium text-gray-800 placeholder:text-gray-400 px-1"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-30 transition-all shadow-lg shadow-blue-200"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;

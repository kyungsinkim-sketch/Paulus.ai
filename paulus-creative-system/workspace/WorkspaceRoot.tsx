
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import CreativeDeckView from '../components/CreativeDeckView';
import CreativeCanvas from '../components/CreativeCanvas';
import Dashboard from '../components/Dashboard';
import ClientBriefView from '../components/ClientBriefView';
import StrategyResearchView from '../components/StrategyResearchView';
import CopyScriptPage from '../components/CopyScriptPage';
import StoryboardPage from '../components/StoryboardPage';
import DirectionBoardPage from '../components/DirectionBoardPage';
import ProductionPage from '../components/ProductionPage';
import AdminDashboardPage from '../components/AdminDashboardPage';
import DeckRail from '../components/DeckRail';
import GlobalUserArea from '../components/GlobalUserArea';
import TopSubBar from '../components/TopSubBar';
import ChatPanel from '../components/ChatPanel';
import CreateProjectFlow from '../components/CreateProjectFlow';
import { Project, Language, Slide, User, UserWorkStatus, ProjectPresence } from '../types';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useLanguageMode } from '../hooks/useLanguageMode';
import { DeckYjsAdapter } from '../services/deckYjsService';
import { DeckOutputAdapter } from '../services/deckOutputAdapter';
import { DeckLegacyAdapter } from '../services/deckLegacyAdapter';
import { StaffSeedService } from '../services/staffSeedService';
import { exportIdeationNodesToDeck } from '../services/moduleExport/ideationExport';
import { projectChatService } from '../services/projectChatService';
import {
  FolderOpen,
  LayoutDashboard,
  ShieldCheck,
  FileText,
  Target,
  Zap,
  Presentation,
  PenTool,
  Film,
  Hammer,
  Eye,
  EyeOff,
  Edit2
} from 'lucide-react';

import ProfileSettingPage from '../components/ProfileSettingPage';

type NavSection = 'DASHBOARD' | 'PROJECT' | 'ADMIN' | 'PROFILE';

type ProjectStage =
  | 'CLIENT_BRIEF'
  | 'STRATEGY_RESEARCH'
  | 'CREATIVE_IDEATION'
  | 'DECK_EDITOR'
  | 'COPY_SCRIPT'
  | 'STORYBOARD'
  | 'DIRECTION'
  | 'PRODUCTION';

interface StageConfig {
  id: ProjectStage;
  labelEN: string;
  labelKO: string;
  icon: any;
}

const STAGE_FLOW: StageConfig[] = [
  { id: 'CLIENT_BRIEF', labelEN: 'Client Brief', labelKO: '클라이언트 브리프', icon: FileText },
  { id: 'STRATEGY_RESEARCH', labelEN: 'Strategy Research', labelKO: '전략 리서치', icon: Target },
  { id: 'CREATIVE_IDEATION', labelEN: 'Creative Ideation', labelKO: '크리에이티브 발상', icon: Zap },
  { id: 'DECK_EDITOR', labelEN: 'Deck Editor', labelKO: '덱 에디터', icon: Presentation },
  { id: 'COPY_SCRIPT', labelEN: 'Copy & Script', labelKO: '카피 & 스크립트', icon: PenTool },
  { id: 'STORYBOARD', labelEN: 'Storyboard', labelKO: '스토리보드', icon: Film },
  { id: 'DIRECTION', labelEN: 'Direction', labelKO: '제작 디렉션', icon: Hammer },
  { id: 'PRODUCTION', labelEN: 'Production', labelKO: '프로덕션 관리', icon: ShieldCheck },
];

const WorkspaceRoot: React.FC = () => {
  const [activeNav, setActiveNav] = useState<NavSection>('DASHBOARD');
  const [activeStage, setActiveStage] = useState<ProjectStage>('CLIENT_BRIEF');
  const { language, setLanguage } = useLanguageMode('EN');
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [isRailVisible, setIsRailVisible] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [presence, setPresence] = useState<ProjectPresence[]>([]);

  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);

  const t = (en: string, ko: string) => language === 'KO' ? ko : en;

  /* User State (Synced with Admin) */
  const [users, setUsers] = useState<User[]>(() => StaffSeedService.getAllStaff());
  const [currentUser, setCurrentUser] = useState<User>(users[0]);
  const { canAccessAdminPanel } = useAdminAccess(currentUser);

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const project = useMemo(() =>
    projects.find(p => p.id === currentProjectId) || null,
    [projects, currentProjectId]);

  // Initial Seed
  useEffect(() => {
    if (projects.length === 0) {
      const defaultProj: Project = {
        id: 'initial-paulus-project',
        title: 'Paulus Brand Restoration',
        client: 'Paulus Internal',
        startDate: new Date().toISOString().split('T')[0],
        strategyEndDate: new Date().toISOString().split('T')[0],
        directionStartDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        phase: 'STRATEGY',
        status: 'ACTIVE',
        members: [currentUser],
        canvasItems: [],
        canvasConnections: [],
        deck: {
          id: 'deck-1',
          projectId: 'initial-paulus-project',
          title: 'Initial Deck',
          slides: [{ id: 'slide-1', title: 'Cover', type: 'COVER', layout: 'BLANK', backgroundColor: '#FFFFFF', isFinal: false, pageNumber: 1, blocks: [] }],
          history: []
        },
        strategyResearch: [],
        directionBoard: [],
        brief: { rawText: '', problemDefinition: { statement: '', why: '', cause: '', isConfirmed: false }, gaps: [], assumptions: [] },
        versions: [],
        comments: [],
        deliveryAuditLog: [],
        tasks: [],
        chatHistory: [],
        requests: [],
        shootingSchedule: [],
        productionData: { activeEstimateType: 'TYPE_A' }
      };
      setProjects([defaultProj]);
      setCurrentProjectId(defaultProj.id);
    }
  }, []);

  useEffect(() => {
    if (activeNav !== 'PROJECT' || !project) return;
    const unsubscribe = projectChatService.subscribePresence(project.id, (list) => {
      setPresence(list);
    });
    return () => unsubscribe();
  }, [project?.id, activeNav]);

  const handleUpdateProject = useCallback((updated: Project) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  }, []);

  const handleCreateProject = (partial: Partial<Project>) => {
    const id = `proj-${Date.now()}`;
    const newProj: Project = {
      ...partial as Project,
      id,
      canvasItems: [],
      canvasConnections: [],
      deck: {
        id: `deck-${id}`,
        projectId: id,
        title: partial.title || 'Untitled',
        slides: [{ id: `slide-1-${id}`, title: 'Cover', type: 'COVER', layout: 'BLANK', backgroundColor: '#FFFFFF', isFinal: false, pageNumber: 1, blocks: [] }],
        history: []
      },
      strategyResearch: [],
      directionBoard: [],
      brief: { rawText: '', problemDefinition: { statement: '', why: '', cause: '', isConfirmed: false }, gaps: [], assumptions: [] },
      versions: [],
      comments: [],
      deliveryAuditLog: [],
      tasks: [],
      chatHistory: [],
      requests: [],
      shootingSchedule: [],
      productionData: { activeEstimateType: 'TYPE_A' }
    };
    setProjects(prev => [...prev, newProj]);
    setCurrentProjectId(id);
    setIsCreatingProject(false);
    setActiveNav('PROJECT');
  };

  const handleEditProject = (partial: Partial<Project>) => {
    if (!project) return;
    handleUpdateProject({ ...project, ...partial });
    setIsEditingProject(false);
  };

  const handleStatusChange = async (status: UserWorkStatus, location?: { lat: number; lng: number }) => {
    setCurrentUser(prev => ({ ...prev, workStatus: status, lastStatusChange: new Date().toISOString() }));
    if (project) {
      try {
        await projectChatService.updatePresence(project.id, currentUser.id, status, location);
      } catch (err) {
        console.error('[Workspace] Presence sync failed', err);
      }
    }
  };

  const handleUpdateUser = useCallback((updated: User) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    if (currentUser.id === updated.id) {
      setCurrentUser(updated);
    }
  }, [currentUser.id]);

  const handleAddSlide = useCallback(() => {
    if (!project) return;
    const newId = `slide-${Date.now()}`;
    const newSlide: Slide = { id: newId, title: 'New Slide', type: 'CONCEPT', layout: 'TITLE_BULLETS', backgroundColor: '#FFFFFF', isFinal: false, pageNumber: project.deck.slides.length + 1, blocks: [] };
    handleUpdateProject({ ...project, deck: { ...project.deck, slides: [...project.deck.slides, newSlide] } });
    setSelectedSlideId(newId);
  }, [project, handleUpdateProject]);

  const handleExportToDeck = useCallback((itemIds: string[]) => {
    if (!project) return;
    const yjs = new DeckYjsAdapter();
    const canonical = DeckLegacyAdapter.toCanonicalDeck(project);
    yjs.loadFromJSON(canonical);
    const outputAdapter = new DeckOutputAdapter(yjs);
    const nodes = project.canvasItems.filter(item => itemIds.includes(item.id));
    exportIdeationNodesToDeck(outputAdapter, nodes).then(() => {
      const updatedCanonical = yjs.exportToJSON();
      const legacySlides: Slide[] = updatedCanonical.slides.map(s => {
        const blocks: any[] = [];
        s.elements.forEach(el => {
          if (el.text) blocks.push({ id: el.id, type: 'TITLE', content: { text: el.text.content } });
          if (el.image) blocks.push({ id: el.id, type: 'IMAGE', content: { url: el.image.src } });
        });
        return { id: s.id, title: s.meta.sectionTitle || 'Idea Plate', type: s.styleType as any, layout: 'BLANK', blocks, isFinal: false, pageNumber: 0 };
      });
      legacySlides.forEach((s, i) => s.pageNumber = i + 1);
      handleUpdateProject({ ...project, deck: { ...project.deck, slides: legacySlides } });
      alert(t('Export successful', '성공적으로 내보냈습니다.'));
    });
  }, [project, t, handleUpdateProject]);

  const renderContent = () => {
    if (activeNav === 'DASHBOARD') return <Dashboard projects={projects} onCreateProject={() => setIsCreatingProject(true)} onOpenProject={(id) => { setCurrentProjectId(id); setActiveNav('PROJECT'); }} onShareProject={() => { }} onUpdateProject={() => { }} language={language} />;
    if (!project) return null;
    switch (activeNav) {
      case 'PROJECT':
        switch (activeStage) {
          case 'CLIENT_BRIEF': return <ClientBriefView project={project} onUpdateProject={handleUpdateProject} onProceed={() => setActiveStage('STRATEGY_RESEARCH')} language={language} currentUser={currentUser} />;
          case 'STRATEGY_RESEARCH': return <StrategyResearchView project={project} onUpdateProject={handleUpdateProject} onProceed={() => setActiveStage('CREATIVE_IDEATION')} language={language} />;
          case 'CREATIVE_IDEATION': return <CreativeCanvas items={project.canvasItems} connections={project.canvasConnections} onUpdateItems={(items) => handleUpdateProject({ ...project, canvasItems: items })} onUpdateConnections={(conns) => handleUpdateProject({ ...project, canvasConnections: conns })} onExportToDeck={handleExportToDeck} language={language} currentUser={currentUser} />;
          case 'DECK_EDITOR': return <CreativeDeckView project={project} onUpdateProject={handleUpdateProject} language={language} selectedSlideId={selectedSlideId} onSelectSlide={setSelectedSlideId} onAddSlide={handleAddSlide} currentUser={currentUser} />;
          case 'COPY_SCRIPT': return <CopyScriptPage project={project} onUpdateProject={handleUpdateProject} language={language} />;
          case 'STORYBOARD': return <StoryboardPage project={project} onUpdateProject={handleUpdateProject} language={language} />;
          case 'DIRECTION': return <DirectionBoardPage project={project} onUpdateProject={handleUpdateProject} language={language} currentUser={currentUser} />;
          case 'PRODUCTION': return <ProductionPage project={project} onUpdateProject={handleUpdateProject} language={language} />;
          default: return null;
        }
      case 'ADMIN': return <AdminDashboardPage projects={projects} users={users} onUpdateProject={handleUpdateProject} onUpdateUser={handleUpdateUser} language={language} />;
      case 'PROFILE': return <ProfileSettingPage user={currentUser} projects={projects} onUpdateUser={handleUpdateUser} language={language} />;
      default: return null;
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F8F9FB] flex font-sans text-[#0F172A]">
      <aside className="left-nav w-[260px] h-full flex flex-col shrink-0 z-[100] shadow-sm">
        <div className="h-[64px] flex items-center px-6 border-b border-white/5 shrink-0">
          <div className="font-black text-sm uppercase tracking-[0.25em] text-white">PAULUS.AI</div>
        </div>
        <div className="px-6 py-6 border-b border-white/5 relative group">
          <h2 className="current-project-title truncate pr-8">{project?.title || t('Untitled Project', '제목 없는 프로젝트')}</h2>
          <p className="current-project-subtitle">{project?.client || t('No Client', '고객사 없음')}</p>
          {project && activeNav === 'PROJECT' && (
            <button
              onClick={() => setIsEditingProject(true)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-blue-400 transition-colors"
              title="Edit Project Info"
            >
              <Edit2 size={14} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <nav className="space-y-0.5">
            <button onClick={() => setActiveNav('DASHBOARD')} className={`nav-item w-full ${activeNav === 'DASHBOARD' ? 'active' : ''}`}>
              <LayoutDashboard className="icon" /> <span>{t('Home', '홈')}</span>
            </button>
            <div className="mt-2">
              <button onClick={() => setActiveNav('PROJECT')} className={`nav-item w-full ${activeNav === 'PROJECT' ? 'active' : ''}`}>
                <FolderOpen className="icon" /> <span>{t('Workspace', '작업 공간')}</span>
              </button>
              {activeNav === 'PROJECT' && (
                <div className="mt-1 space-y-0.5 animate-in slide-in-from-left-2 duration-300">
                  {STAGE_FLOW.map((stage) => (
                    <button key={stage.id} onClick={() => setActiveStage(stage.id)} className={`nav-item w-full pl-10 text-[11px] h-[36px] ${activeStage === stage.id ? 'active' : 'opacity-40'}`}>
                      <stage.icon size={13} className="shrink-0" />
                      <span className="truncate">{t(stage.labelEN, stage.labelKO)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {canAccessAdminPanel && (
              <div className="mt-2">
                <button onClick={() => setActiveNav('ADMIN')} className={`nav-item w-full ${activeNav === 'ADMIN' ? 'active' : ''}`}>
                  <ShieldCheck className="icon" /> <span>{t('Admin Panel', '관리자 패널')}</span>
                </button>
              </div>
            )}
          </nav>
        </div>
        <div className="nav-user-area">
          <GlobalUserArea
            user={currentUser}
            onStatusChange={handleStatusChange}
            onProfileClick={() => setActiveNav('PROFILE')}
          />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white relative overflow-hidden">
        <TopSubBar
          language={language}
          onLanguageChange={setLanguage}
          isProjectActive={activeNav === 'PROJECT'}
          isChatOpen={isChatOpen}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
        />
        <div className="flex-1 relative overflow-hidden">
          {renderContent()}
          {activeNav === 'PROJECT' && isChatOpen && project && (
            <div className="absolute top-0 right-0 h-full z-[140] w-full sm:w-[360px] shadow-2xl animate-in slide-in-from-right duration-300">
              <ChatPanel currentUser={currentUser} projectId={project.id} onClose={() => setIsChatOpen(false)} />
            </div>
          )}
        </div>
        {activeNav === 'PROJECT' && project && (
          <div className={`fixed bottom-0 left-[260px] right-0 transition-all duration-300 z-40 ${isRailVisible ? 'h-44' : 'h-10'}`}>
            <div className="absolute top-0 right-8 -translate-y-full pb-2 z-50">
              <button onClick={() => setIsRailVisible(!isRailVisible)} className="bg-gray-950 text-white p-2 rounded-t-lg border border-gray-800 border-b-0 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest hover:bg-black transition-colors">
                {isRailVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                {isRailVisible ? t('Hide Deck Rail', '레일 숨기기') : t('Show Deck Rail', '레일 보기')}
              </button>
            </div>
            {isRailVisible && project.deck.slides.length > 0 ? (
              <DeckRail slides={project.deck.slides} selectedSlideId={selectedSlideId} onSelectSlide={setSelectedSlideId} onAddSlide={handleAddSlide} onDeleteSlide={() => { }} onReorderSlides={() => { }} />
            ) : (
              <div className="h-full bg-gray-950 border-t border-gray-800 flex items-center px-6">
                <span className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">Navigation Hidden</span>
              </div>
            )}
          </div>
        )}
      </main>

      {isCreatingProject && (
        <CreateProjectFlow
          currentUser={currentUser}
          onCancel={() => setIsCreatingProject(false)}
          onCreate={handleCreateProject}
          mode="CREATE"
        />
      )}

      {isEditingProject && project && (
        <CreateProjectFlow
          currentUser={currentUser}
          onCancel={() => setIsEditingProject(false)}
          onCreate={handleEditProject}
          mode="EDIT"
          initialProject={project}
        />
      )}
    </div>
  );
};

export default WorkspaceRoot;

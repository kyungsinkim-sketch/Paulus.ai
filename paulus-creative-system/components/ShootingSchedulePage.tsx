import React, { useState, useEffect } from 'react';
import { Project, ScheduleDay, ScheduleRow, StoryboardFrameBlock, DirectionItem, Language } from '../types';
import { 
  Calendar, 
  MapPin, 
  Phone, 
  Clock, 
  Plus, 
  Trash2, 
  Move, 
  ArrowDown, 
  ArrowUp,
  FileText,
  Printer,
  MoreVertical,
  Briefcase,
  ImageIcon,
  Link as LinkIcon
} from 'lucide-react';
import DeckRail from './DeckRail';

interface ShootingSchedulePageProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  language: Language;
}

const ShootingSchedulePage: React.FC<ShootingSchedulePageProps> = ({ project, onUpdateProject, language }) => {
  const [activeDayId, setInterActiveDayId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);

  const t = (en: string, ko: string) => language === 'KO' ? ko : en;

  const storyboardSlides = project.deck.slides.filter(s => s.type === 'STORYBOARD');
  const allFrames: { slideIndex: number, frame: StoryboardFrameBlock }[] = [];
  storyboardSlides.forEach((slide, sIdx) => {
    slide.blocks.forEach(block => {
      if (block.type === 'STORYBOARD_FRAME') {
        allFrames.push({ slideIndex: sIdx + 1, frame: block as StoryboardFrameBlock });
      }
    });
  });

  useEffect(() => {
    if (!project.shootingSchedule || project.shootingSchedule.length === 0) {
      const initialDay: ScheduleDay = {
        id: `day-${Date.now()}`,
        dayNumber: 1,
        date: project.directionStartDate || new Date().toISOString().split('T')[0],
        callTime: '07:00',
        location: 'Main Studio',
        locationAddress: '123 Studio Way, Seoul',
        producer: project.members.find(m => m.role.includes('Producer'))?.name || 'TBD',
        director: project.members.find(m => m.role.includes('Director'))?.name || 'TBD',
        ad: 'TBD',
        rows: []
      };
      onUpdateProject({ ...project, shootingSchedule: [initialDay] });
      setInterActiveDayId(initialDay.id);
    } else if (!activeDayId && project.shootingSchedule.length > 0) {
        setInterActiveDayId(project.shootingSchedule[0].id);
    }
  }, [activeDayId, project, onUpdateProject]);

  const activeDay = project.shootingSchedule?.find(d => d.id === activeDayId);

  const handleUpdateDay = (updates: Partial<ScheduleDay>) => {
      if (!activeDayId) return;
      const newSchedule = project.shootingSchedule.map(d => d.id === activeDayId ? { ...d, ...updates } : d);
      onUpdateProject({ ...project, shootingSchedule: newSchedule });
  };

  const handleAddRow = (index?: number) => {
      if (!activeDay) return;
      const newRow: ScheduleRow = {
          id: `row-${Date.now()}`,
          type: 'SHOOT',
          timeStart: '00:00',
          timeEnd: '00:00',
          duration: '0m',
          sceneNum: '',
          cutNum: '',
          dayNight: '',
          location: '',
          description: '',
          cast: '',
          performers: '',
          notes: ''
      };
      const newRows = [...activeDay.rows];
      if (index !== undefined) newRows.splice(index + 1, 0, newRow);
      else newRows.push(newRow);
      handleUpdateDay({ rows: newRows });
  };

  if (!activeDay) return <div className="p-8 text-center">{t('Loading Schedule...', '스케줄 로딩 중...')}</div>;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 p-6 flex-shrink-0">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{project.title} <span className="text-gray-400 font-normal">| {t('Shooting Schedule', '촬영 스케줄')}</span></h1>
                        <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1 bg-white border border-gray-200 px-3 py-1 rounded-md shadow-sm">
                                <span className="text-xs font-bold text-gray-500 uppercase">{t('Day', '일차')}</span>
                                <input type="number" value={activeDay.dayNumber} onChange={(e) => handleUpdateDay({ dayNumber: parseInt(e.target.value) })} className="w-10 font-bold text-blue-600 outline-none text-center" />
                            </div>
                            <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1 rounded-md shadow-sm">
                                <Calendar size={14} className="text-gray-400"/>
                                <input type="date" value={activeDay.date} onChange={(e) => handleUpdateDay({ date: e.target.value })} className="text-sm font-medium outline-none text-gray-700" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden mb-32">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <tr>
                            <th className="p-3 border-b border-r w-12 text-center">#</th>
                            <th className="p-3 border-b border-r w-24">{t('Time', '시간')}</th>
                            <th className="p-3 border-b border-r w-16">{t('Dur', '소요')}</th>
                            <th className="p-3 border-b border-r w-12 text-center">S#</th>
                            <th className="p-3 border-b border-r w-12 text-center">C#</th>
                            <th className="p-3 border-b border-r w-48">{t('Location', '장소')}</th>
                            <th className="p-3 border-b border-r w-64">{t('Description', '내용')}</th>
                            <th className="p-3 border-b border-r w-32">{t('Cast', '출연')}</th>
                            <th className="p-3 border-b w-48">{t('Notes', '비고')}</th>
                            <th className="p-3 border-b w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="text-xs text-gray-700">
                        {activeDay.rows.map((row, index) => (
                            <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="p-2 border-r text-center text-gray-400">{index + 1}</td>
                                <td className="p-2 border-r">{row.timeStart} - {row.timeEnd}</td>
                                <td className="p-2 border-r text-center">{row.duration}</td>
                                <td className="p-2 border-r text-center">{row.sceneNum}</td>
                                <td className="p-2 border-r text-center">{row.cutNum}</td>
                                <td className="p-2 border-r">{row.location}</td>
                                <td className="p-2 border-r">{row.description}</td>
                                <td className="p-2 border-r">{row.cast}</td>
                                <td className="p-2">{row.notes}</td>
                                <td className="p-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleAddRow(index)} className="text-gray-400 hover:text-green-500"><Plus size={14}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-2 bg-gray-50 border-t border-gray-200 text-center">
                    <button onClick={() => handleAddRow()} className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center justify-center gap-1 w-full py-1">
                        <Plus size={12}/> {t('Add Row', '행 추가')}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ShootingSchedulePage;
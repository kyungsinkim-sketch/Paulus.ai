import React, { useState, useEffect, useMemo } from 'react';
import { Project, Language, EstimateType, Slide } from '../types';
import { 
  DollarSign, 
  FileText, 
  CreditCard, 
  Calculator, 
  FileSpreadsheet, 
  Presentation,
  Printer,
  BarChart4
} from 'lucide-react';
import { TypeA_Template_v1 } from '../production/estimate/templates/typeA.template';
import { calcRevenue, calcExternalCosts, calcManpower, calcOverhead, calcProfit } from '../production/estimate/estimateCalculators';
import { EstimateExportWrapper } from './production/EstimateExportWrapper';

const formatNumber = (num: number | undefined) => (num || 0).toLocaleString('ko-KR');

interface ProductionPageProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
  language: Language;
}

const ProductionPage: React.FC<ProductionPageProps> = ({ project, onUpdateProject, language }) => {
  const [activeTab, setActiveTab] = useState<'ESTIMATE' | 'CONTRACT' | 'SPEND'>('ESTIMATE');

  const t = (en: string, ko: string) => language === 'KO' ? ko : en;

  const typeAData = useMemo(() => {
    let core = TypeA_Template_v1();
    core.revenue = calcRevenue(core.revenue);
    core.external_costs = calcExternalCosts(core.external_costs);
    core.manpower_costs = calcManpower(core.manpower_costs);
    core.profit = calcProfit({ revenue: core.revenue, external: core.external_costs, manpower: core.manpower_costs });
    return core;
  }, []);

  const handleSaveToDeck = () => {
      const type = project.productionData?.activeEstimateType;
      const title = t(`Official Estimate (${type})`, `공식 견적서 (${type})`);
      const newSlide: Slide = {
          id: `slide-est-${Date.now()}`,
          pageNumber: project.deck.slides.length + 1,
          title: title,
          type: 'STRATEGY',
          layout: 'TITLE_BULLETS',
          isFinal: false,
          blocks: []
      };
      onUpdateProject({ ...project, deck: { ...project.deck, slides: [...project.deck.slides, newSlide] } });
      alert(t('Summary saved to Deck.', '요약본이 덱에 저장되었습니다.'));
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
        <div className="h-14 border-b border-gray-200 flex justify-between items-center px-6 bg-white shrink-0 z-20">
            <div className="flex gap-6">
                <button onClick={() => setActiveTab('ESTIMATE')} className={`h-14 border-b-2 text-sm font-bold flex items-center gap-2 ${activeTab === 'ESTIMATE' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'}`}>
                    <DollarSign size={16}/> {t('Estimate', '견적서')}
                </button>
                <button onClick={() => setActiveTab('CONTRACT')} className={`h-14 border-b-2 text-sm font-bold flex items-center gap-2 ${activeTab === 'CONTRACT' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'}`}>
                    <FileText size={16}/> {t('Contract', '계약서')}
                </button>
                <button onClick={() => setActiveTab('SPEND')} className={`h-14 border-b-2 text-sm font-bold flex items-center gap-2 ${activeTab === 'SPEND' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'}`}>
                    <CreditCard size={16}/> {t('Actual Spend', '실집행')}
                </button>
            </div>
            <div className="flex items-center gap-4">
                <button onClick={handleSaveToDeck} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 shadow-sm">
                    <Presentation size={14}/> {t('Export Summary', '요약 덱 생성')}
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 p-8 custom-scrollbar">
            {activeTab === 'ESTIMATE' && (
                <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
                    <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="relative z-10 grid grid-cols-3 gap-8">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('Gross Revenue', '총 매출')}</span>
                                <div className="text-3xl font-black italic">₩{formatNumber(typeAData.revenue.revenue_total_ex_vat)}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('Operating Profit', '영업 이익')}</span>
                                <div className="text-3xl font-black text-emerald-400 italic">₩{formatNumber(typeAData.profit.gross_profit)}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('Margin (%)', '수익률 (%)')}</span>
                                <div className="text-3xl font-black text-blue-400 italic">{(typeAData.profit.gross_margin_percent * 100).toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>
                    <EstimateExportWrapper data={typeAData} id="type-a-export-table" />
                </div>
            )}
        </div>
    </div>
  );
};

export default ProductionPage;
import React from 'react';
import { EstimateCore } from '../../production/estimate/estimateCore.types';

interface EstimateExportWrapperProps {
  data: EstimateCore;
  id: string;
}

const formatNumber = (num: number) => num.toLocaleString('ko-KR');

/**
 * WYSIWYG Export Wrapper for Type A Estimate.
 * Standard HTML table structure for perfect Excel translation.
 */
export const EstimateExportWrapper: React.FC<EstimateExportWrapperProps> = ({ data, id }) => {
  return (
    <div className="overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm">
      <table id={id} className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-900 text-white">
            <th colSpan={4} className="p-4 text-lg font-black uppercase tracking-tight">
              Official Estimate - {data.header.client_name}
            </th>
          </tr>
          <tr className="bg-gray-100 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">
            <th className="p-3 w-1/2">Description</th>
            <th className="p-3 text-right">Unit Price</th>
            <th className="p-3 text-center">Qty</th>
            <th className="p-3 text-right">Total (KRW)</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {/* Revenue Section */}
          <tr className="bg-blue-50">
            <td colSpan={4} className="p-2 text-[10px] font-black text-blue-600 uppercase tracking-widest pl-3">
              I. Service Fees (Revenue)
            </td>
          </tr>
          {data.revenue.revenue_lines.map((line) => (
            <tr key={line.line_id} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="p-3 font-bold text-gray-900">{line.title}</td>
              <td className="p-3 text-right font-mono">₩{formatNumber(line.amount_ex_vat)}</td>
              <td className="p-3 text-center">1</td>
              <td className="p-3 text-right font-black">₩{formatNumber(line.amount_ex_vat)}</td>
            </tr>
          ))}
          
          {/* Cost Sections - Merged for simplified client view or kept separate for internal */}
          <tr className="bg-gray-50">
            <td colSpan={4} className="p-2 text-[10px] font-black text-gray-400 uppercase tracking-widest pl-3">
              II. Direct Costs (Reference Only)
            </td>
          </tr>
          {data.external_costs.external_cost_lines.map((line) => (
            <tr key={line.line_id} className="border-b border-gray-50 opacity-60">
              <td className="p-3">{line.description}</td>
              <td className="p-3 text-right font-mono text-gray-400">₩{formatNumber(line.unit_cost)}</td>
              <td className="p-3 text-center">{line.qty}</td>
              <td className="p-3 text-right font-bold text-gray-500">₩{formatNumber(line.amount)}</td>
            </tr>
          ))}
          {data.manpower_costs.manpower_lines.map((line) => (
            <tr key={line.line_id} className="border-b border-gray-50 opacity-60">
              <td className="p-3">{line.role} Allocation</td>
              <td className="p-3 text-right font-mono text-gray-400">₩{formatNumber(line.internal_rate)}</td>
              <td className="p-3 text-center">{line.qty}</td>
              <td className="p-3 text-right font-bold text-gray-500">₩{formatNumber(line.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-900 text-white">
          <tr>
            <td colSpan={3} className="p-4 text-right text-xs font-bold uppercase tracking-widest text-gray-400">
              Grand Total (Excl. VAT)
            </td>
            <td className="p-4 text-right text-xl font-black italic font-mono">
              ₩{formatNumber(data.revenue.revenue_total_ex_vat)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

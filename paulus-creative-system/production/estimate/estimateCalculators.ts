import {
  RevenueBlock,
  ExternalCostBlock,
  ManpowerCostBlock,
  OverheadCostBlock,
  ProfitBlock
} from './estimateCore.types';

export const calcRevenue = (block: RevenueBlock): RevenueBlock => {
  const exVat = block.revenue_lines.reduce((s, l) => s + l.amount_ex_vat, 0);
  const vat = block.revenue_lines.reduce((s, l) => s + l.vat_amount, 0);
  return {
    ...block,
    revenue_total_ex_vat: exVat,
    revenue_total_vat: vat,
    revenue_total_inc_vat: exVat + vat,
  };
};

export const calcExternalCosts = (block: ExternalCostBlock): ExternalCostBlock => {
  const total = block.external_cost_lines.reduce((s, l) => s + l.amount, 0);
  return { ...block, external_cost_total: total };
};

export const calcManpower = (block: ManpowerCostBlock): ManpowerCostBlock => {
  const total = block.manpower_lines.reduce((s, l) => s + l.amount, 0);
  return { ...block, manpower_total: total };
};

export const calcOverhead = (block: OverheadCostBlock): OverheadCostBlock => {
  const total = block.overhead_lines.reduce((s, l) => s + l.amount, 0);
  return { ...block, overhead_total: total };
};

export const calcProfit = (args: {
  revenue: RevenueBlock;
  external: ExternalCostBlock;
  manpower: ManpowerCostBlock;
  overhead?: OverheadCostBlock;
}): ProfitBlock => {
  const totalCost =
    args.external.external_cost_total +
    args.manpower.manpower_total +
    (args.overhead?.overhead_total || 0);

  const grossProfit = args.revenue.revenue_total_ex_vat - totalCost;

  return {
    total_cost: totalCost,
    gross_profit: grossProfit,
    gross_margin_percent:
      args.revenue.revenue_total_ex_vat === 0
        ? 0
        : grossProfit / args.revenue.revenue_total_ex_vat,
  };
};

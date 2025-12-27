export interface EstimateHeader {
  estimate_type: 'A';
  project_id: string;
  client_name: string;
  agency_entity_name: string;
  issue_date: string;
  currency: 'KRW';
  payment_terms_text?: string;
}

export interface RevenueLine {
  line_id: string;
  title: string;
  amount_ex_vat: number;
  vat_amount: number;
  amount_inc_vat: number;
}

export interface RevenueBlock {
  billing_model: 'LUMP_SUM';
  revenue_lines: RevenueLine[];
  revenue_total_ex_vat: number;
  revenue_total_vat: number;
  revenue_total_inc_vat: number;
}

export interface CostLine {
  line_id: string;
  description: string;
  qty: number;
  unit_cost: number;
  amount: number;
}

export interface ExternalCostBlock {
  external_cost_lines: CostLine[];
  external_cost_total: number;
}

export interface ManpowerLine {
  line_id: string;
  role: string;
  qty: number;
  internal_rate: number;
  amount: number;
  allocation_tag?: string;
}

export interface ManpowerCostBlock {
  manpower_lines: ManpowerLine[];
  manpower_total: number;
}

export interface OverheadCostBlock {
  overhead_lines: CostLine[];
  overhead_total: number;
}

export interface ProfitBlock {
  total_cost: number;
  gross_profit: number;
  gross_margin_percent: number;
}

export interface EstimateCore {
  header: EstimateHeader;
  revenue: RevenueBlock;
  external_costs: ExternalCostBlock;
  manpower_costs: ManpowerCostBlock;
  overhead_costs?: OverheadCostBlock;
  profit: ProfitBlock;
}

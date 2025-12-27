
import { EstimateCore } from '../estimateCore.types';

export const TypeA_Template_v1 = (): EstimateCore => ({
  header: {
    estimate_type: 'A',
    project_id: 'new-project',
    client_name: 'New Client',
    agency_entity_name: 'PAULUS.AI',
    issue_date: new Date().toISOString().split('T')[0],
    currency: 'KRW',
    payment_terms_text: '',
  },
  revenue: {
    billing_model: 'LUMP_SUM',
    revenue_lines: [
      {
        line_id: 'rev-1',
        title: 'Service Fee',
        amount_ex_vat: 0,
        vat_amount: 0,
        amount_inc_vat: 0,
      },
    ],
    revenue_total_ex_vat: 0,
    revenue_total_vat: 0,
    revenue_total_inc_vat: 0,
  },
  external_costs: {
    external_cost_lines: [],
    external_cost_total: 0,
  },
  manpower_costs: {
    manpower_lines: [],
    manpower_total: 0,
  },
  profit: {
    total_cost: 0,
    gross_profit: 0,
    gross_margin_percent: 0,
  },
});

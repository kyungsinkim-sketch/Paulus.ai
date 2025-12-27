import * as XLSX from 'https://esm.sh/xlsx';

/**
 * Exports a DOM table to an XLSX file.
 * WYSIWYG implementation for Production module stabilization.
 */
export const exportEstimateExcelFromTable = (
  tableSelector: string,
  filename: string
) => {
  const table = document.querySelector(tableSelector) as HTMLTableElement | null;
  if (!table) throw new Error('Export table not found');
  const wb = XLSX.utils.table_to_book(table, { sheet: 'Estimate' });
  XLSX.writeFile(wb, filename);
};

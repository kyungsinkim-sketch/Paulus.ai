import { User } from '../../types';

/**
 * Exports User data to a CSV file that allows for Excel opening.
 * Uses BOM (\uFEFF) to ensure Korean characters are displayed correctly.
 */
export const exportToExcel = (users: User[]) => {
  const headers = [
    'Name',
    'Korean Name',
    'Employee ID',
    'Department',
    'Position',
    'Level',
    'Class',
    'Join Date',
    'Monthly Salary',
    'Annual Salary',
    'Phone',
    'Email'
  ];

  const rows = users.map(u => [
    u.name,
    u.koreanName || '',
    u.employeeId || '',
    u.department || '',
    u.position || '',
    u.level || '',
    u.salaryClass || '',
    u.joinDate || '',
    u.monthlySalary ? u.monthlySalary.toString() : '0',
    u.annualSalary ? u.annualSalary.toString() : '0',
    u.phoneNumber || '',
    u.email
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  // Add BOM for Excel UTF-8 recognition
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `paulus_payroll_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Placeholder for table export if needed later.
 * Currently stubbed as XLSX library is not present.
 */
export const exportEstimateExcelFromTable = (
  tableSelector: string,
  filename: string
) => {
  console.warn('XLSX export not available without library. Please implement CSV fallback if needed.');
  alert('Excel export requires additional libraries. Please contact admin.');
};

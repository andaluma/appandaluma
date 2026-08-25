// Spending-by-category report, built from an Andaluma Planner backup file.
//
// Usage:
//   npm install        (first time only)
//   node spending-by-category.js [path-to-backup.json] [year]
//
// With no path given, it uses the newest file in ../backups/. With no year,
// it uses the current year.
//
// IMPORTANT: this app stores money data in two separate Firebase nodes —
// `expenses` (individually logged transactions) and `fixedExpenses`
// (recurring items like subscriptions and family support, which the app
// tracks and computes separately and never writes into `expenses`). A report
// built from `expenses` alone will silently be missing every subscription
// and recurring payment. This script requires both and will refuse to
// produce a silently-wrong report if `fixedExpenses` is absent.
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const BACKUPS_DIR = path.join(__dirname, '..', 'backups');
const OUT_DIR = path.join(__dirname, 'output');

function findLatestBackup() {
  const files = fs.readdirSync(BACKUPS_DIR)
    .filter(f => /^andaluma-backup-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort(); // filenames are YYYY-MM-DD, so lexical sort == chronological
  if (!files.length) throw new Error(`No backup files found in ${BACKUPS_DIR}`);
  return path.join(BACKUPS_DIR, files[files.length - 1]);
}

const backupPath = process.argv[2] ? path.resolve(process.argv[2]) : findLatestBackup();
const targetYear = process.argv[3] || String(new Date().getFullYear());

const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
const expenses = Object.values(data.expenses || {});

const hasFixedExpensesKey = 'fixedExpenses' in data;
const fixedExpenses = Object.values(data.fixedExpenses || {});
if (!hasFixedExpensesKey) {
  console.warn('\n⚠️  WARNING: this backup has no "fixedExpenses" node at all.');
  console.warn('   Subscriptions, family support, and other recurring items will be MISSING');
  console.warn('   from this report. Re-export the backup (it needs to fetch');
  console.warn('   fixedExpenses.json from Firebase, same as expenses.json) before trusting');
  console.warn('   this report for anything.\n');
}

const yExpenses = expenses.filter(e => e.date && e.date.startsWith(targetYear) && e.eurAmount != null);

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const monthsWithData = new Set(yExpenses.map(e => parseInt(e.date.slice(5, 7), 10)));
if (!monthsWithData.size) throw new Error(`No expenses found for ${targetYear} in ${backupPath}`);
const lastMonth = Math.max(...monthsWithData);
const months = [];
for (let m = 1; m <= lastMonth; m++) months.push(m);
const monthKeys = months.map(m => `${targetYear}-${String(m).padStart(2, '0')}`);

const categories = [...new Set([...yExpenses.map(e => e.category), ...fixedExpenses.map(f => f.category)])].sort();

const grid = {};
categories.forEach(c => { grid[c] = {}; months.forEach(m => grid[c][m] = 0); });

yExpenses.forEach(e => {
  const m = parseInt(e.date.slice(5, 7), 10);
  if (!months.includes(m)) return;
  grid[e.category][m] += e.eurAmount;
});

// Replicates js/money.js: fxOccurrencesInMonth / getFixedAmountForMonth.
// Keep this in sync if that logic ever changes.
function fxOccurrencesInMonth(fx, monthKey) {
  const period = fx.period || 'monthly';
  const startDate = fx.startDate || null;
  if (startDate && monthKey < startDate.substr(0, 7)) return 0;
  if (period === 'monthly') return 1;
  if (!startDate) return 1;
  const periodDays = period === 'weekly' ? 7 : 28;
  const y = parseInt(monthKey.substr(0, 4)), mo = parseInt(monthKey.substr(5, 2)) - 1;
  const monthStart = new Date(y, mo, 1);
  const monthEnd = new Date(y, mo + 1, 0, 23, 59, 59);
  const start = new Date(startDate + 'T12:00:00');
  if (start > monthEnd) return 0;
  let cur = new Date(start);
  while (cur < monthStart) cur = new Date(cur.getTime() + periodDays * 86400000);
  let count = 0;
  while (cur <= monthEnd) { count++; cur = new Date(cur.getTime() + periodDays * 86400000); }
  return count;
}
function getFixedAmountForMonth(fx, monthKey) {
  const occ = fxOccurrencesInMonth(fx, monthKey);
  if (!occ) return 0;
  if (fx.fixedType === 'hard') return (fx.amount || 0) * occ;
  return (fx.confirmedMonths && fx.confirmedMonths[monthKey]) ? fx.confirmedMonths[monthKey] : 0;
}

const recurringDetail = [];
fixedExpenses.forEach(fx => {
  months.forEach((m, i) => {
    const mk = monthKeys[i];
    const amt = getFixedAmountForMonth(fx, mk);
    if (amt) {
      grid[fx.category][m] += amt;
      recurringDetail.push({ name: fx.name, category: fx.category, type: fx.fixedType, period: fx.period, monthKey: mk, amount: amt });
    }
  });
});

// ---- Build workbook ----
const wb = new ExcelJS.Workbook();
wb.creator = 'Andaluma reports';
wb.created = new Date();

const ws = wb.addWorksheet(`${targetYear} Spending`, { views: [{ state: 'frozen', xSplit: 1, ySplit: 2 }] });

const ACCENT = 'FFE04F28'; // Andaluma coral
const INK = 'FF1F1B18';
const SAND = 'FFF4F1EA';
const GREY_LINE = 'FFD8D2C7';
const numFmt = '#,##0.00" €"';

ws.getColumn(1).width = 26;
for (let i = 0; i < months.length; i++) ws.getColumn(2 + i).width = 13;
ws.getColumn(2 + months.length).width = 14;

ws.mergeCells(1, 1, 1, 2 + months.length);
const titleCell = ws.getCell(1, 1);
titleCell.value = `Andaluma — ${targetYear} Spending by Category (EUR)`;
titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: INK } };
titleCell.alignment = { vertical: 'middle' };
ws.getRow(1).height = 26;

const headerRowIdx = 2;
const headerRow = ws.getRow(headerRowIdx);
headerRow.getCell(1).value = 'Category';
months.forEach((m, i) => { headerRow.getCell(2 + i).value = MONTH_NAMES[m - 1]; });
headerRow.getCell(2 + months.length).value = 'Total';
headerRow.eachCell(cell => {
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = { bottom: { style: 'thin', color: { argb: GREY_LINE } } };
});
headerRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
headerRow.height = 20;

let rowIdx = headerRowIdx + 1;
const firstDataRow = rowIdx;
categories.forEach((cat, ci) => {
  const row = ws.getRow(rowIdx);
  row.getCell(1).value = cat;
  row.getCell(1).font = { bold: true, color: { argb: INK } };
  months.forEach((m, i) => {
    const cell = row.getCell(2 + i);
    cell.value = Math.round(grid[cat][m] * 100) / 100;
    cell.numFmt = numFmt;
  });
  const totalCol = 2 + months.length;
  const startColLetter = ws.getColumn(2).letter;
  const endColLetter = ws.getColumn(1 + months.length).letter;
  const totalCell = row.getCell(totalCol);
  totalCell.value = { formula: `SUM(${startColLetter}${rowIdx}:${endColLetter}${rowIdx})` };
  totalCell.numFmt = numFmt;
  totalCell.font = { bold: true };
  if (ci % 2 === 1) {
    row.eachCell({ includeEmpty: true }, cell => {
      if (!cell.fill || cell.fill.type !== 'pattern') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SAND } };
      }
    });
  }
  rowIdx++;
});
const lastDataRow = rowIdx - 1;

const totalRowIdx = rowIdx;
const totalRow = ws.getRow(totalRowIdx);
totalRow.getCell(1).value = 'TOTAL';
months.forEach((m, i) => {
  const colLetter = ws.getColumn(2 + i).letter;
  const cell = totalRow.getCell(2 + i);
  cell.value = { formula: `SUM(${colLetter}${firstDataRow}:${colLetter}${lastDataRow})` };
  cell.numFmt = numFmt;
});
{
  const startColLetter = ws.getColumn(2).letter;
  const endColLetter = ws.getColumn(1 + months.length).letter;
  const grandTotalCell = totalRow.getCell(2 + months.length);
  grandTotalCell.value = { formula: `SUM(${startColLetter}${totalRowIdx}:${endColLetter}${totalRowIdx})` };
  grandTotalCell.numFmt = numFmt;
}
totalRow.eachCell(cell => {
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
});
rowIdx++;
rowIdx++; // spacer

const avgSectionHeaderRow = rowIdx;
ws.mergeCells(avgSectionHeaderRow, 1, avgSectionHeaderRow, 2 + months.length);
const avgHeaderCell = ws.getCell(avgSectionHeaderRow, 1);
avgHeaderCell.value = `Average per Month (${MONTH_NAMES[months[0] - 1]}–${MONTH_NAMES[months[months.length - 1] - 1]} ${targetYear}, ÷${months.length})`;
avgHeaderCell.font = { bold: true, italic: true, color: { argb: ACCENT } };
rowIdx++;

categories.forEach((cat) => {
  const row = ws.getRow(rowIdx);
  row.getCell(1).value = cat;
  row.getCell(1).font = { color: { argb: INK } };
  const totalCol = 2 + months.length;
  const dataRowIdx = firstDataRow + categories.indexOf(cat);
  const cell = row.getCell(totalCol);
  cell.value = { formula: `${ws.getColumn(totalCol).letter}${dataRowIdx}/${months.length}` };
  cell.numFmt = numFmt;
  cell.font = { italic: true };
  ws.mergeCells(rowIdx, 2, rowIdx, totalCol - 1);
  const noteCell = row.getCell(2);
  noteCell.value = 'avg / month →';
  noteCell.font = { italic: true, color: { argb: 'FF8A8378' } };
  noteCell.alignment = { horizontal: 'right' };
  rowIdx++;
});

rowIdx++; // spacer

const overallAvgRow = rowIdx;
const oRow = ws.getRow(overallAvgRow);
oRow.getCell(1).value = 'OVERALL AVERAGE PER MONTH';
oRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
const grandTotalColLetter = ws.getColumn(2 + months.length).letter;
ws.mergeCells(overallAvgRow, 2, overallAvgRow, 1 + months.length);
const overallAvgCell = oRow.getCell(2 + months.length);
overallAvgCell.value = { formula: `${grandTotalColLetter}${totalRowIdx}/${months.length}` };
overallAvgCell.numFmt = numFmt;
overallAvgCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
oRow.eachCell({ includeEmpty: true }, cell => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } };
});
rowIdx++;

for (let r = headerRowIdx; r <= totalRowIdx; r++) {
  for (let c = 1; c <= 2 + months.length; c++) {
    const cell = ws.getCell(r, c);
    cell.border = {
      top: { style: 'hair', color: { argb: GREY_LINE } },
      left: { style: 'hair', color: { argb: GREY_LINE } },
      bottom: { style: 'hair', color: { argb: GREY_LINE } },
      right: { style: 'hair', color: { argb: GREY_LINE } },
    };
  }
}

rowIdx += 1;
ws.mergeCells(rowIdx, 1, rowIdx, 2 + months.length);
const footCell = ws.getCell(rowIdx, 1);
const completenessNote = hasFixedExpensesKey
  ? 'Includes both logged expenses and the app\'s separately-tracked recurring items (subscriptions, family support, etc. — see "Recurring items" tab).'
  : 'WARNING: this backup has no fixedExpenses node — subscriptions and other recurring items are NOT included below. Re-export the backup before trusting this report.';
footCell.value = `Source: ${backupPath} (exported ${data.exportDate || 'unknown date'}). Personal-venture expenses only, converted to EUR at the rate locked when each expense was entered. ${completenessNote} Rent/school/vehicle daily entries are pre-booked for the full month, so the most recent month may still understate one-off variable spending entered very recently.`;
footCell.font = { italic: true, size: 9, color: { argb: 'FF8A8378' } };
footCell.alignment = { wrapText: true, vertical: 'top' };
ws.getRow(rowIdx).height = 40;

const ws2 = wb.addWorksheet('Recurring items', { views: [{ state: 'frozen', ySplit: 1 }] });
ws2.columns = [
  { header: 'Name', key: 'name', width: 24 },
  { header: 'Category', key: 'category', width: 24 },
  { header: 'Type', key: 'type', width: 10 },
  { header: 'Period', key: 'period', width: 10 },
  { header: 'Month', key: 'monthKey', width: 10 },
  { header: 'Amount', key: 'amount', width: 12 },
];
ws2.getRow(1).eachCell(cell => {
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } };
});
recurringDetail
  .sort((a, b) => (a.name === b.name ? a.monthKey.localeCompare(b.monthKey) : a.name.localeCompare(b.name)))
  .forEach(r => {
    const row = ws2.addRow(r);
    row.getCell('amount').numFmt = numFmt;
  });

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const outPath = path.join(OUT_DIR, `Andaluma-Spending-${targetYear}.xlsx`);
wb.xlsx.writeFile(outPath).then(() => {
  console.log('Written:', outPath);
  console.log('Source backup:', backupPath);
  console.log('Months included:', months.map(m => MONTH_NAMES[m - 1]).join(', '));
  console.log('Categories:', categories.length);
  console.log('Recurring line items folded in:', recurringDetail.length);
}).catch(err => { console.error(err); process.exit(1); });

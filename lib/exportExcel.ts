export type ExcelColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
  width?: number;
};

/**
 * Downloads `rows` as a real .xlsx file. Callers pass the already-filtered list,
 * so with no filter applied this is the full list and with filters applied only
 * the matching rows are exported.
 */
export async function downloadExcel<T>(
  rows: T[],
  columns: ExcelColumn<T>[],
  filenamePrefix: string,
  sheetName = "Data"
): Promise<boolean> {
  if (!rows.length) return false;
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31));
  sheet.columns = columns.map((c) => ({ header: c.header, width: c.width ?? 22 }));
  rows.forEach((row) => sheet.addRow(columns.map((c) => c.value(row) ?? "")));
  const head = sheet.getRow(1);
  head.font = { bold: true };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
  return true;
}

import * as XLSX from 'xlsx';

export function exportarExcel<T extends Record<string, unknown>>(
  datos: T[],
  nombreArchivo: string,
  nombreHoja: string
): void {
  const worksheet = XLSX.utils.json_to_sheet(datos);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, nombreHoja);

  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${nombreArchivo}_${fecha}.xlsx`);
}

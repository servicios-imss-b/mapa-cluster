import { useMemo, useState, type ReactNode } from 'react';
import { Download, Search, ArrowUpDown, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { exportarExcel } from '../exportExcel';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T extends object> {
  data: T[];
  columns: Column<T>[];
  exportColumns?: Column<T>[];
  exportFileName: string;
  exportSheetName: string;
}

const PAGE_SIZE = 15;

export function DataTable<T extends object>({
  data,
  columns,
  exportColumns,
  exportFileName,
  exportSheetName,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) => columns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(q)));
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];

      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }

      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv), 'es')
        : String(bv).localeCompare(String(av), 'es');
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages - 1);
  const paginated = sorted.slice(cur * PAGE_SIZE, (cur + 1) * PAGE_SIZE);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleExport = () => {
    const columnsToExport = exportColumns ?? columns;
    const out = sorted.map((row) => {
      const o: Record<string, unknown> = {};
      columnsToExport.forEach((col) => {
        o[col.label] = row[col.key];
      });
      return o;
    });
    exportarExcel(out, exportFileName, exportSheetName);
  };

  return (
    <div className="card animate-fade-in overflow-hidden">
      <div className="border-b border-gray-100 bg-white px-4 py-3">
        <label className="relative block max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar en la tabla..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-imss-green/40 focus:bg-white"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              {columns.map((col) => (
                <th key={String(col.key)} className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                  {col.sortable !== false ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1 text-xs uppercase tracking-wider text-gray-500 transition-colors hover:text-imss-green"
                    >
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === 'asc'
                          ? <ChevronUp className="h-3.5 w-3.5 text-imss-gold" />
                          : <ChevronDown className="h-3.5 w-3.5 text-imss-gold" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </button>
                  ) : (
                    <span className="text-xs uppercase tracking-wider text-gray-500">{col.label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-sm text-gray-400">
                  No se encontraron registros
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 transition-colors hover:bg-gray-50/70">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-4 py-3 text-sm">
        <p className="text-xs text-gray-400">
          {sorted.length > 0 ? cur * PAGE_SIZE + 1 : 0}-{Math.min((cur + 1) * PAGE_SIZE, sorted.length)} de {sorted.length} registros
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, cur - 1))}
            disabled={cur === 0}
            className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs tabular-nums text-gray-500">
            {cur + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, cur + 1))}
            disabled={cur >= totalPages - 1}
            className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg bg-imss-green px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-imss-green-mid"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar Excel
        </button>
      </div>
    </div>
  );
}

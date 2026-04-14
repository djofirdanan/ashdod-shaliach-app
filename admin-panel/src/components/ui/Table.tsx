import React from 'react';
import clsx from 'clsx';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'אין נתונים להצגה',
  onRowClick,
  className,
}: TableProps<T>) {
  return (
    <div
      className={clsx('rounded-2xl overflow-hidden border border-gray-100', className)}
      style={{ boxShadow: '0 4px 20px rgba(124, 58, 237, 0.06)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(248, 250, 252, 0.8)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100',
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded-lg animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-400 text-sm"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl">
                      📭
                    </div>
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick?.(row)}
                  className={clsx(
                    'border-b border-gray-50 transition-colors duration-150',
                    rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20',
                    onRowClick
                      ? 'cursor-pointer hover:bg-purple-50/40'
                      : 'hover:bg-purple-50/30'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(
                        'px-6 py-4 text-sm text-gray-700',
                        col.className
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Pagination component
interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3.5 border-t border-gray-100 bg-white rounded-b-2xl">
      <span className="text-sm text-gray-400 font-medium">
        עמוד {page} מתוך {totalPages}
      </span>
      <div className="flex gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-sm rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium text-gray-600"
        >
          הקודם
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (page <= 3) {
            pageNum = i + 1;
          } else if (page >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = page - 2 + i;
          }
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-xl transition-all font-semibold',
                pageNum === page
                  ? 'text-white shadow-md'
                  : 'border border-gray-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 text-gray-600'
              )}
              style={
                pageNum === page
                  ? { background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }
                  : {}
              }
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 text-sm rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium text-gray-600"
        >
          הבא
        </button>
      </div>
    </div>
  );
};

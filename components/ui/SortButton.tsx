import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SortConfig } from '@/hooks/useTableSort';

interface SortButtonProps<T> {
  column: keyof T;
  sortConfig: SortConfig<T>;
  onSort: (key: keyof T) => void;
  label: string;
  align?: 'left' | 'right' | 'center';
}

export function SortButton<T>({ column, sortConfig, onSort, label, align = 'left' }: SortButtonProps<T>) {
  const isActive = sortConfig.key === column;
  const direction = isActive ? sortConfig.direction : null;

  const alignClass = 
    align === 'right' ? 'justify-end' :
    align === 'center' ? 'justify-center' :
    'justify-start';

  return (
    <button
      onClick={() => onSort(column)}
      className={`flex items-center gap-1 ${alignClass} w-full hover:text-blue-600 transition-colors ${
        isActive ? 'text-blue-600 font-semibold' : 'text-gray-700'
      }`}
    >
      <span>{label}</span>
      {direction === 'asc' && <ArrowUp className="w-4 h-4" />}
      {direction === 'desc' && <ArrowDown className="w-4 h-4" />}
      {!direction && <ArrowUpDown className="w-4 h-4 opacity-30" />}
    </button>
  );
}

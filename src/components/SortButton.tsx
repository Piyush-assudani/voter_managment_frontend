'use client';

import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

interface SortButtonProps {
  label: string;
  field: string;
  type?: 'numeric' | 'alpha';
  currentSort: SortState;
  onSort: (field: string) => void;
  style?: React.CSSProperties;
}

export const SortButton: React.FC<SortButtonProps> = ({
  label,
  field,
  type = 'alpha',
  currentSort,
  onSort,
  style,
}) => {
  const isActive = currentSort.field === field;
  const isAsc = currentSort.direction === 'asc';

  const typeLabel = type === 'numeric'
    ? (isActive ? (isAsc ? '1-2-3' : '3-2-1') : '1-2-3')
    : (isActive ? (isAsc ? 'A-Z' : 'Z-A') : 'A-Z');

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        ...style,
      }}
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSort(field);
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          border: isActive ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
          background: isActive ? '#2563eb' : '#ffffff',
          color: isActive ? '#ffffff' : '#334155',
          boxShadow: isActive ? '0 1px 3px rgba(37, 99, 235, 0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'all 0.15s ease',
        }}
        title={`क्रमबद्ध करें (${label} ${typeLabel})`}
      >
        {isActive ? (
          isAsc ? <ArrowUp size={12} strokeWidth={2.5} /> : <ArrowDown size={12} strokeWidth={2.5} />
        ) : (
          <ArrowUpDown size={12} strokeWidth={2} />
        )}
        <span>{typeLabel}</span>
      </button>
    </div>
  );
};

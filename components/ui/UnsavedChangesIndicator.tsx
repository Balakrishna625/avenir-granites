'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface UnsavedChangesIndicatorProps {
  hasUnsavedChanges: boolean;
  className?: string;
}

/**
 * Visual indicator showing when a form has unsaved changes
 * 
 * @example
 * <UnsavedChangesIndicator hasUnsavedChanges={hasChanges} />
 */
export function UnsavedChangesIndicator({ 
  hasUnsavedChanges, 
  className = '' 
}: UnsavedChangesIndicatorProps) {
  if (!hasUnsavedChanges) return null;
  
  return (
    <div className={`flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 ${className}`}>
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-medium">You have unsaved changes</span>
    </div>
  );
}

/**
 * Small badge indicator for showing unsaved changes status
 * Can be placed next to form titles or submit buttons
 * 
 * @example
 * <h1>Edit Form <UnsavedChangesBadge hasUnsavedChanges={hasChanges} /></h1>
 */
export function UnsavedChangesBadge({ 
  hasUnsavedChanges 
}: { hasUnsavedChanges: boolean }) {
  if (!hasUnsavedChanges) return null;
  
  return (
    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded">
      <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
      Unsaved
    </span>
  );
}

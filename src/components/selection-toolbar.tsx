'use client';

import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { X, Trash2, FileOutput } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import type { FaultReport } from '@/lib/types';
import { Checkbox } from './ui/checkbox';

interface SelectionToolbarProps {
  selectionCount: number;
  onClear: () => void;
  onDelete: () => void;
  onExport: () => void;
  onStatusChange: (status: FaultReport['status']) => void;
  showStatusChange: boolean;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
}

export function SelectionToolbar({
  selectionCount,
  onClear,
  onDelete,
  onExport,
  onStatusChange,
  showStatusChange,
  onSelectAll,
  isAllSelected
}: SelectionToolbarProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded-md border bg-card text-card-foreground shadow-sm w-full">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClear}>
          <X className="h-4 w-4" />
          <span className="sr-only">Clear selection</span>
        </Button>
        {onSelectAll && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={isAllSelected}
                onCheckedChange={() => onSelectAll && onSelectAll()}
                data-state={isAllSelected ? 'checked' : (selectionCount > 0 ? 'indeterminate' : 'unchecked')}
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                Select All
              </label>
            </div>
          )}
        <span className="text-sm font-medium">
          {selectionCount} selected
        </span>
      </div>
      <div className="flex items-center gap-2">
        {showStatusChange && (
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                Change Status
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onStatusChange('Pending')}>
                Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange('In Progress')}>
                In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange('Resolved')}>
                Resolved
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        )}
        <Button variant="outline" size="sm" onClick={onExport}>
          <FileOutput className="mr-2 h-4 w-4" />
          Export
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}

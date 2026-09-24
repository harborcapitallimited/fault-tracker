'use client';

import * as React from 'react';
import type { ClinicalReport, SystemReport } from '@/lib/types';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { exportToExcel, normalizeSystemNumber } from '@/lib/utils';
import { format } from 'date-fns';
import { Download, Trash2, Calendar as CalendarIcon, FileSpreadsheet, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFaultReportMutations } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/context/admin-context';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { useRTDBList } from '@/firebase';
import { Checkbox } from './ui/checkbox';
import { SelectionToolbar } from './selection-toolbar';

type SortConfig = {
  key: keyof ClinicalReport | 'zone';
  direction: 'asc' | 'desc';
};

const ITEMS_PER_PAGE = 50;

export function ClinicalReportsTable({
  reports,
  isLoading,
}: {
  reports: ClinicalReport[];
  isLoading: boolean;
}) {
  const { deleteClinicalReport } = useFaultReportMutations();
  const { data: systemReports } = useRTDBList<SystemReport>('systemReports');
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  
  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);

  // Selection State
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: 'date', direction: 'desc' });

  // Reset to first page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [reports?.length]);

  const enrichedReports = React.useMemo(() => {
    if (!reports) return [];
    return reports.map(r => {
        const sys = (systemReports || []).find(s => normalizeSystemNumber(s.productSystemId) === normalizeSystemNumber(r.machineId));
        return {
            ...r,
            zone: sys?.zone || 'N/A'
        };
    });
  }, [reports, systemReports]);

  const sortedReports = React.useMemo(() => {
    const sorted = [...enrichedReports];
    sorted.sort((a, b) => {
        let valA: any = a[sortConfig.key as keyof typeof a];
        let valB: any = b[sortConfig.key as keyof typeof b];

        if (typeof valA === 'number' && typeof valB === 'number') {
            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }

        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
    return sorted;
  }, [enrichedReports, sortConfig]);

  // Paginated Slicing
  const totalPages = Math.ceil(sortedReports.length / ITEMS_PER_PAGE);
  const paginatedReports = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedReports.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedReports, currentPage]);

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleToggleSelection = (id: string) => {
    setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        return newSet;
    });
  };

  const handleToggleAll = () => {
    if (selectedIds.size === sortedReports.length) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(sortedReports.map(r => r.id)));
    }
  };

  const handleExport = () => {
    if (!isAdmin) {
      toast({ title: 'Unauthorized', description: 'Only administrators can export data.', variant: 'destructive' });
      return;
    }

    const reportsToExport = selectedIds.size > 0 
        ? sortedReports.filter(r => selectedIds.has(r.id))
        : sortedReports;

    if (reportsToExport.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    
    const exportData = reportsToExport.map(r => ({
      'Reporting Date': format(new Date(r.date), 'yyyy-MM-dd'),
      'Frequency': r.reportPeriod || 'Daily',
      'Machine ID': r.machineId,
      'Radiographer': r.radiographerName || 'N/A',
      'Zone': r.zone,
      'State': r.state,
      'Total Attendees': r.attendeesCount,
      'CXR Screened': r.cxrScreenedCount,
      'Presumptive Cases': r.presumptiveCount,
      'Pres. (No Sputum)': r.presumptiveNoSputumCount,
      'Samples Not Tested': r.samplesNotTestedCount,
      'Prev Day Tested': r.prevDaySamplesTestedCount,
      'TB Patients (Total)': r.tbPatientsCount,
      'DS-TB (Drug Susceptible)': r.dsTbCount,
      'Clinical TB': r.clinicalTbCount,
      'DR-TB (Drug Resistant)': r.drTbCount,
      'Rif-Indeterminate': r.rifIndeterminateCount,
      'Submission User': r.submittedBy,
      'Submission Timestamp': format(new Date(r.createdAt), 'yyyy-MM-dd HH:mm:ss')
    }));

    const fileName = `Clinical_TB_Logs_${format(new Date(), 'yyyyMMdd')}`;
    exportToExcel(exportData, fileName);
    
    toast({ 
      title: 'Excel Export Ready', 
      description: `Successfully exported ${reportsToExport.length} records.` 
    });
    setSelectedIds(new Set());
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this clinical report?')) return;
    try {
      await deleteClinicalReport(id);
      toast({ title: 'Report deleted successfully' });
      setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
      });
    } catch (err) {
      toast({ title: 'Error deleting report', variant: 'destructive' });
    }
  };

  const handleBulkDelete = async () => {
      if (!confirm(`Delete ${selectedIds.size} selected reports? This cannot be undone.`)) return;
      try {
          for (const id of Array.from(selectedIds)) {
              await deleteClinicalReport(id);
          }
          toast({ title: 'Success', description: `${selectedIds.size} reports deleted.` });
          setSelectedIds(new Set());
      } catch (err) {
          toast({ title: 'Error during bulk deletion', variant: 'destructive' });
      }
  };

  const SortableHeader = ({ label, sortKey, className }: { label: string; sortKey: SortConfig['key']; className?: string }) => (
    <TableHead className={cn("text-[10px] font-bold uppercase tracking-wider", className)}>
        <Button 
            variant="ghost" 
            onClick={() => handleSort(sortKey)} 
            className="h-8 px-2 hover:bg-transparent text-[10px] font-bold uppercase tracking-wider gap-1"
        >
            {label}
            <ArrowUpDown className={cn("h-3 w-3", sortConfig.key === sortKey ? "text-primary" : "text-muted-foreground/30")} />
        </Button>
    </TableHead>
  );

  const isAllSelected = sortedReports.length > 0 && selectedIds.size === sortedReports.length;

  return (
    <div className="space-y-4">
      {isAdmin && selectedIds.size > 0 && (
          <div className='px-4 pt-4'>
              <SelectionToolbar 
                selectionCount={selectedIds.size}
                onClear={() => setSelectedIds(new Set())}
                onDelete={handleBulkDelete}
                onExport={handleExport}
                showStatusChange={false}
                onStatusChange={() => {}}
                isAllSelected={isAllSelected}
                onSelectAll={handleToggleAll}
              />
          </div>
      )}

      <div className="flex items-center justify-between px-4 pt-4">
        <div className='flex items-center gap-2'>
            <Badge variant='outline' className='h-6 gap-1 px-3 border-primary/20 bg-background'>
                <CalendarIcon className='h-3 w-3 text-primary' /> Reports Matching Filter: {reports?.length || 0}
            </Badge>
            {totalPages > 1 && (
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, sortedReports.length)} of {sortedReports.length}
                </span>
            )}
        </div>
        {isAdmin && selectedIds.size === 0 && (
          <Button 
            onClick={handleExport} 
            variant="outline" 
            size="sm" 
            className='bg-green-500/5 hover:bg-green-500/10 border-green-500/20 text-green-600 hover:text-green-700 h-8 font-bold text-[10px] uppercase tracking-widest'
            disabled={!reports || reports.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>

      <div className="rounded-md border-x bg-card overflow-hidden">
        <div className="overflow-x-auto">
            <Table>
            <TableHeader className='bg-muted/40'>
                <TableRow>
                <TableHead className="w-[40px] px-4">
                    <Checkbox 
                        checked={isAllSelected} 
                        onCheckedChange={handleToggleAll}
                        aria-label="Select all"
                    />
                </TableHead>
                <SortableHeader label="Date" sortKey="date" className="whitespace-nowrap" />
                <SortableHeader label="Machine" sortKey="machineId" />
                <SortableHeader label="Radiographer" sortKey="radiographerName" />
                <SortableHeader label="Zone" sortKey="zone" />
                <SortableHeader label="State" sortKey="state" />
                <SortableHeader label="Attendees" sortKey="attendeesCount" className="text-center" />
                <SortableHeader label="TB+" sortKey="tbPatientsCount" className="text-center" />
                {isAdmin && <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider pr-6">Action</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={isAdmin ? 9 : 8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))
                ) : paginatedReports && paginatedReports.length > 0 ? (
                paginatedReports.map((report) => (
                    <TableRow 
                        key={report.id} 
                        className={cn('hover:bg-muted/20 transition-colors group', selectedIds.has(report.id) && 'bg-primary/5')}
                        onClick={() => handleToggleSelection(report.id)}
                    >
                    <TableCell className='px-4' onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                            checked={selectedIds.has(report.id)} 
                            onCheckedChange={() => handleToggleSelection(report.id)}
                        />
                    </TableCell>
                    <TableCell className='whitespace-nowrap font-semibold text-xs'>
                        {format(new Date(report.date), 'MMM dd, yy')}
                    </TableCell>
                    <TableCell className='font-bold text-primary text-xs'>{report.machineId}</TableCell>
                    <TableCell className='text-[10px] font-medium text-muted-foreground truncate max-w-[100px]'>{report.radiographerName || 'N/A'}</TableCell>
                    <TableCell className='text-[10px] font-bold uppercase text-muted-foreground'>
                        <div className='flex items-center gap-1'>
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/40" /> {report.zone}
                        </div>
                    </TableCell>
                    <TableCell className='text-[10px] font-bold uppercase text-muted-foreground truncate max-w-[80px]'>{report.state}</TableCell>
                    <TableCell className='text-center tabular-nums font-medium text-xs'>{report.attendeesCount}</TableCell>
                    <TableCell className='text-center tabular-nums font-black text-primary bg-primary/5'>{report.tbPatientsCount}</TableCell>
                    {isAdmin && (
                        <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className='h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity' 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(report.id);
                            }}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                        </TableCell>
                    )}
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={isAdmin ? 9 : 8} className="h-32 text-center text-muted-foreground italic bg-muted/5">
                    <div className='flex flex-col items-center justify-center gap-2'>
                        <CalendarIcon className='h-8 w-8 opacity-20' />
                        <p className='text-xs'>No clinical records match these filters.</p>
                    </div>
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
            <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
            >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
            </Button>
            
            <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, i, arr) => (
                        <React.Fragment key={p}>
                            {i > 0 && arr[i-1] !== p - 1 && <span className="px-2 text-muted-foreground">...</span>}
                            <Button
                                variant={currentPage === p ? "default" : "outline"}
                                size="sm"
                                className="h-8 w-8 p-0 text-[10px] font-bold"
                                onClick={() => setCurrentPage(p)}
                            >
                                {p}
                            </Button>
                        </React.Fragment>
                    ))
                }
            </div>

            <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
            >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
            </Button>
        </div>
      )}
    </div>
  );
}

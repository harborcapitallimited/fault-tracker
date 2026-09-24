'use client';

import * as React from 'react';
import type { ImpactMonthlyReport } from '@/lib/types';
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
import { exportToExcel } from '@/lib/utils';
import { format } from 'date-fns';
import { Download, Trash2, Calendar as CalendarIcon, FileSpreadsheet, ArrowUpDown, Info, ClipboardList, User } from 'lucide-react';
import { useFaultReportMutations } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/context/admin-context';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type SortConfig = {
  key: keyof ImpactMonthlyReport;
  direction: 'asc' | 'desc';
};

export function ImpactMonthlyReportsTable({
  reports,
  isLoading,
}: {
  reports: ImpactMonthlyReport[];
  isLoading: boolean;
}) {
  const { deleteImpactMonthlyReport } = useFaultReportMutations();
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: 'date', direction: 'desc' });
  const [reportToView, setReportToView] = React.useState<ImpactMonthlyReport | null>(null);

  const sortedReports = React.useMemo(() => {
    if (!reports) return [];
    const sorted = [...reports];
    sorted.sort((a, b) => {
        let valA: any = a[sortConfig.key];
        let valB: any = b[sortConfig.key];

        if (typeof valA === 'number' && typeof valB === 'number') {
            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }

        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
    return sorted;
  }, [reports, sortConfig]);

  const handleSort = (key: keyof ImpactMonthlyReport) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleExport = () => {
    if (!reports || reports.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    
    const exportData = sortedReports.map(r => ({
      'Month': format(new Date(r.date), 'MMMM yyyy'),
      'Machine ID': r.machineId,
      'Radiographer': r.radiographerName || 'N/A',
      'State': r.state,
      'Facility': r.facilityName,
      'Total Attendees': r.attendeesCount,
      'Screened for TB': r.screenedForTbCount,
      'Presumptive Registered': r.presumptiveRegisteredCount,
      'Presumptive Evaluated': r.presumptiveEvaluatedCount,
      'Total TB Diagnosed': r.totalTbDiagnosedCount,
      'Bacteriological diagnosed': r.bacteriologicalTbCount,
      'Clinical diagnosed': r.clinicalTbCount,
      'Childhood TB': r.childhoodTbCount,
      'DR-TB cases': r.drTbCount,
      'Started Treatment': r.startedTreatmentCount,
      'Non-Chest X-rays': r.nonChestXrayCount,
      'Remarks': r.remarks,
      'Submitted By': r.submittedBy,
      'Timestamp': format(new Date(r.createdAt), 'yyyy-MM-dd HH:mm:ss')
    }));

    exportToExcel(exportData, `IMPACT_Monthly_Logs_${format(new Date(), 'yyyyMMdd')}`);
    toast({ title: 'Excel Export Ready', description: `Successfully exported ${reports.length} records.` });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to permanently delete this IMPACT monthly report?')) return;
    try {
      await deleteImpactMonthlyReport(id);
      toast({ title: 'Report deleted successfully' });
    } catch (err) {
      toast({ title: 'Error deleting report', variant: 'destructive' });
    }
  };

  const SortableHeader = ({ label, sortKey, className }: { label: string; sortKey: keyof ImpactMonthlyReport; className?: string }) => (
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant='outline' className='h-6 gap-1 px-3 border-primary/20 bg-background'>
            <CalendarIcon className='h-3 w-3 text-primary' /> Total IMPACT Reports: {reports?.length || 0}
        </Badge>
        {isAdmin && (
          <Button 
            onClick={handleExport} 
            variant="outline" 
            size="sm" 
            className='bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20 text-blue-600 h-9 font-bold text-[10px] uppercase tracking-widest'
            disabled={!reports || reports.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export IMPACT Logs
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-card overflow-hidden shadow-inner">
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow className='bg-muted/40 hover:bg-muted/40'>
                <SortableHeader label="Month" sortKey="date" />
                <SortableHeader label="Machine" sortKey="machineId" />
                <SortableHeader label="Radiographer" sortKey="radiographerName" />
                <SortableHeader label="Facility" sortKey="facilityName" />
                <SortableHeader label="TB+" sortKey="totalTbDiagnosedCount" className="text-center" />
                <SortableHeader label="Treatment" sortKey="startedTreatmentCount" className="text-center" />
                {isAdmin && <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider pr-6">Action</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={isAdmin ? 7 : 6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))
                ) : sortedReports && sortedReports.length > 0 ? (
                sortedReports.map((report) => (
                    <TableRow key={report.id} className='hover:bg-muted/20 transition-colors group cursor-pointer' onClick={() => setReportToView(report)}>
                    <TableCell className='whitespace-nowrap font-bold text-xs'>
                        {format(new Date(report.date), 'MMM yyyy')}
                    </TableCell>
                    <TableCell className='font-bold text-primary text-xs'>{report.machineId}</TableCell>
                    <TableCell className='text-[10px] font-medium truncate max-w-[120px]'>
                        {report.radiographerName || 'N/A'}
                    </TableCell>
                    <TableCell className='text-xs truncate max-w-[150px]'>{report.facilityName}</TableCell>
                    <TableCell className='text-center tabular-nums font-black text-primary bg-primary/5'>{report.totalTbDiagnosedCount}</TableCell>
                    <TableCell className='text-center tabular-nums text-xs font-semibold text-green-600'>{report.startedTreatmentCount}</TableCell>
                    {isAdmin && (
                        <TableCell className="text-right pr-6">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className='h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity' 
                            onClick={(e) => handleDelete(e, report.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </TableCell>
                    )}
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="h-32 text-center text-muted-foreground italic bg-muted/5">
                        No IMPACT monthly reports found.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      </div>

      <Dialog open={!!reportToView} onOpenChange={(open) => !open && setReportToView(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                IMPACT Monthly Report Details
            </DialogTitle>
            <DialogDescription>
              Machine #{reportToView?.machineId} • {reportToView?.facilityName} • {reportToView?.date ? format(new Date(reportToView.date), 'MMMM yyyy') : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 mt-4">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-muted-foreground border-b pb-1">Report Context</h4>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Radiographer:</span> <span className="font-bold">{reportToView?.radiographerName || 'N/A'}</span></div>
                    <div className="flex justify-between"><span>State:</span> <span className="font-bold">{reportToView?.state}</span></div>
                    <div className="flex justify-between"><span>Attendees:</span> <span className="font-bold">{reportToView?.attendeesCount}</span></div>
                    <div className="flex justify-between"><span>Screened for TB:</span> <span className="font-bold">{reportToView?.screenedForTbCount}</span></div>
                    <div className="flex justify-between text-primary font-black border-t pt-1"><span>Total Diagnosed:</span> <span>{reportToView?.totalTbDiagnosedCount}</span></div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-muted-foreground border-b pb-1">Diagnosis & Treatment</h4>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Bacteriological:</span> <span className="font-bold">{reportToView?.bacteriologicalTbCount}</span></div>
                    <div className="flex justify-between"><span>Clinical:</span> <span className="font-bold">{reportToView?.clinicalTbCount}</span></div>
                    <div className="flex justify-between"><span>Childhood TB:</span> <span className="font-bold">{reportToView?.childhoodTbCount}</span></div>
                    <div className="flex justify-between"><span>DR-TB cases:</span> <span className="font-bold">{reportToView?.drTbCount}</span></div>
                    <div className="flex justify-between text-green-600 font-black border-t pt-1"><span>Started Treatment:</span> <span>{reportToView?.startedTreatmentCount}</span></div>
                </div>
              </div>
              <div className="col-span-2 space-y-4">
                <h4 className="text-[10px] font-black uppercase text-muted-foreground border-b pb-1">Other Metrics & Remarks</h4>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-blue-500/5 p-2 rounded border border-blue-500/10">
                        <Info className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Non-Chest X-rays (Legs, Arm, etc.): <span className="font-black text-blue-700">{reportToView?.nonChestXrayCount}</span></span>
                    </div>
                    <div className="text-sm bg-muted/20 p-3 rounded italic">
                        <p className="font-bold text-[10px] uppercase not-italic mb-1 text-muted-foreground">Remarks:</p>
                        {reportToView?.remarks || 'No remarks provided for this period.'}
                    </div>
                </div>
              </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

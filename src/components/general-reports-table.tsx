'use client';

import * as React from 'react';
import type { GeneralReport } from '@/lib/types';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdmin } from '@/context/admin-context';
import { Checkbox } from '@/components/ui/checkbox';
import { SelectionToolbar } from '@/components/selection-toolbar';
import { exportToExcel } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFaultReportMutations, createNotification } from '@/lib/data';
import { EditGeneralReportDialog } from '@/components/edit-general-report-dialog';
import { FilePenLine } from 'lucide-react';
import { useDatabase } from '@/firebase';

export function GeneralReportsTable({
  reports: initialReports,
  isLoading,
}: {
  reports: GeneralReport[];
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const database = useDatabase();
  const { deleteGeneralReport } = useFaultReportMutations();
  const { isAdmin, adminRole, adminName } = useAdmin();
  const [selectedReports, setSelectedReports] = React.useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [reportToView, setReportToView] = React.useState<GeneralReport | null>(null);

  const handleToggleSelection = (id: string) => {
    setSelectedReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleToggleAll = () => {
    if (selectedReports.size === initialReports.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(initialReports.map(r => r.id)));
    }
  };
  
  const clearSelection = () => {
    setSelectedReports(new Set());
  };
  
  const handleExport = () => {
    if (!initialReports) return;
    const selectedData = initialReports.filter(r => selectedReports.has(r.id))
      .map(report => ({
        'Name': report.name,
        'Designation': report.designation,
        'Date': report.date ? new Date(report.date as any).toLocaleDateString() : 'N/A',
        'Detail': report.detail,
      }));

    if (selectedData.length > 0) {
      exportToExcel(selectedData, 'General_Reports');
      createNotification(database, `exported ${selectedData.length} general reports.`, adminRole, adminName);
    }
    clearSelection();
  };

  const handleBulkDelete = () => {
    selectedReports.forEach(id => {
      deleteGeneralReport(id).catch(err => {
        toast({
          title: 'Error Deleting Report',
          description: `Could not delete report ${id}.`,
          variant: 'destructive',
        });
      });
    });
    toast({
      title: 'Reports Deleted',
      description: `${selectedReports.size} reports have been permanently deleted.`,
    });
    clearSelection();
    setIsDeleteDialogOpen(false);
  };
  
  const getDate = (date: any) => {
    return new Date(date);
  }

  const isAllSelected = initialReports && selectedReports.size > 0 && selectedReports.size === initialReports.length;
  
  return (
    <div className="w-full">
      {isAdmin && selectedReports.size > 0 && (
        <SelectionToolbar
          selectionCount={selectedReports.size}
          onClear={clearSelection}
          onExport={handleExport}
          onDelete={() => setIsDeleteDialogOpen(true)}
          showStatusChange={false}
          onStatusChange={() => {}}
          isAllSelected={isAllSelected}
          onSelectAll={handleToggleAll}
        />
      )}
      <div className="rounded-md border mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && (
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleToggleAll}
                    aria-label="Select all rows"
                  />
                </TableHead>
              )}
              <TableHead>Name</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Detail</TableHead>
              {isAdmin && <TableHead className="text-right w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={isAdmin ? 6 : 5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : initialReports && initialReports.length > 0 ? (
              initialReports.map((report) => (
                <TableRow 
                  key={report.id} 
                  data-state={selectedReports.has(report.id) ? 'selected' : ''}
                  onClick={() => setReportToView(report)}
                  className="cursor-pointer"
                >
                  {isAdmin && (
                    <TableCell onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelection(report.id);
                    }}>
                      <Checkbox
                        checked={selectedReports.has(report.id)}
                        onCheckedChange={() => {}} // The cell onClick handles the logic
                        aria-label={`Select report by ${report.name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    {report.name}
                  </TableCell>
                   <TableCell>
                    {report.designation}
                  </TableCell>
                  <TableCell>
                    {report.date && getDate(report.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate" title={report.detail}>
                    {report.detail}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <EditGeneralReportDialog report={report}>
                        <Button variant="outline" size="sm">
                          <FilePenLine className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </EditGeneralReportDialog>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center">
                  No general reports found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

       <Dialog open={!!reportToView} onOpenChange={(open) => !open && setReportToView(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>General Report Details</DialogTitle>
            <DialogDescription>
              From {reportToView?.name} on {reportToView?.date ? getDate(reportToView.date).toLocaleDateString() : 'N/A'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-4">
              <div className="text-sm">
                <p className="font-medium text-muted-foreground">Designation</p>
                <p>{reportToView?.designation || '-'}</p>
              </div>
              <div className="text-sm">
                 <p className="font-medium text-muted-foreground">Details</p>
                <p className="whitespace-pre-wrap">
                    {reportToView?.detail}
                </p>
              </div>
          </div>
        </DialogContent>
       </Dialog>

       <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {selectedReports.size} report(s). This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}

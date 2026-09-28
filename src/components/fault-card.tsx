'use client';

import * as React from 'react';
import type { FaultReport } from '@/lib/types';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Trash2,
  FilePenLine,
  Clock,
  Ticket,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { Button } from './ui/button';
import { cn, normalizeSystemNumber, parseDate } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { useFaultReportMutations } from '@/lib/data';
import { useAdmin } from '@/context/admin-context';
import { Separator } from './ui/separator';
import { EditReportDialog } from './edit-report-dialog';
import { SendEmailDialog } from './send-email-dialog';
import { Checkbox } from './ui/checkbox';
import { format, differenceInDays } from 'date-fns';

const StatusBadge = ({ status }: { status: FaultReport['status'] }) => {
  const variant: 'default' | 'secondary' | 'destructive' =
    status === 'Resolved'
      ? 'default'
      : status === 'In Progress'
      ? 'secondary'
      : 'destructive';

  const bgClass =
    status === 'Resolved'
      ? 'bg-green-500'
      : status === 'In Progress'
      ? 'bg-yellow-500'
      : 'bg-red-500';

  return (
    <Badge variant={variant} className={cn('text-white', bgClass)}>
      {status}
    </Badge>
  );
};

const TimeCounter = ({ date }: { date: any }) => {
  const [days, setDays] = React.useState<number | null>(null);

  React.useEffect(() => {
    const d = parseDate(date);
    if (!d) return;
    
    const calculateDays = () => {
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - d.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      setDays(diffDays);
    };

    calculateDays();
    const interval = setInterval(calculateDays, 1000 * 60 * 60 * 24);

    return () => clearInterval(interval);
  }, [date]);
  
  if (days === null) {
      return <span>-</span>
  }

  return <span>{days} days ago</span>;
};

interface FaultCardProps {
  report: FaultReport;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  isHighlighted?: boolean;
  id?: string;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export function FaultCard({ report, isSelected, onToggleSelection, isHighlighted, isOpen, onToggleOpen, ...props }: FaultCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const { toast } = useToast();
  const { deleteFaultReport, updateFaultReport } = useFaultReportMutations();
  const { isAdmin } = useAdmin();

  const handleDelete = async () => {
    try {
      deleteFaultReport(report.id);
      toast({
        title: 'Report Deleted',
        description: 'The fault report has been moved to recently deleted.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete report.',
        variant: 'destructive',
      });
    }
    setIsDeleteDialogOpen(false);
  };

  const handleStatusChange = (e: React.MouseEvent, status: FaultReport['status']) => {
    e.stopPropagation();
    try {
      updateFaultReport(report.id, { status }, report.systemNumber);
      toast({
        title: 'Status Updated',
        description: `Report status changed to ${status}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status.',
        variant: 'destructive',
      });
    }
  };
  
  const getFaultDescription = () => {
    if (report.faultSubCategory === 'add-new' || report.faultCategory === 'Others') {
        return report.customFaultDescription || 'N/A';
    }
    if (report.faultCategory === 'Minxray' || report.faultCategory === 'Qure.ai') {
        return report.faultSubCategory?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || `Not specified`;
    }
    return report.faultDescription || 'N/A';
  };

  const detectedDate = parseDate(report.detectionDate);
  const reportedDate = parseDate(report.dateIssueReported);
  const resolvedDate = parseDate(report.dateResolved);

  const getResolutionTime = () => {
    if (report.status === 'Resolved' && detectedDate && resolvedDate) {
        const days = differenceInDays(resolvedDate, detectedDate);
        return `${days} day${days !== 1 ? 's' : ''}`;
    }
    return null;
  };

  const resolutionTime = getResolutionTime();

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={onToggleOpen}>
        <Card {...props} id={props.id} className={cn("overflow-hidden border-muted", isSelected && "border-primary ring-1 ring-primary", isHighlighted && "ring-2 ring-offset-2 ring-primary transition-all duration-300")}>
          <CollapsibleTrigger asChild>
              <div className="flex items-center p-4 cursor-pointer hover:bg-muted/50">
              {isAdmin && (
                  <div className="mr-4" onClick={(e) => { e.stopPropagation(); onToggleSelection(report.id); }}>
                  <Checkbox
                      checked={isSelected}
                      aria-label="Select report"
                  />
                  </div>
              )}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                  <div className="font-bold flex items-center gap-2">
                      <div className='bg-primary/10 p-1.5 rounded-md'>
                        <Ticket className='h-3.5 w-3.5 text-primary' />
                      </div>
                      <div className='flex flex-col'>
                        <span className='text-[8px] uppercase text-muted-foreground font-black tracking-widest'>Ticket ID</span>
                        <span className='text-xs font-black tracking-tight'>{report.ticketId || 'TKT-PENDING'}</span>
                      </div>
                  </div>
                  <div className="truncate" title={report.radiographerName}>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Radiographer</p>
                      <span className='text-sm font-medium'>{report.radiographerName}</span>
                  </div>
                  <div className="truncate" title={report.systemNumber}>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Machine S/N</p>
                      <span className='text-sm font-black'>{normalizeSystemNumber(report.systemNumber).toString()}</span>
                  </div>
                  <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={!isAdmin}>
                      <Button variant="ghost" className={cn('h-auto p-1 -ml-1')} >
                          <StatusBadge status={report.status} />
                      </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                      <DropdownMenuItem onClick={(e) => handleStatusChange(e, 'Pending')}>
                          Pending
                      </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleStatusChange(e, 'In Progress')}>
                          In Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleStatusChange(e, 'Resolved')}>
                          Resolved
                      </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
                  </div>
              </div>
              </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <Separator />
            <CardContent className="p-4 space-y-4 bg-muted/5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                      <p className="font-medium text-muted-foreground">Location ({report.locationType})</p>
                      <p>{report.facility}</p>
                  </div>
                   <div>
                      <p className="font-medium text-muted-foreground">When Detected</p>
                      <p>{detectedDate ? format(detectedDate, 'PPp') : '-'}</p>
                  </div>
                  <div>
                      <p className="font-medium text-muted-foreground">When Reported</p>
                      <p>{reportedDate ? format(reportedDate, 'PPp') : '-'}</p>
                  </div>
                  <div>
                      <p className="font-medium text-muted-foreground">Phone Number</p>
                      <p>{report.phoneNumber || '-'}</p>
                  </div>
                  {report.status === 'Resolved' && (
                    <div>
                        <p className="font-medium text-muted-foreground">When Resolved</p>
                        <p>{resolvedDate ? format(resolvedDate, 'PPp') : '-'}</p>
                    </div>
                  )}
                   <div>
                      <p className="font-medium text-muted-foreground">{report.status === 'Resolved' ? 'Time to Resolve' : 'Time Elapsed'}</p>
                      <p className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {report.status === 'Resolved' ? (resolutionTime || '-') : <TimeCounter date={report.detectionDate} />}
                      </p>
                  </div>
              </div>
              <div className='bg-background p-3 rounded-md border border-dashed'>
                  <p className="font-bold text-[10px] uppercase text-muted-foreground mb-1 tracking-widest">Fault Details</p>
                  <p className="text-sm italic">"{getFaultDescription()}"</p>
              </div>
               <div className='bg-primary/5 p-3 rounded-md border border-primary/10'>
                  <p className="font-bold text-[10px] uppercase text-primary mb-1 tracking-widest">Current Engineering Action</p>
                  <p className="text-sm font-semibold">{report.currentAction || 'Awaiting initial assessment.'}</p>
              </div>
            </CardContent>
            {isAdmin && (
              <>
                <Separator />
                <CardFooter className="flex justify-between items-center gap-2 p-4 bg-muted/10">
                  <div>
                    <SendEmailDialog report={report}>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={cn(
                          "gap-1.5",
                          report.emailSent 
                            ? "border-green-500/40 text-green-500 hover:bg-green-500/10 hover:text-green-400" 
                            : "border-primary/30 text-primary hover:bg-primary/10"
                        )}
                      >
                        {report.emailSent ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Mail className="h-4 w-4" />}
                        {report.emailSent ? 'Email Sent' : 'Send Email'}
                      </Button>
                    </SendEmailDialog>
                  </div>
                  <div className="flex items-center gap-2">
                    <EditReportDialog report={report} onOpenChange={setIsEditDialogOpen}>
                      <Button variant="outline" size="sm">
                        <FilePenLine className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </EditReportDialog>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardFooter>
              </>
            )}
          </CollapsibleContent>
          </Card>
      </Collapsible>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will move the fault report (Ticket: {report.ticketId}) to the 'Recently Deleted' page. You can restore it from there.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

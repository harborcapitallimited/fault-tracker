'use client';

import * as React from 'react';
import type { FaultReport, SystemReport, AdvancedFilter, ClinicalReport, AppSettings } from '@/lib/types';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from './ui/skeleton';
import { useAdmin } from '@/context/admin-context';
import { Button } from './ui/button';
import { 
  ArrowUpDown, 
  FilePenLine, 
  Trash2, 
  ChevronRight, 
  Phone, 
  Mail, 
  FileText, 
  History as HistoryIcon,
  Filter,
  X,
  Clock,
  Calendar as CalendarIcon,
  BarChart3,
  Stethoscope,
  Users,
  Activity,
  PlusCircle,
  ChevronDown
} from 'lucide-react';
import { cn, normalizeSystemNumber, parseDate } from '@/lib/utils';
import { useFaultReportMutations } from '@/lib/data';
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
import { EditSystemDeviceDialog } from './edit-system-device-dialog';
import { SystemStatusIndicator } from './system-status-indicator';
import { Checkbox } from './ui/checkbox';
import { SelectionToolbar } from './selection-toolbar';
import { exportToExcel } from '@/lib/utils';
import { useRTDBList, useRTDBItem } from '@/firebase';
import { Input } from './ui/input';
import { FaultCard } from './fault-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { DowntimeDetailsForm } from './downtime-details-form';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
  } from "@/components/ui/collapsible"
import { Badge } from './ui/badge';
import { nigerianStates } from '@/data/states';
import { format, differenceInDays, getMonth, getWeekOfMonth, getYear } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

type SortKey = keyof Pick<SystemReport, 'productSystemId' | 'operatorUserName' | 'locationType'> | 'createdAt';
type SortDirection = 'asc' | 'desc';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getDeviceTimestamp = (device: any): number => {
  if (!device) return 0;

  // 1. Explicit createdAt / updatedAt
  if (device.createdAt) {
    const t = new Date(device.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (device.updatedAt) {
    const t = new Date(device.updatedAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  // 2. Explicit dateSystemDown / installationDate / dateFixed / date
  if (device.dateSystemDown) {
    const t = new Date(device.dateSystemDown).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (device.installationDate) {
    const t = new Date(device.installationDate).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (device.dateFixed) {
    const t = new Date(device.dateFixed).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (device.date) {
    const t = new Date(device.date).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  // 3. Most recent associated fault or clinical report
  if (device.allFaults && device.allFaults.length > 0) {
    let maxFaultTime = 0;
    for (const f of device.allFaults) {
      if (f.detectionDate) {
        const t = new Date(f.detectionDate).getTime();
        if (!isNaN(t) && t > maxFaultTime) maxFaultTime = t;
      }
      if (f.dateIssueReported) {
        const t = new Date(f.dateIssueReported).getTime();
        if (!isNaN(t) && t > maxFaultTime) maxFaultTime = t;
      }
    }
    if (maxFaultTime > 0) return maxFaultTime;
  }
  if (device.clinicalHistory && device.clinicalHistory.length > 0) {
    let maxClinicalTime = 0;
    for (const c of device.clinicalHistory) {
      if (c.date) {
        const t = new Date(c.date).getTime();
        if (!isNaN(t) && t > maxClinicalTime) maxClinicalTime = t;
      }
      if (c.createdAt) {
        const t = new Date(c.createdAt).getTime();
        if (!isNaN(t) && t > maxClinicalTime) maxClinicalTime = t;
      }
    }
    if (maxClinicalTime > 0) return maxClinicalTime;
  }

  // 4. Firebase Push ID timestamp decoding
  if (device.id && typeof device.id === 'string' && device.id.length >= 8) {
    const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
    let time = 0;
    let valid = true;
    for (let i = 0; i < 8; i++) {
      const idx = PUSH_CHARS.indexOf(device.id.charAt(i));
      if (idx === -1) {
        valid = false;
        break;
      }
      time = time * 64 + idx;
    }
    if (valid && time > 1262304000000 && time < 4102444800000) {
      return time;
    }
  }

  return 0;
};

const formatDeviceDate = (device: any): string => {
  const ts = getDeviceTimestamp(device);
  if (!ts || ts === 0) return '-';
  try {
    return format(new Date(ts), 'dd MMM yyyy, HH:mm');
  } catch {
    return '-';
  }
};

const SortableHeader = ({ 
  sortKey, 
  children, 
  className, 
  currentSort, 
  onSort 
}: { 
  sortKey: SortKey; 
  children: React.ReactNode; 
  className?: string; 
  currentSort: { key: SortKey; direction: SortDirection };
  onSort: (key: SortKey) => void;
}) => (
  <TableHead className={className}>
    <Button 
      variant="ghost" 
      onClick={() => onSort(sortKey)} 
      className='px-0 hover:bg-transparent text-xs font-bold uppercase tracking-wider'
    >
      {children}
      <ArrowUpDown className={cn("ml-2 h-3 w-3", currentSort.key !== sortKey && "text-muted-foreground/50")} />
    </Button>
  </TableHead>
);

export function SystemDevicesTable({
  devices,
  isLoading,
  externalFilter
}: {
  devices: SystemReport[];
  isLoading: boolean;
  externalFilter?: { type: string; value: string };
}) {
  const { isAdmin, setView } = useAdmin();
  const { toast } = useToast();
  const { data: settings } = useRTDBItem<AppSettings>('settings');

  const { data: faultReports, isLoading: isLoadingFaults } = useRTDBList<FaultReport>('faultReports');
  const { data: clinicalReports, isLoading: isLoadingClinical } = useRTDBList<ClinicalReport>('clinicalReports');
  const { deleteSystemReport, updateMultipleFaultsStatus } = useFaultReportMutations();

  const [sortConfig, setSortConfig] = React.useState<{ key: SortKey; direction: SortDirection }>({
    key: 'createdAt',
    direction: 'desc',
  });
  const [openItems, setOpenItems] = React.useState<Set<string>>(new Set());
  const [openDetails, setOpenDetails] = React.useState<Set<string>>(new Set());
  const [openClinical, setOpenClinical] = React.useState<Set<string>>(new Set());
  const [itemToDelete, setItemToDelete] = React.useState<SystemReport | null>(null);
  const [selectedDevices, setSelectedDevices] = React.useState<Set<string>>(new Set());
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = React.useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = React.useState(false);
  
  const initialFilters: AdvancedFilter = {
    statuses: [],
    states: [],
    year: 'all',
    months: [],
    weeks: [],
    minDuration: '',
    maxDuration: '',
    durationType: 'pending',
    searchTerm: '',
    locationType: 'all',
    healthStatus: 'all'
  };

  const [filters, setFilters] = React.useState<AdvancedFilter>(initialFilters);
  const [openFaultCardId, setOpenFaultCardId] = React.useState<string | null>(null);

  const isClinicalEnabled = settings?.clinicalReportingEnabled ?? false;

  // Sync external filter from Dashboard
  React.useEffect(() => {
    if (externalFilter) {
        if (externalFilter.type === 'health') {
            setFilters(prev => ({ ...prev, healthStatus: externalFilter.value as any }));
        } else if (externalFilter.type === 'report-status') {
            setFilters(prev => ({ ...prev, statuses: [externalFilter.value as any] }));
        } else {
            setFilters(initialFilters);
        }
    }
  }, [externalFilter]);

  // Calculate Report Timeline Analytics
  const temporalStats = React.useMemo(() => {
    const stats: any = {};
    
    (faultReports || []).filter(f => !f.deleted).forEach(f => {
        const date = parseDate(f.detectionDate);
        if (!date) return;
        
        const year = getYear(date).toString();
        const mIdx = getMonth(date).toString();
        const wIdx = getWeekOfMonth(date).toString();
        const isResolved = f.status === 'Resolved';
        
        if (!stats[year]) stats[year] = {};
        if (!stats[year][mIdx]) {
            stats[year][mIdx] = { total: 0, pending: 0, resolved: 0, weeks: {} };
        }
        if (!stats[year][mIdx].weeks[wIdx]) {
            stats[year][mIdx].weeks[wIdx] = { total: 0, pending: 0, resolved: 0 };
        }

        stats[year][mIdx].total++;
        if (isResolved) stats[year][mIdx].resolved++;
        else stats[year][mIdx].pending++;

        stats[year][mIdx].weeks[wIdx].total++;
        if (isResolved) stats[year][mIdx].weeks[wIdx].resolved++;
        else stats[year][mIdx].weeks[wIdx].pending++;
    });
    
    return stats;
  }, [faultReports]);

  const handleToggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDevices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleToggleOpen = (id: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };
  
  const handleToggleDetails = (id: string) => {
    setOpenDetails(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        return newSet;
    });
  };

  const handleToggleClinical = (id: string) => {
    setOpenClinical(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        return newSet;
    });
  }

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteSystemReport(itemToDelete.id);
      toast({
        title: 'System Removed',
        description: `Machine #${itemToDelete.productSystemId} moved to Recently Deleted.`,
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete system.', variant: 'destructive' });
    }
    setItemToDelete(null);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleToggleAll = () => {
    if (selectedDevices.size === sortedAndFilteredDevices.length) {
      setSelectedDevices(new Set());
    } else {
      setSelectedDevices(new Set(sortedAndFilteredDevices.map(r => r.id)));
    }
  };

  const handleExport = () => {
    const selectedData = sortedAndFilteredDevices.filter(r => selectedDevices.has(r.id))
      .map(device => ({
        'Machine #': device.productSystemId,
        'Type': device.locationType || 'N/A',
        'Operator': device.operatorUserName,
        'Date & Time': formatDeviceDate(device),
        'Email': device.operatorEmail,
        'Phone': device.phoneNumber,
        'Facility': device.customerName,
        'State': device.state,
        'Status': device.systemStatus,
        'Clinical Attendees': (device as any).clinicalStats?.totalAttendees || 0,
        'Clinical Screened': (device as any).clinicalStats?.totalScreened || 0,
        'Clinical Positive': (device as any).clinicalStats?.totalPositive || 0,
      }));

    if (selectedData.length > 0) {
      exportToExcel(selectedData, 'Total_Systems_Export');
    }
    setSelectedDevices(new Set());
  };

  const handleBulkDelete = () => {
    Array.from(selectedDevices).forEach(id => deleteSystemReport(id));
    toast({ title: 'Success', description: `${selectedDevices.size} systems moved to Recently Deleted.` });
    setSelectedDevices(new Set());
    setIsBulkDeleteDialogOpen(false);
  };

  const handleBulkStatusChange = (status: FaultReport['status']) => {
    const systemIds = Array.from(selectedDevices);
    const affectedReports = (faultReports || []).filter(fr => 
        systemIds.includes(devices.find(d => normalizeSystemNumber(d.productSystemId) === normalizeSystemNumber(fr.systemNumber))?.id || '')
    );
    
    if (affectedReports.length > 0) {
        updateMultipleFaultsStatus(affectedReports.map(r => r.id), status);
        toast({ title: 'Success', description: `Updated status for ${affectedReports.length} reports associated with selected systems.` });
    }
    setSelectedDevices(new Set());
  }

  const systemsWithEnrichedData = React.useMemo(() => {
    const validDevices = devices?.filter(d => d && !d.deleted) || [];
    if (!faultReports) return validDevices;
  
    const deduplicatedMap = new Map<string, any>();
    validDevices.forEach(device => {
        const normId = normalizeSystemNumber(device.productSystemId);
        if (!normId) return;
        const existing = deduplicatedMap.get(normId);
        if (!existing || (!existing.customerName && device.customerName)) {
            deduplicatedMap.set(normId, device);
        }
    });
    
    const uniqueDevices = Array.from(deduplicatedMap.values());
    
    const nonDeletedFaults = (faultReports || []).filter(fault => fault && !fault.deleted);
    const faultsBySystem = nonDeletedFaults.reduce((acc, fault) => {
      if (!fault.systemNumber) return acc;
      const normId = normalizeSystemNumber(fault.systemNumber);
      if (!normId) return acc;
      if (!acc[normId]) {
        acc[normId] = { active: [], history: [], all: [] };
      }
      acc[normId].all.push(fault);
      if (fault.status === 'Resolved') {
        acc[normId].history.push(fault);
      } else {
        acc[normId].active.push(fault);
      }
      return acc;
    }, {} as Record<string, { active: FaultReport[], history: FaultReport[], all: FaultReport[] }>);

    const clinicalBySystem = (clinicalReports || []).reduce((acc, report) => {
        const normId = normalizeSystemNumber(report.machineId);
        if (!normId) return acc;
        if (!acc[normId]) {
            acc[normId] = { totalAttendees: 0, totalScreened: 0, totalPositive: 0, history: [] };
        }
        acc[normId].totalAttendees += (Number(report.attendeesCount) || 0);
        acc[normId].totalScreened += (Number(report.cxrScreenedCount) || 0);
        acc[normId].totalPositive += (Number(report.tbPatientsCount) || 0);
        acc[normId].history.push(report);
        return acc;
    }, {} as Record<string, { totalAttendees: number, totalScreened: number, totalPositive: number, history: ClinicalReport[] }>);
  
    return uniqueDevices.map(device => {
      const normId = normalizeSystemNumber(device.productSystemId);
      const faults = faultsBySystem[normId] || { active: [], history: [], all: [] };
      const clinical = clinicalBySystem[normId] || { totalAttendees: 0, totalScreened: 0, totalPositive: 0, history: [] };
      const hasActiveFault = faults.active.length > 0;
  
      let finalStatus = device.systemStatus || 'Up';
      if (hasActiveFault) {
        finalStatus = 'Down';
      } else if (finalStatus === 'Down') {
        finalStatus = 'Up';
      }
  
      return {
        ...device,
        systemStatus: finalStatus,
        activeFaults: faults.active,
        faultHistory: faults.history,
        allFaults: faults.all,
        clinicalStats: {
            totalAttendees: clinical.totalAttendees,
            totalScreened: clinical.totalScreened,
            totalPositive: clinical.totalPositive
        },
        clinicalHistory: clinical.history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      };
    });
  }, [devices, faultReports, clinicalReports]);

  const sortedAndFilteredDevices = React.useMemo(() => {
    let filtered = systemsWithEnrichedData;
    
    if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filtered = filtered.filter(d => 
            d.productSystemId.toLowerCase().includes(term) ||
            d.operatorUserName.toLowerCase().includes(term) ||
            d.customerName.toLowerCase().includes(term) ||
            d.state?.toLowerCase().includes(term)
        );
    }

    if (filters.locationType !== 'all') {
        filtered = filtered.filter(d => d.locationType === filters.locationType);
    }

    if (filters.healthStatus !== 'all') {
        filtered = filtered.filter(d => d.systemStatus === filters.healthStatus);
    }

    if (filters.statuses.length > 0) {
        filtered = filtered.filter(d => 
            (d as any).allFaults?.some((f: FaultReport) => filters.statuses.includes(f.status))
        );
    }

    if (filters.states.length > 0) {
        filtered = filtered.filter(d => d.state && filters.states.includes(d.state));
    }

    if (filters.year !== 'all') {
        filtered = filtered.filter(d => 
            (d as any).allFaults?.some((f: FaultReport) => {
                const date = parseDate(f.detectionDate);
                return date && getYear(date).toString() === filters.year;
            })
        );
    }

    if (filters.months.length > 0) {
        filtered = filtered.filter(d => 
            (d as any).allFaults?.some((f: FaultReport) => {
                const date = parseDate(f.detectionDate);
                return date && filters.months.includes(getMonth(date).toString());
            })
        );
    }

    if (filters.weeks.length > 0) {
        filtered = filtered.filter(d => 
            (d as any).allFaults?.some((f: FaultReport) => {
                const date = parseDate(f.detectionDate);
                return date && filters.weeks.includes(getWeekOfMonth(date).toString());
            })
        );
    }

    if (filters.minDuration !== '' || filters.maxDuration !== '') {
        const min = filters.minDuration === '' ? 0 : filters.minDuration;
        const max = filters.maxDuration === '' ? Infinity : filters.maxDuration;

        filtered = filtered.filter(d => {
            const faults = filters.durationType === 'pending' ? (d as any).activeFaults : (d as any).faultHistory;
            return faults?.some((f: FaultReport) => {
                const start = parseDate(f.detectionDate);
                const end = filters.durationType === 'pending' ? new Date() : parseDate(f.dateResolved);
                if (!start || !end) return false;
                const diff = differenceInDays(end, start);
                return diff >= min && diff <= max;
            });
        });
    }
    
    const sortableDevices = [...filtered];
    sortableDevices.sort((a, b) => {
      const key = sortConfig.key;
      if (key === 'createdAt') {
        const timeA = getDeviceTimestamp(a);
        const timeB = getDeviceTimestamp(b);
        if (timeA !== timeB) {
          return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
        }
        return a.productSystemId.localeCompare(b.productSystemId);
      }
      let pValA = ((a as any)[key] || '').toString();
      let pValB = ((b as any)[key] || '').toString();
      return sortConfig.direction === 'asc' ? pValA.localeCompare(pValB) : pValB.localeCompare(pValA);
    });

    return sortableDevices;
  }, [systemsWithEnrichedData, sortConfig, filters]);

  const isAllSelected = sortedAndFilteredDevices.length > 0 && selectedDevices.size === sortedAndFilteredDevices.length;

  const availableYears = Object.keys(temporalStats).sort((a, b) => parseInt(b) - parseInt(a));

  const toggleMonth = (mIdx: string) => {
    setFilters(prev => {
        const newMonths = prev.months.includes(mIdx) 
            ? prev.months.filter(m => m !== mIdx)
            : [...prev.months, mIdx];
        return { ...prev, months: newMonths };
    });
  };

  const toggleWeek = (wIdx: string) => {
    setFilters(prev => {
        const newWeeks = prev.weeks.includes(wIdx)
            ? prev.weeks.filter(w => w !== wIdx)
            : [...prev.weeks, wIdx];
        return { ...prev, weeks: newWeeks };
    });
  };

  return (
    <div className="w-full space-y-4">
      <div className='flex flex-wrap items-center gap-3 bg-muted/10 p-2 rounded-lg border'>
        <div className="relative flex-1 min-w-[240px]">
            <Input
              placeholder="Search by S/N, Facility, or Operator..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="h-10 bg-background"
            />
            {filters.searchTerm && (
                <Button variant="ghost" size="icon" className='absolute right-1 top-1 h-8 w-8' onClick={() => setFilters(prev => ({ ...prev, searchTerm: '' }))}>
                    <X className='h-4 w-4'/>
                </Button>
            )}
        </div>
        
        <Button 
            variant={isFilterPanelOpen ? "secondary" : "outline"} 
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className='h-10 gap-2 font-bold uppercase text-[10px] tracking-widest'
        >
            <Filter className='h-4 w-4' />
            {isFilterPanelOpen ? 'Hide Filters' : 'Advanced Filters'}
            {(filters.statuses.length > 0 || filters.states.length > 0 || filters.months.length > 0 || filters.weeks.length > 0 || filters.minDuration !== '' || filters.year !== 'all') && (
                <Badge variant='destructive' className='h-4 min-w-4 p-0 justify-center rounded-full text-[8px]'>!</Badge>
            )}
        </Button>

        <div className='flex items-center gap-2 ml-auto'>
            {isAdmin && selectedDevices.size > 0 && (
                <SelectionToolbar
                    selectionCount={selectedDevices.size}
                    onClear={() => setSelectedDevices(new Set())}
                    onExport={handleExport}
                    onDelete={() => setIsBulkDeleteDialogOpen(true)}
                    showStatusChange={true}
                    onStatusChange={handleBulkStatusChange}
                    isAllSelected={isAllSelected}
                    onSelectAll={handleToggleAll}
                />
            )}
        </div>
      </div>

      <Collapsible open={isFilterPanelOpen}>
        <CollapsibleContent className='animate-in slide-in-from-top-2 duration-300'>
            <Card className='border-primary/20 bg-muted/5'>
                <CardContent className='p-4 space-y-6'>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
                        <div className='space-y-2'>
                            <Label className='text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2'>
                                <CalendarIcon className='h-3 w-3'/> Maintenance Period
                            </Label>
                            <div className='flex flex-col gap-2'>
                                <Select value={filters.year} onValueChange={(val) => setFilters(prev => ({ ...prev, year: val }))}>
                                    <SelectTrigger className='h-9'><SelectValue placeholder="Select Year" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Years</SelectItem>
                                        {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                
                                <div className='flex gap-2'>
                                    {/* MULTI-MONTH SELECT */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="h-9 flex-1 justify-between text-xs px-3">
                                                {filters.months.length === 0 ? "Select Month(s)" : `${filters.months.length} Month(s)`}
                                                <ChevronDown className="h-3 w-3 opacity-50 ml-2" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-48 max-h-60 overflow-y-auto">
                                            <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground">Select Months</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {MONTHS.map((m, i) => {
                                                const yearData = temporalStats[filters.year] || {};
                                                const monthData = yearData[i.toString()] || { total: 0, pending: 0, resolved: 0 };
                                                return (
                                                    <DropdownMenuCheckboxItem
                                                        key={m}
                                                        checked={filters.months.includes(i.toString())}
                                                        onCheckedChange={() => toggleMonth(i.toString())}
                                                        onSelect={(e) => e.preventDefault()}
                                                        className="text-xs flex items-center justify-between"
                                                    >
                                                        <span>{m}</span>
                                                        <span className="text-[9px] text-muted-foreground ml-auto bg-muted px-1 rounded">{monthData.total}</span>
                                                    </DropdownMenuCheckboxItem>
                                                );
                                            })}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* MULTI-WEEK SELECT */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="h-9 w-24 justify-between text-xs px-3">
                                                {filters.weeks.length === 0 ? "Any Week" : `${filters.weeks.length} Week(s)`}
                                                <ChevronDown className="h-3 w-3 opacity-50 ml-2" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-32">
                                            <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground">Select Weeks</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {[1, 2, 3, 4, 5].map(w => (
                                                <DropdownMenuCheckboxItem
                                                    key={w}
                                                    checked={filters.weeks.includes(w.toString())}
                                                    onCheckedChange={() => toggleWeek(w.toString())}
                                                    onSelect={(e) => e.preventDefault()}
                                                    className="text-xs"
                                                >
                                                    Week {w}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>

                        <div className='space-y-2'>
                            <Label className='text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2'>
                                <Badge variant='outline' className='h-3 p-0 px-1 border-none'>NG</Badge> Regional Scope
                            </Label>
                            <Select 
                                value={filters.states.length === 0 ? 'all' : filters.states[0]} 
                                onValueChange={(val) => setFilters(prev => ({ ...prev, states: val === 'all' ? [] : [val] }))}
                            >
                                <SelectTrigger className='h-9'><SelectValue placeholder="All States" /></SelectTrigger>
                                <SelectContent className='max-h-60'>
                                    <SelectItem value="all">All States</SelectItem>
                                    {nigerianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className='space-y-2'>
                            <Label className='text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2'>
                                Maintenance Health
                            </Label>
                            <Select value={filters.healthStatus} onValueChange={(val: any) => setFilters(prev => ({ ...prev, healthStatus: val }))}>
                                <SelectTrigger className='h-9'><SelectValue placeholder="Any Pulse" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Pulse Statuses</SelectItem>
                                    <SelectItem value="Up">Up (Green)</SelectItem>
                                    <SelectItem value="Up with Fault">Up with Fault (Yellow)</SelectItem>
                                    <SelectItem value="Down">Down (Red)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className='space-y-2'>
                            <Label className='text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2'>
                                <Clock className='h-3 w-3'/> Issue Duration (Days)
                            </Label>
                            <div className='flex gap-2 items-center'>
                                <Input 
                                    type='number' 
                                    placeholder='Min' 
                                    className='h-9 w-16' 
                                    value={filters.minDuration} 
                                    onChange={(e) => setFilters(prev => ({ ...prev, minDuration: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                                />
                                <span className='text-xs'>-</span>
                                <Input 
                                    type='number' 
                                    placeholder='Max' 
                                    className='h-9 w-16' 
                                    value={filters.maxDuration}
                                    onChange={(e) => setFilters(prev => ({ ...prev, maxDuration: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                                />
                                <Select value={filters.durationType} onValueChange={(val: any) => setFilters(prev => ({ ...prev, durationType: val }))}>
                                    <SelectTrigger className='h-9 w-24 text-[10px]'><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="resolved">Resolved</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className='flex items-center justify-between pt-4 border-t border-primary/10'>
                        <div className='flex gap-2'>
                            <Button 
                                variant='outline' 
                                size='sm' 
                                className='h-8 text-[10px] font-bold uppercase tracking-widest text-destructive hover:bg-destructive hover:text-white transition-colors gap-2'
                                onClick={() => {
                                    setFilters(initialFilters);
                                }}
                            >
                                <X className='h-3 w-3' />
                                Clear All Filters
                            </Button>
                        </div>
                        
                        <div className="flex gap-4">
                            {filters.months.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {filters.months.map(mIdx => (
                                        <Badge key={mIdx} variant="secondary" className="text-[9px] h-5 px-1.5 font-bold uppercase">
                                            {MONTHS[parseInt(mIdx)]}
                                            <button className="ml-1 hover:text-destructive" onClick={() => toggleMonth(mIdx)}><X className="h-2 w-2"/></button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            <p className='text-[10px] font-bold text-primary uppercase tracking-tighter self-center'>
                                Found {sortedAndFilteredDevices.length} matching systems
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </CollapsibleContent>
      </Collapsible>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/30'>
              <TableHead className="w-[50px]">
                {isAdmin && (
                  <Checkbox
                    checked={isAllSelected}
                    data-state={isAllSelected ? 'checked' : (selectedDevices.size > 0 ? 'indeterminate' : 'unchecked')}
                    onCheckedChange={handleToggleAll}
                  />
                )}
              </TableHead>
              <SortableHeader sortKey="productSystemId" currentSort={sortConfig} onSort={handleSort}>Machine #</SortableHeader>
              <SortableHeader sortKey="locationType" currentSort={sortConfig} onSort={handleSort}>Type</SortableHeader>
              <SortableHeader sortKey="operatorUserName" currentSort={sortConfig} onSort={handleSort}>Operator Name</SortableHeader>
              <SortableHeader sortKey="createdAt" currentSort={sortConfig} onSort={handleSort}>Date & Time</SortableHeader>
              <TableHead className='text-center'>Pulse</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
            <TableBody>
            {(isLoading || isLoadingFaults || isLoadingClinical) ? (
                Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))
            ) : sortedAndFilteredDevices.length > 0 ? (
              sortedAndFilteredDevices.map((device) => {
                const isOpen = openItems.has(device.id);
                const areDetailsOpen = openDetails.has(device.id);
                const areClinicalOpen = openClinical.has(device.id);
                return (
                  <React.Fragment key={device.id}>
                    <TableRow 
                      className={cn('border-b-0 cursor-pointer transition-colors', isOpen && 'bg-muted/50')}
                      onClick={() => handleToggleOpen(device.id)}
                    >
                        <TableCell onClick={(e) => handleToggleSelection(device.id, e)} className='w-12'>
                            {isAdmin && <Checkbox checked={selectedDevices.has(device.id)} />}
                        </TableCell>
                        <TableCell className='font-bold'>{device.productSystemId}</TableCell>
                        <TableCell>
                            <Badge variant={device.locationType === 'Community' ? 'secondary' : 'outline'} className='text-[10px] font-bold'>
                                {device.locationType || 'Facility'}
                            </Badge>
                        </TableCell>
                        <TableCell className='truncate max-w-[200px]' title={device.operatorUserName}>
                            {device.operatorUserName || '-'}
                        </TableCell>
                        <TableCell className='text-xs text-muted-foreground whitespace-nowrap'>
                            {formatDeviceDate(device)}
                        </TableCell>
                        <TableCell className='text-center'>
                          <div className='flex justify-center'>
                            <SystemStatusIndicator device={device} isAdmin={isAdmin} />
                          </div>
                        </TableCell>
                        {isAdmin && (
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            <div className='flex gap-2 justify-end'>
                            <EditSystemDeviceDialog device={device}>
                                <Button variant="ghost" size="icon" className='h-8 w-8'><FilePenLine className="h-4 w-4" /></Button>
                            </EditSystemDeviceDialog>
                            <Button variant="ghost" size="icon" className='h-8 w-8 text-destructive' onClick={() => setItemToDelete(device)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            </div>
                        </TableCell>
                        )}
                    </TableRow>
                    {isOpen && (
                      <TableRow className='bg-muted/20'>
                        <TableCell colSpan={7} className='p-0'>
                          <div className='p-4 space-y-6 border-x border-b mx-2 mb-2 rounded-b-lg bg-background shadow-inner animate-in slide-in-from-top-1 duration-200'>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                                <div className='space-y-4'>
                                    <div className='flex items-center gap-2 text-xs font-bold uppercase text-primary tracking-widest'>
                                        Contextual Location Details
                                    </div>
                                    <div className='grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border'>
                                        <div><p className='text-[10px] text-muted-foreground uppercase font-bold'>State</p><p className='text-sm font-semibold'>{device.state || '-'}</p></div>
                                        <div><p className='text-[10px] text-muted-foreground uppercase font-bold'>Facility</p><p className='text-sm font-semibold truncate' title={device.customerName}>{device.customerName || '-'}</p></div>
                                    </div>
                                </div>
                                <div className='space-y-4'>
                                    <div className='flex items-center gap-2 text-xs font-bold uppercase text-accent tracking-widest'>
                                        Contact Information
                                    </div>
                                    <div className='grid grid-cols-1 gap-2 bg-muted/30 p-3 rounded-lg border'>
                                        <div className='flex items-center gap-2'><Phone className='h-3 w-3 text-muted-foreground'/><p className='text-sm'>{device.phoneNumber || '-'}</p></div>
                                        <div className='flex items-center gap-2'><Mail className='h-3 w-3 text-muted-foreground'/><p className='text-sm truncate'>{device.operatorEmail || '-'}</p></div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                                <div className='space-y-4'>
                                    <div className='flex items-center justify-between'>
                                        <h4 className='text-sm font-bold uppercase flex items-center gap-2 text-destructive tracking-widest'>
                                            <FileText className='h-4 w-4' /> Active Faults 
                                            {(device as any).activeFaults?.length > 0 && <Badge variant='destructive' className='h-5 min-w-5 justify-center'>{(device as any).activeFaults.length}</Badge>}
                                        </h4>
                                    </div>
                                    {(device as any).activeFaults && (device as any).activeFaults.length > 0 ? (
                                        <div className='space-y-3'>
                                            {(device as any).activeFaults.map((fault: FaultReport) => (
                                                <FaultCard 
                                                    key={fault.id}
                                                    report={fault}
                                                    isSelected={false}
                                                    onToggleSelection={() => {}}
                                                    isOpen={openFaultCardId === fault.id}
                                                    onToggleOpen={() => setOpenFaultCardId(openFaultCardId === fault.id ? null : fault.id)}
                                                />
                                            ))}
                                        </div>
                                    ) : <div className='bg-muted/10 border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground italic'>No active faults.</div>}
                                </div>

                                {isClinicalEnabled && (
                                  <div className='space-y-4'>
                                      <div className='flex items-center justify-between'>
                                          <h4 className='text-sm font-bold uppercase flex items-center gap-2 text-primary tracking-widest'>
                                              <Stethoscope className='h-4 w-4' /> Clinical Performance
                                          </h4>
                                          <Button variant='outline' size='sm' onClick={() => setView('clinical-report')} className='h-7 text-[10px] uppercase font-bold gap-1'>
                                              <PlusCircle className='h-3 w-3' /> New TB Report
                                          </Button>
                                      </div>
                                      <div className='grid grid-cols-3 gap-2'>
                                          <div className='bg-blue-500/5 border border-blue-500/10 p-2 rounded-lg text-center'>
                                              <p className='text-[8px] uppercase font-bold text-blue-600 mb-1'>Total Attendees</p>
                                              <p className='text-lg font-black text-blue-700'>{(device as any).clinicalStats?.totalAttendees || 0}</p>
                                          </div>
                                          <div className='bg-purple-500/5 border border-purple-500/10 p-2 rounded-lg text-center'>
                                              <p className='text-[8px] uppercase font-bold text-purple-600 mb-1'>Screened (CXR)</p>
                                              <p className='text-lg font-black text-purple-700'>{(device as any).clinicalStats?.totalScreened || 0}</p>
                                          </div>
                                          <div className='bg-orange-500/5 border border-orange-500/10 p-2 rounded-lg text-center'>
                                              <p className='text-[8px] uppercase font-bold text-orange-600 mb-1'>TB Positive</p>
                                              <p className='text-lg font-black text-orange-700'>{(device as any).clinicalStats?.totalPositive || 0}</p>
                                          </div>
                                      </div>

                                      <Collapsible open={areClinicalOpen} onOpenChange={() => handleToggleClinical(device.id)}>
                                          <CollapsibleTrigger asChild>
                                              <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-transparent -ml-2">
                                                  <ChevronRight className={cn("h-3 w-3 mr-1 transition-transform", areClinicalOpen && "rotate-90")} />
                                                  View Clinical screening Logs
                                              </Button>
                                          </CollapsibleTrigger>
                                          <CollapsibleContent className='pt-2 animate-in slide-in-from-top-1 duration-200'>
                                              <div className='max-h-48 overflow-y-auto border rounded-md bg-muted/5'>
                                                  {(device as any).clinicalHistory?.length > 0 ? (
                                                      <Table>
                                                          <TableHeader className='bg-muted/30 sticky top-0 z-10'>
                                                              <TableRow>
                                                                  <TableHead className='text-[9px] uppercase h-8 px-2'>Date</TableHead>
                                                                  <TableHead className='text-[9px] uppercase h-8 text-center px-2'>Atten.</TableHead>
                                                                  <TableHead className='text-[9px] uppercase h-8 text-center px-2'>TB+</TableHead>
                                                              </TableRow>
                                                          </TableHeader>
                                                          <TableBody>
                                                              {(device as any).clinicalHistory.map((report: ClinicalReport) => (
                                                                  <TableRow key={report.id} className='h-8'>
                                                                      <TableCell className='text-[10px] py-1 px-2'>{format(new Date(report.date), 'MMM dd, yyyy')}</TableCell>
                                                                      <TableCell className='text-[10px] py-1 px-2 text-center font-medium'>{report.attendeesCount}</TableCell>
                                                                      <TableCell className='text-[10px] py-1 px-2 text-center font-bold text-primary'>{report.tbPatientsCount}</TableCell>
                                                                  </TableRow>
                                                              ))}
                                                          </TableBody>
                                                      </Table>
                                                  ) : <div className='p-4 text-center text-[10px] text-muted-foreground italic'>No clinical logs recorded for this machine.</div>}
                                              </div>
                                          </CollapsibleContent>
                                      </Collapsible>
                                  </div>
                                )}
                            </div>

                            <Separator />

                            <Collapsible open={areDetailsOpen} onOpenChange={() => handleToggleDetails(device.id)}>
                                <div className='flex items-center justify-between'>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-transparent -ml-2">
                                        <ChevronRight className={cn("h-3 w-3 mr-1 transition-transform", areDetailsOpen && "rotate-90")} />
                                        Advanced Maintenance & Logs
                                    </Button>
                                </CollapsibleTrigger>
                                </div>
                                <CollapsibleContent className="pt-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className='bg-muted/20 border rounded-lg overflow-hidden'>
                                        <DowntimeDetailsForm device={device} isAdmin={isAdmin} />
                                    </div>
                                    <div className='mt-6 space-y-4'>
                                        <h4 className='text-sm font-bold uppercase flex items-center gap-2 text-green-500 tracking-widest'>
                                            <HistoryIcon className='h-4 w-4' /> Resolved History
                                            {(device as any).faultHistory?.length > 0 && <Badge variant='secondary' className='h-5 min-w-5 justify-center'>{(device as any).faultHistory.length}</Badge>}
                                        </h4>
                                        {(device as any).faultHistory && (device as any).faultHistory.length > 0 ? (
                                            <div className='grid grid-cols-1 lg:grid-cols-2 gap-3 opacity-80'>
                                                {(device as any).faultHistory.map((fault: FaultReport) => (
                                                    <FaultCard 
                                                        key={fault.id}
                                                        report={fault}
                                                        isSelected={false}
                                                        onToggleSelection={() => {}}
                                                        isOpen={openFaultCardId === fault.id}
                                                        onToggleOpen={() => setOpenFaultCardId(openFaultCardId === fault.id ? null : fault.id)}
                                                    />
                                                ))}
                                            </div>
                                        ) : <div className='bg-muted/10 border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground italic'>No fault history recorded.</div>}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground italic">No systems found matching the current criteria.</TableCell></TableRow>
            )}
            </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This machine and its records will be moved to Recently Deleted.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedDevices.size} Machines?</AlertDialogTitle>
              <AlertDialogDescription>Batch deletion will move these systems to the administrative trash.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete}>Delete All</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}

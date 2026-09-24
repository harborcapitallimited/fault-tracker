'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { format, getYear, getMonth, startOfDay, getWeekOfMonth } from 'date-fns';
import { 
    Search, 
    Filter, 
    X, 
    Calendar as CalendarIcon, 
    MapPin, 
    Clock, 
    Zap, 
    BarChart3,
    LayoutGrid,
    List,
    Globe,
    Users,
    Activity,
    Stethoscope
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { ClinicalReportsTable } from './clinical-reports-table';
import { nigerianStates } from '@/data/states';
import { cn, normalizeSystemNumber } from '@/lib/utils';
import type { ClinicalReport, SystemReport } from '@/lib/types';
import { useAdmin } from '@/context/admin-context';
import { useRTDBList } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function ClinicalReportsManager({ reports, isLoading }: { reports: ClinicalReport[] | null, isLoading: boolean }) {
  const { isAdmin } = useAdmin();
  const { data: systemReports } = useRTDBList<SystemReport>('systemReports');
  
  // Advanced Filtering State
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'breakdown'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Time Context State
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  
  // Regional Focus State
  const [filterState, setFilterState] = useState<string>('all');
  const [filterZone, setFilterZone] = useState<string>('all');
  
  // Impact Intensity State
  const [minAttendees, setMinAttendees] = useState<string>('');
  const [minPositive, setMinPositive] = useState<string>('');

  const enrichedReports = useMemo(() => {
    if (!reports) return [];
    return reports.map(r => {
        const sys = (systemReports || []).find(s => normalizeSystemNumber(s.productSystemId) === normalizeSystemNumber(r.machineId));
        return {
            ...r,
            zone: sys?.zone || 'N/A'
        };
    });
  }, [reports, systemReports]);

  const filteredReports = useMemo(() => {
    let filtered = [...enrichedReports];

    // Global Search (Machine ID, State, or Radiographer)
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(r => 
            r.machineId.toLowerCase().includes(term) || 
            r.state.toLowerCase().includes(term) ||
            (r.radiographerName || '').toLowerCase().includes(term)
        );
    }

    // Time Frame (Range) Filter
    if (startDate) {
      filtered = filtered.filter(r => startOfDay(new Date(r.date)) >= startOfDay(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(r => startOfDay(new Date(r.date)) <= startOfDay(endDate));
    }

    if (filterYear !== 'all') {
      filtered = filtered.filter(r => getYear(new Date(r.date)).toString() === filterYear);
    }

    if (filterMonth !== 'all') {
      filtered = filtered.filter(r => getMonth(new Date(r.date)).toString() === filterMonth);
    }

    if (filterPeriod !== 'all') {
      filtered = filtered.filter(r => r.reportPeriod === filterPeriod);
    }

    if (filterState !== 'all') {
        filtered = filtered.filter(r => r.state === filterState);
    }

    if (filterZone !== 'all') {
        filtered = filtered.filter(r => (r as any).zone === filterZone);
    }

    if (minAttendees) {
        filtered = filtered.filter(r => (Number(r.attendeesCount) || 0) >= Number(minAttendees));
    }

    if (minPositive) {
        filtered = filtered.filter(r => (Number(r.tbPatientsCount) || 0) >= Number(minPositive));
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [enrichedReports, searchTerm, startDate, endDate, filterYear, filterMonth, filterPeriod, filterState, filterZone, minAttendees, minPositive]);

  // Aggregate Totals for the current filtered set
  const metricsSummary = useMemo(() => {
    return filteredReports.reduce((acc, r) => ({
      attendees: acc.attendees + (Number(r.attendeesCount) || 0),
      screened: acc.screened + (Number(r.cxrScreenedCount) || 0),
      positive: acc.positive + (Number(r.tbPatientsCount) || 0),
      count: acc.count + 1
    }), { attendees: 0, screened: 0, positive: 0, count: 0 });
  }, [filteredReports]);

  // Regional breakdown statistics
  const breakdownStats = useMemo(() => {
    const stats: Record<string, { attendees: number, screened: number, positive: number, reports: number }> = {};
    
    filteredReports.forEach(r => {
        const key = filterZone !== 'all' ? r.state : ((r as any).zone || 'Unknown');
        if (!stats[key]) stats[key] = { attendees: 0, screened: 0, positive: 0, reports: 0 };
        
        stats[key].attendees += (Number(r.attendeesCount) || 0);
        stats[key].screened += (Number(r.cxrScreenedCount) || 0);
        stats[key].positive += (Number(r.tbPatientsCount) || 0);
        stats[key].reports += 1;
    });

    return Object.entries(stats).sort((a, b) => b[1].positive - a[1].positive);
  }, [filteredReports, filterZone]);

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate(undefined);
    setEndDate(undefined);
    setFilterYear('all');
    setFilterMonth('all');
    setFilterPeriod('all');
    setFilterState('all');
    setFilterZone('all');
    setMinAttendees('');
    setMinPositive('');
  };

  const years = useMemo(() => {
    if (!reports) return [];
    const yrs = reports.map(r => getYear(new Date(r.date)));
    return Array.from(new Set(yrs)).sort((a, b) => b - a);
  }, [reports]);

  const zones = useMemo(() => {
    if (!systemReports) return [];
    const zs = systemReports.map(s => s.zone).filter(Boolean);
    return Array.from(new Set(zs)).sort() as string[];
  }, [systemReports]);

  const hasActiveFilters = searchTerm || startDate || endDate || filterYear !== 'all' || filterMonth !== 'all' || filterPeriod !== 'all' || filterState !== 'all' || filterZone !== 'all' || minAttendees || minPositive;

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className='space-y-4'>
            {/* Global Metrics Summary Banner */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <Card className='bg-primary/5 border-primary/20 shadow-none'>
                    <CardContent className='p-4 flex items-center justify-between'>
                        <div>
                            <p className='text-[8px] font-black uppercase text-primary/60 tracking-widest'>Filtered Attendees</p>
                            <p className='text-xl font-black text-primary'>{metricsSummary.attendees.toLocaleString()}</p>
                        </div>
                        <Users className='h-5 w-5 text-primary/40' />
                    </CardContent>
                </Card>
                <Card className='bg-purple-500/5 border-purple-500/20 shadow-none'>
                    <CardContent className='p-4 flex items-center justify-between'>
                        <div>
                            <p className='text-[8px] font-black uppercase text-purple-500/60 tracking-widest'>Filtered CXR Screened</p>
                            <p className='text-xl font-black text-purple-600'>{metricsSummary.screened.toLocaleString()}</p>
                        </div>
                        <Activity className='h-5 w-5 text-purple-500/40' />
                    </CardContent>
                </Card>
                <Card className='bg-orange-500/5 border-orange-500/20 shadow-none'>
                    <CardContent className='p-4 flex items-center justify-between'>
                        <div>
                            <p className='text-[8px] font-black uppercase text-orange-500/60 tracking-widest'>Filtered TB Positive</p>
                            <p className='text-xl font-black text-orange-600'>{metricsSummary.positive.toLocaleString()}</p>
                        </div>
                        <Stethoscope className='h-5 w-5 text-orange-500/40' />
                    </CardContent>
                </Card>
                <Card className='bg-muted/30 border-muted-foreground/10 shadow-none'>
                    <CardContent className='p-4 flex items-center justify-between'>
                        <div>
                            <p className='text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest'>Reports in Scope</p>
                            <p className='text-xl font-black text-muted-foreground'>{metricsSummary.count.toLocaleString()}</p>
                        </div>
                        <BarChart3 className='h-5 w-5 text-muted-foreground/40' />
                    </CardContent>
                </Card>
            </div>

            <div className='flex flex-wrap items-center gap-3 bg-muted/10 p-2 rounded-lg border'>
                <div className="relative flex-1 min-w-[200px]">
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                    <Input
                        placeholder="Search by Machine, State, or Radiographer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9 pl-10 bg-background text-xs"
                    />
                </div>
                
                <div className='flex items-center border rounded-md p-1 bg-background'>
                    <Button 
                        variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                        size='sm' 
                        onClick={() => setViewMode('table')}
                        className='h-7 text-[10px] font-bold uppercase tracking-widest gap-1'
                    >
                        <List className='h-3 w-3' /> Logs
                    </Button>
                    <Button 
                        variant={viewMode === 'breakdown' ? 'secondary' : 'ghost'} 
                        size='sm' 
                        onClick={() => setViewMode('breakdown')}
                        className='h-7 text-[10px] font-bold uppercase tracking-widest gap-1'
                    >
                        <LayoutGrid className='h-3 w-3' /> Breakdown
                    </Button>
                </div>

                <Button 
                    variant={isFilterPanelOpen ? "secondary" : "outline"} 
                    size="sm"
                    onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                    className='h-9 gap-2 font-bold uppercase text-[10px] tracking-widest'
                >
                    <Filter className='h-4 w-4' />
                    Filters
                    {hasActiveFilters && (
                        <Badge variant='destructive' className='h-4 min-w-4 p-0 justify-center rounded-full text-[8px]'>!</Badge>
                    )}
                </Button>

                {hasActiveFilters && (
                    <Button 
                        variant='ghost' 
                        size='sm' 
                        onClick={clearFilters} 
                        className='text-[10px] font-bold uppercase tracking-widest h-8 gap-1 hover:text-destructive'
                    >
                        <X className='h-3 w-3' /> Reset
                    </Button>
                )}
            </div>

            <Collapsible open={isFilterPanelOpen}>
                <CollapsibleContent className='animate-in slide-in-from-top-2 duration-300'>
                    <Card className='border-primary/20 bg-muted/5'>
                        <CardContent className='p-4 space-y-6'>
                            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4'>
                                <div className='space-y-2'>
                                    <Label className='text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2'>
                                        <CalendarIcon className='h-3 w-3'/> Time Frame (Range)
                                    </Label>
                                    <div className='flex flex-col gap-2'>
                                        <div className='grid grid-cols-2 gap-2'>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-8 text-[9px] px-2", !startDate && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-1 h-3 w-3" />
                                                    {startDate ? format(startDate, "MMM d, yy") : "From"}
                                                </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-8 text-[9px] px-2", !endDate && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-1 h-3 w-3" />
                                                    {endDate ? format(endDate, "MMM d, yy") : "To"}
                                                </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className='grid grid-cols-2 gap-2'>
                                            <Select value={filterYear} onValueChange={setFilterYear}>
                                                <SelectTrigger className='h-8 text-[10px]'><SelectValue placeholder="Year" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Years</SelectItem>
                                                    {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <Select value={filterMonth} onValueChange={setFilterMonth}>
                                                <SelectTrigger className='h-8 text-[10px]'><SelectValue placeholder="Month" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Months</SelectItem>
                                                    {MONTHS.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div className='space-y-2'>
                                    <Label className='text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2'>
                                        <Globe className='h-3 w-3'/> Regional Focus
                                    </Label>
                                    <div className='space-y-2'>
                                        <Select value={filterZone} onValueChange={setFilterZone}>
                                            <SelectTrigger className='h-8 text-[10px]'><SelectValue placeholder="Zone" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Geopolitical Zones</SelectItem>
                                                {zones.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Select value={filterState} onValueChange={setFilterState}>
                                            <SelectTrigger className='h-8 text-[10px]'><SelectValue placeholder="State" /></SelectTrigger>
                                            <SelectContent className='max-h-60'>
                                                <SelectItem value="all">All Nigerian States</SelectItem>
                                                {nigerianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className='space-y-2'>
                                    <Label className='text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2'>
                                        <Clock className='h-3 w-3'/> Reporting Frequency
                                    </Label>
                                    <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                                        <SelectTrigger className='h-8 text-[10px]'><SelectValue placeholder="Period" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Periods</SelectItem>
                                            <SelectItem value="Daily">Daily</SelectItem>
                                            <SelectItem value="Weekly">Weekly</SelectItem>
                                            <SelectItem value="Monthly">Monthly</SelectItem>
                                            <SelectItem value="Quarterly">Quarterly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className='space-y-2'>
                                    <Label className='text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2'>
                                        <Zap className='h-3 w-3'/> Impact Intensity
                                    </Label>
                                    <div className='space-y-2'>
                                        <div className='flex items-center gap-2'>
                                            <span className='text-[8px] uppercase font-bold text-muted-foreground min-w-[60px]'>Min Atten.</span>
                                            <Input type='number' className='h-7 text-[10px]' value={minAttendees} onChange={(e) => setMinAttendees(e.target.value)} />
                                        </div>
                                        <div className='flex items-center gap-2'>
                                            <span className='text-[8px] uppercase font-bold text-muted-foreground min-w-[60px]'>Min TB+</span>
                                            <Input type='number' className='h-7 text-[10px]' value={minPositive} onChange={(e) => setMinPositive(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className='bg-primary/5 p-3 rounded-lg border border-primary/10 flex flex-col justify-center text-center'>
                                    <p className='text-[8px] uppercase font-bold text-primary mb-1'>Matched Records</p>
                                    <p className='text-xl font-black text-primary'>{filteredReports.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </CollapsibleContent>
            </Collapsible>
        </div>
      )}

      {viewMode === 'table' ? (
        <div className="rounded-md border bg-card overflow-hidden">
            <ClinicalReportsTable reports={filteredReports} isLoading={isLoading} />
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-6'>
            <Card className='bg-muted/10 border-none shadow-none'>
                <CardHeader className='pb-2'>
                    <div className='flex items-center justify-between'>
                        <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
                            {filterZone !== 'all' ? `State Breakdown for ${filterZone}` : 'Geopolitical Zone Breakdown'}
                        </CardTitle>
                        <Badge variant='outline' className='text-[8px] border-primary/20'>{filteredReports.length} reports analyzed</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className='rounded-md border bg-background overflow-hidden'>
                        <Table>
                            <TableHeader className='bg-muted/30'>
                                <TableRow>
                                    <TableHead className='text-[10px] font-bold uppercase'>{filterZone !== 'all' ? 'State' : 'Zone'}</TableHead>
                                    <TableHead className='text-center text-[10px] font-bold uppercase'>Reports</TableHead>
                                    <TableHead className='text-center text-[10px] font-bold uppercase'>Attendees</TableHead>
                                    <TableHead className='text-center text-[10px] font-bold uppercase'>CXR Screened</TableHead>
                                    <TableHead className='text-center text-[10px] font-bold uppercase bg-primary/5'>TB Positive</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {breakdownStats.length > 0 ? breakdownStats.map(([key, data]) => (
                                    <TableRow key={key} className='hover:bg-muted/20'>
                                        <TableCell className='font-bold text-xs'>{key}</TableCell>
                                        <TableCell className='text-center tabular-nums text-xs'>{data.reports}</TableCell>
                                        <TableCell className='text-center tabular-nums text-xs'>{data.attendees.toLocaleString()}</TableCell>
                                        <TableCell className='text-center tabular-nums text-xs'>{data.screened.toLocaleString()}</TableCell>
                                        <TableCell className='text-center tabular-nums font-black text-primary bg-primary/5'>{data.positive.toLocaleString()}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className='h-24 text-center italic text-muted-foreground'>No regional data found for current filters.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}

'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { format, getYear, getMonth, isSameMonth } from 'date-fns';
import { 
    Search, 
    Filter, 
    X, 
    Calendar as CalendarIcon, 
    MapPin, 
    Zap, 
    ClipboardList,
    BarChart3
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { ImpactMonthlyReportsTable } from './impact-monthly-reports-table';
import { nigerianStates } from '@/data/states';
import type { ImpactMonthlyReport } from '@/lib/types';
import { useAdmin } from '@/context/admin-context';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function ImpactMonthlyReportsManager({ reports, isLoading }: { reports: ImpactMonthlyReport[] | null, isLoading: boolean }) {
  const { isAdmin } = useAdmin();

  // Advanced Filtering State
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(undefined);
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterState, setFilterState] = useState<string>('all');
  const [minTbCases, setMinTbCases] = useState<string>('');

  const filteredReports = useMemo(() => {
    if (!reports) return [];
    
    let filtered = [...reports];

    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(r => 
            r.machineId.toLowerCase().includes(term) || 
            r.state.toLowerCase().includes(term) ||
            r.facilityName.toLowerCase().includes(term)
        );
    }

    if (selectedMonth) {
      filtered = filtered.filter(r => isSameMonth(new Date(r.date), selectedMonth));
    }

    if (filterYear !== 'all') {
      filtered = filtered.filter(r => getYear(new Date(r.date)).toString() === filterYear);
    }

    if (filterMonth !== 'all') {
      filtered = filtered.filter(r => getMonth(new Date(r.date)).toString() === filterMonth);
    }

    if (filterState !== 'all') {
        filtered = filtered.filter(r => r.state === filterState);
    }

    if (minTbCases) {
        filtered = filtered.filter(r => (Number(r.totalTbDiagnosedCount) || 0) >= Number(minTbCases));
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reports, searchTerm, selectedMonth, filterYear, filterMonth, filterState, minTbCases]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedMonth(undefined);
    setFilterYear('all');
    setFilterMonth('all');
    setFilterState('all');
    setMinTbCases('');
  };

  const years = useMemo(() => {
    if (!reports) return [];
    const yrs = reports.map(r => getYear(new Date(r.date)));
    return Array.from(new Set(yrs)).sort((a, b) => b - a);
  }, [reports]);

  const hasActiveFilters = searchTerm || selectedMonth || filterYear !== 'all' || filterMonth !== 'all' || filterState !== 'all' || minTbCases;

  return (
    <div className="space-y-6">
      <div className='space-y-4'>
          <div className='flex flex-wrap items-center gap-3 bg-muted/10 p-2 rounded-lg border'>
              <div className="relative flex-1 min-w-[240px]">
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                  <Input
                      placeholder="Search by Machine, State, or Facility..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-10 pl-10 bg-background"
                  />
                  {searchTerm && (
                      <Button variant="ghost" size="icon" className='absolute right-1 top-1 h-8 w-8' onClick={() => setSearchTerm('')}>
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
                  {hasActiveFilters && <Badge variant='destructive' className='h-4 min-w-4 p-0 justify-center rounded-full text-[8px]'>!</Badge>}
              </Button>

              {hasActiveFilters && (
                  <Button variant='ghost' size='sm' onClick={clearFilters} className='text-[10px] font-bold uppercase tracking-widest h-8 gap-1 hover:text-destructive'>
                      <X className='h-3 w-3' /> Clear All
                  </Button>
              )}
          </div>

          <Collapsible open={isFilterPanelOpen}>
              <CollapsibleContent className='animate-in slide-in-from-top-2 duration-300'>
                  <Card className='border-primary/20 bg-muted/5'>
                      <CardContent className='p-4 space-y-6'>
                          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                              <div className='space-y-2'>
                                  <Label className='text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2'>
                                      <CalendarIcon className='h-3 w-3'/> Temporal Drill-down
                                  </Label>
                                  <div className='grid grid-cols-2 gap-2'>
                                      <Select value={filterYear} onValueChange={setFilterYear}>
                                          <SelectTrigger className='h-9 text-xs'><SelectValue placeholder="Year" /></SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="all">All Years</SelectItem>
                                              {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                                          </SelectContent>
                                      </Select>
                                      <Select value={filterMonth} onValueChange={setFilterMonth}>
                                          <SelectTrigger className='h-9 text-xs'><SelectValue placeholder="Month" /></SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="all">All Months</SelectItem>
                                              {MONTHS.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                                          </SelectContent>
                                      </Select>
                                  </div>
                              </div>

                              <div className='space-y-2'>
                                  <Label className='text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2'>
                                      <MapPin className='h-3 w-3'/> Regional Focus
                                  </Label>
                                  <Select value={filterState} onValueChange={setFilterState}>
                                      <SelectTrigger className='h-9 text-xs'><SelectValue placeholder="Select State" /></SelectTrigger>
                                      <SelectContent className='max-h-60'>
                                          <SelectItem value="all">All States (Nigeria)</SelectItem>
                                          {nigerianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                      </SelectContent>
                                  </Select>
                              </div>

                              <div className='space-y-2'>
                                  <Label className='text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2'>
                                      <Zap className='h-3 w-3'/> Clinical Intensity
                                  </Label>
                                  <div className='space-y-1'>
                                      <span className='text-[8px] uppercase font-bold text-muted-foreground'>Min TB Diagnosed (Monthly)</span>
                                      <Input type='number' placeholder='0' className='h-9 text-xs' value={minTbCases} onChange={(e) => setMinTbCases(e.target.value)} />
                                  </div>
                              </div>
                          </div>
                          <div className='pt-4 border-t border-primary/10 flex items-center justify-between'>
                                <div className='flex flex-wrap gap-2'>
                                    {hasActiveFilters && (
                                        <Badge variant='secondary' className='bg-primary/10 text-primary border-primary/20 h-6 gap-2'>
                                            <BarChart3 className='h-3 w-3' /> 
                                            Matched Records: {filteredReports.length}
                                        </Badge>
                                    )}
                                </div>
                                <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic'>
                                    Advanced Admin Audit Mode
                                </p>
                            </div>
                      </CardContent>
                  </Card>
              </CollapsibleContent>
          </Collapsible>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <ImpactMonthlyReportsTable reports={filteredReports} isLoading={isLoading} />
      </div>
    </div>
  );
}

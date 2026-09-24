'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  AlertTriangle, 
  PlayCircle, 
  CheckCircle2, 
  PanelLeft, 
  ChevronRight, 
  ArrowLeft,
  ChevronDown,
  Users,
  Activity,
  Stethoscope,
  ArrowUpRight,
  ClipboardList
} from 'lucide-react';
import type { FaultReport, GeneralReport, SystemReport, ClinicalReport, ImpactMonthlyReport, AppSettings } from '@/lib/types';
import { useRTDBList, useRTDBItem } from '@/firebase/database/use-db';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo, Suspense } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useSidebar } from '@/components/ui/sidebar';
import { useSearchParams } from 'next/navigation';
import { UniversalSearch } from '@/components/universal-search';
import { cn, normalizeSystemNumber } from '@/lib/utils';
import { useAdmin } from '@/context/admin-context';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  type ChartConfig 
} from '@/components/ui/chart';
import { SystemDevicesTable } from '@/components/system-devices-table';
import { ReportForm } from '@/components/report-form';
import { GeneralReportForm } from '@/components/general-report-form';
import { GeneralReportsTable } from '@/components/general-reports-table';
import { DeletedTable } from '@/components/deleted-table';
import { ClinicalReportForm } from '@/components/clinical-report-form';
import { ImpactMonthlyReportForm } from '@/components/impact-monthly-report-form';
import { ClinicalReportsManager } from '@/components/clinical-reports-manager';
import { ImpactMonthlyReportsManager } from '@/components/impact-monthly-reports-manager';
import { ManageActions } from '@/components/manage-actions';
import { ManageFaultOptions } from '@/components/manage-fault-options';
import { DesktopNotificationBanner } from '@/components/desktop-notification-banner';
import { Separator } from '@/components/ui/separator';

// --- Sub-Components ---

const StatusCard = ({ title, count, icon, colorClass, description, onClick }: { title: string; count: number; icon: React.ReactNode; colorClass: string; description: string; onClick?: () => void; }) => (
  <Card onClick={onClick} className={cn(onClick && "cursor-pointer hover:bg-muted/50 border-none bg-muted/30 shadow-none transition-all duration-200")}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
      <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</CardTitle>
      <div className={cn("p-1 rounded-full bg-background/50", colorClass)}>{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-xl font-black tracking-tighter">{count.toLocaleString()}</div>
      <p className="text-[9px] font-medium text-muted-foreground uppercase truncate">{description}</p>
    </CardContent>
  </Card>
);

const ViewHeader = ({ title, backToDashboard = false }: { title: string; backToDashboard?: boolean }) => {
    const { setView } = useAdmin();
    return (
        <header className="flex items-center p-4 border-b gap-4">
            <div className="flex items-center gap-4">
                {backToDashboard && (
                    <Button variant="outline" size="icon" onClick={() => setView('dashboard')}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Button>
                )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </header>
    );
};

// --- Main Page Logic ---

function DashboardContent() {
  const { currentView, setView, isAdmin } = useAdmin();
  const { data: settings } = useRTDBItem<AppSettings>('settings');

  const { data: allReports, isLoading: isLoadingAllReports } = useRTDBList<FaultReport>('faultReports');
  const { data: generalReports, isLoading: isLoadingGeneralReports } = useRTDBList<GeneralReport>('generalReports');
  const { data: systemReports, isLoading: isLoadingSystems } = useRTDBList<SystemReport>('systemReports');
  const { data: clinicalReports, isLoading: isLoadingClinical } = useRTDBList<ClinicalReport>('clinicalReports');
  const { data: impactMonthlyReports, isLoading: isLoadingImpact } = useRTDBList<ImpactMonthlyReport>('impactMonthlyReports');
  
  const reports = useMemo(() => (allReports || []).filter(r => !r.deleted), [allReports]);
  const activeFaults = useMemo(() => reports.filter(r => r.status !== 'Resolved'), [reports]);

  const [registryFilter, setRegistryFilter] = useState<{
    type: 'health' | 'report-status' | 'all';
    value: string;
  }>({ type: 'all', value: 'all' });

  const [isRegistryOpen, setIsRegistryOpen] = useState(false);
  const [isClinicalExplorerOpen, setIsClinicalExplorerOpen] = useState(false);

  const { toggleSidebar } = useSidebar();

  const isClinicalEnabled = settings?.clinicalReportingEnabled ?? false;

  const fleetHealth = useMemo(() => {
    const counts = { Up: 0, Down: 0, 'Up with Fault': 0 };
    const systemsList: SystemReport[] = [];
    if (!systemReports) return { counts, systemsList };
    
    const uniqueSystems = new Map<string, SystemReport>();
    systemReports.filter(s => !s.deleted).forEach(s => {
        const normId = normalizeSystemNumber(s.productSystemId);
        if (!normId) return;
        if (!uniqueSystems.has(normId)) uniqueSystems.set(normId, s);
    });

    uniqueSystems.forEach(s => {
        const normId = normalizeSystemNumber(s.productSystemId);
        const hasActiveFault = activeFaults.some(f => normalizeSystemNumber(f.systemNumber) === normId);
        
        let status: SystemReport['systemStatus'] = hasActiveFault ? 'Down' : (s.systemStatus || 'Up');
        
        if (status in counts) counts[status as keyof typeof counts]++;
        systemsList.push({ ...s, systemStatus: status });
    });
    return { counts, systemsList };
  }, [systemReports, activeFaults]);

  const chartData = [
    { name: 'Up', value: fleetHealth.counts.Up, color: '#10b981' },
    { name: 'Up with Fault', value: fleetHealth.counts['Up with Fault'], color: '#f59e0b' },
    { name: 'Down', value: fleetHealth.counts.Down, color: '#e11d48' },
  ];

  const chartConfig = {
    Up: { label: "System Up", color: "hsl(var(--chart-2))" },
    'Up with Fault': { label: "Up with Fault", color: "hsl(var(--chart-3))" },
    Down: { label: "System Down", color: "hsl(var(--chart-1))" },
  } satisfies ChartConfig;

  const statusCounts = useMemo(() => {
    const counts: Record<FaultReport['status'], number> = { 'Pending': 0, 'In Progress': 0, 'Resolved': 0 };
    reports.forEach(r => { if (r.status in counts) counts[r.status]++; });
    return counts;
  }, [reports]);

  const clinicalStats = useMemo(() => {
    if (!clinicalReports) return { attendees: 0, screened: 0, positive: 0 };
    return clinicalReports.reduce((acc, report) => ({
      attendees: acc.attendees + (Number(report.attendeesCount) || 0),
      screened: acc.screened + (Number(report.cxrScreenedCount) || 0),
      positive: acc.positive + (Number(report.tbPatientsCount) || 0),
    }), { attendees: 0, screened: 0, positive: 0 });
  }, [clinicalReports]);

  const handleChartClick = (entry: any) => {
    if (entry && entry.name) {
        setRegistryFilter({ type: 'health', value: entry.name });
        setIsRegistryOpen(true);
    }
  };

  const handleStatusCardClick = (status: FaultReport['status']) => {
    setRegistryFilter({ type: 'report-status', value: status });
    setIsRegistryOpen(true);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'report': return <div className="flex flex-col h-full"><ViewHeader title="Report a Fault" backToDashboard /><div className="flex-1 p-4 md:p-6 flex justify-center"><div className="w-full max-w-2xl"><Card><CardContent className="pt-6"><ReportForm /></CardContent></Card></div></div></div>;
      case 'clinical-report': return <div className="flex flex-col h-full"><ViewHeader title="Daily Clinical Report" backToDashboard /><div className="flex-1 p-4 md:p-6 flex justify-center"><div className="w-full max-w-4xl"><Card><CardContent className="pt-6"><ClinicalReportForm /></CardContent></Card></div></div></div>;
      case 'clinical-reports': return <div className="flex flex-col h-full"><ViewHeader title="Clinical Data Logs" backToDashboard /><div className="flex-1 p-4 md:p-6"><ClinicalReportsManager reports={clinicalReports} isLoading={isLoadingClinical} /></div></div>;
      case 'impact-monthly-report': return <div className="flex flex-col h-full"><ViewHeader title="IMPACT Monthly Report" backToDashboard /><div className="flex-1 p-4 md:p-6 flex justify-center"><div className="w-full max-w-4xl"><Card><CardContent className="pt-6"><ImpactMonthlyReportForm /></CardContent></Card></div></div></div>;
      case 'impact-monthly-reports': return <div className="flex flex-col h-full"><ViewHeader title="IMPACT Monthly Logs" backToDashboard /><div className="flex-1 p-4 md:p-6"><ImpactMonthlyReportsManager reports={impactMonthlyReports} isLoading={isLoadingImpact} /></div></div>;
      case 'general-report': return <div className="flex flex-col h-full"><ViewHeader title="General Report" backToDashboard /><div className="flex-1 p-4 md:p-6 flex justify-center"><div className="w-full max-w-2xl"><Card><CardContent className="pt-6"><GeneralReportForm /></CardContent></Card></div></div></div>;
      case 'general-reports': return <div className="flex flex-col h-full"><ViewHeader title="General Reports" backToDashboard /><div className="flex-1 p-4 md:p-6"><Card><CardContent className="pt-6"><GeneralReportsTable reports={generalReports || []} isLoading={isLoadingGeneralReports} /></CardContent></Card></div></div>;
      case 'actions': return <div className="flex flex-col h-full"><ViewHeader title="Manage Actions" backToDashboard /><div className="flex-1 p-4 md:p-6 overflow-y-auto"><ManageActions /></div></div>;
      case 'faults': return <div className="flex flex-col h-full"><ViewHeader title="Manage Fault Options" backToDashboard /><div className="flex-1 p-4 md:p-6 overflow-y-auto"><ManageFaultOptions /></div></div>;
      case 'deleted': return <div className="flex flex-col h-full"><ViewHeader title="Recently Deleted" backToDashboard /><div className="flex-1 p-4 md:p-6"><Card><CardContent className="pt-6"><DeletedTable items={[]} isLoading={isLoadingAllReports} /></CardContent></Card></div></div>;
      case 'dashboard':
      default:
        return (
          <div className="flex flex-col h-full bg-background">
            <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden h-8 w-8"><PanelLeft className='h-5 w-5' /></Button>
                <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
              </div>
              <UniversalSearch />
            </header>
            <main className="flex-1 p-4 md:p-6 overflow-y-auto space-y-8">
              <DesktopNotificationBanner />
              <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                <Card className='lg:col-span-1 border-none bg-muted/20'>
                    <CardHeader className='pb-2'><CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Fleet Health Overview</CardTitle></CardHeader>
                    <CardContent className="h-[200px] flex items-center justify-center p-0">
                        <ChartContainer config={chartConfig} className='w-full h-full'>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        className='cursor-pointer'
                                        onClick={handleChartClick}
                                    >
                                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <div className='lg:col-span-2 grid gap-4 grid-cols-1 md:grid-cols-3'>
                    <StatusCard title="Pending" count={statusCounts.Pending} icon={<AlertTriangle className="h-4 w-4" />} colorClass="text-red-500" description="Awaiting action" onClick={() => handleStatusCardClick('Pending')} />
                    <StatusCard title="In Progress" count={statusCounts['In Progress']} icon={<PlayCircle className="h-4 w-4" />} colorClass="text-yellow-500" description="Being addressed" onClick={() => handleStatusCardClick('In Progress')} />
                    <StatusCard title="Resolved" count={statusCounts.Resolved} icon={<CheckCircle2 className="h-4 w-4" />} colorClass="text-green-500" description="Fixed issues" onClick={() => handleStatusCardClick('Resolved')} />
                </div>
              </div>

              {/* Clinical Impact Overview - Restricted to Admins and Feature Flag */}
              {isAdmin && isClinicalEnabled && (
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <Stethoscope className='h-3 w-3 text-primary' /> Clinical Impact Overview
                      </h2>
                      <div className='flex gap-2'>
                        <Button variant='link' size='sm' onClick={() => setView('clinical-reports')} className='h-auto p-0 text-[10px] uppercase font-bold text-primary gap-1'>
                            Daily Logs <ArrowUpRight className='h-3 w-3' />
                        </Button>
                        <Separator orientation='vertical' className='h-3' />
                        <Button variant='link' size='sm' onClick={() => setView('impact-monthly-reports')} className='h-auto p-0 text-[10px] uppercase font-bold text-primary gap-1'>
                            Monthly IMPACT <ArrowUpRight className='h-3 w-3' />
                        </Button>
                      </div>
                  </div>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                      <StatusCard 
                        title="Total Attendees" 
                        count={clinicalStats.attendees} 
                        icon={<Users className="h-4 w-4" />} 
                        colorClass="text-blue-500" 
                        description="Fleet-wide reach" 
                        onClick={() => setIsClinicalExplorerOpen(!isClinicalExplorerOpen)}
                      />
                      <StatusCard 
                        title="Screened (CXR)" 
                        count={clinicalStats.screened} 
                        icon={<Activity className="h-4 w-4" />} 
                        colorClass="text-purple-500" 
                        description="Radiological throughput" 
                        onClick={() => setIsClinicalExplorerOpen(!isClinicalExplorerOpen)}
                      />
                      <StatusCard 
                        title="TB Positive" 
                        count={clinicalStats.positive} 
                        icon={<Stethoscope className="h-4 w-4" />} 
                        colorClass="text-orange-500" 
                        description="Cases identified" 
                        onClick={() => setIsClinicalExplorerOpen(!isClinicalExplorerOpen)}
                      />
                  </div>

                  <Collapsible open={isClinicalExplorerOpen} onOpenChange={setIsClinicalExplorerOpen} className="space-y-4">
                    <div className='flex items-center justify-between'>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                           <Activity className='h-3 w-3' /> Performance Drill-down
                        </h3>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase font-bold">
                                {isClinicalExplorerOpen ? 'Hide Explorer' : 'Open Explorer'}
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="animate-in slide-in-from-top-2 duration-300">
                        <ClinicalReportsManager reports={clinicalReports} isLoading={isLoadingClinical} />
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}

               <Collapsible open={isRegistryOpen} onOpenChange={setIsRegistryOpen} className="space-y-4">
                <div className='flex items-center justify-between'>
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Total Systems</h2>
                        {registryFilter.type !== 'all' && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 text-[10px] uppercase font-bold text-primary"
                                onClick={() => setRegistryFilter({ type: 'all', value: 'all' })}
                            >
                                Clear Filter: {registryFilter.value}
                            </Button>
                        )}
                    </div>
                    <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-2">
                            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isRegistryOpen && "rotate-180")} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{isRegistryOpen ? 'Hide' : 'View'} Registry</span>
                        </Button>
                    </CollapsibleTrigger>
                </div>

                <CollapsibleContent className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <SystemDevicesTable 
                        devices={fleetHealth.systemsList} 
                        isLoading={isLoadingSystems || isLoadingAllReports} 
                        externalFilter={registryFilter}
                    />
                </CollapsibleContent>
              </Collapsible>
            </main>
          </div>
        );
    }
  };

  return <div className="h-full">{renderCurrentView()}</div>;
}

export default function DashboardPage() {
  return <Suspense fallback={<Skeleton className='h-full w-full'/>}> <DashboardContent /> </Suspense>;
}
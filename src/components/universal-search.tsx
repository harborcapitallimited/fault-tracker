'use client';

import * as React from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DialogTitle } from '@/components/ui/dialog';
import { useRTDBList } from '@/firebase/database/use-db';
import type { FaultReport, GeneralReport, SystemReport, AppView } from '@/lib/types';
import { FileWarning, ScrollText, HardDrive, Search, Ticket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { normalizeSystemNumber } from '@/lib/utils';
import { Button } from './ui/button';
import { useAdmin } from '@/context/admin-context';

type SearchResult = {
    id: string;
    type: 'Fault Report' | 'General Report' | 'System Report';
    title: string;
    description: string;
    view: AppView;
    urlParams?: string;
}

export function UniversalSearch() {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const { setView } = useAdmin();
  const router = useRouter();

  const { data: reports } = useRTDBList<FaultReport>('faultReports');
  const { data: generalReports } = useRTDBList<GeneralReport>('generalReports');
  const { data: systemReports } = useRTDBList<SystemReport>('systemReports');

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setSearchTerm('');
    setView(result.view);
    if (result.urlParams) {
        router.push(`/${result.urlParams}`);
    }
  }
  
  const getFaultDescription = (report: FaultReport) => {
    if (report.faultSubCategory === 'add-new' || report.faultCategory === 'Others') {
        return report.customFaultDescription || 'N/A';
    }
    if (report.faultCategory === 'Minxray' || report.faultCategory === 'Qure.ai') {
        return report.faultSubCategory?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || `Not specified`;
    }
    return report.faultDescription || 'N/A';
  };

  const searchResults = React.useMemo(() => {
    const results: SearchResult[] = [];
    if (!searchTerm) return [];

    const lowercasedTerm = searchTerm.toLowerCase();
    const normalizedSearchTerm = normalizeSystemNumber(searchTerm).toString().toLowerCase();


    // Search Fault Reports (including Ticket ID)
    reports?.filter(r => !r.deleted).forEach(r => {
        const normSysNum = normalizeSystemNumber(r.systemNumber).toString().toLowerCase();
        const faultDisplay = getFaultDescription(r);
        const ticketId = (r.ticketId || '').toLowerCase();

        const isMatch = (
            r.radiographerName.toLowerCase().includes(lowercasedTerm) ||
            normSysNum.includes(normalizedSearchTerm) ||
            r.facility.toLowerCase().includes(lowercasedTerm) ||
            (faultDisplay || '').toLowerCase().includes(lowercasedTerm) ||
            (r.currentAction || '').toLowerCase().includes(lowercasedTerm) ||
            ticketId.includes(lowercasedTerm)
        );

        if (isMatch) {
            results.push({
                id: r.id,
                type: 'Fault Report',
                title: `[${r.ticketId || 'NO-ID'}] S/N ${r.systemNumber} - ${r.facility}`,
                description: faultDisplay || '',
                view: 'dashboard',
                urlParams: `?system=${normSysNum}&highlight=${r.id}`
            })
        }
    })

    // Search General Reports
    generalReports?.forEach(r => {
        const searchable = [r.name, r.detail].join(' ').toLowerCase();
        if (searchable.includes(lowercasedTerm)) {
            results.push({
                id: r.id,
                type: 'General Report',
                title: `General: ${r.name}`,
                description: r.detail,
                view: 'general-reports'
            })
        }
    })
    
     // Search System Reports
    systemReports?.filter(r => !r.deleted).forEach(r => {
        const normSysNum = normalizeSystemNumber(r.productSystemId).toString().toLowerCase();

        const isMatch = (
            (r.customerName?.toLowerCase() || '').includes(lowercasedTerm) ||
            (r.operatorUserName?.toLowerCase() || '').includes(lowercasedTerm) ||
            normSysNum.includes(normalizedSearchTerm) ||
            (r.productSystemId?.toLowerCase() || '').includes(lowercasedTerm) ||
            (r.detectorSerialNumber?.toLowerCase() || '').includes(lowercasedTerm) ||
            (r.xraySerialNumber?.toLowerCase() || '').includes(lowercasedTerm) ||
            (r.computerSerialNumber?.toLowerCase() || '').includes(lowercasedTerm)
        );

        if (isMatch) {
            results.push({
                id: r.id,
                type: 'System Report',
                title: `System: ${r.productSystemId} - ${r.customerName}`,
                description: `Operator: ${r.operatorUserName || 'N/A'}`,
                view: 'total-systems'
            })
        }
    })
    
    return results;
  }, [searchTerm, reports, generalReports, systemReports]);

  return (
    <>
        <Button variant="outline" onClick={() => setOpen(true)} className='w-full max-w-[200px] justify-start text-muted-foreground'>
            <Search className="mr-2 h-4 w-4" />
            Search (Ticket, S/N, Facility)...
            <span className="ml-auto text-xs border rounded-sm px-1.5 py-0.5">Ctrl+K</span>
        </Button>
        <CommandDialog open={open} onOpenChange={setOpen}>
            <DialogTitle className="sr-only">Universal Search</DialogTitle>
            <CommandInput 
                placeholder="Search across all reports..." 
                value={searchTerm}
                onValueChange={setSearchTerm}
            />
            <CommandList className="pointer-events-auto">
            <CommandEmpty>{searchTerm ? 'No results found.' : 'Start typing to search.'}</CommandEmpty>
            
            {searchResults.length > 0 && (
                <>
                    {
                        (Array.from(new Set(searchResults.map(r => r.type)))).map(type => (
                            <CommandGroup key={type} heading={type}>
                                {searchResults.filter(r => r.type === type).map(result => (
                                    <CommandItem
                                        key={result.id}
                                        value={`${result.type}-${result.title}-${result.description}-${result.id}`}
                                        onSelect={() => handleSelect(result)}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex items-center w-full">
                                            {result.type === 'Fault Report' && <Ticket className="mr-2 h-4 w-4 text-primary" />}
                                            {result.type === 'General Report' && <ScrollText className="mr-2 h-4 w-4" />}
                                            {result.type === 'System Report' && <HardDrive className="mr-2 h-4 w-4" />}
                                            <div className='flex flex-col flex-1'>
                                                <span>{result.title}</span>
                                                <span className='text-xs text-muted-foreground truncate'>{result.description}</span>
                                            </div>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))
                    }
                </>
            )}

            </CommandList>
        </CommandDialog>
    </>
  );
}

'use client';
import { DeletedTable } from '@/components/deleted-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRTDBList } from '@/firebase';
import type { FaultReport, SystemReport } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

type DeletedItem = (FaultReport & { itemType: 'Fault Report' }) | (SystemReport & { itemType: 'System Report' });


export default function DeletedReportsPage() {
  const { data: faultReports, isLoading: isLoadingFaults } = useRTDBList<FaultReport>('faultReports');
  const { data: systemReports, isLoading: isLoadingSystems } = useRTDBList<SystemReport>('systemReports');

  const allDeletedItems: DeletedItem[] = useMemo(() => {
    const deletedFaults = (faultReports || [])
      .filter(r => r.deleted)
      .map(r => ({ ...r, itemType: 'Fault Report' as const }));
    
    const deletedSystems = (systemReports || [])
      .filter(r => r.deleted)
      .map(r => ({ ...r, itemType: 'System Report' as const }));
      
    return [...deletedFaults, ...deletedSystems];
  }, [faultReports, systemReports]);

  const isLoading = isLoadingFaults || isLoadingSystems;

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-4 border-b gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            Recently Deleted
          </h1>
        </div>
      </header>
      <div className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Deleted Items</CardTitle>
          </CardHeader>
          <CardContent>
            <DeletedTable items={allDeletedItems || []} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

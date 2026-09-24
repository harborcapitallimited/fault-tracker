'use client';

import * as React from 'react';
import type { FaultReport, SystemReport } from '@/lib/types';
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
import { RotateCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useFaultReportMutations } from '@/lib/data';
import { useAdmin } from '@/context/admin-context';
import { normalizeSystemNumber } from '@/lib/utils';
import { Badge } from './ui/badge';

type DeletedItem = (FaultReport & { itemType: 'Fault Report' }) | (SystemReport & { itemType: 'System Report' });

export function DeletedTable({
  items,
  isLoading,
}: {
  items: DeletedItem[];
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const { restoreFaultReport, restoreSystemReport } = useFaultReportMutations();
  const { isAdmin } = useAdmin();

  const handleRestore = async (item: DeletedItem) => {
    try {
      if (item.itemType === 'Fault Report') {
        await restoreFaultReport(item.id);
        toast({
            title: 'Report Restored',
            description: 'The fault report has been restored.',
        });
      } else if (item.itemType === 'System Report') {
        await restoreSystemReport(item.id);
         toast({
            title: 'Report Restored',
            description: 'The system report has been restored.',
        });
      }
    } catch (error) {
        toast({
            title: 'Error',
            description: 'Failed to restore item.',
            variant: 'destructive',
        });
    }
  };
  
  const getFaultDescription = (report: FaultReport) => {
    if (report.faultSubCategory === 'add-new' || report.faultCategory === 'Others') {
        return report.customFaultDescription || 'N/A';
    }
    if (report.faultCategory === 'Minxray' || report.faultCategory === 'Qure.ai') {
        return report.faultSubCategory?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || `Not specified`;
    }
    return report.faultDescription || 'N/A';
  };
  
  const renderItem = (item: DeletedItem) => {
    if (item.itemType === 'Fault Report') {
        return (
            <TableRow key={item.id}>
                <TableCell className="font-medium">{item.radiographerName}</TableCell>
                <TableCell>{normalizeSystemNumber(item.systemNumber).toString()}</TableCell>
                <TableCell>{item.facility}</TableCell>
                <TableCell>
                  <Badge variant="outline">Fault Report</Badge>
                </TableCell>
                <TableCell className="max-w-[300px] truncate" title={getFaultDescription(item)}>
                    {getFaultDescription(item)}
                </TableCell>
                {isAdmin && (
                <TableCell className="text-right">
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(item)}
                    >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore
                    </Button>
                </TableCell>
                )}
            </TableRow>
        );
    } else if (item.itemType === 'System Report') {
         return (
            <TableRow key={item.id}>
                <TableCell className="font-medium">{item.customerName}</TableCell>
                <TableCell>{normalizeSystemNumber(item.productSystemId).toString()}</TableCell>
                <TableCell>{item.operatorUserName}</TableCell>
                <TableCell>
                  <Badge variant="secondary">System Report</Badge>
                </TableCell>
                <TableCell className="max-w-[300px] truncate" title={item.xrayModel || 'N/A'}>
                    {item.xrayModel || 'N/A'}
                </TableCell>
                {isAdmin && (
                <TableCell className="text-right">
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(item)}
                    >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore
                    </Button>
                </TableCell>
                )}
            </TableRow>
        );
    }
    return null;
  }


  return (
    <div className="w-full">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Primary Name</TableHead>
              <TableHead>S/N</TableHead>
              <TableHead>Secondary Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={isAdmin ? 6 : 5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length > 0 ? (
              items.map((item) => renderItem(item))
            ) : (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center">
                  No deleted items.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

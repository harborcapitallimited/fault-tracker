'use client';

import { cn } from '@/lib/utils';
import type { SystemReport } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFaultReportMutations } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from './ui/button';

interface SystemStatusIndicatorProps {
  device: SystemReport;
  isAdmin: boolean;
}

export function SystemStatusIndicator({ device, isAdmin }: SystemStatusIndicatorProps) {
  const { updateSystemDeviceStatus } = useFaultReportMutations();
  const { toast } = useToast();
  
  let status: 'ok' | 'minor' | 'major';
  let statusText: string;
  
  switch (device.systemStatus) {
    case 'Down':
      status = 'major';
      statusText = 'System Down';
      break;
    case 'Up with Fault':
      status = 'minor';
      statusText = 'Up with Fault';
      break;
    case 'Up':
    default:
      status = 'ok';
      statusText = 'System Up';
      break;
  }

  const colorClass = 
    status === 'major' ? 'bg-red-500' :
    status === 'minor' ? 'bg-yellow-500' :
    'bg-green-500';


  const handleStatusChange = (e: React.MouseEvent, newStatus: SystemReport['systemStatus']) => {
    e.stopPropagation();
    try {
      updateSystemDeviceStatus(device.id, newStatus, device);
      toast({
        title: 'Status Updated',
        description: `Status for System #${device.productSystemId} changed to ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status.',
        variant: 'destructive',
      });
    }
  };

  const pulseIndicator = (
    <div className={cn('h-3 w-3 rounded-full animate-pulse', colorClass)} />
  );

  if (isAdmin) {
    return (
       <DropdownMenu>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                            {pulseIndicator}
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                <p>{statusText}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={(e) => handleStatusChange(e, 'Up')}>
                <div className='h-3 w-3 rounded-full bg-green-500 mr-2' /> Up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleStatusChange(e, 'Up with Fault')}>
                <div className='h-3 w-3 rounded-full bg-yellow-500 mr-2' /> Up with Fault
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleStatusChange(e, 'Down')}>
                <div className='h-3 w-3 rounded-full bg-red-500 mr-2' /> Down
            </DropdownMenuItem>
        </DropdownMenuContent>
       </DropdownMenu>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
            <div className='flex justify-start cursor-pointer p-2'>
                {pulseIndicator}
            </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{statusText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

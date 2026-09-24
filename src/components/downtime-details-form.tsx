'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useFaultReportMutations } from '@/lib/data';
import type { SystemReport } from '@/lib/types';
import { useState } from 'react';
import { Switch } from './ui/switch';

const FormSchema = z.object({
  downEquipmentSerial: z.string().optional(),
  odiEngineerOnCase: z.boolean().default(false),
  dateSystemDown: z.date().nullable(),
  issueResolved: z.boolean().default(false),
  dateFixed: z.date().nullable(),
  notes: z.string().optional(),
}).refine(data => {
    if (data.issueResolved && !data.dateFixed) {
        return false;
    }
    return true;
}, {
    message: "Date Fixed is required if the issue is resolved.",
    path: ["dateFixed"],
});

type FormData = z.infer<typeof FormSchema>;

type DowntimeDetailsFormProps = {
  device: SystemReport;
  isAdmin: boolean;
};

export function DowntimeDetailsForm({ device, isAdmin }: DowntimeDetailsFormProps) {
  const { toast } = useToast();
  const { updateSystemDeviceDowntime } = useFaultReportMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof date === 'object' && 'seconds' in date) {
      return new Date(date.seconds * 1000);
    }
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      downEquipmentSerial: device.downEquipmentSerial || '',
      odiEngineerOnCase: device.odiEngineerOnCase || false,
      dateSystemDown: getDate(device.dateSystemDown),
      issueResolved: device.issueResolved || false,
      dateFixed: getDate(device.dateFixed),
      notes: device.notes || '',
    },
  });

  const onSubmit = (data: FormData) => {
    setIsSubmitting(true);
    try {
      updateSystemDeviceDowntime(device.id, data);
      toast({ title: 'Success', description: 'Downtime details updated.' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const dateSystemDown = form.watch('dateSystemDown');
  const dateFixed = form.watch('dateFixed');

  const calculateTotalTimeToFix = () => {
    if (dateSystemDown && dateFixed) {
        const days = differenceInDays(dateFixed, dateSystemDown);
        return `${days} day(s)`;
    }
    return 'N/A';
  };

  if (!isAdmin) {
      return (
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                  <p className="font-medium text-muted-foreground">Down Equip. S/N</p>
                  <p>{device.downEquipmentSerial || '-'}</p>
              </div>
              <div>
                  <p className="font-medium text-muted-foreground">ODI Engineer on Case</p>
                  <p>{device.odiEngineerOnCase ? 'Yes' : 'No'}</p>
              </div>
              <div>
                  <p className="font-medium text-muted-foreground">Issue Resolved</p>
                  <p>{device.issueResolved ? 'Yes' : 'No'}</p>
              </div>
              <div>
                  <p className="font-medium text-muted-foreground">Date Fixed</p>
                  <p>{device.dateFixed ? format(getDate(device.dateFixed)!, 'PPp') : '-'}</p>
              </div>
              <div className="col-span-full">
                  <p className="font-medium text-muted-foreground">Notes</p>
                  <p>{device.notes || '-'}</p>
              </div>
          </div>
      );
  }

  return (
    <div className="p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="downEquipmentSerial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Down Equipment Serial #</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter serial number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="dateSystemDown"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Date Down</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={'outline'}
                            className={cn(
                                'pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                            )}
                            >
                            {field.value ? (
                                format(field.value, 'PPp')
                            ) : (
                                <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={field.onChange}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="dateFixed"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Date Fixed</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={'outline'}
                            className={cn(
                                'pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                            )}
                            >
                            {field.value ? (
                                format(field.value, 'PPp')
                            ) : (
                                <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={field.onChange}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
              control={form.control}
              name="odiEngineerOnCase"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
                  <div className="space-y-0.5">
                    <FormLabel>ODI Engineer on Case?</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="issueResolved"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Issue Resolved?</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
             <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                    <FormLabel>Total Time to Fix</FormLabel>
                    <p className="text-sm text-muted-foreground">{calculateTotalTimeToFix()}</p>
                </div>
            </div>
          </div>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add notes about the downtime..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Details'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

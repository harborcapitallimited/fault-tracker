'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useFaultReportMutations } from '@/lib/data';
import { useAdmin } from '@/context/admin-context';
import { useRTDBList } from '@/firebase';
import type { SystemReport } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, ClipboardCheck, Activity, Users, FileBarChart, Timer, User } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

const FormSchema = z.object({
  date: z.date({ required_error: "A valid date is required." }),
  reportPeriod: z.enum(['Daily', 'Weekly', 'Monthly', 'Quarterly'], {
    required_error: "Reporting period is required",
  }),
  state: z.string().min(1, "State is required"),
  machineId: z.string().min(1, "Machine ID is required"),
  radiographerName: z.string().min(1, "Radiographer name is required"),
  attendeesCount: z.coerce.number().min(0),
  cxrScreenedCount: z.coerce.number().min(0),
  presumptiveCount: z.coerce.number().min(0),
  presumptiveNoSputumCount: z.coerce.number().min(0),
  samplesNotTestedCount: z.coerce.number().min(0),
  prevDaySamplesTestedCount: z.coerce.number().min(0),
  tbPatientsCount: z.coerce.number().min(0),
  dsTbCount: z.coerce.number().min(0),
  clinicalTbCount: z.coerce.number().min(0),
  drTbCount: z.coerce.number().min(0),
  rifIndeterminateCount: z.coerce.number().min(0),
});

type FormData = z.infer<typeof FormSchema>;

export function ClinicalReportForm() {
  const { toast } = useToast();
  const { setView } = useAdmin();
  const { addClinicalReport } = useFaultReportMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: systems } = useRTDBList<SystemReport>('systemReports');

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      date: new Date(),
      reportPeriod: 'Daily',
      state: '',
      machineId: '',
      radiographerName: '',
      attendeesCount: 0,
      cxrScreenedCount: 0,
      presumptiveCount: 0,
      presumptiveNoSputumCount: 0,
      samplesNotTestedCount: 0,
      prevDaySamplesTestedCount: 0,
      tbPatientsCount: 0,
      dsTbCount: 0,
      clinicalTbCount: 0,
      drTbCount: 0,
      rifIndeterminateCount: 0,
    },
  });

  const selectedMachineId = form.watch('machineId');

  useEffect(() => {
    if (selectedMachineId && systems) {
      const sys = systems.find(s => s.productSystemId === selectedMachineId);
      if (sys) {
        if (sys.state) form.setValue('state', sys.state);
        if (sys.operatorUserName) form.setValue('radiographerName', sys.operatorUserName);
      }
    }
  }, [selectedMachineId, systems, form]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await addClinicalReport({
        ...data,
        date: data.date.toISOString(),
      });
      toast({ title: "Report Submitted", description: `Your ${data.reportPeriod.toLowerCase()} clinical report has been saved.` });
      setView('dashboard');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to submit report.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const machineOptions = systems ? Array.from(new Set(systems.filter(s => !s.deleted).map(s => s.productSystemId))).sort() : [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
          <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground'>
            <Activity className='h-3 w-3' /> Reporting Context
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FormField
              control={form.control}
              name="reportPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Timer className='h-3 w-3' /> Reporting Period
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Frequency..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Daily">Daily</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Reporting Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="machineId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Machine ID</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select machine..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {machineOptions.map(id => <SelectItem key={id} value={id}>{id}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl><Input placeholder="Auto-filled..." {...field} readOnly /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="radiographerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <User className='h-3 w-3' /> Radiographer Name
                </FormLabel>
                <FormControl><Input placeholder="Enter or confirm name..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-6">
          <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary'>
            <Users className='h-3 w-3' /> Attendance & Screening
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FormField control={form.control} name="attendeesCount" render={({ field }) => (
              <FormItem><FormLabel className='text-xs'>Total Attendees</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="cxrScreenedCount" render={({ field }) => (
              <FormItem><FormLabel className='text-xs'>Screened (CXR)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="presumptiveCount" render={({ field }) => (
              <FormItem><FormLabel className='text-xs'>Presumptive Cases</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="presumptiveNoSputumCount" render={({ field }) => (
              <FormItem><FormLabel className='text-xs'>Pres. (No Sputum)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
          </div>
        </div>

        <Separator />

        <div className="space-y-6">
          <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent'>
            <ClipboardCheck className='h-3 w-3' /> Lab & TB Testing
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="samplesNotTestedCount" render={({ field }) => (
              <FormItem><FormLabel className='text-xs'>Samples Not Tested</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="prevDaySamplesTestedCount" render={({ field }) => (
              <FormItem><FormLabel className='text-xs'>Prev. Day Tested</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="tbPatientsCount" render={({ field }) => (
              <FormItem><FormLabel className='text-xs font-bold'>Total TB Patients</FormLabel><FormControl><Input type="number" {...field} className='border-primary' /></FormControl></FormItem>
            )} />
          </div>
        </div>

        <div className="space-y-6 bg-muted/10 p-4 rounded-lg border border-dashed">
          <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground'>
            <FileBarChart className='h-3 w-3' /> TB Category Breakdown
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FormField control={form.control} name="dsTbCount" render={({ field }) => (
              <FormItem><FormLabel className='text-[10px]'>Drug Susceptible (DS)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="clinicalTbCount" render={({ field }) => (
              <FormItem><FormLabel className='text-[10px]'>Clinical TB</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="drTbCount" render={({ field }) => (
              <FormItem><FormLabel className='text-[10px]'>Drug Resistant (DR)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="rifIndeterminateCount" render={({ field }) => (
              <FormItem><FormLabel className='text-[10px]'>Rif-Indeterminate</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
          </div>
        </div>

        <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting Report...' : `Submit ${form.watch('reportPeriod')} Clinical Report`}
        </Button>
      </form>
    </Form>
  );
}

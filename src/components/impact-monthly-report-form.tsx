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
import { Textarea } from '@/components/ui/textarea';
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
import { CalendarIcon, Activity, Users, FileBarChart, ClipboardList, Info, User } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const FormSchema = z.object({
  date: z.date({ required_error: "A valid reporting month is required." }),
  state: z.string().min(1, "State is required"),
  machineId: z.string().min(1, "Machine ID is required"),
  radiographerName: z.string().min(1, "Radiographer name is required"),
  facilityName: z.string().min(1, "Facility name is required"),
  attendeesCount: z.coerce.number().min(0, "Must be a positive number"),
  screenedForTbCount: z.coerce.number().min(0, "Must be a positive number"),
  presumptiveRegisteredCount: z.coerce.number().min(0, "Must be a positive number"),
  presumptiveEvaluatedCount: z.coerce.number().min(0, "Must be a positive number"),
  totalTbDiagnosedCount: z.coerce.number().min(0, "Must be a positive number"),
  bacteriologicalTbCount: z.coerce.number().min(0, "Must be a positive number"),
  clinicalTbCount: z.coerce.number().min(0, "Must be a positive number"),
  childhoodTbCount: z.coerce.number().min(0, "Must be a positive number"),
  drTbCount: z.coerce.number().min(0, "Must be a positive number"),
  startedTreatmentCount: z.coerce.number().min(0, "Must be a positive number"),
  remarks: z.string().optional(),
  nonChestXrayCount: z.coerce.number().min(0, "Must be a positive number"),
});

type FormData = z.infer<typeof FormSchema>;

export function ImpactMonthlyReportForm() {
  const { toast } = useToast();
  const { setView } = useAdmin();
  const { addImpactMonthlyReport } = useFaultReportMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: systems } = useRTDBList<SystemReport>('systemReports');

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      date: new Date(),
      state: '',
      machineId: '',
      radiographerName: '',
      facilityName: '',
      attendeesCount: 0,
      screenedForTbCount: 0,
      presumptiveRegisteredCount: 0,
      presumptiveEvaluatedCount: 0,
      totalTbDiagnosedCount: 0,
      bacteriologicalTbCount: 0,
      clinicalTbCount: 0,
      childhoodTbCount: 0,
      drTbCount: 0,
      startedTreatmentCount: 0,
      remarks: '',
      nonChestXrayCount: 0,
    },
  });

  const selectedMachineId = form.watch('machineId');

  useEffect(() => {
    if (selectedMachineId && systems) {
      const sys = systems.find(s => s.productSystemId === selectedMachineId);
      if (sys) {
        if (sys.state) form.setValue('state', sys.state);
        if (sys.customerName) form.setValue('facilityName', sys.customerName);
        if (sys.operatorUserName) form.setValue('radiographerName', sys.operatorUserName);
      }
    }
  }, [selectedMachineId, systems, form]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await addImpactMonthlyReport({
        date: data.date.toISOString(),
        state: data.state,
        machineId: data.machineId,
        radiographerName: data.radiographerName,
        facilityName: data.facilityName,
        attendeesCount: data.attendeesCount,
        screenedForTbCount: data.screenedForTbCount,
        presumptiveRegisteredCount: data.presumptiveRegisteredCount,
        presumptiveEvaluatedCount: data.presumptiveEvaluatedCount,
        totalTbDiagnosedCount: data.totalTbDiagnosedCount,
        bacteriologicalTbCount: data.bacteriologicalTbCount,
        clinicalTbCount: data.clinicalTbCount,
        childhoodTbCount: data.childhoodTbCount,
        drTbCount: data.drTbCount,
        startedTreatmentCount: data.startedTreatmentCount,
        nonChestXrayCount: data.nonChestXrayCount,
        remarks: data.remarks || '',
      });
      toast({ title: "Monthly Report Submitted", description: "The IMPACT PDX monthly database has been updated." });
      setView('dashboard');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to submit monthly report.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const machineOptions = systems ? Array.from(new Set(systems.filter(s => !s.deleted).map(s => s.productSystemId))).sort() : [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Alert variant="default" className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-sm font-bold">Data Entry Rule</AlertTitle>
          <AlertDescription className="text-xs">
            Enter only <strong>positive numbers or values</strong> for the TB Cascade metrics.
          </AlertDescription>
        </Alert>

        <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
          <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground'>
            <ClipboardList className='h-3 w-3' /> Facility & Period Context
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Reporting Month</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "MMMM yyyy") : <span>Pick a month</span>}
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
            <FormField
              control={form.control}
              name="facilityName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility Name</FormLabel>
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
            <Users className='h-3 w-3' /> TB Cascade: Attendance & Screening
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FormField control={form.control} name="attendeesCount" render={({ field }) => (
              <FormItem><FormLabel className='text-xs'>Number of attendees</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="screenedForTbCount" render={({ field }) => (
              <FormItem><FormLabel className='text-xs'>Attendees screened for TB</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="presumptiveRegisteredCount" render={({ field }) => (
              <FormItem><FormLabel className='text-xs'>Presumptive registered</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="presumptiveEvaluatedCount" render={({ field }) => (
              <FormItem><FormLabel className='text-xs'>Presumptive evaluated</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
          </div>
        </div>

        <Separator />

        <div className="space-y-6">
          <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent'>
            <FileBarChart className='h-3 w-3' /> TB Cascade: Diagnosis Breakdown
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="totalTbDiagnosedCount" render={({ field }) => (
              <FormItem><FormLabel className='text-xs font-bold'>Total TB diagnosed</FormLabel><FormControl><Input type="number" {...field} className='border-primary' /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="bacteriologicalTbCount" render={({ field }) => (
              <FormItem><FormLabel className='text-xs'>Bacteriologically diagnosed</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="clinicalTbCount" render={({ field }) => (
              <FormItem><FormLabel className='text-xs'>#Clinically diagnosed</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="childhoodTbCount" render={({ field }) => (
              <FormItem><FormLabel className='text-xs'>#Childhood TB</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="drTbCount" render={({ field }) => (
              <FormItem><FormLabel className='text-xs'>DR-TB cases diagnosed</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="startedTreatmentCount" render={({ field }) => (
              <FormItem><FormLabel className='text-xs'>#Started on Treatment</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
          </div>
        </div>

        <div className="bg-muted/10 p-4 rounded-lg border border-dashed space-y-6">
          <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-500'>
            <Activity className='h-3 w-3' /> Non-Chest Radiography
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="nonChestXrayCount" render={({ field }) => (
              <FormItem>
                <FormLabel className='text-xs font-bold'>Images Taken NOT Chest X-ray</FormLabel>
                <FormControl><Input type="number" placeholder="Legs, Arm, Skull, etc." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="remarks" render={({ field }) => (
              <FormItem>
                <FormLabel className='text-xs'>REMARKS</FormLabel>
                <FormControl><Textarea placeholder="Monthly assessment notes..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting Report...' : `Submit IMPACT Monthly Report`}
        </Button>
      </form>
    </Form>
  );
}

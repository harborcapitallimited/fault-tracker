
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect, useMemo } from 'react';
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
import { cn, normalizeSystemNumber } from '@/lib/utils';
import { CalendarIcon, Zap, MapPin, HardDrive } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useFaultReportMutations } from '@/lib/data';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFaultsData } from '@/lib/faults-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdmin } from '@/context/admin-context';
import { useRTDBList } from '@/firebase';
import type { SystemReport } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

const FormSchema = z.object({
  radiographerName: z.string().min(2, {
    message: 'Radiographer name must be at least 2 characters.',
  }),
  phoneNumber: z.string().optional(),
  systemNumber: z.string({
    required_error: "Please select a system number.",
  }),
  locationType: z.enum(['Facility', 'Community'], {
    required_error: "You need to select a location type."
  }),
  facility: z.string({
    required_error: "Please provide a name.",
  }),
  faultCategory: z.enum(['Minxray', 'Qure.ai', 'Others'], {
    required_error: "You need to select a fault category."
  }),
  faultSubCategory: z.string().optional(),
  customFaultDescription: z.string().optional(),
  detectionDate: z.date({
    required_error: 'A valid detection date is required.',
  }),
  status: z.enum(['Pending', 'In Progress', 'Resolved']),
}).refine(data => {
    if (data.faultCategory === 'Others' && (!data.customFaultDescription || data.customFaultDescription.trim() === '')) {
        return false;
    }
    return true;
}, {
    message: "Please describe the issue.",
    path: ["customFaultDescription"],
});


type FormData = z.infer<typeof FormSchema>;

export function ReportForm() {
  const { toast } = useToast();
  const { setView } = useAdmin();
  const { addFaultReport } = useFaultReportMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { faultOptions, isLoading: isLoadingFaults } = useFaultsData();
  const { data: systems, isLoading: isLoadingSystems } = useRTDBList<SystemReport>('systemReports');

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      radiographerName: '',
      phoneNumber: '',
      systemNumber: '',
      locationType: 'Facility',
      facility: '',
      faultCategory: undefined,
      faultSubCategory: '',
      customFaultDescription: '',
      detectionDate: new Date(),
      status: 'Pending',
    },
  });

  const selectedSystemId = form.watch('systemNumber');
  const locationType = form.watch('locationType');

  // Filter unique systems based on selected location type
  const filteredSystems = useMemo(() => {
    if (!systems) return [];
    const map = new Map();
    systems.forEach(s => {
      if (!s.deleted && (s.locationType === locationType || !s.locationType)) {
        // Use normalized ID for deduplication in the dropdown display
        const norm = normalizeSystemNumber(s.productSystemId);
        if (!map.has(norm)) {
            map.set(norm, s);
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.productSystemId.localeCompare(b.productSystemId));
  }, [systems, locationType]);

  // Reset system number if it's not in the filtered list
  useEffect(() => {
    if (selectedSystemId && !filteredSystems.find(s => s.productSystemId === selectedSystemId)) {
      form.setValue('systemNumber', '');
    }
  }, [locationType, filteredSystems, selectedSystemId, form]);

  // UNIFIED AUTO-FILL LOGIC: Listen for system number changes and map Operator -> Radiographer
  useEffect(() => {
    if (selectedSystemId && systems) {
      // Find matching system using normalized matching logic
      const selectedSystem = systems.find(s => normalizeSystemNumber(s.productSystemId) === normalizeSystemNumber(selectedSystemId));
      if (selectedSystem) {
        // Operator Name is unified with Radiographer Name
        form.setValue('radiographerName', selectedSystem.operatorUserName || '', { shouldValidate: true });
        form.setValue('phoneNumber', selectedSystem.phoneNumber || '', { shouldValidate: true });
        form.setValue('facility', selectedSystem.customerName || '', { shouldValidate: true });
        
        toast({
          title: "System Details Loaded",
          description: `Auto-filled data for Machine #${selectedSystem.productSystemId}`,
          duration: 3000,
        });
      }
    }
  }, [selectedSystemId, systems, form, toast]);
  
  const onSubmit = (data: FormData) => {
    setIsSubmitting(true);
    let submissionData: any = { ...data };

    const selectedSystem = systems?.find(s => normalizeSystemNumber(s.productSystemId) === normalizeSystemNumber(data.systemNumber));
    if (selectedSystem?.operatorEmail) {
      submissionData.radiographerEmail = selectedSystem.operatorEmail;
    }

    if (data.faultCategory !== 'Minxray' && data.faultCategory !== 'Qure.ai') {
        submissionData.faultSubCategory = '';
    }
    
    try {
        addFaultReport(submissionData);
        toast({ title: "Success", description: "Report created successfully." });
        setView('dashboard');
    } catch (error) {
        toast({
          title: 'Error',
          description: 'An unexpected error occurred.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
    }
  };

  const faultCategoryValue = form.watch('faultCategory');
  const locationTypeValue = form.watch('locationType');
  
  const minxrayFaultOptions = faultOptions?.filter(o => o.category === 'Minxray') || [];
  const qureaiFaultOptions = faultOptions?.filter(o => o.category === 'Qure.ai') || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
          <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2'>
            <MapPin className='h-3 w-3' /> Step 1: Location Context
          </div>
          <FormField
              control={form.control}
              name="locationType"
              render={({ field }) => (
                  <FormItem className="space-y-3">
                  <FormLabel>Reporting from a:</FormLabel>
                  <FormControl>
                      <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex items-center space-x-4"
                      >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                          <RadioGroupItem value="Facility" />
                          </FormControl>
                          <FormLabel className="font-normal">Facility (Fixed)</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                          <RadioGroupItem value="Community" />
                          </FormControl>
                          <FormLabel className="font-normal">Community (Mobile)</FormLabel>
                      </FormItem>
                      </RadioGroup>
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <FormField
              control={form.control}
              name="systemNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <HardDrive className='h-4 w-4 text-primary' />
                    Machine S/N ({locationTypeValue} Only)
                    {isLoadingSystems && <Skeleton className="h-3 w-8" />}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={`Choose ${locationTypeValue} machine...`} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredSystems.length > 0 ? (
                        filteredSystems.map(system => (
                          <SelectItem key={system.id} value={system.productSystemId}>
                            {system.productSystemId} ({system.state || 'N/A'})
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-xs text-muted-foreground text-center">No machines found for this location type.</div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {selectedSystemId && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-primary font-bold uppercase tracking-tight animate-pulse">
                      <Zap className="h-3 w-3" />
                      Auto-fill active
                    </div>
                  )}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="facility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{locationTypeValue === 'Community' ? 'Community Name' : 'Facility Name'}</FormLabel>
                  <FormControl>
                     <Input placeholder={`Enter ${locationTypeValue === 'Community' ? 'Community' : 'Facility'} name`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="radiographerName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Radiographer Name</FormLabel>
                <FormControl>
                    <Input placeholder="Enter radiographer's name" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                    <Input placeholder="Enter phone number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <Separator />

        <FormField
          control={form.control}
          name="faultCategory"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Fault Category</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue('faultSubCategory', '');
                    form.setValue('customFaultDescription', '');
                  }}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Minxray" />
                    </FormControl>
                    <FormLabel className="font-normal">Minxray</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Qure.ai" />
                    </FormControl>
                    <FormLabel className="font-normal">Qure.ai</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Others" />
                    </FormControl>
                    <FormLabel className="font-normal">Others</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {faultCategoryValue === 'Minxray' && (
            isLoadingFaults ? <Skeleton className="h-10 w-full" /> :
            <FormField
              control={form.control}
              name="faultSubCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minxray Issue</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a specific issue" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                       {minxrayFaultOptions.map(option => (
                           <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                       ))}
                       <SelectItem value="add-new">Add your own issue</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
        )}
        {faultCategoryValue === 'Qure.ai' && (
            isLoadingFaults ? <Skeleton className="h-10 w-full" /> :
            <FormField
              control={form.control}
              name="faultSubCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qure.ai Issue</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a specific issue" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                       {qureaiFaultOptions.map(option => (
                           <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                       ))}
                       <SelectItem value="add-new">Add your own issue</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
        )}

        {faultCategoryValue && (
             <FormField
                control={form.control}
                name="customFaultDescription"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Issue Description</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Describe the issue in detail..."
                        className="min-h-[120px]"
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="detectionDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date Fault Detected</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
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
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date('1900-01-01')
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </Button>
      </form>
    </Form>
  );
}

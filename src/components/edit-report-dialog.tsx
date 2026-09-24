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
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useFaultReportMutations } from '@/lib/data';
import type { FaultReport } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { useFaultsData } from '@/lib/faults-data';
import { useActionsData } from '@/lib/actions-data';
import { nigerianStates } from '@/data/states';

const FormSchema = z.object({
  id: z.string(),
  radiographerName: z.string().min(2, {
    message: 'Radiographer name must be at least 2 characters.',
  }),
  radiographerEmail: z.string().email().optional().or(z.literal('')),
  phoneNumber: z.string().optional(),
  systemNumber: z.string().min(1, {
    message: 'S/N is required.',
  }),
  locationType: z.enum(['Facility', 'Community'], {
    required_error: "You need to select a location type."
  }),
  facility: z.string().min(2, {
    message: 'Facility/Community name must be at least 2 characters.',
  }),
  faultCategory: z.enum(['Minxray', 'Qure.ai', 'Others'], {
      required_error: "You need to select a fault category."
  }),
  faultSubCategory: z.string().optional(),
  customFaultDescription: z.string().optional(),
  detectionDate: z.date({
    required_error: 'A valid detection date is required.',
  }),
  currentAction: z.string().optional(),
});

type FormData = z.infer<typeof FormSchema>;

type EditReportDialogProps = {
  report: FaultReport;
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
};

export function EditReportDialog({ report, children, onOpenChange }: EditReportDialogProps) {
  const { toast } = useToast();
  const { updateFaultReport } = useFaultReportMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { faultOptions } = useFaultsData();
  const { actionOptions } = useActionsData();

  const getDate = (date: any): Date => {
    if (!date) return new Date();
    if (date instanceof Date) return date;
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    if (date instanceof Timestamp) return date.toDate();
    if (typeof date === 'object' && 'seconds' in date) {
      return new Date(date.seconds * 1000);
    }
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      id: report.id,
      radiographerName: report.radiographerName || '',
      radiographerEmail: report.radiographerEmail || '',
      phoneNumber: report.phoneNumber || '',
      systemNumber: report.systemNumber || '',
      locationType: report.locationType || 'Facility',
      facility: report.facility || '',
      faultCategory: report.faultCategory,
      faultSubCategory: report.faultSubCategory || '',
      customFaultDescription: report.customFaultDescription || '',
      detectionDate: getDate(report.detectionDate),
      currentAction: report.currentAction || '',
    },
  });

  const faultCategoryValue = form.watch('faultCategory');
  const locationTypeValue = form.watch('locationType');

  const minxrayFaultOptions = faultOptions?.filter(o => o.category === 'Minxray') || [];
  const qureaiFaultOptions = faultOptions?.filter(o => o.category === 'Qure.ai') || [];


  const onSubmit = (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { id, ...updateData } = data;
      const dataToUpdate: Partial<FaultReport> = {
        ...updateData,
        detectionDate: updateData.detectionDate.toISOString(),
      };

      if (updateData.faultCategory !== 'Minxray' && updateData.faultCategory !== 'Qure.ai') {
        dataToUpdate.faultSubCategory = '';
      }

      updateFaultReport(id, dataToUpdate);

      toast({ title: 'Success', description: 'Report updated successfully.' });
      setIsOpen(false);
      onOpenChange(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); onOpenChange(open); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Fault Report</DialogTitle>
          <DialogDescription>
            Make changes to the report below. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="radiographerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Radiographer Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Dr. Jane Doe" {...field} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="systemNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>S/N</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., CT-004" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="radiographerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Radiographer Email</FormLabel>
                    <FormControl>
                      <Input placeholder="radiographer@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="locationType"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel>Location Type</FormLabel>
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
                            <FormLabel className="font-normal">Facility</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="Community" />
                            </FormControl>
                            <FormLabel className="font-normal">Community</FormLabel>
                        </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
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
                            className="min-h-[100px]"
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}
            <FormField
              control={form.control}
              name="currentAction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Action</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an action" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {actionOptions?.map(option => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                            format(field.value, 'PPP')
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
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">
                        Cancel
                    </Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

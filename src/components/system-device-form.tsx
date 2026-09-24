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
import type { SystemReport } from '@/lib/types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';

const FormSchema = z.object({
  productSystemId: z.string().min(1, "Machine S/N is required"),
  operatorUserName: z.string().min(1, "Operator name is required"),
  operatorEmail: z.string().email().optional().or(z.literal('')),
  phoneNumber: z.string().optional(),
  customerName: z.string().min(1, "Facility name is required"),
  lga: z.string().optional(),
  state: z.string().optional(),
  zone: z.string().optional(),
  systemStatus: z.string().min(1, 'System status is required'),
});

type FormData = z.infer<typeof FormSchema>;

type SystemDeviceFormProps = {
  device?: SystemReport;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  submitButtonText?: string;
};

export function SystemDeviceForm({
  device,
  onSubmit,
  isSubmitting,
  submitButtonText = "Save",
}: SystemDeviceFormProps) {

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      productSystemId: device?.productSystemId || '',
      operatorUserName: device?.operatorUserName || '',
      operatorEmail: device?.operatorEmail || '',
      phoneNumber: device?.phoneNumber || '',
      customerName: device?.customerName || '',
      lga: device?.lga || '',
      state: device?.state || '',
      zone: device?.zone || '',
      systemStatus: device?.systemStatus || 'Up',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <FormField control={form.control} name="productSystemId" render={({ field }) => (
                <FormItem><FormLabel>Machine S/N</FormLabel><FormControl><Input placeholder="e.g., MNX 003" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="zone" render={({ field }) => (
                <FormItem><FormLabel>Zone</FormLabel><FormControl><Input placeholder="e.g., SSZ" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="operatorUserName" render={({ field }) => (
                <FormItem><FormLabel>Operator Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                <FormItem><FormLabel>Operator Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>

        <FormField control={form.control} name="operatorEmail" render={({ field }) => (
            <FormItem><FormLabel>Operator Email</FormLabel><FormControl><Input placeholder="example@email.com" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>

        <FormField control={form.control} name="customerName" render={({ field }) => (
            <FormItem><FormLabel>Facility Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )}/>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="state" render={({ field }) => (
                <FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="lga" render={({ field }) => (
                <FormItem><FormLabel>LGA</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>

        <FormField
            control={form.control}
            name="systemStatus"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Current Pulse Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                    <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                </FormControl>
                <SelectContent>
                    <SelectItem value="Up">Up (Green)</SelectItem>
                    <SelectItem value="Up with Fault">Up with Fault (Yellow)</SelectItem>
                    <SelectItem value="Down">Down (Red)</SelectItem>
                </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
            )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
}

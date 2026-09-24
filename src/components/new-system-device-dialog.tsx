'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFaultReportMutations } from '@/lib/data';
import type { SystemReport } from '@/lib/types';
import { SystemDeviceForm } from './system-device-form';

type NewSystemDeviceDialogProps = {
  children: React.ReactNode;
};

export function NewSystemDeviceDialog({ children }: NewSystemDeviceDialogProps) {
  const { toast } = useToast();
  const { addSystemReport } = useFaultReportMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const onSubmit = (data: Omit<SystemReport, 'id'>) => {
    setIsSubmitting(true);
    try {
      addSystemReport(data);
      toast({ title: 'Success', description: 'New system report added.' });
      setIsOpen(false);
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New System Report</DialogTitle>
          <DialogDescription>
            Fill out the form below to add a new system report.
          </DialogDescription>
        </DialogHeader>
        <SystemDeviceForm
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          submitButtonText="Add Report"
        />
        <DialogFooter className='sm:justify-start -mt-8'>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

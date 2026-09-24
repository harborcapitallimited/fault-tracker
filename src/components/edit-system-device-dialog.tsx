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
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFaultReportMutations } from '@/lib/data';
import type { SystemReport } from '@/lib/types';
import { SystemDeviceForm } from './system-device-form';

type EditSystemDeviceDialogProps = {
  device: SystemReport;
  children: React.ReactNode;
};

export function EditSystemDeviceDialog({ device, children }: EditSystemDeviceDialogProps) {
  const { toast } = useToast();
  const { updateSystemReport } = useFaultReportMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const onSubmit = (data: Partial<SystemReport>) => {
    setIsSubmitting(true);
    try {
      updateSystemReport(device.id, data);
      toast({ title: 'Success', description: 'System report updated successfully.' });
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
          <DialogTitle>Edit System Report</DialogTitle>
          <DialogDescription>
            Make changes to the system report below. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <SystemDeviceForm
          device={device}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          submitButtonText="Save Changes"
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

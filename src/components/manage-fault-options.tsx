'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRTDBList } from '@/firebase';
import type { FaultOption } from '@/lib/types';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useAdmin } from '@/context/admin-context';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFaultsData } from '@/lib/faults-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

const FaultCategoryManager = ({
  category,
  faultOptions,
  isLoading,
}: {
  category: 'Minxray' | 'Qure.ai';
  faultOptions: FaultOption[];
  isLoading: boolean;
}) => {
  const { addFaultOption, deleteFaultOption } = useFaultsData();
  const [newOption, setNewOption] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FaultOption | null>(null);
  const { toast } = useToast();

  const handleAddOption = async () => {
    if (!newOption.trim()) {
      toast({ title: 'Error', description: 'Fault option cannot be empty.', variant: 'destructive'});
      return;
    }
    setIsAdding(true);
    try {
      await addFaultOption({
        category,
        label: newOption.trim(),
        value: newOption.trim().toLowerCase().replace(/\s+/g, '-'),
      });
      toast({ title: 'Success', description: `Added "${newOption.trim()}" to ${category} faults.`});
      setNewOption('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to add option.', variant: 'destructive'});
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteFaultOption(itemToDelete.id);
      toast({ title: 'Success', description: `Deleted "${itemToDelete.label}".`});
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete option.', variant: 'destructive'});
    }
    setItemToDelete(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{category} Fault Options</CardTitle>
        <CardDescription>Add or remove predefined issues for the {category} category.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input 
            placeholder="New fault description"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            disabled={isAdding}
          />
          <Button onClick={handleAddOption} disabled={isAdding}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {isAdding ? 'Adding...' : 'Add'}
          </Button>
        </div>
        <div className="rounded-md border">
          {isLoading ? (
            <div className='p-4 space-y-2'>
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
            </div>
          ) : (
            faultOptions.map(option => (
              <div key={option.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                <span className="text-sm">{option.label}</span>
                <Button variant="ghost" size="icon" onClick={() => setItemToDelete(option)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            ))
          )}
          {faultOptions.length === 0 && !isLoading && (
            <p className="text-center text-sm text-muted-foreground p-4">No {category} options defined.</p>
          )}
        </div>
        <AlertDialog
          open={!!itemToDelete}
          onOpenChange={(open) => !open && setItemToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the fault option: <strong>{itemToDelete?.label}</strong>. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export function ManageFaultOptions() {
  const { isAdmin } = useAdmin();
  const { data: faultOptions, isLoading } = useRTDBList<FaultOption>('faults');
  
  if (!isAdmin) return null;

  const minxrayFaults = faultOptions?.filter(f => f.category === 'Minxray') || [];
  const qureaiFaults = faultOptions?.filter(f => f.category === 'Qure.ai') || [];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
        <FaultCategoryManager
            category="Minxray"
            faultOptions={minxrayFaults}
            isLoading={isLoading}
        />
        <Separator />
        <FaultCategoryManager
            category="Qure.ai"
            faultOptions={qureaiFaults}
            isLoading={isLoading}
        />
    </div>
  );
}
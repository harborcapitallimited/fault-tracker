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
import type { ActionOption, AppSettings } from '@/lib/types';
import { PlusCircle, Trash2, Download, AlertCircle, Database, ChevronDown, Upload, Ticket, Wrench, Stethoscope, Eye, EyeOff } from 'lucide-react';
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
import { useActionsData } from '@/lib/actions-data';
import { Skeleton } from '@/components/ui/skeleton';
import { ref, get, update } from 'firebase/database';
import { useDatabase, useRTDBItem } from '@/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from '@/components/ui/scroll-area';
import { WorkbookImport } from '@/components/workbook-import';
import { NewSystemDeviceDialog } from '@/components/new-system-device-dialog';
import { Separator } from '@/components/ui/separator';
import { useFaultReportMutations } from '@/lib/data';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function ManageActions() {
  const { isAdmin } = useAdmin();
  const { actionOptions, isLoading, addActionOption, deleteActionOption } = useActionsData();
  const { backfillTicketIds } = useFaultReportMutations();
  const { toast } = useToast();
  const database = useDatabase();
  const { data: settings, isLoading: isLoadingSettings } = useRTDBItem<AppSettings>('settings');

  const [newOption, setNewOption] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ActionOption | null>(null);

  if (!isAdmin) return null;

  const handleToggleClinicalReporting = async (enabled: boolean) => {
    if (!database) return;
    setIsUpdatingSettings(true);
    try {
      await update(ref(database, 'settings'), { clinicalReportingEnabled: enabled });
      toast({
        title: enabled ? 'Functions Enabled' : 'Functions Hidden',
        description: enabled 
          ? 'Daily and Monthly clinical reports are now visible across the app.' 
          : 'Clinical reporting functions have been hidden from the menu and dashboard.',
      });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to update settings.', variant: 'destructive' });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleAddOption = async () => {
    if (!newOption.trim()) {
      toast({ title: 'Error', description: 'Action option cannot be empty.', variant: 'destructive' });
      return;
    }
    setIsAdding(true);
    try {
      await addActionOption({
        label: newOption.trim(),
        value: newOption.trim().toLowerCase().replace(/\s+/g, '-'),
      });
      toast({ title: 'Success', description: `Added "${newOption.trim()}" to actions.` });
      setNewOption('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to add option.', variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteActionOption(itemToDelete.id);
      toast({ title: 'Success', description: `Deleted "${itemToDelete.label}".` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete option.', variant: 'destructive' });
    }
    setItemToDelete(null);
  };

  const handleBackfillTickets = async () => {
    setIsBackfilling(true);
    try {
        const count = await backfillTicketIds();
        toast({ 
            title: 'Maintenance Complete', 
            description: count > 0 ? `Successfully generated unique Ticket IDs for ${count} existing records.` : 'All fault reports already have Ticket IDs.'
        });
    } catch (error: any) {
        toast({ title: 'Maintenance Failed', description: error.message || 'Check console for details.', variant: 'destructive' });
    } finally {
        setIsBackfilling(false);
    }
  };

  const handleExportToJSON = async () => {
    if (!database) {
      toast({ title: 'Error', description: 'Database not ready.', variant: 'destructive' });
      return;
    }

    setIsExporting(true);
    try {
      const snapshot = await get(ref(database));
      const data = snapshot.val();
      
      if (!data) {
        throw new Error("No data found in database.");
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fault_tracker_export_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Export Complete', description: 'Database data has been downloaded as JSON.' });
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Export Failed', description: error.message || 'Check console for details.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      
      {/* Feature Management Card */}
      <Card className="border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Clinical Reporting Modules
          </CardTitle>
          <CardDescription>
            Enable or disable the Daily Clinical and Monthly IMPACT reporting functions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-3">
              {settings?.clinicalReportingEnabled ? <Eye className="h-5 w-5 text-green-500" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Reporting Visibility</Label>
                <p className="text-xs text-muted-foreground">Toggle visibility of Daily and Monthly logs across the app.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
               {isLoadingSettings ? <Skeleton className="h-6 w-12 rounded-full" /> : (
                  <Switch 
                    checked={settings?.clinicalReportingEnabled || false} 
                    onCheckedChange={handleToggleClinicalReporting}
                    disabled={isUpdatingSettings}
                  />
               )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-accent" />
            Registry Administration
          </CardTitle>
          <CardDescription>
            Advanced tools for managing the equipment database and bulk workbook imports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between font-semibold">
                <span>Manage Systems & Imports</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 border-t mt-4 animate-in slide-in-from-top-2 duration-300">
              <ScrollArea className="h-[450px] pr-4 rounded-md bg-muted/10">
                <div className="space-y-8 p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h4 className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                                <PlusCircle className="h-4 w-4 text-primary" />
                                Manual Registration
                            </h4>
                            <p className="text-[10px] text-muted-foreground mt-1">Directly add a new machine to the fleet database.</p>
                        </div>
                        <NewSystemDeviceDialog>
                            <Button size="sm">New Machine</Button>
                        </NewSystemDeviceDialog>
                    </div>
                  </div>
                  
                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                      <Upload className="h-4 w-4 text-primary" />
                      Advanced Workbook Import
                    </h4>
                    <p className="text-[10px] text-muted-foreground">Upload your multi-sheet Excel file to update regional equipment rosters.</p>
                    <div className="bg-background rounded-lg border shadow-inner">
                        <WorkbookImport />
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <Card className="border-orange-500/20 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-orange-500" />
            Ticketing Maintenance
          </CardTitle>
          <CardDescription>
            Assign missing Ticket IDs to existing historical records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className='bg-orange-500/5 border-orange-500/20'>
            <Wrench className='h-4 w-4 text-orange-600' />
            <AlertTitle className='text-orange-800 font-bold'>Backfill System</AlertTitle>
            <AlertDescription className='text-xs text-orange-700/80'>
                Use this tool if you have older reports that don't have a Ticket ID. It will scan your entire fault database and generate unique searchable IDs for every record.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={handleBackfillTickets} 
            className="w-full bg-orange-600 hover:bg-orange-700 text-white" 
            disabled={isBackfilling}
          >
            {isBackfilling ? 'Processing Records...' : 'Generate Missing Ticket IDs'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Current Action Options</CardTitle>
            <CardDescription>Add or remove predefined actions for fault reports.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex gap-2">
            <Input
                placeholder="New action description"
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
                actionOptions?.map(option => (
                <div key={option.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                    <span className="text-sm">{option.label}</span>
                    <Button variant="ghost" size="icon" onClick={() => setItemToDelete(option)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Delete</span>
                    </Button>
                </div>
                ))
            )}
            {actionOptions?.length === 0 && !isLoading && (
                <p className="text-center text-sm text-muted-foreground p-4">No action options defined.</p>
            )}
            </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Data Management
          </CardTitle>
          <CardDescription>
            Download a complete backup of your database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="default" className="bg-primary/5 border-primary/20">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>JSON Export</AlertTitle>
            <AlertDescription className="text-xs">
              This will generate a single JSON file containing all reports, systems, and configurations. Use this for regular backups or data migration.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={handleExportToJSON} 
            className="w-full" 
            variant="outline"
            disabled={isExporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Preparing Export...' : 'Export all Data to JSON'}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This will permanently delete the action option: <strong>{itemToDelete?.label}</strong>. This action cannot be undone.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
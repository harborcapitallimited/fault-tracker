'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFaultReportMutations } from '@/lib/data';
import { Info, Sheet } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

export function TextImportForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const { addSystemReport } = useFaultReportMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importText, setImportText] = useState('');

  const handleImport = async () => {
    if (!importText.trim()) {
      toast({ title: 'Error', description: 'Please paste some data to import.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Split by newline and handle potential copy-paste artifacts
      const lines = importText.split('\n').filter(line => line.trim() !== '');
      let successCount = 0;
      let errorCount = 0;

      for (const line of lines) {
        // Handle both Comma and Tab separated values (Excel copies as Tab)
        const delimiter = line.includes('\t') ? '\t' : ',';
        const parts = line.split(delimiter).map(p => p.trim());
        
        // Expected structure from your spreadsheet image:
        // Names, Email, Phone, Facility Address, LGA, State, Machine, Zone
        // OR Row#, Names, Email, Phone, Facility Address, LGA, State, Machine, Zone
        
        let data: any = {};
        
        if (parts.length >= 8) {
          const hasRowNumber = !isNaN(parseInt(parts[0]));
          const offset = hasRowNumber ? 1 : 0;

          data = {
            operatorUserName: parts[0 + offset],
            operatorEmail: parts[1 + offset],
            phoneNumber: parts[2 + offset],
            customerName: parts[3 + offset],
            lga: parts[4 + offset],
            state: parts[5 + offset],
            productSystemId: parts[6 + offset],
            zone: parts[7 + offset],
            systemStatus: 'Up' as const,
            deleted: false
          };

          // Skip header row if pasted
          if (data.operatorUserName.toLowerCase().includes('name') && data.productSystemId.toLowerCase().includes('machine')) {
            continue;
          }

          if (data.productSystemId) {
            try {
              await addSystemReport(data);
              successCount++;
            } catch (e) {
              console.error('Failed to import row:', line, e);
              errorCount++;
            }
          } else {
            errorCount++;
          }
        } else {
          errorCount++;
        }
      }

      toast({
        title: 'Import Complete',
        description: `Successfully imported ${successCount} systems. ${errorCount > 0 ? `Failed to parse ${errorCount} lines.` : ''}`,
      });
      
      setImportText('');
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <Alert variant="default" className="bg-blue-500/5 border-blue-500/20">
        <Sheet className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-sm font-bold">New Workbook Parser</AlertTitle>
        <AlertDescription className="text-xs">
          Paste your spreadsheet data. The parser now expects:<br />
          <code className="bg-muted px-1 rounded text-[10px] block mt-2">Names, Email, Phone, Facility, LGA, State, Machine, Zone</code>
          <p className="mt-2 text-[10px] text-muted-foreground">Tip: Copy directly from Excel and paste here. It handles row numbers automatically.</p>
        </AlertDescription>
      </Alert>

      <Textarea
        placeholder="Ibanga Mkpouto, prince@gmail.com, 0803..., General Hospital, ORON, Akwa Ibom, MNX 003, SSZ"
        className="min-h-[250px] font-mono text-xs"
        value={importText}
        onChange={(e) => setImportText(e.target.value)}
        disabled={isSubmitting}
      />

      <div className="flex justify-end gap-2">
        <Button 
          onClick={handleImport} 
          disabled={isSubmitting || !importText.trim()} 
          className="w-full sm:w-auto"
        >
          {isSubmitting ? 'Importing...' : 'Start Workbook Import'}
        </Button>
      </div>
    </div>
  );
}

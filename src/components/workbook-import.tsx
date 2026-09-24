'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFaultReportMutations } from '@/lib/data';
import { FileSpreadsheet, Upload, Loader2, CheckCircle2, RefreshCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import * as XLSX from 'xlsx';

export function WorkbookImport({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const { addSystemReport } = useFaultReportMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ count: number; sheets: string[] } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        if (!bstr) return;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheetNames = wb.SheetNames;
        let totalRows = 0;
        sheetNames.forEach(name => {
          const ws = wb.Sheets[name];
          const data = XLSX.utils.sheet_to_json(ws);
          totalRows += data.length;
        });
        setPreview({ count: totalRows, sheets: sheetNames });
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  // Helper to find a value in a row object using case-insensitive partial matching
  const getRowValue = (row: any, keywords: string[]): string => {
    const keys = Object.keys(row);
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().trim();
      if (keywords.some(k => normalizedKey === k.toLowerCase() || normalizedKey.includes(k.toLowerCase()))) {
        const val = row[key];
        return val !== undefined && val !== null ? String(val).trim() : '';
      }
    }
    return '';
  };

  const processFile = async (selectedFile: File) => {
    return new Promise<{ successCount: number; sheetCount: number }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const bstr = e.target?.result;
          if (!bstr) throw new Error("Could not read file data.");
          const wb = XLSX.read(bstr, { type: 'binary' });
          
          let successCount = 0;

          for (const sheetName of wb.SheetNames) {
            const worksheet = wb.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            const locationType = (sheetName.toLowerCase().includes('community') || sheetName.toLowerCase().includes('admin')) 
              ? 'Community' 
              : 'Facility';

            for (const row of jsonData as any[]) {
              const data = {
                operatorUserName: getRowValue(row, ['name', 'operator', 'names']),
                operatorEmail: getRowValue(row, ['email', 'mail']),
                phoneNumber: getRowValue(row, ['phone', 'mobile', 'contact']),
                customerName: getRowValue(row, ['facility', 'address', 'customer', 'location']),
                lga: getRowValue(row, ['lga']),
                state: getRowValue(row, ['state']),
                productSystemId: getRowValue(row, ['machine', 's/n', 'sn', 'system id', 'system id']),
                zone: getRowValue(row, ['zone']),
                locationType: locationType as 'Facility' | 'Community',
                systemStatus: 'Up' as const,
                deleted: false
              };

              // Only import if we have a valid machine ID (S/N)
              if (data.productSystemId && data.productSystemId !== '') {
                try {
                  await addSystemReport(data);
                  successCount++;
                } catch (err) {
                  console.error('Failed to import row:', row, err);
                }
              }
            }
          }
          resolve({ successCount, sheetCount: wb.SheetNames.length });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("File read error."));
      reader.readAsBinaryString(selectedFile);
    });
  };

  const handleImport = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!file) {
      toast({ title: "No file selected", description: "Please select an Excel file first.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await processFile(file);

      toast({
        title: 'Import Complete',
        description: `Successfully processed ${result.successCount} systems across ${result.sheetCount} sheets.`,
      });
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message || 'Could not parse the workbook.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pt-4">
      <Alert variant="default" className="bg-primary/5 border-primary/20">
        <FileSpreadsheet className="h-4 w-4 text-primary" />
        <AlertTitle className="text-sm font-bold">Workbook Parser Active</AlertTitle>
        <AlertDescription className="text-xs">
          Upload your multi-sheet workbook. Systems will be categorized as <strong>Facility</strong> or <strong>Community</strong> based on sheet names.
        </AlertDescription>
      </Alert>

      {!file ? (
        <div className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 flex flex-col items-center justify-center gap-4 bg-muted/5 hover:bg-muted/10 transition-colors">
          <div className="bg-primary/10 p-4 rounded-full">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground mt-1">Excel (.xlsx) or CSV files supported</p>
          </div>
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            className="absolute inset-0 opacity-0 cursor-pointer" 
            onChange={handleFileChange}
            disabled={isSubmitting}
          />
        </div>
      ) : (
        <div className="border rounded-lg p-6 flex flex-col items-center justify-center gap-4 bg-primary/5 border-primary/20">
          <CheckCircle2 className="h-12 w-12 text-primary animate-in zoom-in duration-300" />
          <div className="text-center">
            <p className="font-bold text-primary">{file.name}</p>
            <p className="text-xs text-muted-foreground mt-1">File ready for processing</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setFile(null); setPreview(null); }} disabled={isSubmitting}>
            <RefreshCcw className="mr-2 h-3 w-3" /> Change File
          </Button>
        </div>
      )}

      {preview && (
        <div className="bg-muted/30 rounded-md p-4 space-y-2 border">
          <h4 className="text-[10px] font-bold uppercase text-muted-foreground">Workbook Summary</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Rows Detected</p>
              <p className="text-lg font-bold">{preview.count}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sheets Found</p>
              <p className="text-lg font-bold">{preview.sheets.length}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {preview.sheets.map(s => (
              <span key={s} className="text-[10px] bg-background border px-1.5 py-0.5 rounded italic">{s}</span>
            ))}
          </div>
        </div>
      )}

      <Button 
        onClick={handleImport} 
        disabled={!file || isSubmitting} 
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Workbook...
          </>
        ) : (
          'Start Import'
        )}
      </Button>
    </div>
  );
}

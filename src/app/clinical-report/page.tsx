
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ClinicalReportForm } from '@/components/clinical-report-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Stethoscope } from 'lucide-react';

export default function ClinicalReportPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center p-4 border-b gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
        </div>
        <div className='flex items-center gap-2'>
            <Stethoscope className='h-6 w-6 text-primary' />
            <h1 className="text-2xl font-bold tracking-tight">Daily Clinical TB Report</h1>
        </div>
      </header>
      <div className="flex-1 p-4 md:p-6 flex justify-center">
        <div className="w-full max-w-4xl">
          <Card className='border-primary/20 shadow-lg'>
            <CardHeader>
              <CardTitle>Daily Metrics Submission</CardTitle>
              <CardDescription>
                Enter the TB screening data for today. Ensure the machine ID is correct to track equipment performance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClinicalReportForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

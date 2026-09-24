'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ImpactMonthlyReportForm } from '@/components/impact-monthly-report-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ClipboardList } from 'lucide-react';

export default function ImpactMonthlyReportPage() {
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
            <ClipboardList className='h-6 w-6 text-primary' />
            <h1 className="text-2xl font-bold tracking-tight">IMPACT Monthly Facility Report</h1>
        </div>
      </header>
      <div className="flex-1 p-4 md:p-6 flex justify-center">
        <div className="w-full max-w-4xl">
          <Card className='border-primary/20 shadow-lg'>
            <CardHeader>
              <CardTitle>PDX Facility Monthly Database</CardTitle>
              <CardDescription>
                Complete the monthly TB Cascade assessment for this facility. Ensure all diagnosis counts are cross-referenced with lab records.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImpactMonthlyReportForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

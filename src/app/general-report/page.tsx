'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { GeneralReportForm } from '@/components/general-report-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function GeneralReportPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center p-4 border-b gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">General Report</h1>
      </header>
      <div className="flex-1 p-4 md:p-6 flex justify-center">
        <div className="w-full max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>New General Report</CardTitle>
              <CardDescription>
                Fill out the form below to submit a general report.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GeneralReportForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

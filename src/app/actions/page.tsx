'use client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ManageActions } from '@/components/manage-actions';

export default function ActionsPage() {
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
        <h1 className="text-2xl font-bold tracking-tight">Manage Actions</h1>
      </header>
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <ManageActions />
      </div>
    </div>
  );
}
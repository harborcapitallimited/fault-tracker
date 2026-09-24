import { Wrench } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2 font-bold text-lg text-primary">
      <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
        <Wrench className="h-5 w-5" />
      </div>
      <span className="group-data-[collapsible=icon]:hidden">Minxray Data Tracker</span>
    </div>
  );
}

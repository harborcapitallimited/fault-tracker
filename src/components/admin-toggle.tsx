'use client';

import { useState } from 'react';
import { useAdmin, type AdminRole } from '@/context/admin-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { LogIn, LogOut, UserCircle, ChevronRight, User, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { useFaultReportMutations } from '@/lib/data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

const adminServices: AdminRole[] = ['KNCV', 'NTBLCP', 'MINXRAY', 'QUREAI'];

export function AdminToggle() {
  const { isAdmin, adminName, login, logout, validateCredentials, getKnownNames, addKnownName } = useAdmin();
  const { createLoginNotification } = useFaultReportMutations();

  const [loginStep, setLoginStep] = useState<'credentials' | 'name'>('credentials');
  const [service, setService] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleCredentialsSubmit = () => {
    if (!service) {
        toast({
            title: 'Login Failed',
            description: 'Please select a service.',
            variant: 'destructive',
        });
        return;
    }
    if (validateCredentials(service, password)) {
      setLoginStep('name');
    } else {
        toast({
            title: 'Login Failed',
            description: 'Invalid password.',
            variant: 'destructive',
        });
    }
  };

  const handleLogin = (name: string) => {
    if (!name.trim()) {
        toast({
            title: 'Login Failed',
            description: 'Please enter a name.',
            variant: 'destructive',
        });
        return;
    }
    try {
        login(service, password, name.trim());
        addKnownName(service, name.trim());
        createLoginNotification(service, name.trim());
        resetForm();
    } catch (error: any) {
         toast({
            title: 'Login Failed',
            description: error.message,
            variant: 'destructive',
        });
    }
  }

  const resetForm = () => {
    setIsOpen(false);
    setLoginStep('credentials');
    setService('');
    setPassword('');
    setUserName('');
    setNameSearch('');
  }

  const handleLogout = () => {
    logout();
  };

  const knownNamesForService = getKnownNames(service);
  const filteredKnownNames = knownNamesForService.filter(name => 
    name.toLowerCase().includes(nameSearch.toLowerCase())
  );

  if (isAdmin) {
    return (
      <div className="flex items-center justify-between w-full group-data-[collapsible=icon]:justify-center">
         <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className='flex items-center gap-2 text-sm'>
                  <UserCircle className="h-5 w-5 text-primary" />
                  <span className='font-semibold truncate group-data-[collapsible=icon]:hidden' title={adminName || ''}>{adminName}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" align="start">
              <p>{adminName}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button variant="ghost" size="icon" className='h-8 w-8 group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:p-2' onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Logout</span>
        </Button>
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsOpen(true); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" className='w-full group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:h-auto'>
            <LogIn className="mr-2 h-4 w-4 group-data-[collapsible=icon]:mr-0" />
            <span className='group-data-[collapsible=icon]:hidden'>Admin Login</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        {loginStep === 'credentials' && (
             <div className="grid gap-4">
             <div className="space-y-2">
               <h4 className="font-medium leading-none">Admin Access</h4>
               <p className="text-sm text-muted-foreground">
                 Select your service and enter the password.
               </p>
             </div>
             <div className="grid gap-2">
               <div className="grid grid-cols-3 items-center gap-4">
                 <Label htmlFor="service">Service</Label>
                 <div className="col-span-2">
                   <Select value={service} onValueChange={setService}>
                       <SelectTrigger id="service">
                           <SelectValue placeholder="Select service" />
                       </SelectTrigger>
                       <SelectContent>
                           {adminServices.map(s => (
                               <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>
                           ))}
                       </SelectContent>
                   </Select>
                 </div>
               </div>
               <div className="grid grid-cols-3 items-center gap-4">
                 <Label htmlFor="password">Password</Label>
                 <Input
                   id="password"
                   type="password"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="col-span-2 h-8"
                   onKeyDown={(e) => e.key === 'Enter' && handleCredentialsSubmit()}
                 />
               </div>
             </div>
             <Button onClick={handleCredentialsSubmit}>Next</Button>
           </div>
        )}
        {loginStep === 'name' && (
            <div className="grid gap-4">
                <div className="space-y-2">
                <h4 className="font-medium leading-none">Identify Yourself</h4>
                <p className="text-sm text-muted-foreground">
                    Select a recent name or enter a new one.
                </p>
                </div>
                
                {knownNamesForService.length > 0 && (
                    <div className='space-y-2'>
                        <div className="flex items-center justify-between">
                            <Label className='text-xs font-semibold uppercase text-muted-foreground'>Recent Names</Label>
                            {knownNamesForService.length > 5 && (
                                <div className="relative w-24">
                                    <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                    <Input 
                                        className="h-6 pl-5 text-[10px]" 
                                        placeholder="Filter..." 
                                        value={nameSearch}
                                        onChange={(e) => setNameSearch(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                        <ScrollArea className="h-32 border rounded-md">
                            <div className="p-1">
                                {filteredKnownNames.map((name) => (
                                    <Button
                                        key={name}
                                        variant="ghost"
                                        className="w-full justify-start text-sm h-8"
                                        onClick={() => handleLogin(name)}
                                    >
                                        <User className="mr-2 h-3 w-3" />
                                        {name}
                                    </Button>
                                ))}
                                {filteredKnownNames.length === 0 && (
                                    <p className="text-[10px] text-center py-4 text-muted-foreground">No matching names.</p>
                                )}
                            </div>
                        </ScrollArea>
                        <div className="flex items-center gap-2 py-2">
                            <Separator className="flex-1" />
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">OR</span>
                            <Separator className="flex-1" />
                        </div>
                    </div>
                )}

                <div className="grid gap-2">
                    <Label htmlFor="userName" className={knownNamesForService.length > 0 ? 'text-xs' : ''}>
                        {knownNamesForService.length > 0 ? 'New Name' : 'Enter Your Name'}
                    </Label>
                    <div className="flex gap-2">
                        <Input
                            id="userName"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            placeholder="Enter name..."
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin(userName)}
                        />
                        <Button size="icon" onClick={() => handleLogin(userName)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from './ui/button';
import { Bell, Check, ChevronRight, Info, User } from 'lucide-react';
import { useRTDBList } from '@/firebase/database/use-db';
import type { Notification } from '@/lib/types';
import { ref, update } from 'firebase/database';
import { Separator } from './ui/separator';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Skeleton } from './ui/skeleton';
import { useAdmin } from '@/context/admin-context';
import { useState, useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Badge } from './ui/badge';
import { useDatabase } from '@/firebase';

type GroupedNotifications = {
  [key: string]: Notification[];
};

export function NotificationCenter() {
  const database = useDatabase();
  const { adminRole, adminName } = useAdmin();
  const [isOpen, setIsOpen] = useState(false);

  const { data: allNotifications, isLoading } = useRTDBList<Notification>('notifications');

  const notifications = useMemo(() => {
    return (allNotifications || []).sort((a, b) => {
        const dateA = typeof a.createdAt === 'string' ? parseISO(a.createdAt).getTime() : 0;
        const dateB = typeof b.createdAt === 'string' ? parseISO(b.createdAt).getTime() : 0;
        return dateB - dateA;
    });
  }, [allNotifications]);

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const markAsRead = (id: string) => {
    if (!database) return;
    update(ref(database, `notifications/${id}`), { read: true });
  };
  
  const markAllAsRead = () => {
    if (!database || !notifications) return;
    const updates: any = {};
    notifications.forEach(notif => {
        if (!notif.read) {
            updates[`notifications/${notif.id}/read`] = true;
        }
    })
    update(ref(database), updates);
  }

  const groupedNotifications = (notifications || []).reduce((acc, notif) => {
    const key = notif.adminName && notif.adminRole 
      ? `${notif.adminName} (${notif.adminRole})` 
      : 'System Updates';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(notif);
    return acc;
  }, {} as GroupedNotifications);


  const NotificationItem = ({ notif }: { notif: Notification }) => (
    <div className={cn("p-2 rounded-md hover:bg-muted", !notif.read && "bg-blue-500/10")}>
       <div className='flex items-start gap-3'>
        <div className='mt-1'>
            <Info className='h-4 w-4 text-blue-500' />
        </div>
        <div className='flex-1 space-y-1'>
            <p className="text-sm">{notif.message}</p>
            <div className='flex justify-between items-center'>
            <p className="text-xs text-muted-foreground">
                {notif.createdAt ? formatDistanceToNow(parseISO(notif.createdAt as string), { addSuffix: true }) : ''}
            </p>
            {!notif.read && (
                <Button variant='ghost' size='sm' className='h-auto px-1 py-0' onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}>
                    <Check className='h-4 w-4 mr-1'/> Mark as read
                </Button>
            )}
            </div>
        </div>
       </div>
    </div>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-white text-xs flex items-center justify-center">
              {unreadCount}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="flex justify-between items-center p-2">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
        <Separator />
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="max-h-96 overflow-y-auto space-y-2 p-2">
             <Accordion type="multiple" className="w-full">
              {Object.entries(groupedNotifications).map(([groupName, groupNotifications]) => (
                <AccordionItem value={groupName} key={groupName}>
                  <AccordionTrigger className='py-2 px-2 hover:no-underline'>
                    <h4 className='font-semibold text-sm text-muted-foreground flex items-center gap-2'>
                        <User className='h-4 w-4' />
                        {groupName}
                        <Badge variant='secondary' className='ml-2'>{groupNotifications.length}</Badge>
                    </h4>
                  </AccordionTrigger>
                  <AccordionContent className='pb-0'>
                     <div className='space-y-1 pl-4 border-l ml-4'>
                      {groupNotifications.map(notif => (
                        notif.link ? (
                          <Link href={notif.link} key={notif.id} passHref>
                              <div className="cursor-pointer" onClick={() => { markAsRead(notif.id); setIsOpen(false); }}>
                                <NotificationItem notif={notif} />
                              </div>
                          </Link>
                        ) : (
                          <NotificationItem key={notif.id} notif={notif} />
                        )
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground p-4 text-center">
            No notifications yet.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

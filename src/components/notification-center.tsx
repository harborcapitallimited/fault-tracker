'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from './ui/button';
import { Bell, Check, ChevronRight, Info, User, Volume2, BellRing, Sparkles } from 'lucide-react';
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
import { useDesktopNotifications } from '@/hooks/use-desktop-notifications';

type GroupedNotifications = {
  [key: string]: Notification[];
};

export function NotificationCenter() {
  const database = useDatabase();
  const { adminRole, adminName } = useAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const { isGranted, requestPermission, triggerTestAlert } = useDesktopNotifications();

  const { data: allNotifications, isLoading } = useRTDBList<Notification>('notifications');

  const notifications = useMemo(() => {
    return (allNotifications || []).sort((a, b) => {
      const dateA = typeof a.createdAt === 'string' ? parseISO(a.createdAt).getTime() : 0;
      const dateB = typeof b.createdAt === 'string' ? parseISO(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [allNotifications]);

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  const markAsRead = (id: string) => {
    if (!database) return;
    update(ref(database, `notifications/${id}`), { read: true });
  };

  const markAllAsRead = () => {
    if (!database || !notifications) return;
    const updates: any = {};
    notifications.forEach((notif) => {
      if (!notif.read) {
        updates[`notifications/${notif.id}/read`] = true;
      }
    });
    update(ref(database), updates);
  };

  const groupedNotifications = (notifications || []).reduce((acc, notif) => {
    const key =
      notif.adminName && notif.adminRole
        ? `${notif.adminName} (${notif.adminRole})`
        : 'System Updates';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(notif);
    return acc;
  }, {} as GroupedNotifications);

  const NotificationItem = ({ notif }: { notif: Notification }) => (
    <div
      className={cn(
        'p-2 rounded-md hover:bg-muted transition-colors',
        !notif.read && 'bg-blue-500/10'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1">
          <Info className="h-4 w-4 text-blue-500" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm leading-snug">{notif.message}</p>
          <div className="flex justify-between items-center pt-1">
            <p className="text-[11px] text-muted-foreground">
              {notif.createdAt
                ? formatDistanceToNow(parseISO(notif.createdAt as string), { addSuffix: true })
                : ''}
            </p>
            {!notif.read && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-1.5 py-0.5 text-xs text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(notif.id);
                }}
              >
                <Check className="h-3 w-3 mr-1" /> Mark as read
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
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex justify-between items-center p-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 text-[10px] px-1.5">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 text-xs text-muted-foreground hover:text-foreground">
              Mark all as read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="max-h-80 overflow-y-auto space-y-2 p-2">
            <Accordion type="multiple" className="w-full">
              {Object.entries(groupedNotifications).map(([groupName, groupNotifications]) => (
                <AccordionItem value={groupName} key={groupName} className="border-b-0 mb-1">
                  <AccordionTrigger className="py-2 px-2 rounded hover:bg-muted/50 hover:no-underline">
                    <h4 className="font-semibold text-xs text-muted-foreground flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-primary" />
                      <span>{groupName}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1">
                        {groupNotifications.length}
                      </Badge>
                    </h4>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0 pt-1">
                    <div className="space-y-1 pl-3 border-l-2 border-primary/20 ml-3">
                      {groupNotifications.map((notif) =>
                        notif.link ? (
                          <Link href={notif.link} key={notif.id} passHref>
                            <div
                              className="cursor-pointer"
                              onClick={() => {
                                markAsRead(notif.id);
                                setIsOpen(false);
                              }}
                            >
                              <NotificationItem notif={notif} />
                            </div>
                          </Link>
                        ) : (
                          <NotificationItem key={notif.id} notif={notif} />
                        )
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ) : (
          <div className="p-8 text-center space-y-2">
            <BellRing className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-xs text-muted-foreground">No notifications yet.</p>
          </div>
        )}

        {/* Action Bar with Test Alert & Desktop Alert Status */}
        <div className="p-2 bg-muted/40 border-t flex items-center justify-between gap-2 text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={triggerTestAlert}
            className="h-7 text-[11px] gap-1 px-2 hover:bg-primary/10 hover:text-primary"
          >
            <Volume2 className="h-3 w-3 text-primary" />
            Test Alert Sound
          </Button>

          {!isGranted ? (
            <Button
              variant="default"
              size="sm"
              onClick={requestPermission}
              className="h-7 text-[11px] gap-1 px-2 font-bold"
            >
              <Sparkles className="h-3 w-3" />
              Enable PC Alerts
            </Button>
          ) : (
            <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1 pr-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Desktop Alerts Active
            </span>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

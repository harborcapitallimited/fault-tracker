'use client';

import * as React from 'react';
import { useState } from 'react';
import { useDesktopNotifications } from '@/hooks/use-desktop-notifications';
import { useAdmin } from '@/context/admin-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellRing, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DesktopNotificationBanner() {
  const { isAdmin } = useAdmin();
  const { permission, requestPermission, triggerNotification, isSupported, isGranted } =
    useDesktopNotifications();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  // If not supported or user dismissed prompt, don't show prompt banner
  if (!isSupported) return null;

  const handleEnable = async () => {
    setIsRequesting(true);
    try {
      await requestPermission();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleTestAlert = () => {
    triggerNotification({
      title: '🚨 Test Notification - Machine #MNX 003',
      body: 'Ticket: FLT-TEST-889\nRadiographer: Test Operator\nIssue: Collimator Lamp Replacement Needed\nStatus: Pending Assessment',
      ticketId: 'FLT-TEST-889',
    });
  };

  // State 1: Granted - Show small active control with test button
  if (isGranted) {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span className="font-medium">
            <strong>Desktop Alerts Active</strong> — You'll receive instant PC pop-ups when reports come in.
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestAlert}
          className="h-6 px-2 text-[10px] uppercase font-bold border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        >
          <BellRing className="h-3 w-3 mr-1" />
          Test Alert
        </Button>
      </div>
    );
  }

  // State 2: Denied - User blocked notifications in browser
  if (permission === 'denied') {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
          <span>
            Desktop notifications are currently <strong>blocked in your browser settings</strong>. Click the site settings icon in your URL bar to allow alerts.
          </span>
        </div>
      </div>
    );
  }

  // State 3: Default - Prompt admin to enable desktop notifications
  if (isDismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/20 text-primary shrink-0 mt-0.5 sm:mt-0">
            <BellRing className="h-5 w-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold tracking-tight text-foreground">
                Enable Desktop Notifications
              </h4>
              <Badge variant="secondary" className="text-[10px] font-bold">
                WhatsApp Web Style
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Get instant OS pop-ups with sound on your PC whenever a new fault report is submitted, even when this tab is minimized or running in the background.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="text-xs text-muted-foreground h-8"
          >
            Dismiss
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleEnable}
            disabled={isRequesting}
            className="h-8 gap-1.5 font-bold shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isRequesting ? 'Enabling...' : 'Enable PC Alerts'}
          </Button>
        </div>
      </div>
    </div>
  );
}

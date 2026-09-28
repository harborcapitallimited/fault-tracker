'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRTDBList } from '@/firebase';
import type { FaultReport, Notification as RTDBNotification } from '@/lib/types';
import { playNotificationChime } from '@/lib/notification-sound';
import { useToast } from '@/hooks/use-toast';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function useDesktopNotifications() {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  
  const isInitialLoadReportsRef = useRef(true);
  const knownReportIdsRef = useRef<Set<string>>(new Set());

  // 1. Check support and register Service Worker on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission as NotificationPermissionState);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setSwRegistration(reg);
        })
        .catch((err) => {
          console.warn('Service worker registration failed:', err);
        });
    }
  }, []);

  // 2. Trigger a notification (Sound + Desktop OS Alert + In-App Toast)
  const triggerNotification = useCallback(
    ({
      title,
      body,
      ticketId,
      url = '/',
      skipToast = false,
    }: {
      title: string;
      body: string;
      ticketId?: string;
      url?: string;
      skipToast?: boolean;
    }) => {
      // Always play the notification chime
      playNotificationChime();

      // Show in-app Toast alert for active tab
      if (!skipToast) {
        toast({
          title,
          description: body,
        });
      }

      // Check browser desktop notification support & permission
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      const options: NotificationOptions = {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: ticketId || `fault-notification-${Date.now()}`,
        data: { url, ticketId },
      };

      try {
        if (swRegistration && 'showNotification' in swRegistration) {
          swRegistration.showNotification(title, options);
        } else {
          const notif = new Notification(title, options);
          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        }
      } catch (err) {
        console.warn('Could not dispatch OS desktop notification:', err);
      }
    },
    [swRegistration, toast]
  );

  // 3. Request user permission
  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);

      if (result === 'granted') {
        // Trigger a welcome confirmation notification & chime
        triggerNotification({
          title: '🔔 Desktop Alerts Enabled',
          body: 'You will now receive instant PC alerts & sounds when new fault reports arrive!',
          ticketId: 'WELCOME',
        });
      }

      return result;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return 'denied';
    }
  }, [triggerNotification]);

  // 4. Test Alert Helper
  const triggerTestAlert = useCallback(() => {
    triggerNotification({
      title: '🚨 Test Notification - Machine #MNX 003',
      body: 'Ticket: FLT-TEST-889\nRadiographer: Test Operator\nIssue: Collimator Lamp Replacement Needed\nStatus: Pending Assessment',
      ticketId: 'FLT-TEST-889',
    });
  }, [triggerNotification]);

  // 5. Real-time listener for incoming fault reports in RTDB
  const { data: allReports } = useRTDBList<FaultReport>('faultReports');

  useEffect(() => {
    if (!allReports || allReports.length === 0) return;

    // Filter active (non-deleted) reports
    const validReports = allReports.filter((r) => r && !r.deleted);

    if (isInitialLoadReportsRef.current) {
      // First load: seed existing IDs to prevent historical spam
      validReports.forEach((r) => {
        if (r.id) knownReportIdsRef.current.add(r.id);
      });
      isInitialLoadReportsRef.current = false;
      return;
    }

    // Check for newly added reports
    for (const report of validReports) {
      if (report.id && !knownReportIdsRef.current.has(report.id)) {
        knownReportIdsRef.current.add(report.id);

        const ticket = report.ticketId || report.id;
        const system = report.systemNumber || 'Unknown Machine';
        const radiographer = report.radiographerName || 'Radiographer';
        const fault =
          report.customFaultDescription ||
          report.faultSubCategory ||
          report.faultCategory ||
          'Equipment Fault';

        triggerNotification({
          title: `🚨 New Fault Logged - Machine #${system}`,
          body: `Ticket: ${ticket} | ${radiographer}\nIssue: ${fault}\nLocation: ${report.facility || 'Facility'}`,
          ticketId: ticket,
          url: '/',
        });
      }
    }
  }, [allReports, triggerNotification]);

  return {
    permission,
    requestPermission,
    triggerNotification,
    triggerTestAlert,
    isSupported: permission !== 'unsupported',
    isGranted: permission === 'granted',
  };
}

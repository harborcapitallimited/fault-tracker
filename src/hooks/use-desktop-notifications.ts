'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRTDBList } from '@/firebase';
import type { FaultReport } from '@/lib/types';
import { playNotificationChime } from '@/lib/notification-sound';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function useDesktopNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const isInitialLoadRef = useRef(true);
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

  // 2. Request user permission
  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);

      if (result === 'granted') {
        // Trigger a welcome/confirmation notification & chime
        playNotificationChime();
        triggerNotification({
          title: '🔔 Desktop Alerts Enabled',
          body: 'You will now receive instant PC alerts when new fault reports arrive, just like WhatsApp Web!',
          ticketId: 'WELCOME',
        });
      }

      return result;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return 'denied';
    }
  }, [swRegistration]);

  // 3. Trigger a desktop notification
  const triggerNotification = useCallback(
    ({
      title,
      body,
      ticketId,
      url = '/',
    }: {
      title: string;
      body: string;
      ticketId?: string;
      url?: string;
    }) => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      playNotificationChime();

      const options: NotificationOptions = {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: ticketId || 'fault-notification',
        data: { url, ticketId },
      };

      if (swRegistration && 'showNotification' in swRegistration) {
        swRegistration.showNotification(title, options);
      } else {
        const notif = new Notification(title, options);
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    },
    [swRegistration]
  );

  // 4. Real-time listener for incoming fault reports
  const { data: allReports } = useRTDBList<FaultReport>('faultReports');

  useEffect(() => {
    if (!allReports || allReports.length === 0) return;

    // Filter non-deleted reports
    const validReports = allReports.filter((r) => r && !r.deleted);

    if (isInitialLoadRef.current) {
      // First time loading: populate known IDs without firing alerts for historical data
      validReports.forEach((r) => {
        if (r.id) knownReportIdsRef.current.add(r.id);
      });
      isInitialLoadRef.current = false;
      return;
    }

    // Check for any newly added reports
    for (const report of validReports) {
      if (report.id && !knownReportIdsRef.current.has(report.id)) {
        knownReportIdsRef.current.add(report.id);

        const ticket = report.ticketId || report.id;
        const system = report.systemNumber || 'Unknown Machine';
        const radiographer = report.radiographerName || 'Radiographer';
        const fault = report.customFaultDescription || report.faultSubCategory || report.faultCategory || 'Equipment Fault';

        triggerNotification({
          title: `🚨 New Fault Logged - Machine #${system}`,
          body: `Ticket: ${ticket}\nReported by: ${radiographer}\nIssue: ${fault}\nLocation: ${report.facility || 'Facility'}`,
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
    isSupported: permission !== 'unsupported',
    isGranted: permission === 'granted',
  };
}

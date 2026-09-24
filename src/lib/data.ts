'use client';

import {
  Database,
  ref,
  push,
  set,
  update,
  remove,
  get,
} from 'firebase/database';
import { useDatabase } from '@/firebase';
import type { FaultReport, GeneralReport, SystemReport, ClinicalReport, ImpactMonthlyReport } from './types';
import { normalizeSystemNumber, generateTicketId } from './utils';
import { useAdmin, type AdminRole } from '@/context/admin-context';

export const createNotification = (
    database: Database | null,
    message: string,
    adminRole?: AdminRole | null,
    adminName?: string | null,
    link?: string
  ) => {
    if (!database) return;
    
    const notificationsRef = ref(database, 'notifications');
    const newNotifRef = push(notificationsRef);
    
    set(newNotifRef, {
      createdAt: new Date().toISOString(),
      message: message,
      link: link || '',
      read: false,
      adminRole: adminRole || 'System',
      adminName: adminName || 'Update'
    });
};


export function useFaultReportMutations() {
    const database = useDatabase();
    const { adminRole, adminName } = useAdmin();
    
    const getMessage = (message: string) => {
      if (adminRole && adminName) {
        return message;
      }
      return `A user ${message}`;
    }

    const createLoginNotification = (service: string, userName: string) => {
        if (!database) return;
        const message = `${service.toUpperCase()} Admin (${userName}) has logged in.`;
        createNotification(database, message, service.toUpperCase() as AdminRole, `${service.toUpperCase()} Admin (${userName})`);
    }

    /**
     * Helper to sync system status based on active faults.
     */
    const syncSystemStatus = async (systemNumber: string) => {
        if (!database || !systemNumber) return;
        const normalizedSN = normalizeSystemNumber(systemNumber);

        const systemsSnap = await get(ref(database, 'systemReports'));
        const systems = systemsSnap.val() || {};
        
        const systemEntries = Object.entries(systems).filter(([_, data]: [string, any]) => 
            data && data.productSystemId && normalizeSystemNumber(data.productSystemId) === normalizedSN
        );

        if (systemEntries.length === 0) return;

        const faultsSnap = await get(ref(database, 'faultReports'));
        const allFaults = faultsSnap.val() || {};
        const activeFaults = Object.values(allFaults).filter((f: any) => 
            f && f.systemNumber && normalizeSystemNumber(f.systemNumber) === normalizedSN && 
            !f.deleted && 
            (f.status === 'Pending' || f.status === 'In Progress')
        );

        const newStatus = activeFaults.length > 0 ? 'Down' : 'Up';
        
        const updates: any = {};
        systemEntries.forEach(([id, data]: [string, any]) => {
            if (data.systemStatus !== newStatus) {
                if (newStatus === 'Down') {
                    updates[`systemReports/${id}/systemStatus`] = 'Down';
                } else if (data.systemStatus === 'Down') {
                    updates[`systemReports/${id}/systemStatus`] = 'Up';
                }
            }
        });

        if (Object.keys(updates).length > 0) {
            await update(ref(database), updates);
        }
    };

    const addFaultReport = async (
      report: Omit<FaultReport, 'id' | 'deleted' | 'detectionDate' | 'dateIssueReported' | 'ticketId'> & { detectionDate: Date }
    ) => {
      if (!database) throw new Error("Database not available");
      const faultReportsRef = ref(database, 'faultReports');
      const newReportRef = push(faultReportsRef);
      
      const newReportData = { 
        ...report, 
        id: newReportRef.key, 
        ticketId: generateTicketId(),
        deleted: false,
        detectionDate: report.detectionDate.toISOString(),
        dateIssueReported: new Date().toISOString()
      };

      await set(newReportRef, newReportData);
      createNotification(database, getMessage(`created a new fault report for Machine #${report.systemNumber}.`), adminRole, adminName);
      
      await syncSystemStatus(report.systemNumber);
    }

    const updateFaultReport = async (
        id: string,
        updatedReportData: Partial<Omit<FaultReport, 'id'>>,
        systemNumber?: string
      ) => {
        if (!database) throw new Error("Database not available");
        const reportRef = ref(database, `faultReports/${id}`);
        
        const snapshot = await get(reportRef);
        const originalReport = snapshot.val() as FaultReport;
        if (!originalReport) return;

        const dataToUpdate: any = { ...updatedReportData };
        if (updatedReportData.detectionDate && updatedReportData.detectionDate instanceof Date) {
            dataToUpdate.detectionDate = updatedReportData.detectionDate.toISOString();
        }
        
        if (updatedReportData.status === 'Resolved' && originalReport.status !== 'Resolved') {
            dataToUpdate.dateResolved = new Date().toISOString();
        }

        await update(reportRef, dataToUpdate);

        const snToSync = systemNumber || originalReport.systemNumber;
        if (snToSync) await syncSystemStatus(snToSync);
      }

      const updateMultipleFaultsStatus = async (ids: string[], status: FaultReport['status']) => {
        if (!database) throw new Error("Database not available");
        const updates: any = {};
        const timestamp = new Date().toISOString();
        const systemNumbersToSync = new Set<string>();

        for (const id of ids) {
            const snap = await get(ref(database, `faultReports/${id}`));
            const report = snap.val();
            if (report) {
                systemNumbersToSync.add(report.systemNumber);
                updates[`faultReports/${id}/status`] = status;
                if (status === 'Resolved') {
                    updates[`faultReports/${id}/dateResolved`] = timestamp;
                }
            }
        }

        await update(ref(database), updates);
        for (const sn of Array.from(systemNumbersToSync)) {
            await syncSystemStatus(sn);
        }
      }

    const deleteFaultReport = async (id: string) => {
        if (!database) throw new Error("Database not available");
        const snap = await get(ref(database, `faultReports/${id}`));
        const report = snap.val();
        await update(ref(database, `faultReports/${id}`), { deleted: true });
        if (report && report.systemNumber) await syncSystemStatus(report.systemNumber);
    };

    const restoreFaultReport = async (id: string) => {
        if (!database) throw new Error("Database not available");
        await update(ref(database, `faultReports/${id}`), { deleted: false });
        const snapshot = await get(ref(database, `faultReports/${id}`));
        const report = snapshot.val();
        if (report && report.systemNumber) await syncSystemStatus(report.systemNumber);
    };
    
    const addGeneralReport = async (report: Omit<GeneralReport, 'id' | 'date'>) => {
      if (!database) throw new Error("Database not available");
      const newRef = push(ref(database, 'generalReports'));
      const newReportData = { ...report, id: newRef.key, date: new Date().toISOString() };
      await set(newRef, newReportData);
    }

    const updateGeneralReport = (id: string, updatedReportData: Partial<Omit<GeneralReport, 'id'>>) => {
        if (!database) throw new Error("Database not available");
        update(ref(database, `generalReports/${id}`), updatedReportData);
    }

    const deleteGeneralReport = async (id: string) => {
      if (!database) throw new Error("Database not available");
      await remove(ref(database, `generalReports/${id}`));
    };

    const addSystemReport = async (device: Omit<SystemReport, 'id'>) => {
      if (!database) throw new Error("Database not available");
      const newRef = push(ref(database, 'systemReports'));
      const newDeviceData = {
        ...device,
        id: newRef.key,
        deleted: false,
        createdAt: (device as any).createdAt || new Date().toISOString(),
      };
      await set(newRef, newDeviceData);
      await syncSystemStatus(device.productSystemId);
      return newDeviceData;
    }

    const updateSystemReport = (id: string, data: Partial<Omit<SystemReport, 'id'>>) => {
        if (!database) throw new Error("Database not available");
        const sRef = ref(database, `systemReports/${id}`);
        get(sRef).then(snapshot => {
            if (!snapshot.exists()) return;
            update(sRef, {
                ...data,
                updatedAt: new Date().toISOString()
            });
            if (data.productSystemId) syncSystemStatus(data.productSystemId);
        });
    }
    
    const deleteSystemReport = (id: string) => {
        if (!database) throw new Error("Database not available");
        update(ref(database, `systemReports/${id}`), { deleted: true });
    }

    const restoreSystemReport = (id: string) => {
        if (!database) throw new Error("Database not available");
        update(ref(database, `systemReports/${id}`), { deleted: false });
    };

    const updateSystemDeviceStatus = (id: string, status: string, device: SystemReport) => {
        if (!database) throw new Error("Database not available");
        update(ref(database, `systemReports/${id}`), { systemStatus: status });
    };

    const updateSystemDeviceDowntime = async (id: string, data: Partial<SystemReport>) => {
        if (!database) throw new Error("Database not available");
        const sRef = ref(database, `systemReports/${id}`);
        const dataToUpdate: any = { ...data };
        if (data.dateSystemDown && data.dateSystemDown instanceof Date) dataToUpdate.dateSystemDown = data.dateSystemDown.toISOString();
        if (data.dateFixed && data.dateFixed instanceof Date) dataToUpdate.dateFixed = data.dateFixed.toISOString();
        await update(sRef, dataToUpdate);
    };

    const cleanupDuplicateSystems = async (currentDevices: SystemReport[]) => {
        if (!database) throw new Error("Database not available");
        const normalizedIds = new Set();
        const updates: any = {};
        let count = 0;
        currentDevices.forEach(device => {
            const norm = normalizeSystemNumber(device.productSystemId);
            if (normalizedIds.has(norm)) {
                updates[`systemReports/${device.id}`] = null;
                count++;
            } else {
                normalizedIds.add(norm);
            }
        });
        if (count > 0) await update(ref(database), updates);
        return count;
    };

    // Maintenance Tool: Backfill Ticket IDs for existing reports
    const backfillTicketIds = async () => {
        if (!database) throw new Error("Database not available");
        const reportsSnap = await get(ref(database, 'faultReports'));
        const reports = reportsSnap.val();
        if (!reports) return 0;

        const updates: any = {};
        let count = 0;

        Object.entries(reports).forEach(([id, data]: [string, any]) => {
            if (data && !data.ticketId) {
                updates[`faultReports/${id}/ticketId`] = generateTicketId();
                count++;
            }
        });

        if (count > 0) {
            await update(ref(database), updates);
        }
        return count;
    };

    // Clinical Reporting
    const addClinicalReport = async (report: Omit<ClinicalReport, 'id' | 'createdAt' | 'submittedBy'>) => {
      if (!database) throw new Error("Database not available");
      const newRef = push(ref(database, 'clinicalReports'));
      const data = {
        ...report,
        id: newRef.key,
        createdAt: new Date().toISOString(),
        submittedBy: adminName || 'Field Team'
      };
      await set(newRef, data);
      createNotification(database, getMessage(`submitted a new clinical report for Machine #${report.machineId}.`), adminRole, adminName);
    };

    const deleteClinicalReport = async (id: string) => {
      if (!database) throw new Error("Database not available");
      await remove(ref(database, `clinicalReports/${id}`));
    };

    // IMPACT Monthly Reporting
    const addImpactMonthlyReport = async (report: Omit<ImpactMonthlyReport, 'id' | 'createdAt' | 'submittedBy'>) => {
      if (!database) throw new Error("Database not available");
      const newRef = push(ref(database, 'impactMonthlyReports'));
      const data = {
        ...report,
        id: newRef.key,
        createdAt: new Date().toISOString(),
        submittedBy: adminName || 'Field Team',
        remarks: report.remarks || ''
      };
      await set(newRef, data);
      createNotification(database, getMessage(`submitted an IMPACT Monthly report for Machine #${report.machineId}.`), adminRole, adminName);
    };

    const deleteImpactMonthlyReport = async (id: string) => {
      if (!database) throw new Error("Database not available");
      await remove(ref(database, `impactMonthlyReports/${id}`));
    };

    return { 
        addFaultReport, 
        updateFaultReport, 
        deleteFaultReport, 
        restoreFaultReport, 
        addGeneralReport, 
        updateGeneralReport, 
        deleteGeneralReport, 
        addSystemReport, 
        updateSystemReport, 
        deleteSystemReport, 
        restoreSystemReport, 
        updateSystemDeviceStatus, 
        updateSystemDeviceDowntime, 
        updateMultipleFaultsStatus, 
        createLoginNotification,
        cleanupDuplicateSystems,
        addClinicalReport,
        deleteClinicalReport,
        addImpactMonthlyReport,
        deleteImpactMonthlyReport,
        backfillTicketIds
    };
}

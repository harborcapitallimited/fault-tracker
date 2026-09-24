'use client';
import { Timestamp } from "firebase/firestore";
import { type AdminRole } from "@/context/admin-context";

export type FaultReport = {
  id: string;
  ticketId?: string; // Unique reference ID for tracking
  radiographerName: string;
  radiographerEmail?: string;
  systemNumber: string;
  facility: string;
  locationType: 'Facility' | 'Community';
  faultCategory: 'Minxray' | 'Qure.ai' | 'Others';
  faultDescription?: string;
  faultSubCategory?: string;
  customFaultDescription?: string;
  detectionDate: Date | Timestamp | string;
  dateIssueReported?: Date | Timestamp | string | null;
  dateResolved?: Date | Timestamp | string | null;
  status: 'Pending' | 'In Progress' | 'Resolved';
  deleted?: boolean;
  currentAction?: string;
  phoneNumber?: string;
  emailSent?: boolean;
  lastEmailSentAt?: string;
};

export type GeneralReport = {
  id: string;
  name: string;
  designation?: string;
  detail: string;
  date: Date | Timestamp | string;
};

export type SystemReport = {
    id: string;
    productSystemId: string; // Machine # / S/N
    operatorUserName: string; // Radiographer / Name
    operatorEmail?: string;
    phoneNumber?: string;
    customerName: string; // Facility / Location
    lga?: string;
    state?: string;
    zone?: string;
    locationType: 'Facility' | 'Community';
    systemStatus: 'Up' | 'Down' | 'Up with Fault';
    downEquipmentSerial?: string;
    odiEngineerOnCase?: boolean;
    dateSystemDown?: Date | Timestamp | string | null;
    issueResolved?: boolean;
    dateFixed?: Date | Timestamp | string | null;
    notes?: string;
    deleted?: boolean;
    // Extended fields from registry imports
    reportPageNo?: string;
    detectorSerialNumber?: string;
    installationDate?: Date | Timestamp | string | null;
    customerAddress?: string;
    xrayModel?: string;
    xraySerialNumber?: string;
    detectorModel?: string;
    computerModel?: string;
    computerSerialNumber?: string;
    minxrayRepresentative?: string;
    createdAt?: Date | Timestamp | string | null;
    updatedAt?: Date | Timestamp | string | null;
};

export type ClinicalReport = {
  id: string;
  date: string;
  reportPeriod: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';
  state: string;
  machineId: string;
  radiographerName: string;
  attendeesCount: number;
  cxrScreenedCount: number;
  presumptiveCount: number;
  presumptiveNoSputumCount: number;
  samplesNotTestedCount: number;
  prevDaySamplesTestedCount: number;
  tbPatientsCount: number;
  dsTbCount: number;
  clinicalTbCount: number;
  drTbCount: number;
  rifIndeterminateCount: number;
  submittedBy: string;
  createdAt: string;
};

export type ImpactMonthlyReport = {
  id: string;
  date: string;
  state: string;
  machineId: string;
  radiographerName: string;
  facilityName: string;
  attendeesCount: number;
  screenedForTbCount: number;
  presumptiveRegisteredCount: number;
  presumptiveEvaluatedCount: number;
  totalTbDiagnosedCount: number;
  bacteriologicalTbCount: number;
  clinicalTbCount: number;
  childhoodTbCount: number;
  drTbCount: number;
  startedTreatmentCount: number;
  remarks: string;
  nonChestXrayCount: number;
  submittedBy: string;
  createdAt: string;
};

export type FaultOption = {
    id: string;
    category: string;
    label: string;
    value: string;
};

export type ActionOption = {
    id: string;
    label: string;
    value: string;
};

export type Notification = {
    id: string;
    createdAt: Timestamp | string;
    message: string;
    link?: string;
    read: boolean;
    adminRole?: AdminRole | 'System' | null;
    adminName?: string | 'Update' | null;
};

export type AppSettings = {
  clinicalReportingEnabled: boolean;
};

export type AppView = 'dashboard' | 'report' | 'general-report' | 'general-reports' | 'clinical-report' | 'clinical-reports' | 'impact-monthly-report' | 'impact-monthly-reports' | 'total-systems' | 'actions' | 'faults' | 'deleted';

export type AdvancedFilter = {
    statuses: FaultReport['status'][];
    states: string[];
    year: string | 'all';
    months: string[];
    weeks: string[];
    minDuration: number | '';
    maxDuration: number | '';
    durationType: 'pending' | 'resolved';
    searchTerm: string;
    locationType: 'all' | 'Facility' | 'Community';
    healthStatus: 'all' | 'Up' | 'Down' | 'Up with Fault';
}

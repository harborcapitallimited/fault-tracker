
# Minxray Data Tracker

A high-performance, real-time Single Page Application (SPA) designed for radiographers and administrators to track, manage, and analyze medical equipment faults and clinical TB screening metrics. Built with **Next.js**, **Firebase Realtime Database**, and **ShadCN UI**.

---

## 🚀 App Summary
The Minxray Data Tracker centralizes equipment maintenance and clinical output. It allows radiographers to report faults and daily screening metrics in seconds, providing administrators with a birds-eye view of both fleet health and clinical impact.

---

## 🛠 Functional Breakdown

### 1. Core Architecture (SPA & State)
- **Unified Navigation (`setView`)**: Manages the application as a Single Page App. Switching between views happens instantly.
- **Admin Authentication (`AdminProvider`)**: Implements role-based access control (KNCV, NTBLCP, MINXRAY, QUREAI).
- **Theme Engine**: A dark-mode optimized interface using Tailwind CSS variables.

### 2. Dashboard & Analytics
- **Hardware Health**: Real-time counters for "Pending", "In Progress", and "Resolved" issues.
- **Clinical Impact**: Fleet-wide totals for Attendees, Screenings, and TB+ identifications.
- **Universal Search (`UniversalSearch`)**: A "Command+K" global search tool.

### 3. Fault Management
- **Reporting (`ReportForm`)**: Multi-step form for capturing fault categories and descriptions.
- **Automated Sync**: Marking a fault as active automatically marks the system as "Down" in the registry.
- **Resolution Tracking**: Precise timestamps for detection and resolution.

### 4. Clinical Reporting
- **Submission Hub**: Daily, Weekly, Monthly, and Quarterly reporting for TB screening metrics.
- **Data Auditing**: Advanced filtering for admins to analyze screening trends by state, machine, or timeframe.
- **Precision Export**: Filtered Excel extraction for clinical audits.

### 5. System Registry (Total Systems)
- **Unified View**: Integrates both fault history and clinical performance history for every machine in the fleet.
- **Downtime Details**: Tracks component-level failures and engineering assignments.
- **Pulse Indicators**: Visual status icons (Green/Yellow/Red).

---

## 🔑 Admin Access
| Service | Password |
| :--- | :--- |
| **KNCV** | `kncv4` |
| **NTBLCP** | `NTBlcp` |
| **MINXRAY** | `miNxraY` |
| **QUREAI** | `QureAi` |

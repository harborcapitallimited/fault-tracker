'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import { type AppView } from '@/lib/types';

export type AdminRole = 'KNCV' | 'NTBLCP' | 'QUREAI' | 'MINXRAY' | 'master';

const adminCredentials: Record<string, { role: AdminRole; password: any, name: string }> = {
    kncv: { role: 'KNCV', password: 'kncv4', name: 'KNCV Admin' },
    ntblcp: { role: 'NTBLCP', password: 'NTBlcp', name: 'NTBLCP Admin' },
    minxray: { role: 'MINXRAY', password: 'miNxraY', name: 'Minxray Admin' },
    qureai: { role: 'QUREAI', password: 'QureAi', name: 'Qure.ai Admin' },
    master: { role: 'master', password: 'master', name: 'Master Admin' },
};

type KnownAdminNames = {
  [key: string]: string[];
};

interface AdminContextType {
  isAdmin: boolean;
  adminRole: AdminRole | null;
  adminName: string | null;
  currentView: AppView;
  setView: (view: AppView) => void;
  login: (service: string, password: string, userName: string) => void;
  logout: () => void;
  validateCredentials: (service: string, password: string) => boolean;
  getKnownNames: (service: string) => string[];
  addKnownName: (service: string, name: string) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [knownNames, setKnownNames] = useState<KnownAdminNames>({});

  useEffect(() => {
    // Load session
    const storedRole = localStorage.getItem('adminRole') as AdminRole | null;
    const storedName = localStorage.getItem('adminName');
    if (storedRole && storedName && Object.values(adminCredentials).some(c => c.role === storedRole)) {
        setIsAdmin(true);
        setAdminRole(storedRole);
        setAdminName(storedName);
    }
    
    // Load last view
    const lastView = localStorage.getItem('currentView') as AppView | null;
    if (lastView) {
        setCurrentView(lastView);
    }

    // Load known names
    try {
        const storedKnownNames = localStorage.getItem('knownAdminNames');
        if (storedKnownNames) {
            setKnownNames(JSON.parse(storedKnownNames));
        }
    } catch (error) {
        console.error("Failed to parse known admin names from localStorage", error);
    }

  }, []);

  const setView = useCallback((view: AppView) => {
    setCurrentView(view);
    localStorage.setItem('currentView', view);
  }, []);

  const validateCredentials = (service: string, password: string): boolean => {
    const lowercasedService = service.toLowerCase();
    const creds = adminCredentials[lowercasedService];
    return !!creds && creds.password === password;
  };

  const login = (service: string, password: string, userName: string) => {
    if (validateCredentials(service, password)) {
      const creds = adminCredentials[service.toLowerCase()];
      const finalAdminName = `${creds.name} (${userName})`;

      setIsAdmin(true);
      setAdminRole(creds.role);
      setAdminName(finalAdminName);
      localStorage.setItem('adminRole', creds.role);
      localStorage.setItem('adminName', finalAdminName);
    } else {
      throw new Error('Invalid service or password.');
    }
  };

  const logout = () => {
    setIsAdmin(false);
    setAdminRole(null);
    setAdminName(null);
    setCurrentView('dashboard');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminName');
    localStorage.removeItem('currentView');
  };

  const addKnownName = useCallback((service: string, name: string) => {
    const lowercasedService = service.toLowerCase();
    const normalizedName = name.trim();
    if (!normalizedName) return;

    setKnownNames(prev => {
        const updatedNames = { ...prev };
        const serviceNames = updatedNames[lowercasedService] || [];
        if (!serviceNames.map(n => n.toLowerCase()).includes(normalizedName.toLowerCase())) {
            updatedNames[lowercasedService] = [...serviceNames, normalizedName];
            localStorage.setItem('knownAdminNames', JSON.stringify(updatedNames));
        }
        return updatedNames;
    });
  }, []);

  const getKnownNames = useCallback((service: string) => {
    return knownNames[service.toLowerCase()] || [];
  }, [knownNames]);


  return (
    <AdminContext.Provider value={{ 
      isAdmin, 
      adminRole, 
      adminName, 
      currentView,
      setView,
      login,
      logout,
      validateCredentials,
      getKnownNames,
      addKnownName
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}

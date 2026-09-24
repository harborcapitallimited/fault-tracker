'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { LayoutDashboard, FilePlus2, Trash2, ClipboardPen, FileText, Wrench, Settings, Stethoscope, FileStack, ClipboardList, Database } from 'lucide-react';
import { Logo } from './logo';
import { useAdmin } from '@/context/admin-context';
import { NotificationCenter } from './notification-center';
import { AdminToggle } from './admin-toggle';
import { type AppView, type AppSettings } from '@/lib/types';
import { useRTDBItem } from '@/firebase';

export function AppSidebar() {
  const { isAdmin, currentView, setView } = useAdmin();
  const { isMobile, setOpenMobile } = useSidebar();
  const { data: settings } = useRTDBItem<AppSettings>('settings');

  const isClinicalEnabled = settings?.clinicalReportingEnabled ?? false;

  const handleLinkClick = (view: AppView) => {
    setView(view);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const mainItems: { view: AppView; label: string; icon: any; hidden?: boolean }[] = [
    {
      view: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      view: 'report',
      label: 'Report Fault',
      icon: FilePlus2,
    },
    {
        view: 'clinical-report',
        label: 'Daily Clinical Report',
        icon: Stethoscope,
        hidden: !isClinicalEnabled,
    },
    {
        view: 'impact-monthly-report',
        label: 'Monthly Facility Report',
        icon: ClipboardList,
        hidden: !isClinicalEnabled,
    },
    {
      view: 'general-report',
      label: 'General Report',
      icon: ClipboardPen,
    },
    {
      view: 'general-reports',
      label: 'View General Reports',
      icon: FileText,
    },
  ];

  const adminItems: { view: AppView; label: string; icon: any; hidden?: boolean }[] = [
    {
        view: 'clinical-reports',
        label: 'Clinical TB Logs',
        icon: FileStack,
        hidden: !isClinicalEnabled,
    },
    {
        view: 'impact-monthly-reports',
        label: 'IMPACT Monthly Logs',
        icon: Database,
        hidden: !isClinicalEnabled,
    },
    {
      view: 'actions',
      label: 'Manage Actions',
      icon: Settings,
    },
    {
      view: 'faults',
      label: 'Manage Faults',
      icon: Wrench,
    },
    {
      view: 'deleted',
      label: 'Recently Deleted',
      icon: Trash2,
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Logo />
            <SidebarTrigger className="hidden group-data-[collapsible=icon]:flex" />
          </div>
          <NotificationCenter />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.filter(i => !i.hidden).map((item) => (
                <SidebarMenuItem key={item.view}>
                  <SidebarMenuButton
                    isActive={currentView === item.view}
                    tooltip={item.label}
                    onClick={() => handleLinkClick(item.view)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin Tools</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.filter(i => !i.hidden).map((item) => (
                  <SidebarMenuItem key={item.view}>
                    <SidebarMenuButton
                      isActive={currentView === item.view}
                      tooltip={item.label}
                      onClick={() => handleLinkClick(item.view)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <AdminToggle />
      </SidebarFooter>
    </Sidebar>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { OrganizeSidebarDialog } from "@/components/dashboard/organize-sidebar-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  getSidebarOrganization,
  toggleFolderOpen,
} from "@/app/(dashboard)/settings/sidebar-actions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  key: string;
  pinned?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: HomeIcon, key: "dashboard", pinned: true },
  { href: "/deals", label: "Deals", icon: BriefcaseIcon, key: "deals" },
  { href: "/network", label: "Projects", icon: NetworkIcon, key: "network" },
  { href: "/coach", label: "StrategyGPT", icon: SparklesIcon, key: "coach" },
  { href: "/prospects", label: "Prospects", icon: SearchIcon, key: "prospects" },
  { href: "/meetings", label: "Meetings", icon: CalendarIcon, key: "meetings" },
  { href: "/tradeshows", label: "Tradeshows", icon: MapPinIcon, key: "tradeshows" },
  { href: "/flashcards", label: "Flashcards", icon: FlashcardsIcon, key: "flashcards" },
  { href: "/plan", label: "90-Day Plan", icon: FlagIcon, key: "plan" },
  { href: "/playbook", label: "Playbook", icon: BookIcon, key: "playbook" },
  { href: "/compete", label: "Compete", icon: ShieldIcon, key: "compete" },
  { href: "/ma", label: "M&A", icon: HandshakeIcon, key: "ma" },
  { href: "/marketing", label: "Marketing", icon: MegaphoneIcon, key: "marketing" },
  { href: "/studio", label: "Studio", icon: StudioIcon, key: "studio" },
  { href: "/settings", label: "Settings", icon: GearIcon, key: "settings", pinned: true },
];

interface FolderData {
  folder_id: string;
  name: string;
  sort_order: number;
  is_open: boolean;
}

interface AssignmentData {
  nav_key: string;
  folder_id: string;
  sort_order: number;
}

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [showOrganize, setShowOrganize] = useState(false);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);

  const loadOrganization = useCallback(async () => {
    const result = await getSidebarOrganization();
    if ("error" in result) return;
    setFolders(result.folders);
    setAssignments(result.assignments);
  }, []);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  // Build render structure
  const assignmentMap = new Map(assignments.map((a) => [a.nav_key, a.folder_id]));
  const pinnedTop = NAV_ITEMS.filter((item) => item.key === "dashboard");
  const pinnedBottom = NAV_ITEMS.filter((item) => item.key === "settings");
  const organizable = NAV_ITEMS.filter((item) => !item.pinned);

  // Items not assigned to any folder
  const rootItems = organizable.filter((item) => !assignmentMap.has(item.key));

  // Items grouped by folder
  const folderGroups = folders.map((folder) => ({
    ...folder,
    items: organizable.filter((item) => assignmentMap.get(item.key) === folder.folder_id),
  }));

  function handleToggleFolder(folderId: string, currentOpen: boolean) {
    // Optimistic update
    setFolders((prev) =>
      prev.map((f) =>
        f.folder_id === folderId ? { ...f, is_open: !currentOpen } : f
      )
    );
    toggleFolderOpen(folderId, !currentOpen);
  }

  return (
    <>
      <aside
        className={`flex h-screen flex-col border-r border-border-primary bg-surface-secondary transition-[width] duration-200 ${
          isCollapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center px-5">
          <Link href="/" className="text-lg font-bold text-text-primary">
            {isCollapsed ? (
              <span>
                R<span className="text-accent-primary">S</span>
              </span>
            ) : (
              <span>
                Rev<span className="text-accent-primary">Signal</span>
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {/* Pinned: Dashboard */}
          {pinnedTop.map((item) => (
            <NavLink
              key={item.key}
              item={item}
              pathname={pathname}
              isCollapsed={isCollapsed}
            />
          ))}

          {/* Folders */}
          {folderGroups.map((folder) => {
            if (folder.items.length === 0) return null;

            // Check if any item in folder is active
            const hasActiveItem = folder.items.some((item) =>
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
            );

            return (
              <div key={folder.folder_id} className="mt-1">
                {/* Folder header */}
                {!isCollapsed ? (
                  <button
                    onClick={() =>
                      handleToggleFolder(folder.folder_id, folder.is_open)
                    }
                    className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted hover:text-text-secondary transition-colors"
                  >
                    <svg
                      className={`h-3 w-3 shrink-0 transition-transform duration-150 ${
                        folder.is_open ? "rotate-90" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span className="truncate">{folder.name}</span>
                    {!folder.is_open && hasActiveItem && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-primary shrink-0" />
                    )}
                  </button>
                ) : (
                  <div className="my-1 mx-3 border-t border-border-primary" />
                )}

                {/* Folder items */}
                {(folder.is_open || isCollapsed) &&
                  folder.items.map((item) => (
                    <NavLink
                      key={item.key}
                      item={item}
                      pathname={pathname}
                      isCollapsed={isCollapsed}
                    />
                  ))}
              </div>
            );
          })}

          {/* Root items (not in any folder) */}
          {rootItems.length > 0 && folderGroups.some((f) => f.items.length > 0) && !isCollapsed && (
            <div className="my-1 mx-3 border-t border-border-primary" />
          )}
          {rootItems.map((item) => (
            <NavLink
              key={item.key}
              item={item}
              pathname={pathname}
              isCollapsed={isCollapsed}
            />
          ))}

          {/* Pinned: Settings */}
          {pinnedBottom.map((item) => (
            <NavLink
              key={item.key}
              item={item}
              pathname={pathname}
              isCollapsed={isCollapsed}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border-primary px-3 py-3 space-y-1">
          {/* Organize button */}
          {!isCollapsed && (
            <button
              onClick={() => setShowOrganize(true)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
            >
              <FolderIcon className="h-4 w-4 shrink-0" />
              <span>Organize</span>
            </button>
          )}

          {/* Theme toggle */}
          <div className={isCollapsed ? "flex justify-center" : "px-3"}>
            <ThemeToggle collapsed={isCollapsed} />
          </div>

          {/* Collapse toggle */}
          <button
            onClick={toggleSidebar}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary ${
              isCollapsed ? "justify-center" : ""
            }`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <CollapseIcon className="h-4 w-4 shrink-0" collapsed={isCollapsed} />
            {!isCollapsed && <span>Collapse</span>}
          </button>

          {/* Version */}
          {!isCollapsed && (
            <p className="px-3 font-data text-xs text-text-muted">
              RevSignal v0.1
            </p>
          )}
        </div>
      </aside>

      <OrganizeSidebarDialog
        open={showOrganize}
        onOpenChange={setShowOrganize}
        onSaved={loadOrganization}
      />
    </>
  );
}

// --- Nav Link ---

function NavLink({
  item,
  pathname,
  isCollapsed,
}: {
  item: NavItem;
  pathname: string;
  isCollapsed: boolean;
}) {
  const isActive =
    item.href === "/"
      ? pathname === "/"
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      title={isCollapsed ? item.label : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        isCollapsed ? "justify-center" : ""
      } ${
        isActive
          ? "bg-accent-glow text-accent-primary"
          : "text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
      }`}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

// --- Icons ---

function CollapseIcon({
  className,
  collapsed,
}: {
  className?: string;
  collapsed: boolean;
}) {
  return (
    <svg
      className={`${className} transition-transform duration-200 ${
        collapsed ? "rotate-180" : ""
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5"
      />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function FlashcardsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="6" width="16" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 2h12a2 2 0 0 1 2 2v12" />
    </svg>
  );
}

function HandshakeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3.15M10.05 4.575a1.575 1.575 0 013.15 0v3.15M10.05 4.575v3.15M3.75 9.75h16.5M3.75 9.75a2.25 2.25 0 00-2.25 2.25v1.5a2.25 2.25 0 002.25 2.25h1.318m12.682-6h.932a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25h-.932M10.05 7.725h3.9m-3.9 0L6.75 15.75m7.2-8.025L17.25 15.75m-10.5 0h10.5m-10.5 0l-1.068 2.135A1.125 1.125 0 006.182 19.5h11.636a1.125 1.125 0 001-1.615L17.75 15.75" />
    </svg>
  );
}

function NetworkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="4.5" cy="7" r="1.5" />
      <circle cx="19.5" cy="7" r="1.5" />
      <circle cx="4.5" cy="17" r="1.5" />
      <circle cx="19.5" cy="17" r="1.5" />
      <path strokeLinecap="round" d="M9.75 10.75L6 8.25m8.25 2.5L18 8.25m-8.25 3.25L6 15.75m8.25-2.25L18 15.75" />
    </svg>
  );
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
    </svg>
  );
}

function StudioIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

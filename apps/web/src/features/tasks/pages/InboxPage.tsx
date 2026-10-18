import { useOutletContext } from 'react-router-dom';
import { DesktopTaskManagementView } from '../components/DesktopTaskManagementView';

export interface AppShellOutletContext {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  selectedTagFilter: string | null;
  setSelectedTagFilter: (tag: string | null) => void;
  selectedListName: string;
  setSelectedListName: (name: string) => void;
}

export function InboxPage() {
  const context = useOutletContext<AppShellOutletContext | undefined>();
  const isSidebarOpen = context?.isSidebarOpen ?? true;
  const toggleSidebar = context?.toggleSidebar ?? (() => {});
  const selectedTagFilter = context?.selectedTagFilter ?? null;
  const selectedListName = context?.selectedListName ?? 'Inbox';

  return (
    <DesktopTaskManagementView
      currentListName={selectedListName}
      isSidebarOpen={isSidebarOpen}
      onToggleSidebar={toggleSidebar}
      selectedTagFilter={selectedTagFilter}
    />
  );
}

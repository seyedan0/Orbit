import type { AtomicTaskStore } from '@orbit/sync-engine';
import { createContext, useContext, type ReactNode } from 'react';

const StoreContext = createContext<AtomicTaskStore | undefined>(undefined);

export function StoreProvider({
  children,
  store
}: {
  children: ReactNode;
  store: AtomicTaskStore;
}) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): AtomicTaskStore {
  const store = useContext(StoreContext);
  if (store === undefined) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

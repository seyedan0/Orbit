import type {
  AtomicFilterStore,
  AtomicTagStore,
  AtomicTaskStore
} from '@orbit/sync-engine';
import { createContext, useContext, type ReactNode } from 'react';

export type WebStore = AtomicTaskStore & AtomicTagStore & AtomicFilterStore;

const StoreContext = createContext<WebStore | undefined>(undefined);

export function StoreProvider({
  children,
  store
}: {
  children: ReactNode;
  store: WebStore;
}) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): WebStore {
  const store = useContext(StoreContext);
  if (store === undefined) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

import React, { createContext, useContext } from 'react';

export type AppRole = 'rider' | 'driver';

const AppRoleContext = createContext<AppRole | null>(null);

export function AppRoleProvider({
  role,
  children,
}: {
  role: AppRole;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <AppRoleContext.Provider value={role}>{children}</AppRoleContext.Provider>
  );
}

export function useAppRole(): AppRole {
  const v = useContext(AppRoleContext);
  if (!v) throw new Error('useAppRole called outside AppRoleProvider');
  return v;
}

import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InitialSetupView } from './components/auth/InitialSetupView';
import { LoginView } from './components/auth/LoginView';
import { AppLayout } from './components/layout/AppLayout';

const MainAppContent: React.FC = () => {
  const { isInitialized, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <p style={{ color: 'var(--text-muted)' }}>Loading Hospital Inventory Security System...</p>
        </div>
      </div>
    );
  }

  // First launch: Initial Setup Wizard (Creates Master Admin & Staff Accounts)
  if (!isInitialized) {
    return <InitialSetupView />;
  }

  // Unauthenticated: Login Screen (Requires Login ID & Password)
  if (!user) {
    return <LoginView />;
  }

  // Authenticated Workspace (STAFF MODE or MASTER ADMIN)
  return <AppLayout />;
};

export function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

export default App;

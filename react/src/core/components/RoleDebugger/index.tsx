import { useClerk, useUser } from '@clerk/clerk-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';

const RoleDebugger = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const clerk = useClerk();
  const dataLayout = useSelector((state: any) => state.themeSetting.dataLayout);
  const [refreshing, setRefreshing] = useState(false);

  const handleReloadMetadata = async () => {
    setRefreshing(true);
    try {
      // Force reload user from Clerk
      await user?.reload();
      // Reload page to refresh all components
      window.location.reload();
    } catch (error) {
      console.error('Error reloading metadata:', error);
      setRefreshing(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: '#ff9800',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        zIndex: 9999,
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        ⚠️ User not loaded
      </div>
    );
  }

  const originalRole = user?.publicMetadata?.role as string | undefined;
  const normalizedRole = originalRole?.toLowerCase();
  const email = user?.primaryEmailAddress?.emailAddress;
  const fullName = user?.fullName;
  const clerkUserId = user?.id;

  const isHorizontalLayout = dataLayout === "horizontal" || dataLayout === "horizontal-single" || dataLayout === "horizontal-overlay" || dataLayout === "horizontal-box";

  // Determine background color based on role
  const getBackgroundColor = () => {
    if (normalizedRole === 'superadmin') return '#2196F3'; // Blue for superadmin
    if (normalizedRole === 'hr') return '#4caf50'; // Green for hr
    if (normalizedRole === 'admin') return '#9c27b0'; // Purple for admin
    return '#f44336'; // Red for unknown/employee
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: getBackgroundColor(),
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      zIndex: 9999,
      fontSize: '11px',
      fontFamily: 'monospace',
      maxWidth: '380px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      border: '2px solid rgba(255,255,255,0.3)'
    }}>
      <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>🔍 ROLE DEBUGGER</span>
        <button
          onClick={handleReloadMetadata}
          disabled={refreshing}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.4)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '9px',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            opacity: refreshing ? 0.6 : 1,
          }}
          title="Force reload metadata from Clerk"
        >
          {refreshing ? '🔄 REFRESHING...' : '🔄 RELOAD'}
        </button>
      </div>
      <div><strong>Role:</strong> {originalRole || 'NOT SET'} → {normalizedRole || 'NOT SET'}</div>
      <div><strong>Email:</strong> {email || 'NOT SET'}</div>
      <div><strong>Name:</strong> {fullName || 'NOT SET'}</div>
      <div><strong>Clerk ID:</strong> {clerkUserId || 'NOT SET'}</div>
      <div><strong>Layout:</strong> {dataLayout} {isHorizontalLayout ? '(HORIZONTAL)' : '(VERTICAL)'}</div>
      <div style={{ marginTop: '10px', fontSize: '9px', opacity: 0.9 }}>
        <strong>Full Metadata:</strong>
        <pre style={{ margin: '5px 0 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: 'rgba(0,0,0,0.2)', padding: '5px', borderRadius: '3px' }}>
          {JSON.stringify(user?.publicMetadata, null, 2)}
        </pre>
      </div>
      <div style={{ marginTop: '10px', fontSize: '9px' }}>
        <strong>Expected Behavior:</strong><br/>
        {normalizedRole === 'superadmin' ? '✅ SHOULD SEE FULL SUPER ADMIN MENU' :
         normalizedRole === 'hr' ? '✅ SHOULD SEE FULL HRM MENU' :
         normalizedRole === 'admin' ? '✅ SHOULD SEE ADMIN MENU' :
         '❌ NOT RECOGNIZED ROLE'}
      </div>
      {(normalizedRole !== 'superadmin' && normalizedRole !== 'hr' && normalizedRole !== 'admin') && (
        <div style={{ marginTop: '8px', padding: '5px', background: 'rgba(255,0,0,0.3)', borderRadius: '3px', fontSize: '9px' }}>
          ⚠️ <strong>ISSUE DETECTED:</strong><br/>
          Role is not set correctly in Clerk.<br/>
          Click RELOAD button or sign out/in.
        </div>
      )}
    </div>
  );
};

export default RoleDebugger;

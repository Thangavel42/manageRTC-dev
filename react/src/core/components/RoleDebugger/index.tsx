import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { useSelector } from 'react-redux';

const RoleDebugger = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const dataLayout = useSelector((state: any) => state.themeSetting.dataLayout);

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

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: normalizedRole === 'hr' ? '#4caf50' : '#f44336',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      zIndex: 9999,
      fontSize: '11px',
      fontFamily: 'monospace',
      maxWidth: '350px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      border: '2px solid rgba(255,255,255,0.3)'
    }}>
      <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: '5px' }}>
        🔍 ROLE DEBUGGER
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
        {normalizedRole === 'hr' ? '✅ SHOULD SEE FULL HRM MENU' : '❌ NOT HR ROLE'}
      </div>
    </div>
  );
};

export default RoleDebugger;

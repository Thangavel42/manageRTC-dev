const fs = require('fs');
const path = require('path');

// Read the file list
const fileList = fs.readFileSync(path.join(__dirname, '../../../files.txt'), 'utf8')
  .split('\n')
  .filter(l => l.trim());

// Output CSV
let csv = 'File Path,Status,Notes,RBAC_Issues,Implementation_Plan\n';
let stats = { compliant: 0, notNeeded: 0, needsMigration: 0, partial: 0, notFound: 0 };

// Analysis functions
const analyzeBackendFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    stats.notFound++;
    return { status: '➖', notes: 'File not found', issues: '', plan: '' };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const pathLower = filePath.toLowerCase();

  // Tests - no RBAC needed
  if (pathLower.includes('test') || pathLower.includes('__tests__') || pathLower.includes('spec')) {
    stats.notNeeded++;
    return { status: '➖', notes: 'Test file - no RBAC needed', issues: '', plan: '' };
  }

  // Seeds/scripts - usually no RBAC
  if (pathLower.includes('seed') || pathLower.includes('script') || pathLower.includes('migration')) {
    stats.notNeeded++;
    return { status: '➖', notes: 'Seed/migration script - no RBAC needed', issues: '', plan: '' };
  }

  // Models - schema definitions
  if (pathLower.includes('models') && (pathLower.includes('.schema.js') || pathLower.includes('.model.js'))) {
    stats.notNeeded++;
    return { status: '➖', notes: 'Schema definition - no RBAC needed', issues: '', plan: '' };
  }

  // Config files
  if (pathLower.includes('config')) {
    stats.notNeeded++;
    return { status: '➖', notes: 'Configuration file - no RBAC needed', issues: '', plan: '' };
  }

  // Check for RBAC compliance
  const hasRequirePageAccess = content.includes('requirePageAccess');
  const hasRequireRole = content.includes('requireRole(') || content.includes('requireRole (');
  const hasRoleCheck = content.includes('user.role') || content.includes('req.user.role') || content.includes('user?.role');
  const hasPermissionCheck = content.includes('hasPermission') || content.includes('checkPermission');

  // Controllers/Routes
  if (pathLower.includes('controller') || pathLower.includes('routes')) {
    if (hasRequirePageAccess) {
      stats.compliant++;
      return { status: '✅', notes: 'Using requirePageAccess middleware', issues: '', plan: '' };
    }
    if (hasRequireRole) {
      stats.needsMigration++;
      return { status: '❌', notes: 'Using legacy requireRole middleware', issues: 'requireRole() should be replaced with requirePageAccess()', plan: 'Replace requireRole with requirePageAccess' };
    }
    stats.needsMigration++;
    return { status: '❌', notes: 'No RBAC middleware found', issues: 'Missing requirePageAccess middleware', plan: 'Add requirePageAccess middleware to routes' };
  }

  // Socket controllers - check for permission checks
  if (pathLower.includes('socket')) {
    if (hasPermissionCheck || hasRequirePageAccess) {
      stats.compliant++;
      return { status: '✅', notes: 'Socket controller with permission checks', issues: '', plan: '' };
    }
    stats.needsMigration++;
    return { status: '❌', notes: 'Socket controller without explicit permission checks', issues: 'Socket operations need permission validation', plan: 'Add permission checks to socket handlers' };
  }

  // Services
  if (pathLower.includes('service')) {
    if (hasRoleCheck) {
      stats.needsMigration++;
      return { status: '❌', notes: 'Service contains role-based logic', issues: 'Role checks in service layer', plan: 'Move permission checks to controller/middleware layer' };
    }
    stats.notNeeded++;
    return { status: '➖', notes: 'Service file - business logic only', issues: '', plan: '' };
  }

  // Middleware
  if (pathLower.includes('middleware')) {
    if (filePath.includes('auth.js')) {
      stats.partial++;
      return { status: '🔄', notes: 'Auth middleware has both requireRole and modern auth', issues: 'Still exports requireRole for backward compatibility', plan: 'Keep for backward compatibility, use requirePageAccess in new code' };
    }
    if (filePath.includes('pageAccess.js') || filePath.includes('pageaccess.js')) {
      stats.compliant++;
      return { status: '✅', notes: 'Page access middleware - core RBAC component', issues: '', plan: '' };
    }
    stats.notNeeded++;
    return { status: '➖', notes: 'Middleware file', issues: '', plan: '' };
  }

  stats.notNeeded++;
  return { status: '➖', notes: 'Backend utility/file', issues: '', plan: '' };
};

const analyzeReactFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    stats.notFound++;
    return { status: '➖', notes: 'File not found', issues: '', plan: '' };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const pathLower = filePath.toLowerCase();

  // Auth pages - public
  if (pathLower.includes('feature-module/auth') ||
      pathLower.includes('login') ||
      pathLower.includes('register') ||
      pathLower.includes('forgotpassword') ||
      pathLower.includes('resetpassword') ||
      pathLower.includes('emailverification') ||
      pathLower.includes('twostep')) {
    stats.notNeeded++;
    return { status: '➖', notes: 'Auth/public page - no RBAC needed', issues: '', plan: '' };
  }

  // UI Interface - demo pages
  if (pathLower.includes('uiinterface') || pathLower.includes('ui-interface')) {
    stats.notNeeded++;
    return { status: '➖', notes: 'UI Interface demo page - no RBAC needed', issues: '', plan: '' };
  }

  // Data files
  if (pathLower.includes('data/json')) {
    if (filePath.includes('sidebarMenu.jsx')) {
      stats.needsMigration++;
      return { status: '❌', notes: 'Hardcoded role-based sidebar menu filtering', issues: 'Uses switch statement with hardcoded roles (superadmin, hr, admin, etc.)', plan: 'Replace with permission-based filtering using PermissionContext' };
    }
    if (filePath.includes('horizontalSidebar.tsx')) {
      stats.needsMigration++;
      return { status: '❌', notes: 'Hardcoded role-based horizontal menu filtering', issues: 'Uses roles: [] arrays with hardcoded role values', plan: 'Replace with permission-based filtering' };
    }
    if (filePath.includes('all_routes.tsx')) {
      stats.notNeeded++;
      return { status: '➖', notes: 'Route definitions file - no RBAC needed', issues: '', plan: '' };
    }
    stats.notNeeded++;
    return { status: '➖', notes: 'Static data file', issues: '', plan: '' };
  }

  // Router files
  if (pathLower.includes('router')) {
    if (filePath.includes('withRoleCheck.jsx')) {
      stats.needsMigration++;
      return { status: '❌', notes: 'Legacy role-based route protection HOC', issues: 'withRoleCheck uses hardcoded roles instead of permissions', plan: 'Replace with PageAccessGuard or usePageAccess hook' };
    }
    if (filePath.includes('router.jsx') || filePath.includes('router.link')) {
      stats.notNeeded++;
      return { status: '➖', notes: 'Router configuration file', issues: '', plan: '' };
    }
    stats.notNeeded++;
    return { status: '➖', notes: 'Router utility file', issues: '', plan: '' };
  }

  // Modals
  if (pathLower.includes('modal')) {
    const hasPermissionCheck = content.includes('PermissionButton') ||
                               content.includes('usePageAccess') ||
                               content.includes('can(') ||
                               content.includes('hasPermission(');
    const hasUnprotectedButton = /<Button[^>]*>(Edit|Delete|Add|Create|Save|Update|Remove|Submit)/i.test(content);
    const hasActionButtons = hasUnprotectedButton || content.includes('onClick') && content.includes('delete') || content.includes('edit');

    if (hasPermissionCheck) {
      stats.compliant++;
      return { status: '✅', notes: 'Modal uses permission-based controls', issues: '', plan: '' };
    }
    if (hasActionButtons) {
      stats.needsMigration++;
      return { status: '❌', notes: 'Modal has action buttons without permission checks', issues: 'Edit/Delete/Create buttons need PermissionButton wrapper', plan: 'Wrap action buttons with PermissionButton component' };
    }
    stats.partial++;
    return { status: '🔄', notes: 'Modal file - needs manual review for action buttons', issues: '', plan: 'Review for action button permissions' };
  }

  // Hooks
  if (pathLower.includes('hooks')) {
    if (filePath.includes('usePageAccess') || filePath.includes('useAuth')) {
      stats.compliant++;
      return { status: '✅', notes: 'Core permission/authorization hook', issues: '', plan: '' };
    }
    if (filePath.includes('dashboardRoleFilter')) {
      stats.needsMigration++;
      return { status: '❌', notes: 'Hook contains role-based filtering logic', issues: 'Hardcoded role filtering', plan: 'Replace with permission-based filtering' };
    }
    stats.notNeeded++;
    return { status: '➖', notes: 'Utility hook - no RBAC needed', issues: '', plan: '' };
  }

  // Services
  if (pathLower.includes('services')) {
    stats.notNeeded++;
    return { status: '➖', notes: 'API service layer - no RBAC needed', issues: '', plan: '' };
  }

  // Feature modules
  if (pathLower.includes('feature-module')) {
    const hasPermissionCheck = content.includes('PermissionButton') ||
                               content.includes('usePageAccess') ||
                               content.includes('PageAccessGuard') ||
                               content.includes('can(') ||
                               content.includes('hasPermission(');
    const hasWithRoleCheck = content.includes('withRoleCheck');
    const hasRoleComparison = content.includes('user?.role ===') ||
                             content.includes('user.role ===') ||
                             content.includes('publicMetadata?.role ===');
    const hasUnprotectedButton = /<Button[^>]*>(Edit|Delete|Add|Create|Save|Update|Remove)/i.test(content);
    const hasHardcodedRoles = content.includes('allowedRoles:') ||
                              content.includes("['admin',") ||
                              content.includes("['hr',");

    if (hasPermissionCheck && !hasWithRoleCheck && !hasRoleComparison && !hasHardcodedRoles) {
      stats.compliant++;
      return { status: '✅', notes: 'Uses permission-based access control', issues: '', plan: '' };
    }
    if (hasWithRoleCheck) {
      stats.needsMigration++;
      return { status: '❌', notes: 'Uses legacy withRoleCheck HOC', issues: 'withRoleCheck should be replaced with PageAccessGuard', plan: 'Replace withRoleCheck HOC with PageAccessGuard or usePageAccess hook' };
    }
    if (hasRoleComparison || hasHardcodedRoles) {
      stats.needsMigration++;
      return { status: '❌', notes: 'Contains hardcoded role comparisons', issues: 'user?.role === or allowedRoles array found', plan: 'Replace with permission checks using usePageAccess hook' };
    }
    if (hasUnprotectedButton) {
      stats.partial++;
      return { status: '🔄', notes: 'May have unprotected action buttons', issues: 'Potential unprotected buttons', plan: 'Review and wrap with PermissionButton' };
    }
    stats.partial++;
    return { status: '🔄', notes: 'Feature module - needs manual review for RBAC', issues: '', plan: 'Review for permission-based access controls' };
  }

  // Core components
  if (pathLower.includes('core/components')) {
    if (filePath.includes('RoleBasedRenderer') ||
        filePath.includes('PermissionField') ||
        filePath.includes('RoleDebugger')) {
      stats.compliant++;
      return { status: '✅', notes: 'Permission-related component', issues: '', plan: '' };
    }
    stats.notNeeded++;
    return { status: '➖', notes: 'UI component - no RBAC needed', issues: '', plan: '' };
  }

  // Common components
  if (pathLower.includes('core/common')) {
    stats.notNeeded++;
    return { status: '➖', notes: 'Common UI component - no RBAC needed', issues: '', plan: '' };
  }

  // Utils
  if (pathLower.includes('utils')) {
    stats.notNeeded++;
    return { status: '➖', notes: 'Utility function - no RBAC needed', issues: '', plan: '' };
  }

  // Types
  if (pathLower.includes('types')) {
    stats.notNeeded++;
    return { status: '➖', notes: 'Type definition file - no RBAC needed', issues: '', plan: '' };
  }

  // Contexts
  if (pathLower.includes('contexts')) {
    if (filePath.includes('Permission') || filePath.includes('permission')) {
      stats.compliant++;
      return { status: '✅', notes: 'Permission context provider', issues: '', plan: '' };
    }
    stats.notNeeded++;
    return { status: '➖', notes: 'Context provider - no RBAC needed', issues: '', plan: '' };
  }

  // Config
  if (pathLower.includes('config')) {
    stats.notNeeded++;
    return { status: '➖', notes: 'Configuration file - no RBAC needed', issues: '', plan: '' };
  }

  stats.partial++;
  return { status: '🔄', notes: 'React file - needs manual review', issues: '', plan: 'Review for RBAC compliance' };
};

// Process files
console.log('Analyzing files for RBAC compliance...\n');
fileList.forEach((line, index) => {
  const cleanLine = line.replace(/^\s*\d+→/, '').trim();
  if (!cleanLine) return;

  // Convert backslashes to forward slashes
  const normalizedPath = cleanLine.replace(/\\/g, '/');
  const fullPath = path.join(__dirname, '../../../', normalizedPath);

  let analysis;

  if (normalizedPath.startsWith('backend')) {
    analysis = analyzeBackendFile(fullPath);
  } else if (normalizedPath.startsWith('react')) {
    analysis = analyzeReactFile(fullPath);
  } else {
    stats.notNeeded++;
    analysis = { status: '➖', notes: 'Unknown file type', issues: '', plan: '' };
  }

  // Escape CSV values
  const escapeCsv = (val) => {
    if (!val) return '';
    return '"' + val.replace(/"/g, '""') + '"';
  };

  csv += `${escapeCsv(normalizedPath)},${escapeCsv(analysis.status)},${escapeCsv(analysis.notes)},${escapeCsv(analysis.issues)},${escapeCsv(analysis.plan)}\n`;

  if ((index + 1) % 100 === 0) {
    console.log(`Processed ${index + 1} files...`);
  }
});

// Write output
const outputPath = path.join(__dirname, 'files_status_detailed.csv');
fs.writeFileSync(outputPath, csv);

// Print summary
console.log('\n=== RBAC Compliance Summary ===');
console.log(`✅ Fully Compliant: ${stats.compliant}`);
console.log(`➖ No RBAC Needed: ${stats.notNeeded}`);
console.log(`❌ Needs Migration: ${stats.needsMigration}`);
console.log(`🔄 Partial/Review Needed: ${stats.partial}`);
console.log(`❓ Files Not Found: ${stats.notFound}`);
console.log(`\nTotal Files Analyzed: ${fileList.length}`);
console.log(`\n✅ Report written to: ${outputPath}`);

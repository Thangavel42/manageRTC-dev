#!/usr/bin/env python3
"""
RBAC Compliance File Analyzer
Analyzes all files in the codebase for RBAC compliance
"""

import os
import re
import csv
from pathlib import Path
from typing import Dict, Tuple, List

# File lists from files.txt
FILES_TXT = Path(__file__).parent.parent.parent.parent.parent / 'files.txt'

# Output paths
OUTPUT_DIR = Path(__file__).parent
CSV_OUTPUT = OUTPUT_DIR / 'files_status_detailed.csv'
SUMMARY_OUTPUT = OUTPUT_DIR / 'rbac_summary.txt'

# Statistics tracking
stats = {
    'compliant': 0,
    'not_needed': 0,
    'needs_migration': 0,
    'partial': 0,
    'not_found': 0
}


def escape_csv(value: str) -> str:
    """Escape a value for CSV output"""
    if not value:
        return '""'
    value = str(value).replace('"', '""')
    return f'"{value}"'


def analyze_backend_file(file_path: str, relative_path: str) -> Dict[str, str]:
    """Analyze a backend file for RBAC compliance"""
    path_lower = file_path.lower()

    # File not found
    if not os.path.exists(file_path):
        stats['not_found'] += 1
        return {
            'status': '➖',
            'notes': 'File not found',
            'issues': '',
            'plan': ''
        }

    # Read file content
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except:
        stats['not_found'] += 1
        return {
            'status': '➖',
            'notes': 'Cannot read file',
            'issues': '',
            'plan': ''
        }

    # Tests - no RBAC needed
    if 'test' in path_lower or '__tests__' in path_lower or 'spec' in path_lower:
        stats['not_needed'] += 1
        return {
            'status': '➖',
            'notes': 'Test file - no RBAC needed',
            'issues': '',
            'plan': ''
        }

    # Seeds/scripts/migrations
    if 'seed' in path_lower or 'script' in path_lower or 'migration' in path_lower:
        stats['not_needed'] += 1
        return {
            'status': '➖',
            'notes': 'Seed/migration script - no RBAC needed',
            'issues': '',
            'plan': ''
        }

    # Models - schema definitions
    if 'models' in path_lower and ('.schema.js' in path_lower or '.model.js' in path_lower):
        stats['not_needed'] += 1
        return {
            'status': '➖',
            'notes': 'Schema definition - no RBAC needed',
            'issues': '',
            'plan': ''
        }

    # Config files
    if 'config' in path_lower:
        stats['not_needed'] += 1
        return {
            'status': '➖',
            'notes': 'Configuration file - no RBAC needed',
            'issues': '',
            'plan': ''
        }

    # Check for RBAC patterns
    has_require_page_access = 'requirePageAccess' in content
    has_require_role = bool(re.search(r'requireRole\s*\(', content))
    has_role_check = 'user.role' in content or 'req.user.role' in content or 'user?.role' in content
    has_permission_check = 'hasPermission' in content or 'checkPermission' in content

    # Controllers
    if 'controller' in path_lower:
        if has_require_page_access:
            stats['compliant'] += 1
            return {
                'status': '✅',
                'notes': 'Using requirePageAccess middleware',
                'issues': '',
                'plan': ''
            }
        if has_require_role:
            stats['needs_migration'] += 1
            return {
                'status': '❌',
                'notes': 'Using legacy requireRole middleware',
                'issues': 'requireRole() should be replaced with requirePageAccess()',
                'plan': 'Replace requireRole with requirePageAccess'
            }
        # Check if it's a socket controller
        if 'socket' in path_lower:
            if has_permission_check:
                stats['compliant'] += 1
                return {
                    'status': '✅',
                    'notes': 'Socket controller with permission checks',
                    'issues': '',
                    'plan': ''
                }
            stats['needs_migration'] += 1
            return {
                'status': '❌',
                'notes': 'Socket controller without explicit permission checks',
                'issues': 'Socket operations need permission validation',
                'plan': 'Add permission checks to socket handlers'
            }
        stats['needs_migration'] += 1
        return {
            'status': '❌',
            'notes': 'Controller without RBAC middleware',
            'issues': 'Missing requirePageAccess or requireRole middleware',
            'plan': 'Add requirePageAccess middleware to controller routes'
        }

    # Routes
    if 'routes' in path_lower:
        if has_require_page_access:
            stats['compliant'] += 1
            return {
                'status': '✅',
                'notes': 'Routes use requirePageAccess middleware',
                'issues': '',
                'plan': ''
            }
        if has_require_role:
            stats['needs_migration'] += 1
            return {
                'status': '❌',
                'notes': 'Routes use legacy requireRole middleware',
                'issues': 'requireRole() should be replaced with requirePageAccess()',
                'plan': 'Replace requireRole with requirePageAccess'
            }
        stats['needs_migration'] += 1
        return {
            'status': '❌',
            'notes': 'Routes without RBAC middleware',
            'issues': 'Missing requirePageAccess or requireRole middleware',
            'plan': 'Add requirePageAccess middleware to routes'
        }

    # Services
    if 'service' in path_lower:
        if has_role_check:
            stats['needs_migration'] += 1
            return {
                'status': '❌',
                'notes': 'Service contains role-based logic',
                'issues': 'Role checks should be in controller/middleware, not service',
                'plan': 'Move permission checks to controller/middleware layer'
            }
        stats['not_needed'] += 1
        return {
            'status': '➖',
            'notes': 'Service file - business logic only',
            'issues': '',
            'plan': ''
        }

    # Middleware
    if 'middleware' in path_lower:
        if 'auth.js' in relative_path:
            stats['partial'] += 1
            return {
                'status': '🔄',
                'notes': 'Auth middleware exports requireRole for backward compatibility',
                'issues': 'Still exports requireRole function',
                'plan': 'Keep for backward compatibility, use requirePageAccess in new code'
            }
        if 'pageaccess.js' in relative_path or 'pageAccess.js' in relative_path:
            stats['compliant'] += 1
            return {
                'status': '✅',
                'notes': 'Page access middleware - core RBAC component',
                'issues': '',
                'plan': ''
            }
        stats['not_needed'] += 1
        return {
            'status': '➖',
            'notes': 'Middleware file (not auth-related)',
            'issues': '',
            'plan': ''
        }

    # Default for other backend files
    stats['not_needed'] += 1
    return {
        'status': '➖',
        'notes': 'Backend utility/file',
        'issues': '',
        'plan': ''
    }


def analyze_react_file(file_path: str, relative_path: str) -> Dict[str, str]:
    """Analyze a React file for RBAC compliance"""
    path_lower = file_path.lower()

    # File not found
    if not os.path.exists(file_path):
        stats['not_found'] += 1
        return {
            'status': '➖',
            'notes': 'File not found',
            'issues': '',
            'plan': ''
        }

    # Read file content
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except:
        stats['not_found'] += 1
        return {
            'status': '➖',
            'notes': 'Cannot read file',
            'issues': '',
            'plan': ''
        }

    # Auth pages - public
    auth_patterns = ['auth', 'login', 'register', 'forgotpassword', 'resetpassword',
                     'emailverification', 'twostep', 'lockscreen']
    if any(pattern in path_lower for pattern in auth_patterns):
        stats['not_needed'] += 1
        return {
            'status': '➖',
            'notes': 'Auth/public page - no RBAC needed',
            'issues': '',
            'plan': ''
        }

    # UI Interface - demo pages
    if 'uiinterface' in path_lower or 'ui-interface' in path_lower:
        stats['not_needed'] += 1
        return {
            'status': '➖',
            'notes': 'UI Interface demo page - no RBAC needed',
            'issues': '',
            'plan': ''
        }

    # Data files
    if 'data/json' in path_lower:
        if 'sidebarmenu.jsx' in relative_path:
            stats['needs_migration'] += 1
            return {
                'status': '❌',
                'notes': 'Hardcoded role-based sidebar menu filtering',
                'issues': 'Uses switch statement with hardcoded roles (superadmin, hr, admin, etc.)',
                'plan': 'Replace with permission-based filtering using PermissionContext'
            }
        if 'horizontalsidebar.tsx' in relative_path:
            stats['needs_migration'] += 1
            return {
                'status': '❌',
                'notes': 'Hardcoded role-based horizontal menu filtering',
                'issues': 'Uses roles: [] arrays with hardcoded role values',
                'plan': 'Replace with permission-based filtering'
            }
        if 'all_routes.tsx' in relative_path or 'router' in path_lower:
            stats['not_needed'] += 1
            return {
                'status': '➖',
                'notes': 'Route definitions file - no RBAC needed',
                'issues': '',
                'plan': ''
            }
        stats['not_needed'] += 1
        return {
            'status': '➖',
            'notes': 'Static data file',
            'issues': '',
            'plan': ''
        }

    # Router files
    if 'router' in path_lower:
        if 'withrolecheck.jsx' in relative_path:
            stats['needs_migration'] += 1
            return {
                'status': '❌',
                'notes': 'Legacy role-based route protection HOC',
                'issues': 'withRoleCheck uses hardcoded roles instead of permissions',
                'plan': 'Replace with PageAccessGuard or usePageAccess hook'
            }
        stats['not_needed'] += 1
        return {
            'status': '➖',
            'notes': 'Router configuration/utility file',
            'issues': '',
            'plan': ''
        }

    # Modals
    if 'modal' in path_lower:
        has_permission_check = ('PermissionButton' in content or
                                'usePageAccess' in content or
                                'can(' in content or
                                'hasPermission(' in content)
        has_unprotected_button = bool(re.search(r'<Button[^>]*>(Edit|Delete|Add|Create|Save|Update|Remove|Submit)', content, re.IGNORECASE))
        has_action_buttons = has_unprotected_button or ('onClick' in content and ('delete' in content.lower() or 'edit' in content.lower()))

        if has_permission_check:
            stats['compliant'] += 1
            return {
                'status': '✅',
                'notes': 'Modal uses permission-based controls',
                'issues': '',
                'plan': ''
            }
        if has_action_buttons:
            stats['needs_migration'] += 1
            return {
                'status': '❌',
                'notes': 'Modal has action buttons without permission checks',
                'issues': 'Edit/Delete/Create buttons need PermissionButton wrapper',
                'plan': 'Wrap action buttons with PermissionButton component'
            }
        stats['partial'] += 1
        return {
            'status': '🔄',
            'notes': 'Modal file - needs manual review for action buttons',
            'issues': '',
            'plan': 'Review for action button permissions'
        }

    # Hooks
    if 'hooks' in path_lower:
        if 'usepageaccess' in relative_path or 'useauth' in relative_path:
            stats['compliant'] += 1
            return {
                'status': '✅',
                'notes': 'Core permission/authorization hook',
                'issues': '',
                'plan': ''
            }
        if 'dashboardrolefilter' in relative_path:
            stats['needs_migration'] += 1
            return {
                'status': '❌',
                'notes': 'Hook contains role-based filtering logic',
                'issues': 'Hardcoded role filtering',
                'plan': 'Replace with permission-based filtering'
            }
        stats['not_needed'] += 1
        return {
            'status': '➖',
            'notes': 'Utility hook - no RBAC needed',
            'issues': '',
            'plan': ''
        }

    # Services
    if 'services' in path_lower:
        stats['not_needed'] += 1
        return {
            'status': '➖',
            'notes': 'API service layer - no RBAC needed',
            'issues': '',
            'plan': ''
        }

    # Feature modules
    if 'feature-module' in path_lower:
        has_permission_check = ('PermissionButton' in content or
                                'usePageAccess' in content or
                                'PageAccessGuard' in content or
                                'can(' in content or
                                'hasPermission(' in content)
        has_with_role_check = 'withRoleCheck' in content
        has_role_comparison = ('user?.role ===' in content or
                              'user.role ===' in content or
                              'publicMetadata?.role ===' in content)
        has_unprotected_button = bool(re.search(r'<Button[^>]*>(Edit|Delete|Add|Create|Save|Update|Remove)', content, re.IGNORECASE))
        has_hardcoded_roles = ('allowedRoles:' in content or
                              "['admin'," in content or
                              "['hr'," in content)

        if has_permission_check and not has_with_role_check and not has_role_comparison and not has_hardcoded_roles:
            stats['compliant'] += 1
            return {
                'status': '✅',
                'notes': 'Uses permission-based access control',
                'issues': '',
                'plan': ''
            }
        if has_with_role_check:
            stats['needs_migration'] += 1
            return {
                'status': '❌',
                'notes': 'Uses legacy withRoleCheck HOC',
                'issues': 'withRoleCheck should be replaced with PageAccessGuard',
                'plan': 'Replace withRoleCheck HOC with PageAccessGuard or usePageAccess hook'
            }
        if has_role_comparison or has_hardcoded_roles:
            stats['needs_migration'] += 1
            return {
                'status': '❌',
                'notes': 'Contains hardcoded role comparisons',
                'issues': 'user?.role === or allowedRoles array found',
                'plan': 'Replace with permission checks using usePageAccess hook'
            }
        if has_unprotected_button:
            stats['partial'] += 1
            return {
                'status': '🔄',
                'notes': 'May have unprotected action buttons',
                'issues': 'Potential unprotected buttons',
                'plan': 'Review and wrap with PermissionButton'
            }
        stats['partial'] += 1
        return {
            'status': '🔄',
            'notes': 'Feature module - needs manual review for RBAC',
            'issues': '',
            'plan': 'Review for permission-based access controls'
        }

    # Core components
    if 'core/components' in path_lower:
        if ('rolebasedrenderer' in relative_path or
            'permissionfield' in relative_path or
            'roledebugger' in relative_path):
            stats['compliant'] += 1
            return {
                'status': '✅',
                'notes': 'Permission-related component',
                'issues': '',
                'plan': ''
            }
        stats['not_needed'] += 1
        return {
            'status': '➖',
            'notes': 'UI component - no RBAC needed',
            'issues': '',
            'plan': ''
        }

    # Common components
    if 'core/common' in path_lower:
        stats['not_needed'] += 1
        return {
            'status': '➖',
            'notes': 'Common UI component - no RBAC needed',
            'issues': '',
            'plan': ''
        }

    # Utils
    if 'utils' in path_lower:
        stats['not_needed'] += 1
        return {
            'status': '➖',
            'notes': 'Utility function - no RBAC needed',
            'issues': '',
            'plan': ''
        }

    # Types
    if 'types' in path_lower:
        stats['not_needed'] += 1
        return {
            'status': '➖',
            'notes': 'Type definition file - no RBAC needed',
            'issues': '',
            'plan': ''
        }

    # Contexts
    if 'contexts' in path_lower:
        if 'permission' in relative_path.lower():
            stats['compliant'] += 1
            return {
                'status': '✅',
                'notes': 'Permission context provider',
                'issues': '',
                'plan': ''
            }
        stats['not_needed'] += 1
        return {
            'status': '➖',
            'notes': 'Context provider - no RBAC needed',
            'issues': '',
            'plan': ''
        }

    # Config
    if 'config' in path_lower:
        stats['not_needed'] += 1
        return {
            'status': '➖',
            'notes': 'Configuration file - no RBAC needed',
            'issues': '',
            'plan': ''
        }

    # Default
    stats['partial'] += 1
    return {
        'status': '🔄',
        'notes': 'React file - needs manual review',
        'issues': '',
        'plan': 'Review for RBAC compliance'
    }


def analyze_file(line: str) -> Tuple[str, str, str, str, str]:
    """Analyze a single file line and return CSV row"""
    # Parse the line - format is "123→filepath"
    match = re.match(r'\s*\d+→(.+)', line)
    if not match:
        return None

    relative_path = match.group(1).strip().replace('\\', '/')
    if not relative_path:
        return None

    # Get full path
    base_dir = Path(__file__).parent.parent.parent.parent.parent
    full_path = base_dir / relative_path

    # Determine file type and analyze
    if relative_path.startswith('backend'):
        analysis = analyze_backend_file(str(full_path), relative_path)
    elif relative_path.startswith('react'):
        analysis = analyze_react_file(str(full_path), relative_path)
    else:
        stats['not_needed'] += 1
        analysis = {
            'status': '➖',
            'notes': 'Unknown file type',
            'issues': '',
            'plan': ''
        }

    return (
        escape_csv(relative_path),
        escape_csv(analysis['status']),
        escape_csv(analysis['notes']),
        escape_csv(analysis['issues']),
        escape_csv(analysis['plan'])
    )


def main():
    """Main analysis function"""
    print("RBAC Compliance File Analyzer")
    print("=" * 50)

    # Read file list
    if not FILES_TXT.exists():
        print(f"Error: files.txt not found at {FILES_TXT}")
        return

    with open(FILES_TXT, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    print(f"Found {len(lines)} files to analyze")
    print()

    # Create CSV
    csv_rows = []
    csv_rows.append('File Path,Status,Notes,RBAC_Issues,Implementation_Plan')

    # Analyze each file
    for i, line in enumerate(lines, 1):
        row = analyze_file(line)
        if row:
            csv_rows.append(','.join(row))

        if i % 100 == 0:
            print(f"Processed {i}/{len(lines)} files...")

    # Write CSV
    csv_content = '\n'.join(csv_rows)
    with open(CSV_OUTPUT, 'w', encoding='utf-8') as f:
        f.write(csv_content)

    print()
    print("=" * 50)
    print("RBAC Compliance Summary")
    print("=" * 50)
    print(f"✅ Fully Compliant: {stats['compliant']}")
    print(f"➖ No RBAC Needed: {stats['not_needed']}")
    print(f"❌ Needs Migration: {stats['needs_migration']}")
    print(f"🔄 Partial/Review Needed: {stats['partial']}")
    print(f"❓ Files Not Found: {stats['not_found']}")
    print(f"Total Files: {len(lines)}")
    print()
    print(f"CSV Report: {CSV_OUTPUT}")

    # Calculate compliance percentage (excluding "not needed")
    actionable = stats['compliant'] + stats['needs_migration'] + stats['partial']
    if actionable > 0:
        compliance_rate = (stats['compliant'] / actionable) * 100
        print(f"RBAC Compliance Rate: {compliance_rate:.1f}%")

    # Write summary to file
    with open(SUMMARY_OUTPUT, 'w') as f:
        f.write("RBAC Compliance Analysis Summary\n")
        f.write("=" * 50 + "\n\n")
        f.write(f"Total Files Analyzed: {len(lines)}\n\n")
        f.write(f"✅ Fully Compliant: {stats['compliant']}\n")
        f.write(f"➖ No RBAC Needed: {stats['not_needed']}\n")
        f.write(f"❌ Needs Migration: {stats['needs_migration']}\n")
        f.write(f"🔄 Partial/Review Needed: {stats['partial']}\n")
        f.write(f"❓ Files Not Found: {stats['not_found']}\n\n")
        if actionable > 0:
            f.write(f"RBAC Compliance Rate: {compliance_rate:.1f}%\n")
        f.write(f"\nDetailed Report: {CSV_OUTPUT}\n")

    print(f"Summary: {SUMMARY_OUTPUT}")


if __name__ == '__main__':
    main()

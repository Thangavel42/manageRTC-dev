# Pages Collection Seeding Guide

## Overview

This guide explains how to properly seed the `pages` collection in the ManageRTC database with the correct parent-child hierarchical structure.

## Problem Identified

The **Acceptance database** had 172 pages with **NO hierarchical structure**:
- 0 pages with parent relationships
- 0 menu groups
- All pages at Level 1 (flat structure)

The **Development database** has 232 pages with **PROPER hierarchical structure**:
- 119 pages with parent relationships
- 24 menu groups
- Proper multi-level hierarchy (Level 1, 2, 3)

This discrepancy caused navigation issues and incorrect page organization in the acceptance environment.

## Root Cause

The acceptance database was seeded using an outdated seed script that:
1. Did not include all pages (172 vs 232)
2. Did not maintain parent-child page relationships
3. Did not create menu group pages
4. Used flat naming conventions (e.g., `dashboards.admin` instead of `admin.dashboard` with proper hierarchy)

## Solution

A comprehensive seed script has been created to properly seed all pages with their hierarchical relationships.

## Files Created

### 1. Export Script
**File:** `backend/scripts/exportPagesFromDev.js`
- Exports all pages and categories from the development database
- Creates a complete snapshot with all relationships
- Output: `backend/data/pagesExport.json`

### 2. Comprehensive Seed Script
**File:** `backend/scripts/seedPagesComplete.js`
- Seeds all 232 pages with proper hierarchy
- Creates 14 page categories
- Maintains parent-child relationships
- Supports both fresh install and update modes

### 3. Verification Script
**File:** `backend/scripts/verifyPagesSeed.js`
- Verifies the seed was successful
- Compares against expected values from development
- Shows detailed statistics

### 4. Analysis Script
**File:** `backend/scripts/analyzePagesDifference.js`
- Compares two databases to identify differences
- Shows missing pages, extra pages, and hierarchy discrepancies

## How To Use

### For New/Fresh Database Setup

```bash
cd backend

# Step 1: Export pages from development (if needed)
node scripts/exportPagesFromDev.js

# Step 2: Seed pages with fresh install (clears existing)
node scripts/seedPagesComplete.js --fresh

# Step 3: Verify the seed
node scripts/verifyPagesSeed.js
```

### For Updating Existing Database

```bash
cd backend

# Step 1: Seed pages in update mode (preserves existing)
node scripts/seedPagesComplete.js

# Step 2: Verify the seed
node scripts/verifyPagesSeed.js
```

### For Comparing Two Databases

```bash
cd backend

# Analyze differences between dev and acceptance
node scripts/analyzePagesDifference.js
```

## Expected Results

After running the seed script successfully, you should see:

```
Categories: 14
Total Pages: 232
Pages with parent: 119
Menu groups: 24

Hierarchy Levels:
  Level 1: 113
  Level 2: 73
  Level 3: 46
```

## Page Hierarchy Structure

The pages follow this hierarchical structure:

```
Level 1: Top-level pages and menu groups (no parent)
  ├── Level 2: Pages under Level 1 parent or sub-menu groups
  │     └── Level 3: Pages under Level 2 parent
```

### Example Hierarchy:

```
hrm.employees-menu (Level 1, Menu Group)
├── hrm.employees-list (Level 2)
├── hrm.departments (Level 2)
├── hrm.designations (Level 2)
└── hrm.leaves-menu (Level 2, Menu Group)
      ├── hrm.leaves-admin (Level 3)
      ├── hrm.leaves-employee (Level 3)
      └── hrm.leave-settings (Level 3)
```

## Environment Configuration

Make sure your `.env` file has the correct database connection:

```env
# For Development
MONGO_URI=mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/

# For Acceptance
MONGO_URI=mongodb+srv://amasQISAdminACC:sT0jJICEV1YiwFr8@managertc-acc-cluster.mffqa03.mongodb.net/?appName=manageRTC-acc-cluster

MONGODB_DATABASE=AmasQIS
```

## Integration with Deployment

### During New Company Initialization

When creating a new company/database, the pages should be seeded as part of the initialization process. Update the company initialization script to include:

```javascript
// After creating company and basic collections
console.log('Seeding pages and categories...');
await seedPagesComplete();
```

### During Deployment

For acceptance/production deployments, add the seed script to your deployment checklist:

```bash
# After pulling latest code
cd backend
npm install

# Seed/update pages
node scripts/seedPagesComplete.js

# Verify
node scripts/verifyPagesSeed.js
```

## Deployment Guide Updates

The following sections should be added to deployment guides:

### In DEPLOY_ACC.md

Add a new section after database setup:

```markdown
## Database Initialization

### Seed System Data

After setting up the MongoDB connection, seed the required system data:

1. **Seed Pages and Categories**
   ```bash
   cd /var/www/apiacc.manage-rtc.com/backend
   node scripts/seedPagesComplete.js --fresh
   ```

2. **Verify the seed**
   ```bash
   node scripts/verifyPagesSeed.js
   ```

3. **Seed other system data (if needed)**
   ```bash
   node scripts/seedRbac.js
   node scripts/seedModules.js
   ```
```

## Troubleshooting

### Issue: Pages count doesn't match

**Solution:** Run the seed script with `--fresh` flag to clear and reseed:
```bash
node scripts/seedPagesComplete.js --fresh
```

### Issue: Parent pages not found

**Solution:** Pages are seeded in order (Level 1 → Level 2 → Level 3). If parents are missing, check the export data file is complete:
```bash
node scripts/exportPagesFromDev.js
```

### Issue: Category not found errors

**Solution:** Ensure page categories are seeded before pages. The seed script handles this automatically.

### Issue: Validation errors for `availableActions`

**Solution:** The schema only accepts specific action values: `read`, `create`, `write`, `delete`, `import`, `export`, `approve`, `assign`. If you see "update" errors, those pages need their actions corrected in the export data.

## Maintenance

### Updating the Pages Export

Whenever pages are added or modified in the development database, update the export:

```bash
cd backend
node scripts/exportPagesFromDev.js
git add data/pagesExport.json
git commit -m "chore: update pages export"
```

### Adding New Pages

When adding new pages programmatically:

1. Add to development database first
2. Test thoroughly
3. Export from development
4. Commit the export file
5. Deploy and run seed script in other environments

## Summary

- **Development DB:** 232 pages with proper hierarchy ✓
- **Acceptance DB (Before Fix):** 172 pages, flat structure ✗
- **Acceptance DB (After Fix):** 232 pages with proper hierarchy ✓
- **Fix Applied:** Complete pages seed script with hierarchical relationships
- **Scripts Created:** Export, Seed, Verify, and Analysis tools

## Related Files

- `backend/scripts/exportPagesFromDev.js` - Export pages from development
- `backend/scripts/seedPagesComplete.js` - Comprehensive seed script
- `backend/scripts/verifyPagesSeed.js` - Verification script
- `backend/scripts/analyzePagesDifference.js` - Comparison script
- `backend/data/pagesExport.json` - Complete pages export data
- `backend/models/rbac/page.schema.js` - Page model schema
- `backend/models/rbac/pageCategory.schema.js` - PageCategory model schema

## Next Steps

1. ✅ Run the seed script on acceptance database
2. ✅ Verify the results
3. ⏳ Test the application navigation and permissions
4. ⏳ Update deployment guides
5. ⏳ Document the process for future deployments
6. ⏳ Create automated tests for page hierarchy validation

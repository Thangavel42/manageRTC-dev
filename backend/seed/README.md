# RBAC Seed Scripts

This directory contains seed scripts for initializing and testing the RBAC (Role-Based Access Control) system.

## Available Scripts

### 1. Run Seed Script (`run-seed.js`)
Seeds the database with initial RBAC data including SuperAdmin pages.

**Usage:**
```bash
# Using npm
npm run seed
npm run seed:pages

# Using node directly
node seed/run-seed.js
```

**What it does:**
- Connects to MongoDB using `MONGODB_URI` from `.env`
- Seeds the Pages collection with SuperAdmin pages
- Updates existing pages if they already exist
- Preserves system page integrity

### 2. Test API Script (`test-pages-api.js`)
Tests all Pages API endpoints to verify the implementation is working correctly.

**Usage:**
```bash
# Using npm
npm run test:pages

# Using node directly with custom API URL
API_BASE_URL=http://localhost:5000 node seed/test-pages-api.js
```

**What it tests:**
- GET `/api/rbac/pages` - Get all pages
- GET `/api/rbac/pages/grouped` - Get pages grouped by category
- GET `/api/rbac/pages/stats` - Get page statistics
- GET `/api/rbac/pages/category/:category` - Get pages by module
- POST `/api/rbac/pages` - Create a new page
- GET `/api/rbac/pages/:id` - Get page by ID
- PUT `/api/rbac/pages/:id` - Update a page
- PATCH `/api/rbac/pages/:id/toggle-status` - Toggle page status
- PUT `/api/rbac/pages/batch/orders` - Batch update sort orders
- DELETE `/api/rbac/pages/:id` - Delete a page

## Environment Variables

Create a `.env` file in the backend root directory:

```env
MONGODB_URI=mongodb://localhost:27017/manageRTC
API_BASE_URL=http://localhost:5000
```

## Seed Data

The `pages.seed.js` file contains the initial seed data for SuperAdmin pages:

### Super Admin Module (6 pages)
1. Dashboard - `/super-admin/dashboard`
2. Companies - `/super-admin/companies`
3. Subscriptions - `/super-admin/subscription`
4. Packages - `/super-admin/package`
5. Modules - `/super-admin/modules`
6. Pages - `/super-admin/pages` (NEW)

### Users & Permissions Module (3 pages)
1. Users - `/users`
2. Roles & Permissions - `/roles-permissions`
3. Permission - `/permission`

### Dashboards Module (5 pages)
1. Admin Dashboard - `/admin-dashboard`
2. HR Dashboard - `/hr-dashboard`
3. Employee Dashboard - `/employee-dashboard`
4. Deals Dashboard - `/deals-dashboard`
5. Leads Dashboard - `/leads-dashboard`

## Page Schema Fields

Each page has the following fields:
- `name` - Unique page identifier (e.g., 'super-admin.dashboard')
- `displayName` - Human-readable name
- `description` - Page description
- `route` - Frontend route path
- `icon` - Tabler icon class
- `moduleCategory` - Module category (enum)
- `sortOrder` - Display order within module
- `isSystem` - Whether this is a system page (protected)
- `isActive` - Whether the page is active
- `availableActions` - Array of allowed actions
- `createdBy` - User ID who created the page
- `updatedBy` - User ID who last updated the page

### Available Actions
- `all` - Full access
- `read` - Read-only access
- `create` - Create new records
- `write` - Update existing records
- `delete` - Delete records
- `import` - Import data
- `export` - Export data
- `approve` - Approve records
- `assign` - Assign records

### Module Categories
- `super-admin` - Super Admin module
- `users-permissions` - Users & Permissions module
- `pages` - Pages management
- `auth` - Authentication
- `ui` - UI settings
- `extras` - Additional features
- `dashboards` - Dashboard pages
- `reports` - Reports module

## Testing Workflow

1. **Start the backend server:**
   ```bash
   npm run dev
   ```

2. **Run the seed script (first time or after schema changes):**
   ```bash
   npm run seed
   ```

3. **Run the API test script:**
   ```bash
   npm run test:pages
   ```

4. **Access the Pages UI:**
   - Navigate to: `http://localhost:5000/super-admin/pages`
   - Login with SuperAdmin credentials
   - View, create, edit, and delete pages

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env` file
- Verify network connectivity

### Port Already in Use
- Change the port in `.env` file
- Or kill the process using the port

### Seed Not Updating Existing Data
- The seed script is designed to update existing pages with new fields
- Check the console output for update messages
- If issues persist, manually drop the Pages collection and re-seed

## API Endpoints Reference

Base URL: `/api/rbac/pages`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all pages (supports filtering) |
| GET | `/grouped` | Get pages grouped by category |
| GET | `/stats` | Get page statistics |
| GET | `/category/:category` | Get pages by module category |
| GET | `/:id` | Get a single page |
| POST | `/` | Create a new page |
| PUT | `/:id` | Update a page |
| DELETE | `/:id` | Delete a page |
| PATCH | `/:id/toggle-status` | Toggle page active status |
| PUT | `/batch/orders` | Batch update sort orders |

## Implementation Status

Phase 1 (Pages Collection Enhancement) - COMPLETED
- ✅ Page schema updated with `availableActions` field
- ✅ Seed data created for SuperAdmin pages
- ✅ Page service with all CRUD operations
- ✅ Page controller with HTTP handlers
- ✅ Pages API routes
- ✅ Frontend Pages management UI
- ✅ Routes and sidebar menu integration
- ✅ Seed scripts and test scripts

## Next Steps

See `.ferb/docs/docs_output/RBAC/02_IMPLEMENTATION_GUIDE_PHASES_2-7.md` for the next phases:
- Phase 2: Roles Collection Enhancement
- Phase 3: Permissions Collection
- Phase 4: Users Collection Enhancement
- Phase 5: Middleware & Authentication
- Phase 6: API Endpoint Protection
- Phase 7: Frontend Integration

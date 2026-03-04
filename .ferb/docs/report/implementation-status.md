# Company Enhancement - Implementation Status

**Date:** 2026-03-03
**Status:** Phase 1 & 2 Complete (Backend + Frontend Core)

---

## Completed Changes

### Backend

| # | File | Change | Status |
|---|------|--------|--------|
| 1 | `backend/models/superadmin/package.schema.js` | Added 30+ new company fields (legal, industry, address, contact, social, billing, admin details) | Done |
| 2 | `backend/models/superadmin/companyChangeRequest.schema.js` | **NEW** - Company change request schema with field-level approval | Done |
| 3 | `backend/controllers/rest/companyChangeRequest.controller.js` | **NEW** - 9 endpoints (submit, get, approve/reject field, bulk, cancel, stats) | Done |
| 4 | `backend/routes/api/companyChangeRequest.js` | **NEW** - Admin + Superadmin routes for change requests | Done |
| 5 | `backend/config/db.js` | Added `companyChangeRequestsCollection` to `getsuperadminCollections()` | Done |
| 6 | `backend/server.js` | Registered `/api/company-change-requests` route | Done |
| 7 | `backend/services/superadmin/companies.services.js` | Updated `fetchcompany`, `fetcheditcompanyview`, `updateCompany` with new fields | Done |
| 8 | `backend/controllers/rest/userProfile.controller.js` | Enhanced `getAdminProfile` (all fields + employee count), expanded `updateAdminProfile` (social links, phone2, fax) | Done |

### Frontend

| # | File | Change | Status |
|---|------|--------|--------|
| 1 | `react/src/hooks/useSuperadminCompaniesREST.ts` | Updated `CompanyDetails` interface with all new fields + sub-interfaces | Done |
| 2 | `react/src/hooks/useCompanyChangeRequestREST.ts` | **NEW** - Hook for Admin→Superadmin change request operations | Done |
| 3 | `react/src/hooks/useAdminProfileREST.ts` | **NEW** - Hook for admin profile fetch/update with typed interfaces | Done |
| 4 | `react/src/feature-module/super-admin/companies/company-details.tsx` | **NEW** - Full company details page with sidebar + tabbed content | Done |
| 5 | `react/src/feature-module/pages/admin-profile/index.tsx` | **REWRITTEN** - 3-tab layout (My Details, Company Info, Subscription) with three-tier field access | Done |
| 6 | `react/src/feature-module/router/all_routes.tsx` | Added `superAdminCompanyDetails` route | Done |
| 7 | `react/src/feature-module/router/router.link.tsx` | Registered CompanyDetailsPage component with superadmin role | Done |
| 8 | `react/src/feature-module/super-admin/companies/index.tsx` | Added new fields to add company form + "View Details" link in table | Done |

---

## Three-Tier Field Access (Admin Profile)

### Tier 1 - Direct Edit
Phone, Phone 2, Fax, Website, Description, Social Links (LinkedIn, Twitter, Facebook, Instagram), Company Logo

### Tier 2 - Read-Only
Registration Number, Tax ID, Tax ID Type, Legal Name, Legal Entity Type, Incorporation Country, Industry, Sub-Industry, Company Size, Company Type, Contact Person (all), Founder Name

### Tier 3 - Request to Edit (via Change Request → Superadmin)
Billing Email, Billing Address (all fields), Address, Structured Address (all fields)

---

## Company Change Request Flow

1. Admin clicks "Request to Edit" on Tier 3 fields
2. Modal opens with current values pre-filled
3. Admin modifies values and provides reason
4. Request submitted to `POST /api/company-change-requests`
5. Superadmin reviews in their dashboard
6. Per-field approve/reject with auto-apply on approval
7. Admin sees request status in "My Change Requests" table

---

## Pending / Future Work

- [ ] Superadmin dashboard widget for pending company change requests
- [ ] Edit company modal update with all new fields (currently only Add form updated)
- [ ] Migration script for existing companies (populate structuredAddress from address string)
- [ ] Company change request notification (real-time via socket or email)
- [ ] Company details modal update (existing quick-view modal)

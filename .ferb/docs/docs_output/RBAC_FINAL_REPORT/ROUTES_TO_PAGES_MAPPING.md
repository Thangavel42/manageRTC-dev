# Routes to Pages Collection Mapping

**Date**: 2026-02-16
**Source**: `react/src/feature-module/router/all_routes.tsx`
**Total Routes**: 409+

---

## Executive Summary

This document maps all routes in `all_routes.tsx` to their expected `pageCode` in the Pages collection. This mapping is critical for RBAC migration.

---

## Mapping Legend

| Status | Meaning |
|--------|---------|
| ✅ | Page exists in Pages collection |
| ❌ | Page missing - needs to be created |
| 🔄 | Page exists but code may need update |
| ➖ | No RBAC needed (public/auth page) |

---

## Category I: Super Admin

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `superAdminDashboard` | `/super-admin/dashboard` | `superadmin.dashboard` | ✅ |
| `superAdminCompanies` | `/super-admin/companies` | `superadmin.companies` | ✅ |
| `superAdminSubscriptions` | `/super-admin/subscription` | `superadmin.subscriptions` | ✅ |
| `superAdminPackages` | `/super-admin/package` | `superadmin.packages` | ✅ |
| `superAdminPackagesGrid` | `/super-admin/package-grid` | `superadmin.packages` | ✅ |
| `superAdminDomain` | `/super-admin/domain` | `superadmin.domains` | ❌ |
| `superAdminPurchaseTransaction` | `/super-admin/purchase-transaction` | `superadmin.purchase-transactions` | ❌ |
| `superAdminModules` | `/super-admin/modules` | `superadmin.modules` | ✅ |
| `superAdminPages` | `/super-admin/pages` | `superadmin.pages` | ✅ |
| `superAdminUsers` | `/super-admin/superadmins` | `superadmin.superadmins` | ✅ |

**Missing Pages**: `superadmin.domains`, `superadmin.purchase-transactions`

---

## Category II: Users & Permissions

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `users` | `/users` | `users.users` | ✅ |
| `rolePermission` | `/roles-permissions` | `users.roles` | ✅ |
| `permissionpage` | `/permission` | `users.permissions` | ✅ |
| `mandatoryPermissions` | `/mandatory-permissions` | `users.mandatory-permissions` | ❌ |
| `manageusers` | `/user-management/manage-users` | `users.manage-users` | 🔄 |
| `deleteRequest` | `/user-management/delete-request` | `users.delete-requests` | ❌ |

**Missing Pages**: `users.mandatory-permissions`, `users.delete-requests`

---

## Category III: HRM - Employees

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `employeeList` | `/employees` | `hrm.employees` | ✅ |
| `employeeGrid` | `/employees-grid` | `hrm.employees` | ✅ |
| `employeeDetailPage` | `/employees/:employeeId` | `hrm.employees` | ✅ |
| `departments` | `/departments` | `hrm.departments` | ✅ |
| `designations` | `/designations` | `hrm.designations` | ✅ |
| `policy` | `/policy` | `hrm.policy` | ✅ |
| `holidays` | `/hrm/holidays` | `hrm.holidays` | ✅ |

---

## Category IV: HRM - Attendance & Leave

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `leaveadmin` | `/leaves` | `hrm.leaves.admin` | ✅ |
| `leaveemployee` | `/leaves-employee` | `hrm.leaves.employee` | ✅ |
| `leavesettings` | `/leave-settings` | `hrm.leaves.settings` | ❌ |
| `attendanceadmin` | `/attendance-admin` | `hrm.attendance.admin` | ✅ |
| `attendanceemployee` | `/attendance-employee` | `hrm.attendance.employee` | ✅ |
| `timesheet` | `/timesheets` | `hrm.timesheets` | ✅ |
| `scheduletiming` | `/schedule-timing` | `hrm.schedule-timing` | ❌ |
| `shiftsManagement` | `/shifts-management` | `hrm.shifts.management` | ❌ |
| `batchesManagement` | `/batches-management` | `hrm.batches.management` | ❌ |
| `overtime` | `/overtime` | `hrm.overtime` | ✅ |
| `promotion` | `/promotion` | `hrm.promotion` | ✅ |
| `resignation` | `/resignation` | `hrm.resignation` | ✅ |
| `termination` | `/termination` | `hrm.termination` | ✅ |

**Missing Pages**: `hrm.leaves.settings`, `hrm.schedule-timing`, `hrm.shifts.management`, `hrm.batches.management`

---

## Category V: Projects

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `project` | `/projects-grid` | `projects.projects` | ✅ |
| `projectlist` | `/projects` | `projects.projects` | ✅ |
| `projectdetails` | `/projects-details/:projectId` | `projects.projects` | ✅ |
| `tasks` | `/tasks` | `projects.tasks` | ✅ |
| `tasksdetails` | `/task-details/:taskId` | `projects.tasks` | ✅ |
| `taskboard` | `/task-board` | `projects.task-board` | ✅ |
| `milestones` | `/milestones` | `projects.milestones` | ❌ |

**Missing Pages**: `projects.milestones`

---

## Category VI: CRM - Clients

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `clientgrid` | `/clients-grid` | `crm.clients` | ✅ |
| `clientlist` | `/clients` | `crm.clients` | ✅ |
| `clientdetils` | `/clients-details/:clientId` | `crm.clients` | ✅ |

---

## Category VII: CRM - Companies

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `companiesGrid` | `/companies-grid` | `crm.companies` | ✅ |
| `companiesList` | `/companies-list` | `crm.companies` | ✅ |
| `companiesDetails` | `/companies-details/:companyId` | `crm.companies` | ✅ |

---

## Category VIII: CRM - Contacts

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `contactGrid` | `/contact-grid` | `crm.contacts` | ✅ |
| `contactList` | `/contact-list` | `crm.contacts` | ✅ |
| `contactDetails` | `/contact-details/:contactId` | `crm.contacts` | ✅ |

---

## Category IX: CRM - Deals

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `dealsGrid` | `/deals-grid` | `crm.deals` | ✅ |
| `dealsList` | `/deals-list` | `crm.deals` | ✅ |
| `dealsDetails` | `/deals-details` | `crm.deals` | ✅ |

---

## Category X: CRM - Leads

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `leadsList` | `/leads-list` | `crm.leads` | ✅ |
| `leadsGrid` | `/leads-grid` | `crm.leads` | ✅ |
| `leadsDetails` | `/leads-details` | `crm.leads` | ✅ |
| `pipeline` | `/pipeline` | `crm.pipeline` | ✅ |
| `editPipeline` | `/pipeline/edit/:pipelineId` | `crm.pipeline` | ✅ |
| `analytics` | `/analytics` | `crm.analytics` | ✅ |
| `activities` | `/` | `crm.activities` | ✅ |

---

## Category XI: Recruitment

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `jobgrid` | `/job-grid` | `recruitment.jobs` | ❌ |
| `joblist` | `/job-list` | `recruitment.jobs` | ❌ |
| `jobdetails` | `/jobs/:jobId` | `recruitment.jobs` | ❌ |
| `candidatesGrid` | `/candidates-grid` | `recruitment.candidates` | ❌ |
| `candidateslist` | `/candidates` | `recruitment.candidates` | ❌ |
| `candidateskanban` | `/candidates-kanban` | `recruitment.candidates` | ❌ |
| `refferal` | `/refferals` | `recruitment.referrals` | ❌ |

**Missing Pages**: All recruitment pages

---

## Category XII: Finance & Accounts

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `estimate` | `/estimates` | `finance.estimates` | ❌ |
| `invoices` | `/invoices` | `finance.invoices` | ✅ |
| `addinvoice` | `/add-invoices` | `finance.invoices` | ✅ |
| `editinvoice` | `/edit-invoices` | `finance.invoices` | ✅ |
| `invoicesdetails` | `/invoice-details` | `finance.invoices` | ✅ |
| `payments` | `/payments` | `finance.payments` | ❌ |
| `expenses` | `/expenses` | `finance.expenses` | ✅ |
| `providentfund` | `/provident-fund` | `finance.provident-fund` | ❌ |
| `taxes` | `/taxes` | `finance.taxes` | ❌ |
| `employeesalary` | `/employee-salary` | `finance.employee-salary` | ❌ |
| `payslip` | `/payslip` | `finance.payslip` | ❌ |
| `payrollAddition` | `/payroll` | `finance.payroll` | ❌ |
| `payrollOvertime` | `/payroll-overtime` | `finance.payroll-overtime` | ❌ |
| `payrollDeduction` | `/payroll-deduction` | `finance.payroll-deduction` | ❌ |
| `accountsIncome` | `/accounts/accounts-income` | `finance.accounts-income` | ❌ |
| `accountsInvoices` | `/accounts/accounts-invoices` | `finance.accounts-invoices` | ❌ |
| `accountsTransactions` | `/accounts/accounts-transactions` | `finance.accounts-transactions` | ❌ |
| `expense` | `/accounts/expense` | `finance.expenses` | ✅ |
| `expenseCategory` | `/accounts/expense-category` | `finance.expense-categories` | ❌ |
| `categories` | `/accounting/categories` | `finance.categories` | ❌ |
| `budgets` | `/accounting/budgets` | `finance.budgets` | ❌ |
| `budgetexpenses` | `/accounting/budgets-expenses` | `finance.budget-expenses` | ❌ |
| `budgetrevenues` | `accounting/budget-revenues` | `finance.budget-revenues` | ❌ |

**Missing Pages**: Most finance pages

---

## Category XIII: Administration

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `knowledgebase` | `/knowledgebase` | `administration.knowledge-base` | ❌ |
| `activity` | `/activity` | `administration.activities` | ✅ |
| `assetCategories` | `/asset-categories` | `administration.asset-categories` | ❌ |
| `assetList` | `/assets` | `administration.assets` | ✅ |
| `employeeAsset` | `/asset/employee-asset` | `administration.employee-assets` | ❌ |

---

## Category XIV: Reports

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `expensesreport` | `/expenses-report` | `reports.expenses` | ❌ |
| `invoicereport` | `/invoice-report` | `reports.invoices` | ❌ |
| `paymentreport` | `/payment-report` | `reports.payments` | ❌ |
| `projectreport` | `/project-report` | `reports.projects` | ❌ |
| `taskreport` | `/task-report` | `reports.tasks` | ❌ |
| `userreport` | `/user-report` | `reports.users` | ❌ |
| `employeereport` | `/employee-report` | `reports.employees` | ❌ |
| `payslipreport` | `/payslip-report` | `reports.payslips` | ❌ |
| `attendancereport` | `/attendance-report` | `reports.attendance` | ❌ |
| `leavereport` | `/leave-report` | `reports.leaves` | ❌ |
| `dailyreport` | `/daily-report` | `reports.daily` | ❌ |

**Missing Pages**: All report pages

---

## Category XV: Settings

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `customFields` | `/app-settings/custom-fields` | `settings.custom-fields` | ❌ |
| `invoiceSettings` | `/app-settings/invoice-settings` | `settings.invoice-settings` | ❌ |
| `currencies` | `/financial-settings/currencies` | `settings.currencies` | ❌ |
| `paymentGateways` | `/financial-settings/payment-gateways` | `settings.payment-gateways` | ❌ |
| `taxRates` | `/financial-settings/tax-rates` | `settings.tax-rates` | ❌ |
| `connectedApps` | `/general-settings/connected-apps` | `settings.connected-apps` | ❌ |
| `notificationssettings` | `/general-settings/notifications-settings` | `settings.notifications` | ❌ |
| `profilesettings` | `/general-settings/profile-settings` | `settings.profile` | ❌ |
| `securitysettings` | `/general-settings/security-settings` | `settings.security` | ❌ |
| `bussinessSettings` | `/website-settings/bussiness-settings` | `settings.business` | ❌ |
| `seoSettings` | `/website-settings/seo-settings` | `settings.seo` | ❌ |
| `localizationSettings` | `/website-settings/localization-settings` | `settings.localization` | ❌ |
| `prefixes` | `/website-settings/prefixes` | `settings.prefixes` | ❌ |
| `preference` | `/website-settings/preferences` | `settings.preferences` | ❌ |
| `appearance` | `/website-settings/appearance` | `settings.appearance` | ❌ |
| `authenticationSettings` | `/website-settings/authentication-settings` | `settings.authentication` | ❌ |
| `aiSettings` | `/website-settings/ai-settings` | `settings.ai` | ❌ |
| `salarySettings` | `/app-settings/salary-settings` | `settings.salary` | ❌ |
| `approvalSettings` | `/app-settings/approval-settings` | `settings.approvals` | ❌ |
| `leaveType` | `/app-settings/leave-type` | `settings.leave-types` | ❌ |
| `banIpAddress` | `/other-settings/ban-ip-address` | `settings.ban-ip` | ❌ |
| `customCss` | `/other-settings/custom-css` | `settings.custom-css` | ❌ |
| `customJs` | `/other-settings/custom-js` | `settings.custom-js` | ❌ |
| `cronjob` | `/other-settings/cronjob` | `settings.cronjobs` | ❌ |
| `Cronjobschedule` | `/other-settings/cronjob-schedule` | `settings.cronjob-schedule` | ❌ |
| `storage` | `/other-settings/storage-settings` | `settings.storage` | ❌ |
| `backup` | `/other-settings/backup` | `settings.backup` | ❌ |
| `clearcache` | `/other-settings/clear-cache` | `settings.clear-cache` | ❌ |
| `emailSettings` | `/system-settings/email-settings` | `settings.email` | ❌ |
| `emailTemplates` | `/system-settings/email-templates` | `settings.email-templates` | ❌ |
| `gdprCookies` | `/system-settings/gdpr-cookies` | `settings.gdpr` | ❌ |
| `smsSettings` | `/system-settings/sms-settings` | `settings.sms` | ❌ |
| `smsTemplate` | `/system-settings/sms-template` | `settings.sms-templates` | ❌ |
| `otpSettings` | `/system-settings/otp-settings` | `settings.otp` | ❌ |
| `maintenanceMode` | `/system-settings/maintenance-mode` | `settings.maintenance` | ❌ |
| `socialAuthentication` | `/website-settings/social-authentication` | `settings.social-auth` | ❌ |
| `companySettings` | `/website-settings/company-settings` | `settings.company` | ❌ |
| `language` | `/website-settings/language` | `settings.languages` | ❌ |
| `addLanguage` | `/website-settings/add-language` | `settings.languages` | ❌ |
| `languageWeb` | `/website-settings/language-web` | `settings.languages` | ❌ |
| `localization` | `/website-settings/localization` | `settings.localization` | ❌ |

**Missing Pages**: Most settings pages

---

## Category XVI: Content

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `pages` | `/content/pages` | `content.pages` | ❌ |
| `countries` | `/countries` | `content.countries` | ❌ |
| `states` | `/content/states` | `content.states` | ❌ |
| `cities` | `/content/cities` | `content.cities` | ❌ |
| `testimonials` | `/testimonials` | `content.testimonials` | ❌ |
| `faq` | `/faq` | `content.faq` | ❌ |
| `blogs` | `/blogs` | `content.blogs` | ❌ |
| `blogCategories` | `/blog-categories` | `content.blog-categories` | ❌ |
| `blogComments` | `/blog-comments` | `content.blog-comments` | ❌ |
| `blogTags` | `/blog-tags` | `content.blog-tags` | ❌ |

**Missing Pages**: Most content pages

---

## Category XVII: Support

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `contactMessages` | `/support/contact-messages` | `support.contact-messages` | ❌ |
| `tickets` | `/tickets/ticket-list` | `support.tickets` | ❌ |
| `ticketGrid` | `/tickets/ticket-grid` | `support.tickets` | ❌ |
| `ticketList` | `/support/ticket-list` | `support.tickets` | ❌ |
| `ticketDetails` | `/tickets/ticket-details` | `support.ticket-details` | ❌ |

**Missing Pages**: All support pages

---

## Category XVIII: Performance

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `performanceIndicator` | `/performance/performance-indicator` | `performance.indicators` | ✅ |
| `performanceReview` | `/performance/performance-review` | `performance.reviews` | ✅ |
| `performanceAppraisal` | `/preformance/performance-appraisal` | `performance.appraisals` | ✅ |
| `goalTracking` | `/performance/goal-tracking` | `performance.goal-tracking` | ✅ |
| `goalType` | `/performance/goal-type` | `performance.goal-types` | ✅ |

---

## Category XIX: Training

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `trainingList` | `/training/training-list` | `training.trainings` | ✅ |
| `trainers` | `/training/trainers` | `training.trainers` | ✅ |
| `trainingType` | `/training/training-type` | `training.training-types` | ✅ |

---

## Category XX: Main Dashboards

| Route Property | URL Path | Page Code | Status |
|----------------|----------|-----------|--------|
| `adminDashboard` | `/admin-dashboard` | `main.admin-dashboard` | ✅ |
| `employeeDashboard` | `/employee-dashboard` | `main.employee-dashboard` | ✅ |
| `leadsDashboard` | `/leads-dashboard` | `main.leads-dashboard` | ✅ |
| `dealsDashboard` | `/deals-dashboard` | `main.deals-dashboard` | ✅ |
| `hrDashboard` | `/hr-dashboard` | `main.hr-dashboard` | ✅ |

---

## Category XXI: Application (No RBAC)

| Route Property | URL Path | Status |
|----------------|----------|--------|
| `chat` | `/application/chat` | ➖ |
| `voiceCall` | `/application/voice-call` | ➖ |
| `videoCall` | `/application/video-call` | ➖ |
| `outgoingCall` | `/application/outgoing-call` | ➖ |
| `incomingCall` | `/application/incoming-call` | ➖ |
| `callHistory` | `/application/call-history` | ➖ |
| `todo` | `/application/todo` | ➖ |
| `TodoList` | `/application/todo-list` | ➖ |
| `email` | `/application/email` | ➖ |
| `EmailReply` | `/application/email-reply` | ➖ |
| `audioCall` | `/application/audio-call` | ➖ |
| `fileManager` | `/application/file-manager` | ➖ |
| `socialFeed` | `/application/social-feed` | ➖ |
| `kanbanView` | `/application/kanban-view` | ➖ |
| `invoice` | `/application/invoices` | ➖ |

---

## Category XXII: Auth (No RBAC)

| Route Property | URL Path | Status |
|----------------|----------|--------|
| `login` | `/login` | ➖ |
| `register` | `/register` | ➖ |
| `forgotPassword` | `/forgot-password` | ➖ |
| `resetPassword` | `/reset-password` | ➖ |
| `emailVerification` | `/email-verification` | ➖ |
| `twoStepVerification` | `/two-step-verification` | ➖ |
| `lockScreen` | `/lock-screen` | ➖ |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Total Routes** | 409 |
| **Pages Verified** | ~80 |
| **Pages Missing** | ~200+ |
| **No RBAC Needed** | ~50 |
| **UI/Demo Routes** | ~80 |

---

## Priority Pages to Create

### High Priority (Core Business Functions)
1. All Recruitment pages (7 pages)
2. All Finance & Payroll pages (15+ pages)
3. All Report pages (11 pages)
4. All Settings pages (40+ pages)

### Medium Priority (Extended Features)
1. Support pages (5 pages)
2. Content pages (10 pages)
3. Administration missing pages (3 pages)

### Low Priority (Optional Features)
1. UI demo routes (use default permissions)

---

**Next Steps**:
1. Run Pages collection validation agent to confirm missing pages
2. Generate seed script for missing pages
3. Update pagesStatus.csv with findings

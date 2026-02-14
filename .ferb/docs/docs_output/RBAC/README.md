# RBAC System Documentation

**Project:** manageRTC-my
**Last Updated:** 2026-02-11
**Status:** ✅ IMPLEMENTATION COMPLETE - MIGRATION REQUIRED

---

## Overview

This directory contains comprehensive documentation for the Role-Based Access Control (RBAC) system restructuring for the manageRTC-my application.

### Current Status: ✅ IMPLEMENTATION COMPLETE

The RBAC system has been successfully refactored with proper ObjectId references and improved data integrity. **Migration is required to update existing data.**

---

## ⚡ QUICK START - Run Migration

```bash
# Navigate to project root
cd manageRTC-my

# Run the migration script
node backend/seed/migrate-rbac-refs.js
```

This will:
1. Sync Permissions with Pages (add pageId references)
2. Update Plans to use ObjectId for module references
3. Update Companies to use ObjectId for plan references
4. Update Role permissions to include pageId references

---

## Documentation Files

### Implementation Documents (Latest - 2026-02-12)

| Document | Description | Status |
|----------|-------------|--------|
| **[Backend Files Analysis](../ALL_RBAC/BACKEND_FILES_RBAC_ANALYSIS.md)** | Comprehensive backend RBAC analysis - 100+ files | ✅ COMPLETE |
| **[Implementation Completion Report](../../../RBAC_IMPLEMENTATION_COMPLETION_REPORT.md)** | Details of all changes made, before/after comparison | ✅ COMPLETE |
| **[UI Validation Report](../../../RBAC_UI_VALIDATION_REPORT.md)** | Frontend component validation | ✅ COMPLETE |
| **[Structure Validation Report](../../../RBAC_STRUCTURE_VALIDATION_REPORT.md)** | Original analysis and recommendations | ✅ COMPLETE |

### Primary Documents (Previous Analysis - 2026-02-10)

| Document | Description | Status |
|----------|-------------|--------|
| **[Brutal Validation Report](./00_RBTC_BRUTAL_VALIDATION_REPORT.md)** | Complete analysis of RBAC, 181 pages inventory | Reference |
| **[Implementation Guide - Phase 1](./01_IMPLEMENTATION_GUIDE.md)** | Pages Collection Enhancement | ✅ IMPLEMENTED |
| **[Implementation Guide - Phases 2-7](./02_IMPLEMENTATION_GUIDE_PHASES_2-7.md)** | Implementation roadmap | ✅ IMPLEMENTED |

---

## Quick Reference

### Issues Resolved ✅

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Dual Permission Systems | CRITICAL | ✅ Fixed - Embedded with pageId |
| 2 | Pages NOT used for Permissions | CRITICAL | ✅ Fixed - Permission references Page |
| 3 | No `availableActions` in Pages schema | HIGH | ✅ Fixed - Added field |
| 4 | String References in Packages | HIGH | ✅ Fixed - Uses ObjectId |
| 5 | String plan_id in Companies | HIGH | ✅ Fixed - Added planId ObjectId |
| 6 | No "Pages" management UI | MEDIUM | ✅ Fixed - Page created |
| 7 | Module-Page-Permission chain broken | CRITICAL | ✅ Fixed - All linked |

### New Architecture ✅

```
Companies (planId: ObjectId → Plan)
  └─> Plans (planModules[].moduleId: ObjectId → Module)
        └─> Modules (pages[].pageId: ObjectId → Page)
              └─> Pages (availableActions: [String])
                    └─> Permissions (pageId: ObjectId → Page)
                          └─> Roles (permissions[].pageId: ObjectId → Page)
```

---

## Score Improvement

| Component | Before | After | Change |
|-----------|--------|-------|--------|
| Roles | 90% | 95% | +5% |
| Permissions | 40% | 85% | +45% |
| Pages | 40% | 85% | +45% |
| Modules | 85% | 85% | 0% |
| Packages | 60% | 90% | +30% |
| Companies | 60% | 90% | +30% |
| **Overall** | **67%** | **88%** | **+21%** |

---

## Pages Inventory (181 Total Pages)

| Category | Pages | Key Pages |
|----------|-------|-----------|
| Super Admin | 5 | Dashboard, Companies, Subscriptions, Packages, Modules |
| Users & Permissions | 3 | Users, Roles & Permissions, Permission |
| Dashboards | 5 | Admin, HR, Employee, Deals, Leads |
| HRM | 28 | Employees, Departments, Designations, Leaves, Attendance... |
| Recruitment | 3 | Jobs, Candidates, Referrals |
| Projects | 4 | Clients, Projects, Tasks, Task Board |
| CRM | 7 | Contacts, Companies, Deals, Leads, Pipeline... |
| Applications | 14 | Chat, Calls, Calendar, Email, To Do, Notes... |
| Finance & Accounts | 13 | Estimates, Invoices, Payments, Expenses, Payroll... |
| Administration | 27 | Assets, Knowledge Base, Users, Reports, Settings... |
| Content | 10 | Pages, Blogs, Locations, Testimonials, FAQs |
| Pages | 12 | Starter, Profile, Gallery, Pricing, API Keys... |
| Authentication | 9 | Login, Register, Forgot Password, Lock Screen... |
| UI Interface | 7 | Base UI, Advanced UI, Charts, Icons, Forms... |
| Extras | 2 | Documentation, Change Log |

---

## Sidebar Routes Reference

### Super Admin Menu

| Label | Route | Link | Base |
|-------|-------|------|------|
| Dashboard | `superAdminDashboard` | `/super-admin/dashboard` | `super-admin-dashboard` |
| Companies | `superAdminCompanies` | `/super-admin/companies` | `companies` |
| Subscriptions | `superAdminSubscriptions` | `/super-admin/subscription` | `subscriptions` |
| Packages | `superAdminPackages` | `/super-admin/package` | `packages` |
| Modules | `superAdminModules` | `/super-admin/modules` | `modules` |
| Pages | `superAdminPages` | `/super-admin/pages` | `pages` |

### Users & Permissions Menu

| Label | Route | Link |
|-------|-------|------|
| Users | `users` | `/users` |
| Roles & Permissions | `rolePermission` | `/roles-permissions` |
| Permission | `permissionpage` | `/permission` |

### HRM Menu

| Label | Route | Link | Base |
|-------|-------|------|------|
| Employees List | `employeeList` | `/employees` | `employees` |
| Departments | `departments` | `/departments` | `departments` |
| Designations | `designations` | `/designations` | `designations` |
| Policies | `policy` | `/policy` | `policy` |
| Tickets | `tickets` | `/tickets/ticket-list` | `ticket-list` |
| Tickets Detail | `ticketDetails` | `/tickets/ticket-details` | `ticket-details` |
| Holidays | `holidays` | `/hrm/holidays` | `holidays` |
| Leaves (Admin) | `leaveadmin` | `/leaves` | `leaves` |
| Leaves (Employee) | `leaveemployee` | `/leaves-employee` | - |
| Leave Settings | `leavesettings` | `/leave-settings` | - |
| Attendance (Admin) | `attendanceadmin` | `/attendance-admin` | `attendance-admin` |
| Attendance (Employee) | `attendanceemployee` | `/attendance-employee` | `attendance-employee` |
| Timesheet | `timesheet` | `/timesheets` | `timesheet` |
| Shift & Schedule | `scheduletiming` | `/schedule-timing` | `shift-schedule` |
| Shifts Management | `shiftsManagement` | `/shifts-management` | `shifts-management` |
| Shift Batches | `batchesManagement` | `/batches-management` | `batches-management` |
| Overtime | `overtime` | `/overtime` | `overtime` |
| Performance Indicator | `performanceIndicator` | `/performance/performance-indicator` | `indicator` |
| Performance Review | `performanceReview` | `/performance/performance-review` | `review` |
| Performance Appraisal | `performanceAppraisal` | `/preformance/performance-appraisal` | `appraisal` |
| Goal List | `goalTracking` | `/performance/goal-tracking` | `appraisal` |
| Goal Type | `goalType` | `/performance/goal-type` | `appraisal` |
| Training List | `trainingList` | `/training/training-list` | `lists` |
| Trainers | `trainers` | `/training/trainers` | `trainer` |
| Training Type | `trainingType` | `/training/training-type` | `types` |
| Promotion | `promotion` | `/promotion` | `promotion` |
| Resignation | `resignation` | `/resignation` | `resignation` |
| Termination | `termination` | `/termination` | `termination` |

### Projects Menu

| Label | Route | Link | Base |
|-------|-------|------|------|
| Clients | `clientgrid` | `/clients-grid` | `client` |
| Projects | `project` | `/projects-grid` | `projects` |
| Tasks | `tasks` | `/tasks` | `tasks` |
| Task Board | `taskboard` | `/task-board` | `task-board` |

### CRM Menu

| Label | Route | Link | Base |
|-------|-------|------|------|
| Contacts | `contactList` | `/contact-list` | `contact` |
| Companies | `companiesList` | `/companies-list` | `company` |
| Deals | `dealsList` | `/deals-list` | `deals` |
| Leads | `leadsList` | `/leads-list` | `leads` |
| Pipeline | `pipeline` | `/pipeline` | `pipeline` |
| Analytics | `analytics` | `/analytics` | `analytics` |
| Activities | `activity` | `/` | `activity` |

### Recruitment Menu

| Label | Route | Link | Base |
|-------|-------|------|------|
| Jobs | `jobgrid` | `/job-grid` | `jobs` |
| Candidates | `candidatesGrid` | `/candidates-grid` | `candidates` |
| Referrals | `refferal` | `/refferals` | `refferals` |

### Finance & Accounts Menu

#### Sales Submenu
| Label | Route | Link | Base |
|-------|-------|------|------|
| Estimates | `estimate` | `/estimates` | `estimates` |
| Invoices | `invoices` | `/invoices` | `invoices` |
| Payments | `payments` | `/payments` | `payments` |
| Expenses | `expenses` | `/expenses` | `expenses` |
| Provident Fund | `providentfund` | `/provident-fund` | `provident-fund` |
| Taxes | `taxes` | `/taxes` | `taxes` |

#### Accounting Submenu
| Label | Route | Link | Base |
|-------|-------|------|------|
| Categories | `categories` | `/accounting/categories` | `categories` |
| Budgets | `budgets` | `/accounting/budgets` | `budgets` |
| Budget Expenses | `budgetexpenses` | `/accounting/budgets-expenses` | `budget-expenses` |
| Budget Revenues | `budgetrevenues` | `/accounting/budget-revenues` | `budget-revenues` |

#### Payroll Submenu
| Label | Route | Link | Base |
|-------|-------|------|------|
| Employee Salary | `employeesalary` | `/employee-salary` | `employee-salary` |
| Payslip | `payslip` | `/payslip` | `payslip` |
| Payroll Items | `payrollAddition` | `/payroll` | `payroll-items` |

### Administration Menu

#### Assets Submenu
| Label | Route | Link | Base |
|-------|-------|------|------|
| Assets | `assetList` | `/assets` | `asset-list` |
| Asset Categories | `assetCategories` | `/asset-categories` | `asset-categories` |

#### Help & Supports Submenu
| Label | Route | Link | Base |
|-------|-------|------|------|
| Knowledge Base | `knowledgebase` | `/knowledgebase` | `knowledgebase` |
| Activities | `activity` | `/` | `activities` |

#### Reports Submenu
| Label | Route | Link | Base |
|-------|-------|------|------|
| Expense Report | `expensesreport` | `/expenses-report` | `expenses-report` |
| Invoice Report | `invoicereport` | `/invoice-report` | `invoice-report` |
| Payment Report | `paymentreport` | `/payment-report` | `payment-report` |
| Project Report | `projectreport` | `/project-report` | `project-report` |
| Task Report | `taskreport` | `/task-report` | - |
| User Report | `userreport` | `/user-report` | - |
| Employee Report | `employeereport` | `/employee-report` | - |
| Payslip Report | `payslipreport` | `/payslip-report` | - |
| Attendance Report | `attendancereport` | `/attendance-report` | - |
| Leave Report | `leavereport` | `/leave-report` | - |
| Daily Report | `dailyreport` | `/daily-report` | - |

#### Users Submenu
| Label | Route | Link | Base |
|-------|-------|------|------|
| Users | `users` | `/users` | `users` |
| Roles & Permissions | `rolePermission` | `/roles-permissions` | - |
| Permission | `permissionpage` | `/permission` | - |
| Delete Request | `deleteRequest` | `/user-management/delete-request` | - |

---

### Applications Menu

| Label | Route | Link | Base |
|-------|-------|------|------|
| Chat | `chat` | `/application/chat` | `chats` |
| Voice Call | `voiceCall` | `/application/voice-call` | `voice-call` |
| Video Call | `videoCall` | `/application/video-call` | `video-call` |
| Outgoing Call | `outgoingCall` | `/application/outgoing-call` | `outgoing-call` |
| Incoming Call | `incomingCall` | `/application/incoming-call` | `incoming-call` |
| Call History | `callHistory` | `/application/call-history` | `call-history` |
| Calendar | `calendar` | `/calendar` | `calendar` |
| Email | `email` | `/application/email` | `email` |
| To Do | `todo` | `/application/todo` | `todo` |
| Notes | `notes` | `/notes` | `notes` |
| Social Feed | `socialFeed` | `/application/social-feed` | `social-feed` |
| File Manager | `fileManager` | `/application/file-manager` | `file-manager` |
| Kanban | `kanbanView` | `/application/kanban-view` | `kanban` |
| Invoices | `invoice` | `/application/invoices` | `invoices` |

---

### Layout Menu

| Label | Route | Link | Base |
|-------|-------|------|------|
| Horizontal | `Horizontal` | `/layout-horizontal` | `layout-horizontal` |
| Detached | `Detached` | `/layout-detached` | `layout-detached` |
| Modern | `Modern` | `/layout-modern` | `layout-modern` |
| Two Column | `TwoColumn` | `/layout-twocolumn` | `layout-twocolumn` |
| Hovered | `Hovered` | `/layout-hovered` | `layout-hovered` |
| Boxed | `Boxed` | `/layout-box` | `layout-box` |
| Horizontal Single | `HorizontalSingle` | `/layout-horizontal-single` | `layout-horizontal-single` |
| Horizontal Overlay | `HorizontalOverlay` | `/layout-horizontal-overlay` | `layout-horizontal-overlay` |
| Horizontal Box | `HorizontalBox` | `/layout-horizontal-box` | `layout-horizontal-box` |
| Menu Aside | `MenuAside` | `/layout-horizontal-sidemenu` | `layout-horizontal-sidemenu` |
| Transparent | `Transparent` | `/layout-transparent` | `layout-transparent` |
| Without Header | `WithoutHeader` | `/layout-without-header` | `layout-without-header` |
| RTL | `RTL` | `/layout-rtl` | `layout-rtl` |
| Dark | `Dark` | `/layout-dark` | `layout-dark` |

---

### Settings Menu

#### General Settings Submenu
| Label | Route | Link | Base |
|-------|-------|------|------|
| Profile | `profilesettings` | `/general-settings/profile-settings` | `profile-settings` |
| Security | `securitysettings` | `/general-settings/security-settings` | `security-settings` |
| Notifications | `notificationssettings` | `/general-settings/notifications-settings` | `notification-settings` |
| Connected Apps | `connectedApps` | `/general-settings/connected-apps` | `connected-apps` |

#### Website Settings Submenu
| Label | Route | Link | Base |
|-------|-------|------|------|
| Business Settings | `bussinessSettings` | `/website-settings/bussiness-settings` | `bussiness-settings` |
| SEO Settings | `seoSettings` | `/website-settings/seo-settings` | `seo-settings` |
| Localization | `localizationSettings` | `/website-settings/localization-settings` | `localization-settings` |
| Prefixes | `prefixes` | `/website-settings/prefixes` | `prefixes` |
| Preferences | `preference` | `/website-settings/preferences` | `preferences` |
| Appearance | `appearance` | `/website-settings/appearance` | `appearance` |
| Language | `language` | `/website-settings/language` | `language` |
| Authentication | `authenticationSettings` | `/website-settings/authentication-settings` | `authentication-settings` |
| AI Settings | `aiSettings` | `/website-settings/ai-settings` | `ai-settings` |

#### App Settings Submenu
| Label | Route | Link | Base |
|-------|-------|------|------|
| Salary Settings | `salarySettings` | `/app-settings/salary-settings` | `salary-settings` |
| Approval Settings | `approvalSettings` | `/app-settings/approval-settings` | `approval-settings` |
| Invoice Settings | `invoiceSettings` | `/app-settings/invoice-settings` | `invoice-settings` |
| Leave Type | `leaveType` | `/app-settings/leave-type` | `leave-type` |
| Custom Fields | `customFields` | `/app-settings/custom-fields` | `custom-fields` |

#### System Settings Submenu
| Label | Route | Link | Base |
|-------|-------|------|------|
| Email Settings | `emailSettings` | `/system-settings/email-settings` | `email-settings` |
| Email Templates | `emailTemplates` | `/system-settings/email-templates` | `email-template` |
| SMS Settings | `smsSettings` | `/system-settings/sms-settings` | `sms-settings` |
| SMS Templates | `smsTemplate` | `/system-settings/sms-template` | `sms-template` |
| OTP | `otpSettings` | `/system-settings/otp-settings` | `otp-settings` |
| GDPR Cookies | `gdprCookies` | `/system-settings/gdpr-cookies` | `gdpr` |
| Maintenance Mode | `maintenanceMode` | `/system-settings/maintenance-mode` | `maintenance-mode` |

#### Financial Settings Submenu
| Label | Route | Link | Base |
|-------|-------|------|------|
| Payment Gateways | `paymentGateways` | `/financial-settings/payment-gateways` | `payment-gateways` |
| Tax Rate | `taxRates` | `/financial-settings/tax-rates` | `tax-rates` |
| Currencies | `currencies` | `/financial-settings/currencies` | `currencies` |

#### Other Settings Submenu
| Label | Route | Link | Base |
|-------|-------|------|------|
| Custom CSS | `customCss` | `/other-settings/custom-css` | `custom-css` |
| Custom JS | `customJs` | `/other-settings/custom-js` | `custom-js` |
| Cronjob | `cronjob` | `/other-settings/cronjob` | `cronjob` |
| Storage | `storage` | `/other-settings/storage-settings` | `storage-settings` |
| Ban IP Address | `banIpAddress` | `/other-settings/ban-ip-address` | `ban-ip-address` |
| Backup | `backup` | `/other-settings/backup` | `backup` |
| Clear Cache | `clearcache` | `/other-settings/clear-cache` | `clear-cache` |

---

### Content Menu

| Label | Route | Link | Base |
|-------|-------|------|------|
| Pages | `pages` | `/content/pages` | `pages` |
| All Blogs | `blogs` | `blogs` | - |
| Blog Categories | `blogCategories` | `blog-categories` | - |
| Comments | `blogComments` | `blog-comments` | - |
| Blog Tags | `blogTags` | `blog-tags` | - |
| Countries | `countries` | `countries` | `countries` |
| States | `states` | `/content/states` | `states` |
| Cities | `cities` | `/content/cities` | `cities` |
| Testimonials | `testimonials` | `testimonials` | `testimonials` |
| FAQ | `faq` | `faq` | `faq` |

---

### Pages Menu

| Label | Route | Link | Base |
|-------|-------|------|------|
| Starter | `starter` | `/starter` | `starter` |
| Profile | `profile` | `/pages/profile` | `profile` |
| Gallery | `gallery` | `/gallery` | `gallery` |
| Search Results | `searchresult` | `/search-result` | `search-result` |
| Timeline | `timeline` | `/timeline` | `timeline` |
| Pricing | `pricing` | `/pricing` | `pricing` |
| Coming Soon | `comingSoon` | `/coming-soon` | `coming-soon` |
| Under Maintenance | `underMaintenance` | `/under-maintenance` | `under-maintenance` |
| Under Construction | `underConstruction` | `/under-construction` | `under-construction` |
| API Keys | `apikey` | `/api-keys` | `api-keys` |
| Privacy Policy | `privacyPolicy` | `/privacy-policy` | `privacy-policy` |
| Terms & Conditions | `termscondition` | `/terms-condition` | `terms-condition` |

---

### Authentication Menu

#### Login Submenu
| Label | Route | Link |
|-------|-------|------|
| Cover | `login` | `/login` |
| Illustration | `login2` | `/login-2` |
| Basic | `login3` | `/login-3` |

#### Register Submenu
| Label | Route | Link |
|-------|-------|------|
| Cover | `register` | `/register` |
| Illustration | `register2` | `/register-2` |
| Basic | `register3` | `/register-3` |

#### Forgot Password Submenu
| Label | Route | Link |
|-------|-------|------|
| Cover | `forgotPassword` | `/forgot-password` |
| Illustration | `forgotPassword2` | `/forgot-password-2` |
| Basic | `forgotPassword3` | `/forgot-password-3` |

#### Reset Password Submenu
| Label | Route | Link |
|-------|-------|------|
| Cover | `resetPassword` | `/reset-password` |
| Illustration | `resetPassword2` | `/reset-password-2` |
| Basic | `resetPassword3` | `/reset-password-3` |

#### Email Verification Submenu
| Label | Route | Link |
|-------|-------|------|
| Cover | `emailVerification` | `/email-verification` |
| Illustration | `emailVerification2` | `/email-verification-2` |
| Basic | `emailVerification3` | `/email-verification-3` |

#### 2 Step Verification Submenu
| Label | Route | Link |
|-------|-------|------|
| Cover | `twoStepVerification` | `/two-step-verification` |
| Illustration | `twoStepVerification2` | `/two-step-verification-2` |
| Basic | `twoStepVerification3` | `/two-step-verification-3` |

#### Other Auth Pages
| Label | Route | Link | Base |
|-------|-------|------|------|
| Lock Screen | `lockScreen` | `/lock-screen` | - |
| 404 Error | `error404` | `/error-404` | - |
| 500 Error | `error500` | `/error-500` | - |

---

### UI Interface Menu

#### Base UI Submenu (Selected Routes)
| Label | Route | Link | Base |
|-------|-------|------|------|
| Alerts | `alert` | `/ui-alert` | `ui-alerts` |
| Accordions | `accordion` | `/ui-accordion` | `ui-accordion` |
| Avatar | `avatar` | `/ui-avatar` | `ui-avatar` |
| Badges | `badges` | `/ui-badges` | `ui-badges` |
| Borders | `border` | `/ui-border` | `ui-borders` |
| Buttons | `button` | `/ui-buttons` | `ui-buttons` |
| Button Group | `buttonGroup` | `/ui-button-group` | `ui-buttons-group` |
| Breadcrumb | `breadcrums` | `/ui-breadcrums` | `ui-breadcrumb` |
| Cards | `cards` | `/ui-cards` | `ui-cards` |
| Carousel | `carousel` | `/ui-carousel` | `ui-carousel` |
| Colors | `colors` | `/ui-colors` | `ui-colors` |
| Dropdowns | `dropdowns` | `/ui-dropdowns` | `ui-dropdowns` |
| Grid | `grid` | `/ui-grid` | `ui-grid` |
| Images | `images` | `/ui-images` | `ui-images` |
| Lightbox | `lightbox` | `/ui-lightbox` | `ui-lightbox` |
| Media | `media` | `/ui-media` | `ui-media` |
| Modals | `modals` | `/ui-modals` | `ui-modals` |
| Offcanvas | `offcanvas` | `/ui-offcanvas` | `ui-offcanvas` |
| Pagination | `pagination` | `/ui-pagination` | `ui-pagination` |
| Progress Bars | `progress` | `/ui-progress` | `ui-progress` |
| Placeholders | `placeholder` | `/ui-placeholder` | `ui-placeholders` |
| Spinner | `spinner` | `/ui-spinner` | `ui-spinner` |
| Range Slider | `rangeSlider` | `/ui-rangeslider` | `ui-rangeslider` |
| Toasts | `toasts` | `/ui-toasts` | `ui-toasts` |
| Tooltip | `tooltip` | `/ui-tooltip` | `ui-tooltips` |
| Typography | `typography` | `/ui-typography` | `ui-typography` |
| Videos | `video` | `/ui-video` | `ui-video` |
| Sortable | `sortable` | `/ui-sortable` | `ui-sortable` |
| SwiperJs | `swiperjs` | `/ui-swiperjs` | `ui-swiperjs` |

#### Advanced UI Submenu
| Label | Route | Link | Base |
|-------|-------|------|------|
| Ribbon | `ribbon` | `/ui-ribbon` | `ui-ribbon` |
| Clipboard | `clipboard` | `/ui-clipboard` | `ui-clipboard` |
| Drag & Drop | `dragandDrop` | `/ui-drag-drop` | `ui-drag-drop` |
| Rating | `rating` | `/ui-rating` | `ui-rating` |
| Text Editor | `textEditor` | `/ui-text-editor` | `ui-text-editor` |
| Counter | `counter` | `/ui-counter` | `ui-counter` |
| Scrollbar | `scrollBar` | `/ui-scrollbar` | `ui-scrollbar` |
| Timeline | `timeLine` | `/ui-timeline` | `ui-timeline` |

#### Charts Submenu
| Label | Route | Link | Base |
|-------|-------|------|------|
| Apex Charts | `apexChart` | `/ui-apexchart` | `apex-charts` |
| Prime Charts | `primeChart` | `/ui-prime-chart` | `prime-charts` |
| Chart JS | `chartJs` | `/ui-chart-js` | `chart-js` |

#### Icons Submenu
| Label | Route | Link | Base |
|-------|-------|------|------|
| Fontawesome Icons | `fontawesome` | `/ui-fontawesome` | `icon-fontawesome` |
| Bootstrap Icons | `bootstrapIcons` | `/icon-bootstrap` | `icon-bootstrap` |
| Remix Icons | `RemixIcons` | `/icon-remix` | `icon-remix` |
| Feather Icons | `featherIcons` | `/ui-feather-icon` | `icon-feather` |
| Ionic Icons | `iconicIcon` | `/icon-ionic` | `icon-ionic` |
| Material Icons | `materialIcon` | `/ui-material-icon` | `icon-material` |
| pe7 Icons | `pe7icon` | `/ui-icon-pe7` | `icon-pe7` |
| Simpleline Icons | `simpleLineIcon` | `/ui-simpleline` | `icon-simple-line` |
| Themify Icons | `themifyIcon` | `/ui-themify` | `icon-themify` |
| Weather Icons | `weatherIcon` | `/ui-weather-icon` | `icon-weather` |
| Typicon Icons | `typicon` | `/ui-typicon` | `icon-typicon` |
| Flag Icons | `FlagIcons` | `/icon-flag` | `icon-flag` |

#### Forms Submenu (Selected Routes)
| Label | Route | Link | Base |
|-------|-------|------|------|
| Basic Inputs | `basicInput` | `/forms-basic-input` | `form-basic-inputs` |
| Checkbox & Radios | `checkboxandRadion` | `/form-checkbox-radios` | `form-checkbox-radios` |
| Input Groups | `inputGroup` | `/form-input-groups` | `form-input-groups` |
| Grid & Gutters | `gridandGutters` | `/form-grid-gutters` | `form-grid-gutters` |
| Form Select | `formSelect` | `/select` | `form-select` |
| Input Masks | `formMask` | `/form-mask` | `form-mask` |
| File Uploads | `fileUpload` | `/form-fileupload` | `form-fileupload` |
| Horizontal Form | `horizontalForm` | `/form-horizontal` | `form-horizontal` |
| Vertical Form | `verticalForm` | `/form-vertical` | `form-vertical` |
| Floating Labels | `floatingLable` | `/form-floating-labels` | `form-floating-labels` |
| Form Validation | `formValidation` | `/form-validation` | `form-validation` |
| React Select | `reactSelect` | `/select` | `react-select` |
| Form Wizard | `formWizard` | `/form-wizard` | `form-wizard` |

---

### Dashboards Menu

| Label | Route | Link |
|-------|-------|------|
| Admin Dashboard | `adminDashboard` | `/admin-dashboard` |
| Employee Dashboard | `employeeDashboard` | `/employee-dashboard` |
| Leads Dashboard | `leadsDashboard` | `/leads-dashboard` |
| Deals Dashboard | `dealsDashboard` | `/deals-dashboard` |
| HR Dashboard | `hrDashboard` | `/hr-dashboard` |

---

## Route Naming Convention Notes

1. **Route Property Names**: Use camelCase (e.g., `superAdminDashboard`, `rolePermission`)
2. **URL Paths**: Use kebab-case for actual routes (e.g., `/super-admin/dashboard`)
3. **Base Values**: Use kebab-case for base matching (e.g., `super-admin-dashboard`)
4. **Sidebar Labels**: Use Title Case for display (e.g., "Super Admin", "Roles & Permissions")

---

## Implementation Phases

| Phase | Description | Duration | Dependencies |
|-------|-------------|----------|--------------|
| 1 | Pages Collection Enhancement | 2-3 days | None |
| 2 | Roles Restructuring | 2-3 days | Phase 1 |
| 3 | Modules Restructuring | 2 days | Phase 1 |
| 4 | Plans & Companies Fix | 1-2 days | Phase 3 |
| 5 | Permission Middleware | 2-3 days | Phase 2 |
| 6 | Menu Generation & UI Updates | 2 days | Phase 5 |
| 7 | Testing & Documentation | 2-3 days | All |

**Total Estimated Duration:** 13-19 days

---

## Multi-Tenancy Architecture

### Recommended Database Structure:

**AmasQIS Database (Main):**
- SuperAdmin Users
- Companies
- Plans/Packages
- Modules
- Pages (all 181 pages)
- System Roles (templates)

**Company Database (e.g., "company_acme"):**
- Company Users
- Company Roles (copied/customized from system roles)
- All company-specific data (employees, departments, etc.)

### Authentication Flow:

1. User logs in via Clerk
2. JWT includes claims: `{ userId, companyId?, role }`
3. Middleware determines database:
   - SuperAdmin → AmasQIS database
   - Company User → Company-specific database
4. All requests use appropriate database context

---

## Key Questions Answered

### Q1: Should all admins route to main AmasQIS dashboard?

**Answer:** NO. Each company should have its own subdomain or path prefix. AmasQIS dashboard is for SuperAdmin only.

### Q2: Should admin details be stored in AmasQIS DB or company DB?

**Answer:**
- **SuperAdmin Users:** AmasQIS database
- **Company Admins:** Company-specific database
- Authentication token includes `companyId` claim for routing

---

## Getting Started

1. **Read the Brutal Validation Report** to understand current issues
2. **Start with Phase 1** (Pages Enhancement) - it's the foundation
3. **Follow phases sequentially** - each phase builds on the previous
4. **Test thoroughly** before moving to next phase
5. **Create backups** before running migrations

---

## File Inventory

```
.ferb/docs/docs_output/RBAC/
├── README.md                                        # This file
├── 00_RBTC_BRUTAL_VALIDATION_REPORT.md              # Complete analysis (NEW)
├── 01_IMPLEMENTATION_GUIDE.md                       # Phase 1 (NEW)
├── 02_IMPLEMENTATION_GUIDE_PHASES_2-7.md            # Phases 2-7 (NEW)
├── 01_RBAC_REQUIREMENTS_ANALYSIS.md                 # Legacy
├── 02_FILE_VALIDATION_REPORT.md                     # Legacy
├── 03_DATABASE_SCHEMAS.md                           # Legacy
└── 04_IMPLEMENTATION_PLAN.md                        # Legacy
```

---

**Last Updated:** 2026-02-12
**Version:** 3.0 (Updated with Complete Sidebar Routes Reference)

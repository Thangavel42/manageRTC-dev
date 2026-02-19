# Tickets Module - Implementation Guide

## Phase 1: Setup & Configuration ✅ COMPLETE

### Files Modified:
- [all_routes.tsx](react/src/feature-module/router/all_routes.tsx) - Routes configuration

### What Was Done:
1. Hash-based tab navigation (no separate routes needed)
2. Tab configuration for normal users and admins

### Verification:
```bash
# Check routes are correct (should only have main tickets route)
grep "tickets" react/src/feature-module/router/all_routes.tsx
```

**Expected Output:**
```
tickets: '/tickets/ticket-list',
ticketGrid: '/tickets/ticket-grid',
ticketList: '/support/ticket-list',
ticketDetails: '/tickets/ticket-details',
```

---

## Phase 2: Backend Implementation ✅ COMPLETE

### Files Modified:
- [tickets.services.js](backend/services/tickets/tickets.services.js) - Tab filtering logic
- [tickets.socket.controller.js](backend/controllers/tickets/tickets.socket.controller.js) - Socket events

### What Was Done:
1. Added `tab` parameter to `getTicketsByUser()` function
2. Created `getTicketTabCounts()` function
3. Added `tickets/get-tab-counts` socket event
4. Fixed employee ObjectId lookup (clerkUserId → MongoDB _id)

### Backend Socket Events Added:
| Event | Purpose |
|-------|---------|
| `tickets/get-my-tickets` | Get tickets for current tab |
| `tickets/get-tab-counts` | Get count for each tab badge |

### Verification:
```bash
cd backend
npm run dev
```

Check console for these logs when fetching tickets:
```
📋 Tab filtering: my-tickets, Role: manager
📋 Tab filtering: new, Role: hr
```

---

## Phase 3: Frontend Implementation ✅ COMPLETE

### Files Modified:
- [tickets.tsx](react/src/feature-module/tickets/tickets.tsx) - Main tickets page with tabs
- [ticket-details.tsx](react/src/feature-module/tickets/ticket-details.tsx) - "Assigned to you" display

### What Was Done:
1. Added tab navigation with hash links
2. Implemented hash change listener for browser back/forward
3. Fetch and display tab counts in badges
4. Removed status filter dropdown (tabs handle status)
5. Updated fetchTicketsList to include tab parameter

### Tab Structure:
```typescript
// Normal Users (employee, manager, etc.)
const normalUserTabs = [
  { id: 'my-tickets', label: 'My Tickets' },
  { id: 'closed', label: 'Closed' }
];

// HR/Admin Users
const adminTabs = [
  { id: 'new', label: 'New' },
  { id: 'active', label: 'Active' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed', label: 'Closed' },
  { id: 'my-tickets', label: 'My Tickets' }
];
```

### URL Pattern:
- `/tickets/ticket-list#my-tickets` - Default for normal users
- `/tickets/ticket-list#new` - Admin: New tickets
- `/tickets/ticket-list#active` - Admin: Active tickets
- `/tickets/ticket-list#resolved` - Admin: Resolved tickets
- `/tickets/ticket-list#closed` - Closed tickets
- `/tickets/ticket-list#my-tickets` - Admin: My tickets

---

## Phase 4: Role-Based Features ✅ COMPLETE

### Files Modified:
- [ticket-details.tsx](react/src/feature-module/tickets/ticket-details.tsx) - Permissions UI
- [sidebarMenu.jsx](react/src/core/data/json/sidebarMenu.jsx) - Manager menu

### "Assigned to You" Display:
When the current logged-in user is the assignee, they see "Assigned to You" instead of their name.

**Code Location:** [ticket-details.tsx:913-922](c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\tickets\ticket-details.tsx#L913-L922)

### Assigned User Permissions:
| Action | Employee | Manager | HR | Admin |
|--------|----------|--------|-----|-------|
| View Tickets | Created/Assigned | Created/Assigned | All | All |
| Add Comments | Created/Assigned | Created/Assigned | All | All |
| Change Status | Assigned only | Assigned only | All | All |
| Change Priority | Assigned only | Assigned only | All | All |
| Assign Tickets | No | No | Yes | Yes |
| Delete Tickets | No | No | Yes | Yes |

---

## Phase 5: Testing & Validation 🔄 IN PROGRESS

### Test Scenarios:

#### Test 1: Normal User (Employee/Manager)
**User:** Raj Raj (EMP-0364, Manager role)
**URL:** `/tickets/ticket-list#my-tickets`

**Expected Behavior:**
- ✅ Only shows tabs: "My Tickets" and "Closed"
- ✅ My Tickets shows tickets where `createdBy OR assignedTo = Raj Raj`
- ✅ Closed tickets excluded from My Tickets tab
- ✅ Badge shows count of tickets in each tab
- ✅ Can see "Assigned to You" when ticket is assigned to Raj Raj
- ✅ Can add comments to assigned tickets
- ✅ Can change status of assigned tickets
- ✅ Can change priority of assigned tickets

**Commands to test:**
```bash
# 1. Check permissions in database
cd backend
node seed/diagnose-ticket-employee.js

# 2. Verify Clerk metadata
# User should sign out and sign back in after role fix
```

#### Test 2: HR/Admin User
**User:** HR user
**URL:** `/tickets/ticket-list`

**Expected Behavior:**
- ✅ Shows 5 tabs: New, Active, Resolved, Closed, My Tickets
- ✅ New tab shows only Open status tickets
- ✅ Active tab shows In Progress/On Hold/Reopened tickets
- ✅ Resolved tab shows Resolved status tickets
- ✅ Closed tab shows Closed status tickets
- ✅ My Tickets shows HR's personal tickets
- ✅ Can assign tickets to employees
- ✅ Can create new tickets via modal
- ✅ Can delete tickets
- ✅ All tabs show correct counts

#### Test 3: Browser Navigation
**Actions:**
1. Click on different tabs
2. Use browser back button
3. Use forward button
4. Direct URL access with hash

**Expected Behavior:**
- ✅ Tab highlights when clicked
- ✅ URL hash updates correctly
- ✅ Browser back/forward works
- ✅ Direct links work (`/tickets/ticket-list#new`)

---

## Phase 6: Documentation & Cleanup ⏳ TODO

### Cleanup Tasks:
1. Remove debug console.log statements from:
   - [tickets.services.js](c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\services\tickets\tickets.services.js)
   - [tickets.tsx](c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\tickets\tickets.tsx)
   - [ticket-details.tsx](c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\tickets\ticket-details.tsx)

2. Add error boundaries for error handling

3. Add loading skeletons for better UX

---

## 🔧 Troubleshooting

### Issue: Tabs not showing correct tickets
**Check:**
1. Browser console for errors
2. Network tab for failed requests
3. Backend logs for filter queries

**Solution:**
```bash
# Verify backend is running
cd backend
npm run dev

# Check database connection
# Look for: "Connected to MongoDB (Native Client)"
```

### Issue: "Assigned to You" not showing
**Check:**
1. `currentEmployee._id` vs `ticket.assignedTo._id`
2. Both should be MongoDB ObjectId strings

**Solution:**
```javascript
// In ticket-details.tsx, check console for:
console.log('📋 Permissions updated:', {
  currentEmployeeId,
  assignedUserId,
  isCreator,
  isAssigned
});
```

### Issue: Tab counts not updating
**Check:**
1. Socket event listeners for `tickets/get-tab-counts-response`
2. Real-time update listeners on ticket changes

**Solution:**
```javascript
// Verify tab counts are fetched
// Check console for: "📊 Tab counts:"
```

---

## 📊 Socket Events Reference

### Frontend Emits → Backend Listens
| Frontend Emit | Backend Handler |
|---------------|----------------|
| `tickets/get-my-tickets` | `socket.on('tickets/get-my-tickets')` |
| `tickets/get-tab-counts` | `socket.on('tickets/get-tab-counts')` |
| `tickets/dashboard/get-stats` | `socket.on('tickets/dashboard/get-stats')` |
| `tickets/categories/get-categories` | `socket.on('tickets/categories/get-categories')` |
| `tickets/details/get-ticket` | `socket.on('tickets/details/get-ticket')` |
| `tickets/create-ticket` | `socket.on('tickets/create-ticket')` |
| `tickets/update-ticket` | `socket.on('tickets/update-ticket')` |
| `tickets/add-comment` | `socket.on('tickets/add-comment')` |
| `tickets/delete-ticket` | `socket.on('tickets/delete-ticket')` |
| `tickets/assign-ticket` | `socket.on('tickets/assign-ticket')` |
| `tickets/update-status` | `socket.on('tickets/update-status')` |

### Backend Emits → Frontend Listens
| Backend Emit | Frontend Listener |
|--------------|-------------------|
| `tickets/get-my-tickets-response` | `socket.on('tickets/get-my-tickets-response')` |
| `tickets/get-tab-counts-response` | `socket.on('tickets/get-tab-counts-response')` |
| `tickets/dashboard/get-stats-response` | `socket.on('tickets/dashboard/get-stats-response')` |
| `tickets/details/get-ticket-response` | `socket.on('tickets/details/get-ticket-response')` |
| `tickets/create-ticket-response` | `socket.on('tickets/create-ticket-response')` |
| `tickets/update-ticket-response` | `socket.on('tickets/update-ticket-response')` |
| `tickets/add-comment-response` | `socket.on('tickets/add-comment-response')` |
| `tickets/delete-ticket-response` | `socket.on('tickets/delete-ticket-response')` |
| `tickets/assign-ticket-response` | `socket.on('tickets/assign-ticket-response')` |
| `tickets/update-status-response` | `socket.on('tickets/update-status-response')` |
| `tickets/ticket-created` | `socket.on('tickets/ticket-created')` |
| `tickets/ticket-updated` | `socket.on('tickets/ticket-updated')` |
| `tickets/ticket-deleted` | `socket.on('tickets/ticket-deleted')` |

---

## 📝 Quick Reference

### How Tabs Work:
1. **User clicks tab** → `handleTabChange(tabId)` called
2. **Update hash** → `window.location.hash = tabId`
3. **Hash change event** → Triggers tab switch
4. **Fetch tickets** → `socket.emit('tickets/get-my-tickets', { tab })`
5. **Backend filters** → Returns tickets based on tab
6. **Update UI** → Tickets display with new filter

### How Status Change Works:
1. **User changes status** → `handleStatusChange(option)`
2. **Emit update** → `socket.emit('tickets/update-ticket', { ticketId, updateData: { status } })`
3. **Backend validates** → Checks valid transitions
4. **Update database** → Saves new status + history
5. **Broadcast** → All connected clients refresh
6. **Tab counts update** → Badges show new counts

---

**Guide Version:** 1.0
**Last Updated:** 2026-02-19
**Status:** ✅ Implementation Complete - Ready for Testing

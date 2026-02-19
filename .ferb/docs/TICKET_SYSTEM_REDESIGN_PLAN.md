# Ticket Management System Redesign - Implementation Plan

## Summary
Complete redesign of the ticket management system to implement category/subcategory hierarchy, HR-based assignment workflow, and role-based ticket access.

---

## Requirements Analysis

### 1. Category & Subcategory Dropdown (Dynamic)
**Main Categories:**
1. Human Resources (HR) → 8 subcategories
2. IT Support → 7 subcategories
3. Administration → 4 subcategories
4. Finance → 5 subcategories
5. Project / Operations → 5 subcategories
6. Training & Development → 3 subcategories
7. General → 3 subcategories

### 2. Form Field Changes
- **Remove**: `subject` field, `assignTo` field (from create form)
- **Add**: `category` (main), `subCategory` (dynamic)

### 3. New Workflow
- User creates ticket → No direct assignment
- New tickets default to "Open" status with no assignee
- HR/Admin assigns tickets to employees
- Status flow: Open → Assigned → In Progress → On Hold → Resolved → Closed → Reopened

### 4. Access Control
- **Regular users**: See tickets they created OR tickets assigned to them
- **HR/Admin**: See ALL tickets

### 5. Reopen Capability
- Ticket creator can reopen closed tickets

---

## Implementation Plan

### Phase 1: Backend Schema & Data Structure

#### 1.1 Create Ticket Category Schema
**File**: `backend/models/ticketCategory.model.js` (NEW)
```javascript
{
  name: String,           // Main category name
  subCategories: [{
    name: String,         // Subcategory name
    isActive: Boolean
  }],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### 1.2 Update Ticket Schema
**File**: `backend/models/ticket.model.js`
- Remove: `subject` field
- Add: `subCategory` field
- Change: `assignedTo` to optional (for HR assignment later)
- Update: `status` enum to new flow

**New Status Flow:**
```javascript
enum: ['Open', 'Assigned', 'In Progress', 'On Hold', 'Resolved', 'Closed', 'Reopened']
```

#### 1.3 Create Seed Data
**File**: `backend/seed/ticketCategories.seed.js` (NEW)
- All 7 main categories with 35 subcategories

---

### Phase 2: Backend Services & Controllers

#### 2.1 Update Ticket Service
**File**: `backend/services/tickets/tickets.services.js`

**New Functions:**
- `getTicketsByUser(tenantDbName, userId, role)` - Filter by user role
- `assignTicket(tenantDbName, ticketId, assigneeId, assignedBy)` - HR assignment
- `updateTicketStatus(tenantDbName, ticketId, status, userId)` - Status transition

**Updated Functions:**
- `createTicket` - Remove subject, add subCategory, set status to "Open"
- `getTicketsList` - Add user-based filtering

#### 2.2 Update Socket Controller
**File**: `backend/controllers/tickets/tickets.socket.controller.js`

**New Events:**
- `tickets/assign-ticket` - HR assigns ticket to employee
- `tickets/get-my-tickets` - Get tickets for current user

**Updated Events:**
- `tickets/create-ticket` - Handle new structure
- `tickets/list/get-tickets` - Role-based filtering

---

### Phase 3: Frontend Modal Updates

#### 3.1 Update Add Ticket Modal
**File**: `react/src/core/modals/ticketListModal.tsx`

**Changes:**
1. Remove `subject` field
2. Remove `assignedTo` field from create form
3. Add `category` dropdown (7 main categories)
4. Add `subCategory` dropdown (dynamic based on category)
5. Remove `status` field (defaults to "Open")

**UI Pattern:**
```tsx
<div className="mb-3">
  <label>Category *</label>
  <CommonSelect options={mainCategories} onChange={handleCategoryChange} />
</div>
<div className="mb-3">
  <label>Subcategory *</label>
  <CommonSelect options={subCategories} disabled={!selectedCategory} />
</div>
```

---

### Phase 4: Ticket List & Details Pages

#### 4.1 Update Ticket List Page
**File**: `react/src/feature-module/tickets/tickets.tsx`

**Changes:**
- Apply role-based filtering (HR sees all, others see theirs + assigned)
- Show category/subcategory in ticket cards
- Add "Assign Ticket" button for HR users only

#### 4.2 Update Ticket Details Page
**File**: `react/src/feature-module/tickets/ticket-details.tsx`

**Changes:**
- Show category/subcategory hierarchy
- "Assign To" dropdown only for HR users
- "Reopen" button for ticket creator (when status is Closed)
- Update status dropdown with new flow

---

## File Changes Summary

### New Files (3)
1. `backend/models/ticketCategory.model.js` - Category schema
2. `backend/seed/ticketCategories.seed.js` - Seed data
3. `backend/services/tickets/ticketCategories.service.js` - Category service

### Modified Files (6)
1. `backend/models/ticket.model.js` - Schema updates
2. `backend/services/tickets/tickets.services.js` - Business logic
3. `backend/controllers/tickets/tickets.socket.controller.js` - Socket handlers
4. `react/src/core/modals/ticketListModal.tsx` - Add Ticket modal
5. `react/src/feature-module/tickets/tickets.tsx` - List page
6. `react/src/feature-module/tickets/ticket-details.tsx` - Details page

---

## Database Changes

### Ticket Schema Changes
```javascript
// REMOVE
subject: String

// ADD
subCategory: String

// MODIFY
assignedTo: { ... },  // Was required, now optional for HR assignment
status: {
  type: String,
  enum: ['Open', 'Assigned', 'In Progress', 'On Hold', 'Resolved', 'Closed', 'Reopened'],
  default: 'Open'
}
```

---

## API/Socket Events

### New Socket Events
| Event | Direction | Purpose |
|-------|-----------|---------|
| `tickets/categories/get-main-categories` | Client→Server | Get main categories |
| `tickets/categories/get-subcategories` | Client→Server | Get subcategories by category |
| `tickets/assign-ticket` | Client→Server | HR assigns ticket |
| `tickets/get-my-tickets` | Client→Server | User's tickets (created + assigned) |

---

## Status Flow Diagram

```
User Creates Ticket
        ↓
      [OPEN] (No assignee)
        ↓
    HR Assigns
        ↓
   [ASSIGNED] (Has assignee)
        ↓
  [IN PROGRESS] (Employee working)
        ↓
    [ON HOLD] (Paused, optional)
        ↓
   [RESOLVED] (Fix complete)
        ↓
    [CLOSED] (User accepted)
        ↓
  [REOPENED] (User rejected, back to In Progress)
```

---

## Testing Checklist

- [ ] Main categories load correctly
- [ ] Subcategories update dynamically
- [ ] Form validation works without subject/assignTo
- [ ] Tickets created with "Open" status
- [ ] HR can assign tickets
- [ ] Regular users see only their tickets
- [ ] HR/Admin sees all tickets
- [ ] Ticket creator can reopen closed tickets
- [ ] Status transitions work correctly

# Timesheet Module – Full Flow Analysis & Validation

Analyze the entire **Timesheet flow** to verify that:

- The workflow logic is correct
- The UI behavior matches the business rules
- Permissions and approvals work correctly

---

# Pre-Validation Before Loading Timesheet Page

Before loading the Timesheet page, perform the following checks.

## 1. Check User Role

Verify the current user's role from:

- Clerk metadata
OR
- `employees` collection → `account.role`

Possible roles:

- admin
- hr
- manager
- employee

---

## 2. Check Project Assignment

Verify whether the current user is assigned to any project.

If the user is **not assigned to any project**, they **cannot create timesheets**.

---

## 3. Check Project Role Assignment

When a project is created, users are assigned roles in the `projects` collection.

Example structure:

```json
{
  "teamMembers": ["userId"],
  "teamLeader": ["userId"],
  "projectManager": ["userId"]
}

Example:

teamMembers
Array
  0: 69a54b831a76b37802cbcc3b

teamLeader
Array
  0: 69a54add1a76b37802cbcc3a

projectManager
Array
  0: 69a54a091a76b37802cbcc39

  These assignments determine Timesheet access and permissions.

Timesheet Access Rules
1. User Timesheet Access

Any user who creates a time entry:

Can view their own time entries

Can edit/delete their own entries only when status = draft

Can submit the entry for approval (draft → submitted)

Status Rules
Status	Edit	Delete	Resubmit
Draft	Yes	Yes	N/A
Submitted	No	No	No
Approved	No	No	No
Rejected	Yes	No	Yes

Rules:

After rejection, user can edit and resubmit

After approval, user cannot edit or delete

2. Team Leader Permissions

Team Leaders can:

View timesheets of projects they are assigned to

View team member entries

Approve/Reject team member entries

Create their own time entries

Submit their entries for approval

Team Leaders cannot approve their own entries.

3. Project Manager Permissions

Project Managers can:

View all time entries of assigned projects

Approve/Reject:

Team members

Team leaders

Their own entries

They can also:

Create their own time entries

Submit them

4. Project Assignment Restriction

Users with roles:

hr

manager

admin

employee

cannot create timesheets if they are not assigned to any project.

5. HR / Manager / Admin Permissions

These roles can:

View all time entries

Approve/Reject all time entries

Approve/Reject their own entries

6. Admin Restriction

Admin users:

Cannot create time entries

They only:

Review

Approve

Reject

UI Behavior Rules
Approval/Rejection Icons

Approval icons should appear only if the user has approval permission.

Examples:

Approve

Reject

Submit Icon

The creator of the time entry should see the Send icon.

Used to move:

Draft → Submitted
Expected UI State
Role	Create	View	Approve	Delete
Employee	Only if assigned	Own	No	Draft only
Team Leader	Yes	Project entries	Team members	Draft only
Project Manager	Yes	Project entries	All project users	Draft only
HR	Only if assigned	All	All	Draft only
Manager	Only if assigned	All	All	Draft only
Admin	No	All	All	No
Key Things to Verify in Code

Developers must analyze:

Frontend

Timesheet page load logic

Role-based UI rendering

Approval icon visibility

Edit/Delete visibility

Backend

Role validation

Project assignment validation

Approval authority validation

Status transition logic

Final Objective

Ensure the Timesheet module has:

Correct role-based access

Correct project assignment validation

Proper approval workflow

Accurate UI behavior

Secure backend validation


If you want, I can also generate a **clean developer implementation version** (with **API design, Mongo qu

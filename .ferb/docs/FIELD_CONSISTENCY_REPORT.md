# Field Consistency Report: Profile Page vs EmployeeDetails Page

**Generated:** 2026-02-28
**Purpose:** Complete list of all fields in both pages, their presence, and validation rules.

---

## Pages Compared

| Page | File | API Used |
|------|------|----------|
| **Profile Page** | `react/src/feature-module/pages/profile/index.tsx` + `compts/` | `PUT /api/user-profile/current` |
| **EmployeeDetails Page** | `react/src/feature-module/hrm/employees/employeedetails.tsx` | `PUT /api/employees/:id` |

---

## Section 1: Basic / Identity Information

| Field | Profile Page | EmployeeDetails Page | Validation |
|-------|-------------|---------------------|-----------|
| First Name | ✅ View only (header) | ✅ Edit (modal) | Required, min 2 chars |
| Last Name | ✅ View only (header) | ✅ Edit (modal) | Required, min 1 char |
| Email | ✅ Change Request flow | ✅ Change Request / OTP flow | Valid email format |
| Phone | ✅ View only | ✅ Edit | International phone regex |
| Employee ID | ✅ View only | ✅ View only | Auto-generated |
| Department | ✅ View only | ✅ Edit (dropdown) | Required (objectId) |
| Designation | ✅ View only | ✅ Edit (dropdown) | Required (objectId) |
| Date of Joining | ✅ View only | ✅ View only | DD-MM-YYYY, not future |
| Status | ✅ View only | ✅ Edit (dropdown) | Active/Inactive/etc. |
| Profile Photo | ✅ Upload via Cloudinary | ✅ Upload via Cloudinary | Max 4MB |
| About / Bio | ✅ Edit (SkillsSection) | ✅ Edit (about modal) | Not empty (employeedetails), max 2000 chars |

---

## Section 2: Date of Birth & Gender

| Field | Profile Page | EmployeeDetails Page | Validation |
|-------|-------------|---------------------|-----------|
| Date of Birth | ✅ Edit (PersonalInfoSection) | ✅ Edit | **Frontend:** max = today − 15 years, min = today − 100 years; **Backend:** not future, must be ≥15 years old |
| Gender | ✅ Edit (dropdown) | ✅ Edit (CommonSelect) | Male / Female / Other / Prefer not to say |

---

## Section 3: Address Information

> **Both pages now use `react-country-state-city` for dynamic Country → State loading.**
> Field order: Street → Country → State (loaded from country) → City → Postal Code

| Field | Profile Page | EmployeeDetails Page | Required | Validation |
|-------|-------------|---------------------|----------|-----------|
| Street Address | ✅ Edit (textarea) | ✅ Edit (textarea) | ❌ Optional | Max 200 chars |
| Country | ✅ Edit (dynamic select from API) | ✅ Edit (dynamic select from API) | ✅ Required | Must select from list |
| State / Province | ✅ Edit (dynamic select, loaded from Country) | ✅ Edit (dynamic select, loaded from Country) | ✅ Required | Must select after country |
| City | ✅ Edit (free-text) | ✅ Edit (free-text) | ✅ Required | Min 2 chars (profile only) |
| Postal Code | ✅ Edit | ✅ Edit | ✅ Required (profile) | 3–10 chars, alphanumeric |

---

## Section 4: Personal Information (Passport, Marital, etc.)

| Field | Profile Page | EmployeeDetails Page | Required | Validation |
|-------|-------------|---------------------|----------|-----------|
| Passport Number | ✅ Edit (PersonalInfoSection) | ✅ Edit | ❌ Optional | Free-text |
| Passport Expiry Date | ✅ Edit | ✅ Edit | ❌ Optional | Must be future date |
| Passport Country | ✅ Edit (static 170+ country dropdown) | ✅ Edit (static country dropdown) | ❌ Optional | Select from list |
| Nationality | ✅ Edit (CommonSelect from country list) | ✅ Edit (free-text) | ❌ Optional | Free-text / Select |
| Marital Status | ✅ Edit (CommonSelect) | ✅ Edit (native select) | ❌ Optional | Single / Married / Divorced / Widowed |
| No. of Children | ✅ Edit (number input) | ✅ Edit (number input) | ❌ Optional | 0–50 integer |
| Religion | ❌ Not shown | ❌ Not shown | — | — |
| Employment of Spouse | ❌ Not shown | ❌ Not shown | — | — |

---

## Section 5: Emergency Contact

| Field | Profile Page | EmployeeDetails Page | Required | Validation |
|-------|-------------|---------------------|----------|-----------|
| Contact Name | ✅ Edit (EmergencyContactSection) | ✅ Edit (modal) | ✅ Required | Min 2 chars |
| Phone 1 | ✅ Edit | ✅ Edit | ✅ Required | 10–15 digits (strip separators) |
| Phone 2 | ✅ Edit (optional) | ❌ Not present | ❌ Optional | 10–15 digits if filled |
| Relationship | ✅ Edit | ✅ Edit | ✅ Required | Min 2 chars (profile) / Required (employeedetails) |
| Email | ❌ Not shown | ❌ Not shown | — | Schema has it but not displayed |

---

## Section 6: Family Members

> **Note:** Field name difference — employeedetails stores `Name` (capital N), profile stores `familyMemberName`. Both are normalized to `{ Name, relationship, phone }` by the backend controller.

| Field | Profile Page | EmployeeDetails Page | Required | Validation |
|-------|-------------|---------------------|----------|-----------|
| Family Member Name | ✅ Edit (FamilyModal) | ✅ Edit (modal) | ✅ Required | Min 2 chars (modal validation) |
| Relationship | ✅ Edit (dropdown) | ✅ Edit (dropdown) | ✅ Required | Spouse / Father / Mother / Son / Daughter / Brother / Sister / Other |
| Phone | ✅ Edit | ✅ Edit | ✅ Required | Regex: `+?[\d\s\-()]+` |
| Multiple entries | ✅ Yes (add/edit/delete) | ✅ Yes (add/edit/delete) | — | — |

---

## Section 7: Education / Qualifications

> **Field name stored in MongoDB:** `education` (both pages now send `education` key, backend maps `qualifications` → `education` too).

| Field | Profile Page (EducationModal) | EmployeeDetails Page (modal) | Required | Validation |
|-------|------------------------------|------------------------------|----------|-----------|
| Institution | ✅ Edit | ✅ Edit | ✅ Required | Not empty |
| Degree / Course | ✅ Edit | ✅ Edit | ✅ Required | Not empty |
| Start Date | ✅ Edit (date input) | ✅ Edit (date input) | ✅ Required | Valid date |
| End Date | ✅ Edit (date input) | ✅ Edit (date input) | ✅ Required | Must be after start date |
| Grade | ✅ Edit | ✅ Edit | ❌ Optional | Free-text |
| Field of Study | ❌ Removed | ❌ Removed | — | Removed from both pages |
| Year of Passing | ❌ Removed | ❌ Removed | — | Removed from both pages |
| Multiple entries | ✅ Yes | ✅ Yes | — | — |

---

## Section 8: Work Experience

> **MongoDB field:** `experience[].{ company/previousCompany, position/designation, startDate, endDate, current/currentlyWorking }`

| Field | Profile Page (ExperienceModal) | EmployeeDetails Page (modal) | Required | Validation |
|-------|-------------------------------|------------------------------|----------|-----------|
| Company Name | ✅ Edit | ✅ Edit | ✅ Required | Not empty |
| Designation / Position | ✅ Edit (field: `designation`) | ✅ Edit (field: `designation`) | ✅ Required | Not empty |
| Start Date | ✅ Edit | ✅ Edit | ✅ Required | Valid date |
| End Date | ✅ Edit | ✅ Edit | Required if not current | Must be after start date |
| Currently Working | ✅ Edit (checkbox) | ✅ Edit (checkbox) | — | Disables end date if checked |
| Multiple entries | ✅ Yes | ✅ Yes | — | — |

---

## Section 9: Bank Details

> Bank details use a **Change Request** flow — employees cannot edit directly. HR approves changes.

| Field | Profile Page (BankInfoSection) | EmployeeDetails Page | Required | Validation |
|-------|-------------------------------|---------------------|----------|-----------|
| Account Holder Name | ✅ View + Change Request | ✅ Edit | ✅ Required | Min 3 chars (profile) |
| Bank Name | ✅ View + Change Request | ✅ Edit | ✅ Required | Min 3 chars (profile) |
| Account Number | ✅ View (masked) + Change Request | ✅ Edit | ✅ Required | 8–18 digits |
| IFSC Code | ✅ View + Change Request | ✅ Edit | ✅ Required | Pattern: `[A-Z]{4}0[A-Z0-9]{6}` |
| Branch | ✅ View + Change Request | ✅ Edit | ✅ Required | Min 2 chars (profile) |
| Account Type | ✅ View + Change Request | ✅ Edit | ❌ Optional | Savings / Current / etc. |

---

## Section 10: Skills & Bio

| Field | Profile Page (SkillsSection) | EmployeeDetails Page | Required | Validation |
|-------|------------------------------|---------------------|----------|-----------|
| Skills (array) | ✅ Edit (comma-separated tags) | ❌ Not present | ❌ Optional | Each skill max 50 chars |
| Bio / About | ✅ Edit (textarea) | ✅ Edit (about modal) | ❌ Optional (employeedetails requires non-empty) | Max 2000 chars (profile), non-empty (employeedetails) |

---

## Section 11: Social Links

| Field | Profile Page (SocialLinksSection) | EmployeeDetails Page | Required | Validation |
|-------|-----------------------------------|---------------------|----------|-----------|
| LinkedIn URL | ✅ Edit | ❌ Not present | ❌ Optional | URL format starting with https:// |
| Twitter URL | ✅ Edit | ❌ Not present | ❌ Optional | URL format |
| Facebook URL | ✅ Edit | ❌ Not present | ❌ Optional | URL format |
| Instagram URL | ✅ Edit | ❌ Not present | ❌ Optional | URL format |

---

## Section 12: Work / Employment Information (View Only)

| Field | Profile Page | EmployeeDetails Page | Notes |
|-------|-------------|---------------------|-------|
| Employee ID | ✅ View only | ✅ View only | Auto-generated |
| Date of Joining | ✅ View only | ✅ View only | — |
| Department | ✅ View only | ✅ Edit | HR edits only |
| Designation | ✅ View only | ✅ Edit | HR edits only |
| Reporting Manager | ✅ View only | ✅ Edit | HR edits only |
| Employment Type | ✅ View only | ✅ Edit | Full-time / Part-time / Contract / Intern |
| Shift | ✅ View only | ✅ View only | — |
| Company | ✅ View only | ✅ View only | — |

---

## Backend Validation Summary (validate.js)

### Date of Birth
```
- Not in future
- Must be ≥ 15 years before today
- Format: DD-MM-YYYY (employee create/update)
- Format: ISO date (profile update)
```

### Phone Numbers
```
Regex: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/
Frontend (Emergency Contact): strip separators, require 10-15 digits
```

### Bank Details
```
- Account Number: 8–18 digits
- IFSC Code: /^[A-Z]{4}0[A-Z0-9]{6}$/
```

### Education / Experience Dates
```
- Format: DD-MM-YYYY (stored) or ISO (sent)
- End date must be after start date (frontend validation)
```

---

## Country / State Selection (After Fix)

| Location | Before Fix | After Fix |
|----------|-----------|-----------|
| Address — Profile Page (inline) | Static 7 countries, text inputs for state/city | **Dynamic API (`react-country-state-city`)**: Country → loads States |
| Address — Profile Page (compts/AddressInfoSection) | Static 7 countries, text inputs for state/city | **Dynamic API**: Country → loads States |
| Address — AddEmployeeModal | Dynamic API ✅ | Unchanged ✅ |
| Address — EditEmployeeModal | Dynamic API ✅ | Unchanged ✅ |
| Passport Country — Profile PersonalInfoSection | Static 170+ country dropdown | Unchanged (static OK for passport) |
| Passport Country — EmployeeDetails | Static dropdown | Unchanged |

**Field Order (Address edit form — both profile sections):**
1. Street Address (optional)
2. Country *(required)* — dynamic dropdown from API
3. State / Province *(required)* — dynamic dropdown, loaded from selected Country; disabled until country is chosen
4. City *(required)* — free-text input
5. Postal Code *(required)* — 3–10 alphanumeric chars

---

## Modals Used by Both Pages

| Modal | File | Used By Profile | Used By EmployeeDetails |
|-------|------|-----------------|------------------------|
| EducationModal | `react/src/core/modals/EducationModal.tsx` | ✅ | ✅ |
| ExperienceModal | `react/src/core/modals/ExperienceModal.tsx` | ✅ | ✅ |
| FamilyModal | `react/src/core/modals/FamilyModal.tsx` | ✅ | ✅ |
| ChangeRequestsModal | `react/src/core/modals/ChangeRequestsModal.tsx` | ✅ | ✅ |
| MyChangeRequestsModal | `react/src/core/modals/MyChangeRequestsModal.tsx` | ✅ | ❌ |

---

## Files Modified in This Session

| File | Change |
|------|--------|
| `react/src/core/modals/FamilyModal.tsx` | Fixed `useEffect` to read `Name` \| `familyMemberName` \| `name` |
| `react/src/feature-module/pages/profile/compts/AddressInfoSection.tsx` | Dynamic `GetCountries`/`GetState`; correct field order; replaced static list |
| `react/src/feature-module/pages/profile/index.tsx` | Dynamic country-state in inline AddressInfoSection; dateOfBirth min-15-years; expanded country list for passport |
| `backend/middleware/validate.js` | Added 15-year minimum age check to `dateOfBirth` in `create` and `update` schemas |

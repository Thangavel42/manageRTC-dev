# Employee Details Page - Database Storage Analysis

**Date:** 2026-02-26

This document traces exactly how the employee details page (`employeedetails.tsx`) stores data in the database.

---

## Data Flow: Frontend → Backend → Database

### 1. Bank Details Storage

**Frontend Hook** (`useEmployeesREST.ts:708-730`):
```typescript
const updateBankDetails = useCallback(async (
  employeeId: string,
  bankData: any
): Promise<boolean> => {
  const response: ApiResponse = await put(`/employees/${employeeId}`, {
    bank: bankData      // ← Sends under 'bank' key
  });
  // ...
}, []);
```

**Backend Service** (`hrm.employee.js:1694-1760`):
```javascript
export const updateBankDetails = async (companyId, hrId, payload = {}) => {
  // Prepare bank details update
  const updateData = {
    "bank.accountHolderName": payload.bank.accountHolderName || "",  // ← Stores under 'bank.*'
    "bank.accountNumber": payload.bank.accountNumber || "",
    "bank.bankName": payload.bank.bankName || "",
    "bank.ifscCode": payload.bank.ifscCode || "",
    "bank.branch": payload.bank.branch || "",
  };

  await collections.employees.updateOne(
    { employeeId: payload.employeeId },
    { $set: updateData },
    { session }
  );
}
```

**Schema Definition** (`employee.schema.js:381-390`):
```javascript
bankDetails: {        // ← Schema expects 'bankDetails' NOT 'bank'
  bankName: String,
  accountNumber: String,
  ifscCode: String,
  accountType: { type: String, enum: ['Savings', 'Current'] }
  // NOTE: 'branch' and 'accountHolderName' DO NOT EXIST in schema!
}
```

**RESULT:** Data stored at `bank.*` but schema defines `bankDetails.*` → **MISMATCH**

---

### 2. Emergency Contact Storage

**Frontend Hook** (`useEmployeesREST.ts:794-817`):
```typescript
const updateEmergencyContacts = useCallback(async (
  employeeId: string,
  emergencyContacts: any
): Promise<boolean> => {
  const normalizedEmergencyContacts = normalizeEmergencyContactsPayload(emergencyContacts);
  // Returns: [{ name, relationship, phone: [phone1, phone2] }]

  const response: ApiResponse = await put(`/employees/${employeeId}`, {
    emergencyContacts: normalizedEmergencyContacts  // ← Sends as array
  });
  // ...
}, []);
```

**Backend Service** (`hrm.employee.js:2091-2170`):
```javascript
export const updateEmergencyContacts = async (companyId, hrId, payload = {}) => {
  // Get the first contact from array (frontend sends array with one object)
  const firstContact = Array.isArray(payload.emergencyContacts)
    ? payload.emergencyContacts[0]
    : payload.emergencyContacts;

  const updateData = {
    "emergencyContacts": payload.emergencyContacts,  // ← Stores array
  };

  await collections.employees.updateOne(
    { employeeId: payload.employeeId },
    { $set: updateData },
    { session }
  );
}
```

**Schema Definition** (`employee.schema.js:361-379`):
```javascript
emergencyContact: {     // ← Schema expects 'emergencyContact' (singular, not array)
  name: { type: String, trim: true },
  relationship: { type: String, trim: true },
  phone: { type: String, trim: true },      // ← String, not array!
  email: { type: String, lowercase: true, trim: true }
}
```

**RESULT:** Data stored as `emergencyContacts[]` but schema defines `emergencyContact{}` → **MISMATCH**

---

### 3. Personal Information Storage

**Frontend Hook** (`useEmployeesREST.ts:680-702`):
```typescript
const updatePersonalInfo = useCallback(async (
  employeeId: string,
  personalData: any  // { maritalStatus, noOfChildren }
): Promise<boolean> => {
  const response: ApiResponse = await put(`/employees/${employeeId}`, {
    personal: personalData  // ← Sends { maritalStatus, noOfChildren }
  });
  // ...
}, []);
```

**Frontend Form Data** (`employeedetails.tsx:355-358`):
```typescript
const [personalFormData, setPersonalFormData] = useState({
  maritalStatus: 'Select',
  noOfChildren: 0,
});
```

**Backend Service** (`hrm.employee.js:1760-1840`):
```javascript
export const updatePersonalInfo = async (companyId, hrId, payload = {}) => {
  // Prepare personal info update
  const updateData = {
    "personal.passport.number": payload.personal.passport?.number || "",
    "personal.passport.expiryDate": payload.personal.passport?.expiryDate || "",
    "personal.passport.country": payload.personal.passport?.country || "",
    "personal.nationality": payload.personal.nationality || "",
    "personal.religion": payload.personal.religion || "",
    "personal.maritalStatus": payload.personal.maritalStatus || "",  // ← Nested
    "personal.noOfChildren": payload.personal.noOfChildren || 0,     // ← Nested
  };

  await collections.employees.updateOne(
    { employeeId: payload.employeeId },
    { $set: updateData },
    { session }
  );
}
```

**Schema Definition** (`employee.schema.js:44-86`):
```javascript
personal: {
  passport: { number, expiryDate, country },
  nationality: String,
  religion: String,
  maritalStatus: { type: String, ... },  // ← Nested under personal
  noOfChildren: { type: Number, ... }    // ← Nested under personal
}
```

**RESULT:** This one is **CORRECT** - matches schema (`personal.maritalStatus`, `personal.noOfChildren`)

---

### 4. Family Information Storage

**Frontend Hook** (`useEmployeesREST.ts:736-759`):
```typescript
const updateFamilyInfo = useCallback(async (
  employeeId: string,
  familyData: any
): Promise<boolean> => {
  const normalizedFamily = normalizeFamilyPayload(familyData);
  // Maps to: { Name, relationship, phone } (note capital 'Name')

  const response: ApiResponse = await put(`/employees/${employeeId}`, {
    family: normalizedFamily  // ← Stores under 'family' key
  });
  // ...
}, []);
```

**Schema Definition** (`employee.schema.js`):
```javascript
// NOTE: Schema does NOT define 'family' field!
// Family is stored as ad-hoc data
```

**RESULT:** Family data is stored but **NOT DEFINED in schema** → Works but not validated

---

### 5. Education Information Storage

**Frontend Hook** (`useEmployeesREST.ts:765-788`):
```typescript
const updateEducationInfo = useCallback(async (
  employeeId: string,
  educationData: any
): Promise<boolean> => {
  const normalizedEducation = normalizeEducationPayload(educationData);

  const response: ApiResponse = await put(`/employees/${employeeId}`, {
    education: normalizedEducation  // ← Stores under 'education' key
  });
  // ...
}, []);
```

**Schema Definition** (`employee.schema.js:346-351`):
```javascript
qualifications: [{    // ← Schema calls it 'qualifications' NOT 'education'
  degree: String,
  institution: String,
  year: Number,
  field: String
}]
```

**RESULT:** Stored as `education` but schema defines `qualifications` → **MISMATCH**

---

### 6. Experience Information Storage

**Frontend Hook** (`useEmployeesREST.ts:823-846`):
```typescript
const updateExperienceInfo = useCallback(async (
  employeeId: string,
  experienceData: any
): Promise<boolean> => {
  const normalizedExperience = normalizeExperiencePayload(experienceData);

  const response: ApiResponse = await put(`/employees/${employeeId}`, {
    experience: normalizedExperience  // ← Stores under 'experience' key
  });
  // ...
}, []);
```

**Schema Definition** (`employee.schema.js:352-358`):
```javascript
experience: [{    // ← Matches!
  company: String,
  position: String,
  startDate: Date,
  endDate: Date,
  current: Boolean
}]
```

**RESULT:** **CORRECT** - matches schema

---

## Database Storage Summary Table

| Data Section | Frontend Sends | Backend Stores | Schema Expects | Status |
|--------------|----------------|----------------|----------------|--------|
| **Bank Details** | `bank.*` | `bank.*` | `bankDetails.*` | ❌ **MISMATCH** |
| **Emergency Contact** | `emergencyContacts[]` | `emergencyContacts[]` | `emergencyContact{}` | ❌ **MISMATCH** |
| **Personal Info** | `personal.*` | `personal.*` | `personal.*` | ✅ **MATCH** |
| **Address** | `address.*` | `address.*` | `address.*` | ✅ **MATCH** |
| **Family** | `family` | `family` | *(not defined)* | ⚠️ **AD-HOC** |
| **Education** | `education` | `education` | `qualifications` | ❌ **MISMATCH** |
| **Experience** | `experience` | `experience` | `experience` | ✅ **MATCH** |
| **Skills** | `skills` | `skills` | `skills` | ✅ **MATCH** |

---

## Key Insight: Two Parallel Storage Patterns

The system has evolved to support **TWO different storage patterns**:

### Pattern A: Legacy (HR Admin View)
```javascript
{
  bank: { bankName, accountNumber, ifscCode, branch },
  emergencyContacts: [{ name, relationship, phone: [] }],
  education: [{ institution, degree, startDate, endDate, grade }],
  family: [{ Name, relationship, phone }]
}
```

### Pattern B: Schema-Defined (Profile Page)
```javascript
{
  bankDetails: { bankName, accountNumber, ifscCode, accountType },
  emergencyContact: { name, relationship, phone, email },
  qualifications: [{ degree, institution, year, field }],
  personal: { maritalStatus, noOfChildren, nationality, religion, passport }
}
```

---

## Impact Analysis

### What Works Now
1. **HR Admin View** saves to legacy fields (`bank`, `emergencyContacts`, `education`)
2. **Profile Page** saves to schema fields (`bankDetails`, `emergencyContact`, `personal.*`)
3. **BOTH work independently** because MongoDB is schemaless - it accepts any fields

### What Doesn't Work
1. **Data duplication:** Same data stored in two different places
2. **Inconsistent reads:** Each page reads from its own storage location
3. **No single source of truth:** Bank details in `bank` vs `bankDetails`
4. **Migration needed:** Existing data in legacy format won't display on new profile page

---

## The Fix Strategy

### Option 1: Migrate Everything to Schema (Recommended)

**Frontend Changes:**
- Update `employeedetails.tsx` to use schema field names
- Update `useEmployeesREST.ts` to send under correct field names

**Backend Changes:**
- Update `hrm.employee.js` services to store under schema field names
- Add migration script to move existing data

**Migration:**
```javascript
// For each employee:
{
  // Move bank → bankDetails
  bankDetails: {
    bankName: bank?.bankName,
    accountNumber: bank?.accountNumber,
    ifscCode: bank?.ifscCode,
    branch: bank?.branch || '',        // Add to schema
    accountHolderName: bank?.accountHolderName,
    accountType: 'Savings'             // Add default
  },
  // Move emergencyContacts → emergencyContact
  emergencyContact: {
    name: emergencyContacts?.[0]?.name,
    relationship: emergencyContacts?.[0]?.relationship,
    phone: Array.isArray(emergencyContacts?.[0]?.phone)
      ? emergencyContacts[0].phone[0]
      : emergencyContacts?.[0]?.phone
  },
  // Move education → qualifications
  qualifications: education?.map(e => ({
    degree: e.degree,
    institution: e.institution,
    year: new Date(e.startDate).getFullYear()
  }))
}
```

### Option 2: Make Schema Accept Both (Backward Compatible)

Update schema to support both old and new field names:
```javascript
// Virtual field that reads from either location
employeeSchema.virtual('fullBankDetails').get(function() {
  return this.bankDetails || this.bank;
});
```

---

## Recommendation

**Go with Option 1** - Migrate to schema-defined fields:

1. **Update schema** to include missing fields (`branch`, `accountHolderName`)
2. **Update frontend** (employeedetails.tsx) to use schema field names
3. **Update backend** (hrm.employee.js) to store under schema field names
4. **Create migration script** to move existing data
5. **Test thoroughly** - ensure no data loss

This creates a **single source of truth** and eliminates confusion going forward.

# Security Scan Guide - OWASP ZAP (Task 1.7)

## Overview

This guide provides step-by-step instructions for running security scans using OWASP ZAP (Zed Attack Proxy) to validate Phase 1 security fixes for:
- ✅ NoSQL Injection Prevention
- ✅ IDOR (Insecure Direct Object Reference) Prevention
- ✅ Mass Assignment Prevention

## Prerequisites

### 1. Install OWASP ZAP

**Download ZAP:**
- Visit: https://www.zaproxy.org/download/
- Download version: ZAP 2.14+ (latest stable)
- Platforms: Windows, macOS, Linux

**Installation:**
```bash
# Windows
- Run the installer (.exe)
- Accept default options
- Launch ZAP Desktop

# macOS
brew install --cask owasp-zap

# Linux (Debian/Ubuntu)
sudo apt-get update
sudo apt-get install zaproxy
```

### 2. Backend Server Setup

Ensure your backend server is running:
```bash
cd backend
npm run dev
# Server should be running on http://localhost:5000
```

### 3. Test Credentials

Prepare test user accounts with different roles:
- **Employee**: Regular employee account
- **HR**: HR manager account
- **Admin**: System administrator account

---

## Scan Configuration

### Step 1: Create Context in ZAP

1. **Launch OWASP ZAP**
2. **Create New Session**: File → New Session
3. **Create Context**:
   - Right-click Sites → New Context
   - Name: `manageRTC API`
   - Include in Context: `http://localhost:5000/api/.*`

### Step 2: Configure Authentication

1. **Set Authentication Method**:
   - Context → Authentication
   - Method: `JSON-based authentication` or `Script-based authentication`
   - Login URL: `http://localhost:5000/api/auth/login`

2. **Configure Login Request**:
   ```json
   POST /api/auth/login
   Content-Type: application/json

   {
     "email": "test@example.com",
     "password": "testPassword123"
   }
   ```

3. **Set Logged-In Indicator**:
   - Pattern: `"success":true`
   - Location: Response body

4. **Create Users**:
   - Add employee user credentials
   - Add hr user credentials
   - Add admin user credentials

### Step 3: Configure Session Management

1. **Session Management**:
   - Method: `Cookie-based` or `Token-based`
   - If using JWT tokens:
     - Header: `Authorization`
     - Pattern: `Bearer {token}`

---

## Running Security Scans

### Scan 1: NoSQL Injection Testing

**Target Endpoints:**
- `GET /api/employees?search={payload}`
- `GET /api/projects?search={payload}`
- `GET /api/leaves?search={payload}`
- `PUT /api/employees/:id`
- `POST /api/leaves`

**Attack Payloads to Test:**
```bash
# MongoDB Operator Injection
search={"$where": "sleep(5000)"}
search={"$ne": null}
search={"$regex": ".*"}
search={"$gt": ""}

# ReDoS Attempts
search=(a+)+b
search=.*.*.*.*
search=^(a+)+$

# JSON Object Injection
search={"admin": true}
search={"role": "admin"}
```

**Expected Results:**
- ✅ All payloads should return `400 Bad Request`
- ✅ Error message: `INVALID_SEARCH_QUERY`
- ✅ No execution of MongoDB operators
- ✅ Response time < 1 second (ReDoS prevented)

**ZAP Scan Steps:**
1. **Spider/Crawl**: Tools → Spider → Start Scan
2. **Active Scan**: Tools → Active Scan
3. **Configure Scan Policy**:
   - Enable: SQL Injection, NoSQL Injection
   - Enable: Server Side Code Injection
   - Enable: Remote Code Execution
4. **Run Scan** against `/api/employees`, `/api/leaves`, `/api/projects`

**Validation Checklist:**
- [ ] No alerts for NoSQL Injection vulnerabilities
- [ ] All MongoDB operator payloads blocked
- [ ] Search queries with `$where`, `$regex`, `$ne` return 400
- [ ] ReDoS patterns complete quickly (< 1s)
- [ ] Valid search queries still work normally

---

### Scan 2: IDOR (Insecure Direct Object Reference) Testing

**Target Endpoints:**
- `GET /api/employees/:id`
- `PUT /api/employees/:id`
- `GET /api/user-profile/current`
- `PUT /api/user-profile/current`
- `GET /api/employees/me`
- `PUT /api/employees/me`

**Manual Test Cases:**

**Test 1: Access Another Employee's Profile**
```bash
# Login as Employee A (employeeId: EMP-001)
# Try to access Employee B's profile
GET /api/employees/{employeeBId}
Authorization: Bearer {employeeAToken}

# Expected: 403 Forbidden or filtered data (no salary/bankDetails)
```

**Test 2: Update Another Employee's Profile**
```bash
# Login as Employee A
# Try to update Employee B's profile
PUT /api/employees/{employeeBId}
Authorization: Bearer {employeeAToken}
Content-Type: application/json

{
  "phone": "9999999999",
  "role": "admin"
}

# Expected: 403 Forbidden
```

**Test 3: JWT Manipulation**
```bash
# Try with modified/tampered JWT token
GET /api/user-profile/current
Authorization: Bearer {tamperedToken}

# Expected: 401 Unauthorized
```

**ZAP IDOR Testing:**
1. **Fuzzer Tool**:
   - Right-click endpoint → Attack → Fuzz
   - Target: Employee ID parameter
   - Payloads: Valid employee IDs from different users

2. **Active Scan**:
   - Enable: Access Control Testing
   - Enable: Authentication Testing

3. **Manual Testing**:
   - Use ZAP's Manual Request Editor
   - Send requests with different user tokens
   - Verify cross-user access is blocked

**Validation Checklist:**
- [ ] Employees cannot access other employees' profiles
- [ ] Employees cannot update other employees' data
- [ ] Sensitive fields (salary, bankDetails) hidden from non-authorized users
- [ ] JWT tampering rejected with 401
- [ ] requireOwnEmployee middleware blocks cross-user access

---

### Scan 3: Mass Assignment Testing

**Target Endpoints:**
- `PUT /api/employees/me`
- `PUT /api/user-profile/current`
- `PUT /api/employees/:id` (as HR/Admin)

**Attack Payloads:**

**Test 1: Employee Role Privilege Escalation**
```bash
# Login as regular employee
PUT /api/employees/me
Authorization: Bearer {employeeToken}
Content-Type: application/json

{
  "phone": "1234567890",
  "role": "admin",              // ❌ Should be blocked
  "salary": {                   // ❌ Should be blocked
    "basic": 999999,
    "HRA": 50000
  },
  "department": "Executive",    // ❌ Should be blocked
  "_id": "malicious_id",        // ❌ Protected field
  "employeeId": "EMP-HACKER",   // ❌ Protected field
  "companyId": "other_company"  // ❌ Protected field
}

# Expected:
# - phone: Updated ✅
# - role, salary, department, _id, employeeId, companyId: Ignored/Blocked ✅
# - Response: 200 OK (with only allowed fields updated)
```

**Test 2: HR Role Restrictions**
```bash
# Login as HR user
PUT /api/employees/{employeeId}
Authorization: Bearer {hrToken}
Content-Type: application/json

{
  "department": "Engineering",  // ✅ Allowed for HR
  "designation": "Senior Dev",  // ✅ Allowed for HR
  "salary": {                   // ❌ Should be blocked for HR
    "basic": 999999
  },
  "role": "admin"               // ❌ Should be blocked for HR
}

# Expected:
# - department, designation: Updated ✅
# - salary, role: Blocked ✅
```

**Test 3: Admin Full Permissions**
```bash
# Login as Admin user
PUT /api/employees/{employeeId}
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "salary": {                   // ✅ Allowed for Admin
    "basic": 50000
  },
  "bankDetails": {              // ✅ Allowed for Admin
    "accountNumber": "1234567890"
  },
  "_id": "malicious_id",        // ❌ Still protected even for Admin
  "clerkUserId": "malicious"    // ❌ Still protected
}

# Expected:
# - salary, bankDetails: Updated ✅
# - _id, clerkUserId: Blocked ✅
```

**ZAP Mass Assignment Testing:**
1. **Fuzzer Tool**:
   - Right-click request body → Attack → Fuzz
   - Add payloads for restricted fields
   - Run fuzzer with different role tokens

2. **Manual Testing**:
   - Use Manual Request Editor
   - Test each role (employee, hr, admin)
   - Verify field restrictions per role

**Validation Checklist:**
- [ ] Employees cannot update: role, salary, department, protected fields
- [ ] HR cannot update: salary, bankDetails, role
- [ ] Admin cannot update: _id, clerkUserId, employeeId, companyId, createdBy
- [ ] Empty updates rejected (400 Bad Request)
- [ ] Mixed valid/invalid fields: Only valid fields updated
- [ ] Security logging active for blocked fields

---

## Automated Scan Execution

### Quick Scan Script

Create `zap-scan.sh` for automated scanning:

```bash
#!/bin/bash

# OWASP ZAP Automated Scan Script
ZAP_PORT=8090
API_URL="http://localhost:5000"
ZAP_API_KEY="your-api-key-here"

echo "Starting OWASP ZAP API Scan..."

# Start ZAP in daemon mode
zap.sh -daemon -port $ZAP_PORT -config api.key=$ZAP_API_KEY &
sleep 10

# Spider the API
curl "http://localhost:$ZAP_PORT/JSON/spider/action/scan/?url=$API_URL&apikey=$ZAP_API_KEY"
sleep 30

# Active scan
curl "http://localhost:$ZAP_PORT/JSON/ascan/action/scan/?url=$API_URL&apikey=$ZAP_API_KEY"

# Wait for scan to complete
while [ $(curl -s "http://localhost:$ZAP_PORT/JSON/ascan/view/status/?apikey=$ZAP_API_KEY" | jq -r '.status') != "100" ]; do
  echo "Scan progress: $(curl -s "http://localhost:$ZAP_PORT/JSON/ascan/view/status/?apikey=$ZAP_API_KEY" | jq -r '.status')%"
  sleep 10
done

# Generate report
curl "http://localhost:$ZAP_PORT/OTHER/core/other/htmlreport/?apikey=$ZAP_API_KEY" > zap-report.html

echo "Scan complete. Report saved to zap-report.html"
```

**Run the script:**
```bash
chmod +x zap-scan.sh
./zap-scan.sh
```

---

## Interpreting Scan Results

### Alert Severity Levels

| Severity | Color | Action Required |
|----------|-------|-----------------|
| **High** | Red | Fix immediately |
| **Medium** | Orange | Fix before production |
| **Low** | Yellow | Fix if time permits |
| **Informational** | Blue | Review and document |

### Expected Results After Phase 1 Fixes

**✅ PASS Criteria:**
- **NoSQL Injection**: 0 High/Medium alerts
- **IDOR**: 0 High/Medium alerts for profile access
- **Mass Assignment**: 0 High/Medium alerts for role escalation
- **Protected Fields**: Cannot be modified via API

**⚠️ Acceptable Alerts:**
- **Informational**: "Application Error Disclosure" (if error messages are generic)
- **Low**: "Cookie No HttpOnly Flag" (if using HttpOnly cookies)
- **Low**: "X-Content-Type-Options Header Missing" (can be added later)

**❌ FAIL Criteria:**
- Any High/Medium alerts for:
  - NoSQL Injection
  - Command Injection
  - Code Injection
  - Unauthorized Access to other user data
  - Privilege Escalation via mass assignment

### Common False Positives

**1. "SQL Injection" on MongoDB API**
- **Reason**: ZAP might flag generic injection patterns
- **Verification**: Check if MongoDB operators are actually executed
- **Action**: Test manually with MongoDB-specific payloads

**2. "Access Control Issue" on Public Endpoints**
- **Reason**: Some endpoints are intentionally public
- **Verification**: Check if endpoint should be public
- **Action**: Document as intended behavior

**3. "Session Management" warnings**
- **Reason**: Using JWT instead of sessions
- **Verification**: Confirm JWT tokens are secure
- **Action**: Document authentication method

---

## Validation Report Template

Create `SECURITY_VALIDATION_REPORT.md`:

```markdown
# Security Validation Report - Phase 1

**Date**: {current_date}
**Scanner**: OWASP ZAP 2.14+
**Target**: manageRTC Backend API
**URL**: http://localhost:5000/api

## Summary

| Vulnerability | Status | Alerts |
|---------------|--------|--------|
| NoSQL Injection | ✅ FIXED | 0 High, 0 Medium |
| IDOR | ✅ FIXED | 0 High, 0 Medium |
| Mass Assignment | ✅ FIXED | 0 High, 0 Medium |

## Test Results

### 1. NoSQL Injection Prevention
- **Endpoints Tested**: 15+
- **Payloads Tested**: 25+
- **Results**: All MongoDB operators blocked (400 Bad Request)
- **Evidence**:
  - `$where` operator: Blocked ✅
  - `$regex` operator: Blocked ✅
  - `$ne` operator: Blocked ✅
  - ReDoS patterns: Prevented ✅

### 2. IDOR Prevention
- **Endpoints Tested**: 10+
- **Test Cases**: 15+
- **Results**: Cross-user access blocked (403 Forbidden)
- **Evidence**:
  - Employee A cannot access Employee B's profile ✅
  - JWT tampering rejected ✅
  - requireOwnEmployee middleware active ✅

### 3. Mass Assignment Prevention
- **Endpoints Tested**: 5+
- **Test Cases**: 20+
- **Results**: Role-based field restrictions enforced
- **Evidence**:
  - Employee role restrictions: Active ✅
  - HR role restrictions: Active ✅
  - Admin role restrictions: Active ✅
  - Protected fields: Cannot be modified ✅

## Scan Evidence

### ZAP Scan Summary
- **Total Alerts**: {count}
- **High Severity**: 0
- **Medium Severity**: 0
- **Low Severity**: {count}
- **Informational**: {count}

### Manual Test Evidence
- Attached: screenshots/test-results/
- Test scripts: backend/tests/security/

## Recommendations

### Immediate Actions
- [x] Phase 1 security fixes verified
- [ ] Deploy to staging for QA testing
- [ ] Run penetration testing

### Future Enhancements
- [ ] Add rate limiting (Phase 2)
- [ ] Implement CSRF protection (Phase 2)
- [ ] Add input validation schemas (Phase 2)

## Sign-off

**Security Validated By**: {name}
**Date**: {date}
**Approved For**: Staging Deployment

---
**Next Steps**: Deploy to staging, run full regression tests
```

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/security-scan.yml`:

```yaml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1'  # Weekly scan every Monday at 2am

jobs:
  zap-scan:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: cd backend && npm install

      - name: Start backend server
        run: cd backend && npm run dev &
        env:
          NODE_ENV: test

      - name: Wait for server
        run: sleep 10

      - name: Run OWASP ZAP Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'http://localhost:5000'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'

      - name: Upload ZAP Report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: zap-report
          path: zap-report.html

      - name: Check for High/Medium Alerts
        run: |
          if grep -q "High\|Medium" zap-report.html; then
            echo "Security vulnerabilities found!"
            exit 1
          fi
```

---

## Troubleshooting

### Issue 1: ZAP Cannot Authenticate

**Symptom**: All API requests return 401 Unauthorized

**Solution**:
1. Check authentication configuration in ZAP
2. Verify JWT token is being sent in Authorization header
3. Test login endpoint manually first
4. Check token expiration time

```bash
# Test login manually
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testPass123"}'
```

### Issue 2: False Positives for NoSQL Injection

**Symptom**: ZAP reports SQL Injection on MongoDB endpoints

**Solution**:
1. Review alert details carefully
2. Test with actual MongoDB operators manually
3. Verify if the payload is actually executed
4. Mark as false positive if operators are blocked

### Issue 3: Scan Takes Too Long

**Symptom**: Active scan runs for hours

**Solution**:
1. Reduce scan scope to critical endpoints only
2. Adjust scan policy (disable unnecessary tests)
3. Use targeted scans instead of full scan
4. Increase thread count in ZAP settings

### Issue 4: CORS Errors in ZAP

**Symptom**: Requests blocked by CORS policy

**Solution**:
1. Configure backend CORS to allow ZAP proxy
2. Add ZAP proxy IP to CORS whitelist
3. Or disable CORS for testing environment only

```javascript
// backend/server.js
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:8090'],  // Add ZAP port
  credentials: true
};
```

---

## Security Scan Checklist

### Pre-Scan Checklist
- [ ] Backend server running on http://localhost:5000
- [ ] Test user accounts created (employee, hr, admin)
- [ ] OWASP ZAP installed and configured
- [ ] Context and authentication set up in ZAP
- [ ] Unit tests passing (85+ tests)
- [ ] Integration tests passing (60+ tests)

### During Scan
- [ ] Spider/Crawl completed successfully
- [ ] Active scan running on target endpoints
- [ ] Monitor for alerts in real-time
- [ ] Test critical endpoints manually
- [ ] Verify authentication is working

### Post-Scan
- [ ] Review all High/Medium severity alerts
- [ ] Manually verify each alert
- [ ] Document false positives
- [ ] Generate HTML/PDF report
- [ ] Update SECURITY_VALIDATION_REPORT.md
- [ ] Share results with team
- [ ] Fix any issues found
- [ ] Re-scan after fixes

---

## Next Steps

After completing security scans:

1. **Document Results**: Fill out SECURITY_VALIDATION_REPORT.md
2. **Fix Issues**: Address any High/Medium alerts found
3. **Re-scan**: Verify fixes with another scan
4. **Deploy to Staging**: If all tests pass
5. **Penetration Testing**: Hire external security firm (optional)
6. **Plan Phase 2**: Implement remaining security enhancements
   - Rate limiting
   - CSRF protection
   - Input validation schemas
   - SQL injection prevention (if using SQL databases)
   - XSS prevention
   - Security headers (CSP, HSTS, etc.)

---

## Resources

### Documentation
- OWASP ZAP User Guide: https://www.zaproxy.org/docs/
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- NoSQL Injection: https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05.6-Testing_for_NoSQL_Injection

### Tools
- OWASP ZAP: https://www.zaproxy.org/
- Burp Suite: https://portswigger.net/burp (alternative)
- Postman: https://www.postman.com/ (manual testing)

### Training
- OWASP ZAP Tutorial: https://www.zaproxy.org/getting-started/
- API Security Best Practices: https://owasp.org/www-project-api-security/

---

## Contact

For questions about security scans:
- Review: [SECURITY_VALIDATION_REPORT.md](./SECURITY_VALIDATION_REPORT.md)
- Implementation: [SECURITY_IMPLEMENTATION_PLAN.md](./SECURITY_IMPLEMENTATION_PLAN.md)
- Progress: [PHASE1_IMPLEMENTATION_PROGRESS.md](./PHASE1_IMPLEMENTATION_PROGRESS.md)
- Tests: [backend/tests/security/README.md](../../backend/tests/security/README.md)

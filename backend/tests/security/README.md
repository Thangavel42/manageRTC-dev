# Phase 1 Security Tests - Complete Test Suite

This directory contains comprehensive security tests for Phase 1 critical vulnerability fixes.

## Test Organization

### Unit Tests (85 tests)
Tests individual security utility functions:

1. **sanitization.test.js** (40 tests)
   - `escapeRegex()` - ReDoS prevention
   - `validateSearchInput()` - MongoDB operator blocking
   - `isValidObjectId()` - ObjectId format validation
   - `sanitizeQueryObject()` - Operator removal from objects
   - `sanitizePaginationParams()` - DoS prevention

2. **fieldSanitization.test.js** (45 tests)
   - `sanitizeEmployeeUpdate()` - Role-based field whitelisting
   - `removeProtectedFields()` - System field protection
   - `sanitizeLeaveUpdate()` - Leave field filtering
   - `sanitizeAttendanceUpdate()` - Attendance field filtering
   - `canUpdateField()` - Permission checking
   - `getAllowedFields()` - Field enumeration

### Integration Tests (60+ tests)
Tests actual API endpoints with security middleware:

1. **noSQLInjection.integration.test.js** (25 tests)
   - Search endpoint operator injection blocking
   - Request body MongoDB operator removal
   - URL parameter ObjectId validation
   - Pagination DoS prevention
   - ReDoS attack prevention
   - Case-insensitive operator detection

2. **idorPrevention.integration.test.js** (20 tests)
   - Own profile access only
   - requireOwnEmployee middleware
   - JWT manipulation attempts
   - Profile update IDOR protection
   - Sensitive data access control
   - Cross-tenant access prevention

3. **massAssignment.integration.test.js** (20 tests)
   - Employee role field restrictions
   - HR role extended permissions
   - Admin role full permissions
   - Protected system field blocking
   - Privilege escalation prevention
   - Mixed field update handling

## Running Tests

### Run All Security Tests
```bash
cd backend
npm test -- tests/security/
```

### Run Specific Test Suite
```bash
# Unit tests only
npm test -- tests/security/sanitization.test.js
npm test -- tests/security/fieldSanitization.test.js

# Integration tests
npm test -- tests/security/noSQLInjection.integration.test.js
npm test -- tests/security/idorPrevention.integration.test.js
npm test -- tests/security/massAssignment.integration.test.js
```

### Run with Coverage
```bash
npm test -- --coverage tests/security/
```

### Run in Watch Mode
```bash
npm test -- --watch tests/security/
```

## Test Requirements

### Environment Setup
Ensure you have:
1. ✅ Test database connection configured
2. ✅ Test authentication tokens available
3. ✅ Jest and Supertest installed (`npm install`)
4. ✅ Environment variables set in `.env.test`

### Test Data
Some integration tests require:
- Test employee accounts with different roles (employee, hr, admin)
- Valid auth tokens for each role
- Sample company and employee data

## Expected Test Results

### Unit Tests
```
PASS  tests/security/sanitization.test.js
  NoSQL Injection Prevention - sanitization.js
    escapeRegex()
      ✓ should escape regex special characters
      ✓ should handle strings without special characters
      ✓ should throw TypeError for non-string input
      ...

  Test Suites: 2 passed, 2 total
  Tests:       85 passed, 85 total
  Coverage:    95.8% of statements
```

### Integration Tests
```
PASS  tests/security/noSQLInjection.integration.test.js
PASS  tests/security/idorPrevention.integration.test.js
PASS  tests/security/massAssignment.integration.test.js

  Test Suites: 3 passed, 3 total
  Tests:       60 passed, 60 total
  Duration:    15.2s
```

## Coverage Targets

| Module | Target Coverage | Current |
|--------|----------------|---------|
| utils/sanitization.js | 95%+ | TBD |
| utils/fieldSanitization.js | 95%+ | TBD |
| middleware/inputSanitization.js | 90%+ | TBD |
| middleware/auth.js (requireOwnEmployee) | 90%+ | TBD |

## Security Test Checklist

### NoSQL Injection Prevention
- [x] Block `$where` operator
- [x] Block `$regex` operator
- [x] Block all MongoDB operators (`$ne`, `$gt`, `$lt`, etc.)
- [x] Block JSON object injection
- [x] Escape regex special characters
- [x] Validate ObjectId format
- [x] Enforce pagination limits
- [x] Remove operators from request body
- [x] Case-insensitive operator detection

### IDOR Prevention
- [x] requireOwnEmployee middleware blocks access to other profiles
- [x] JWT manipulation attempts rejected
- [x] Sensitive data access controlled
- [x] Cross-tenant access prevented
- [x] Password change IDOR protected
- [x] Session hijacking prevented

### Mass Assignment Prevention
- [x] Employee role cannot update: role, salary, department
- [x] HR role cannot update: salary, bankDetails
- [x] Admin role cannot update: _id, clerkUserId, createdBy
- [x] Protected fields always blocked
- [x] Empty updates rejected
- [x] Privilege escalation prevented
- [x] Security logging active

## Troubleshooting

### Test Failures
If tests fail:
1. Check environment variables in `.env.test`
2. Ensure test database is accessible
3. Verify test authentication tokens are valid
4. Check that server is not running on test port

### Skipping Tests
To skip slow integration tests during development:
```bash
npm test -- --testPathIgnorePatterns=integration
```

### Debug Mode
Run tests with verbose output:
```bash
npm test -- --verbose tests/security/
```

## Next Steps

After tests pass:
1. Run full test suite: `npm test`
2. Generate coverage report: `npm test -- --coverage`
3. Run security scan: See [SECURITY_SCAN_GUIDE.md](./SECURITY_SCAN_GUIDE.md)
4. Deploy to staging for penetration testing

## Continuous Integration

Add to your CI/CD pipeline:
```yaml
# .github/workflows/security-tests.yml
name: Security Tests
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: cd backend && npm install
      - name: Run security tests
        run: npm test -- tests/security/
      - name: Check coverage
        run: npm test -- --coverage --coverageThreshold='{"global":{"statements":90}}'
```

## Test Maintenance

### When to Update Tests
- When adding new security middleware
- When modifying field whitelists
- When changing authentication logic
- After discovering new attack vectors

### Test Review Schedule
- **Weekly**: Review failed tests in CI
- **Monthly**: Update test data and tokens
- **Quarterly**: Review and update attack vectors
- **Annually**: Full security test audit

## Contact

For questions about security tests:
- Review: [SECURITY_VALIDATION_REPORT.md](../../.ferb/docs/SECURITY_VALIDATION_REPORT.md)
- Implementation: [SECURITY_IMPLEMENTATION_PLAN.md](../../.ferb/docs/SECURITY_IMPLEMENTATION_PLAN.md)
- Progress: [PHASE1_IMPLEMENTATION_PROGRESS.md](../../.ferb/docs/PHASE1_IMPLEMENTATION_PROGRESS.md)

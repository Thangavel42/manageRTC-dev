/**
 * Response DTO Unit Tests
 *
 * Tests that API response DTOs correctly filter sensitive data
 * based on user role and self-access context.
 */

import { employeeReferenceDTO, employeeListDTO, employeeDetailDTO } from '../../utils/responseDTO.js';

// ─── Test Data ───────────────────────────────────────────────────────────────

const mockEmployee = {
  _id: '507f1f77bcf86cd799439011',
  employeeId: 'EMP-1234',
  clerkUserId: 'user_abc123xyz',
  firstName: 'John',
  lastName: 'Doe',
  fullName: 'John Doe',
  email: 'john@example.com',
  phone: '+91-9876543210',
  profileImage: 'https://example.com/photo.jpg',
  gender: 'Male',
  dateOfBirth: new Date('1990-01-15'),
  department: 'Engineering',
  departmentName: 'Engineering',
  departmentId: '507f1f77bcf86cd799439022',
  designation: 'Senior Developer',
  designationTitle: 'Senior Developer',
  designationId: '507f1f77bcf86cd799439033',
  employmentType: 'Full-time',
  status: 'Active',
  joiningDate: new Date('2023-01-01'),
  shiftId: '507f1f77bcf86cd799439044',
  batchId: '507f1f77bcf86cd799439055',
  reportingTo: {
    _id: '507f1f77bcf86cd799439066',
    employeeId: 'EMP-5678',
    firstName: 'Jane',
    lastName: 'Manager',
    fullName: 'Jane Manager',
    profileImage: 'https://example.com/jane.jpg',
    salary: { total: 200000 },
  },
  address: {
    street: '123 Main St',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    postalCode: '400001',
  },
  personal: {
    passport: { number: 'P1234567', expiryDate: '2030-12-31', country: 'India' },
    nationality: 'Indian',
    religion: 'Hindu',
    maritalStatus: 'Single',
    bloodGroup: 'O+',
    employmentOfSpouse: '',
    noOfChildren: 0,
  },
  salary: {
    basic: 50000,
    HRA: 20000,
    total: 80000,
    CTC: 960000,
    currency: 'INR',
  },
  bankDetails: {
    accountHolderName: 'John Doe',
    bankName: 'HDFC Bank',
    accountNumber: '1234567890',
    ifscCode: 'HDFC0001234',
    branch: 'Mumbai Main',
    accountType: 'Savings',
  },
  emergencyContact: {
    name: 'Jane Doe',
    phone: '+91-9876543211',
    relationship: 'Spouse',
  },
  account: {
    userName: 'johndoe',
    password: '$2b$10$hashedpassword',
    role: 'employee',
  },
  documents: [{ type: 'aadhar', number: '1234-5678-9012' }],
  education: [{ degree: 'B.Tech', institution: 'IIT' }],
  experience: [{ company: 'Previous Corp', designation: 'Developer' }],
  family: [{ Name: 'Parent', relationship: 'Father', phone: '123' }],
  bio: 'Full stack developer',
  skills: ['JavaScript', 'Node.js'],
  socialProfiles: { linkedin: 'linkedin.com/johndoe' },
  isDeleted: false,
  deletedAt: null,
  deletedBy: null,
  __v: 0,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ─── Reference DTO Tests ─────────────────────────────────────────────────────

describe('employeeReferenceDTO', () => {
  it('should return only minimal fields', () => {
    const result = employeeReferenceDTO(mockEmployee);

    expect(result).toEqual({
      _id: '507f1f77bcf86cd799439011',
      employeeId: 'EMP-1234',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      profileImage: 'https://example.com/photo.jpg',
    });
  });

  it('should NEVER include clerkUserId', () => {
    const result = employeeReferenceDTO(mockEmployee);
    expect(result).not.toHaveProperty('clerkUserId');
  });

  it('should NEVER include salary', () => {
    const result = employeeReferenceDTO(mockEmployee);
    expect(result).not.toHaveProperty('salary');
  });

  it('should NEVER include bankDetails', () => {
    const result = employeeReferenceDTO(mockEmployee);
    expect(result).not.toHaveProperty('bankDetails');
  });

  it('should NEVER include account', () => {
    const result = employeeReferenceDTO(mockEmployee);
    expect(result).not.toHaveProperty('account');
  });

  it('should handle null input', () => {
    expect(employeeReferenceDTO(null)).toBeNull();
    expect(employeeReferenceDTO(undefined)).toBeNull();
  });

  it('should handle employee with missing fields', () => {
    const result = employeeReferenceDTO({ _id: '123' });
    expect(result._id).toBe('123');
    expect(result.firstName).toBe('');
    expect(result.lastName).toBe('');
  });
});

// ─── List DTO Tests ──────────────────────────────────────────────────────────

describe('employeeListDTO', () => {
  describe('employee role', () => {
    it('should return base fields for employee role', () => {
      const result = employeeListDTO(mockEmployee, 'employee');

      expect(result._id).toBe('507f1f77bcf86cd799439011');
      expect(result.employeeId).toBe('EMP-1234');
      expect(result.firstName).toBe('John');
      expect(result.email).toBe('john@example.com');
      expect(result.status).toBe('Active');
    });

    it('should NEVER include clerkUserId', () => {
      const result = employeeListDTO(mockEmployee, 'employee');
      expect(result).not.toHaveProperty('clerkUserId');
    });

    it('should NOT include salary for employee role', () => {
      const result = employeeListDTO(mockEmployee, 'employee');
      expect(result).not.toHaveProperty('salary');
    });

    it('should NOT include bankDetails for employee role', () => {
      const result = employeeListDTO(mockEmployee, 'employee');
      expect(result).not.toHaveProperty('bankDetails');
    });

    it('should NOT include passport for employee role', () => {
      const result = employeeListDTO(mockEmployee, 'employee');
      expect(result).not.toHaveProperty('personal');
      expect(result).not.toHaveProperty('passport');
    });

    it('should NOT include phone for employee role', () => {
      const result = employeeListDTO(mockEmployee, 'employee');
      expect(result).not.toHaveProperty('phone');
    });

    it('should NOT include dateOfBirth for employee role', () => {
      const result = employeeListDTO(mockEmployee, 'employee');
      expect(result).not.toHaveProperty('dateOfBirth');
    });

    it('should NOT include full address for employee role', () => {
      const result = employeeListDTO(mockEmployee, 'employee');
      expect(result).not.toHaveProperty('address');
    });

    it('should NOT include religion for employee role', () => {
      const result = employeeListDTO(mockEmployee, 'employee');
      expect(result).not.toHaveProperty('religion');
    });

    it('should NOT include account for employee role', () => {
      const result = employeeListDTO(mockEmployee, 'employee');
      expect(result).not.toHaveProperty('account');
    });
  });

  describe('hr role', () => {
    it('should include HR fields', () => {
      const result = employeeListDTO(mockEmployee, 'hr');

      expect(result.dateOfBirth).toEqual(mockEmployee.dateOfBirth);
      expect(result.phone).toBe('+91-9876543210');
    });

    it('should include partial address (city/state only)', () => {
      const result = employeeListDTO(mockEmployee, 'hr');

      expect(result.address).toBeDefined();
      expect(result.address.city).toBe('Mumbai');
      expect(result.address.state).toBe('Maharashtra');
      expect(result.address).not.toHaveProperty('street');
      expect(result.address).not.toHaveProperty('postalCode');
    });

    it('should include nationality and maritalStatus', () => {
      const result = employeeListDTO(mockEmployee, 'hr');

      expect(result.nationality).toBe('Indian');
      expect(result.maritalStatus).toBe('Single');
    });

    it('should NOT include salary for HR role in list view', () => {
      const result = employeeListDTO(mockEmployee, 'hr');
      expect(result).not.toHaveProperty('salary');
    });

    it('should NEVER include clerkUserId', () => {
      const result = employeeListDTO(mockEmployee, 'hr');
      expect(result).not.toHaveProperty('clerkUserId');
    });

    it('should NEVER include passport in list view', () => {
      const result = employeeListDTO(mockEmployee, 'hr');
      expect(result).not.toHaveProperty('passport');
    });

    it('should sanitize reporting manager', () => {
      const result = employeeListDTO(mockEmployee, 'hr');

      expect(result.reportingTo).toBeDefined();
      expect(result.reportingTo.fullName).toBe('Jane Manager');
      expect(result.reportingTo).not.toHaveProperty('salary');
      expect(result.reportingTo).not.toHaveProperty('clerkUserId');
    });
  });

  describe('admin role', () => {
    it('should include salary summary', () => {
      const result = employeeListDTO(mockEmployee, 'admin');

      expect(result.salary).toBeDefined();
      expect(result.salary.total).toBe(80000);
      expect(result.salary.CTC).toBe(960000);
    });

    it('should NOT include full salary breakdown in list view', () => {
      const result = employeeListDTO(mockEmployee, 'admin');

      expect(result.salary).not.toHaveProperty('basic');
      expect(result.salary).not.toHaveProperty('HRA');
    });

    it('should NEVER include clerkUserId', () => {
      const result = employeeListDTO(mockEmployee, 'admin');
      expect(result).not.toHaveProperty('clerkUserId');
    });

    it('should NEVER include bankDetails in list view', () => {
      const result = employeeListDTO(mockEmployee, 'admin');
      expect(result).not.toHaveProperty('bankDetails');
    });
  });

  describe('superadmin role', () => {
    it('should behave same as admin', () => {
      const result = employeeListDTO(mockEmployee, 'superadmin');

      expect(result.salary).toBeDefined();
      expect(result.salary.total).toBe(80000);
      expect(result).not.toHaveProperty('clerkUserId');
      expect(result).not.toHaveProperty('bankDetails');
    });
  });

  it('should handle null input', () => {
    expect(employeeListDTO(null, 'admin')).toBeNull();
  });

  it('should default to employee role for unknown roles', () => {
    const result = employeeListDTO(mockEmployee, 'unknown');
    expect(result).not.toHaveProperty('salary');
    expect(result).not.toHaveProperty('phone');
  });
});

// ─── Detail DTO Tests ────────────────────────────────────────────────────────

describe('employeeDetailDTO', () => {
  describe('self-access (isSelf=true)', () => {
    it('should return full data for self-access', () => {
      const result = employeeDetailDTO(mockEmployee, 'employee', true);

      expect(result.salary).toBeDefined();
      expect(result.salary.basic).toBe(50000);
      expect(result.bankDetails).toBeDefined();
      expect(result.bankDetails.accountNumber).toBe('1234567890');
      expect(result.personal).toBeDefined();
      expect(result.personal.passport.number).toBe('P1234567');
      expect(result.emergencyContact).toBeDefined();
    });

    it('should NEVER include clerkUserId even for self', () => {
      const result = employeeDetailDTO(mockEmployee, 'employee', true);
      expect(result).not.toHaveProperty('clerkUserId');
    });

    it('should NEVER include account even for self', () => {
      const result = employeeDetailDTO(mockEmployee, 'employee', true);
      expect(result).not.toHaveProperty('account');
    });

    it('should NEVER include isDeleted', () => {
      const result = employeeDetailDTO(mockEmployee, 'employee', true);
      expect(result).not.toHaveProperty('isDeleted');
    });

    it('should NEVER include __v', () => {
      const result = employeeDetailDTO(mockEmployee, 'employee', true);
      expect(result).not.toHaveProperty('__v');
    });

    it('should sanitize reporting manager in self-access', () => {
      const result = employeeDetailDTO(mockEmployee, 'employee', true);

      if (result.reportingTo) {
        expect(result.reportingTo).not.toHaveProperty('salary');
        expect(result.reportingTo).not.toHaveProperty('clerkUserId');
      }
    });
  });

  describe('admin viewing other employee', () => {
    it('should return full data except NEVER_EXPOSE fields', () => {
      const result = employeeDetailDTO(mockEmployee, 'admin', false);

      expect(result.salary).toBeDefined();
      expect(result.bankDetails).toBeDefined();
      expect(result.personal).toBeDefined();
      expect(result).not.toHaveProperty('clerkUserId');
      expect(result).not.toHaveProperty('account');
    });
  });

  describe('superadmin viewing other employee', () => {
    it('should return full data except NEVER_EXPOSE fields', () => {
      const result = employeeDetailDTO(mockEmployee, 'superadmin', false);

      expect(result.salary).toBeDefined();
      expect(result).not.toHaveProperty('clerkUserId');
      expect(result).not.toHaveProperty('account');
    });
  });

  describe('hr viewing other employee', () => {
    it('should include address, emergency contacts, documents', () => {
      const result = employeeDetailDTO(mockEmployee, 'hr', false);

      expect(result.address).toBeDefined();
      expect(result.emergencyContact).toBeDefined();
      expect(result.documents).toBeDefined();
    });

    it('should include personal info with passport for HR', () => {
      const result = employeeDetailDTO(mockEmployee, 'hr', false);

      expect(result.personal).toBeDefined();
      expect(result.personal.nationality).toBe('Indian');
      expect(result.personal.passport).toBeDefined();
    });

    it('should include education, experience, family', () => {
      const result = employeeDetailDTO(mockEmployee, 'hr', false);

      expect(result.education).toBeDefined();
      expect(result.experience).toBeDefined();
      expect(result.family).toBeDefined();
    });

    it('should NEVER include clerkUserId', () => {
      const result = employeeDetailDTO(mockEmployee, 'hr', false);
      expect(result).not.toHaveProperty('clerkUserId');
    });

    it('should NOT include salary for HR', () => {
      const result = employeeDetailDTO(mockEmployee, 'hr', false);
      expect(result).not.toHaveProperty('salary');
    });

    it('should NOT include bankDetails for HR', () => {
      const result = employeeDetailDTO(mockEmployee, 'hr', false);
      expect(result).not.toHaveProperty('bankDetails');
    });
  });

  describe('employee viewing other employee', () => {
    it('should return list-level fields only', () => {
      const result = employeeDetailDTO(mockEmployee, 'employee', false);

      expect(result.firstName).toBe('John');
      expect(result.email).toBe('john@example.com');
      expect(result.status).toBe('Active');
    });

    it('should NOT include salary', () => {
      const result = employeeDetailDTO(mockEmployee, 'employee', false);
      expect(result).not.toHaveProperty('salary');
    });

    it('should NOT include bankDetails', () => {
      const result = employeeDetailDTO(mockEmployee, 'employee', false);
      expect(result).not.toHaveProperty('bankDetails');
    });

    it('should NOT include passport', () => {
      const result = employeeDetailDTO(mockEmployee, 'employee', false);
      expect(result).not.toHaveProperty('personal');
    });

    it('should NOT include phone', () => {
      const result = employeeDetailDTO(mockEmployee, 'employee', false);
      expect(result).not.toHaveProperty('phone');
    });

    it('should NOT include address', () => {
      const result = employeeDetailDTO(mockEmployee, 'employee', false);
      expect(result).not.toHaveProperty('address');
    });

    it('should NOT include emergency contact', () => {
      const result = employeeDetailDTO(mockEmployee, 'employee', false);
      expect(result).not.toHaveProperty('emergencyContact');
    });

    it('should NEVER include clerkUserId', () => {
      const result = employeeDetailDTO(mockEmployee, 'employee', false);
      expect(result).not.toHaveProperty('clerkUserId');
    });

    it('should NEVER include account', () => {
      const result = employeeDetailDTO(mockEmployee, 'employee', false);
      expect(result).not.toHaveProperty('account');
    });
  });

  it('should handle null input', () => {
    expect(employeeDetailDTO(null, 'admin', false)).toBeNull();
  });
});

// ─── Cross-cutting Security Tests ────────────────────────────────────────────

describe('Security: clerkUserId NEVER exposed', () => {
  const roles = ['employee', 'hr', 'admin', 'superadmin'];

  roles.forEach(role => {
    it(`employeeReferenceDTO should not expose clerkUserId`, () => {
      const result = employeeReferenceDTO(mockEmployee);
      expect(result).not.toHaveProperty('clerkUserId');
    });

    it(`employeeListDTO (${role}) should not expose clerkUserId`, () => {
      const result = employeeListDTO(mockEmployee, role);
      expect(result).not.toHaveProperty('clerkUserId');
    });

    it(`employeeDetailDTO (${role}, self) should not expose clerkUserId`, () => {
      const result = employeeDetailDTO(mockEmployee, role, true);
      expect(result).not.toHaveProperty('clerkUserId');
    });

    it(`employeeDetailDTO (${role}, other) should not expose clerkUserId`, () => {
      const result = employeeDetailDTO(mockEmployee, role, false);
      expect(result).not.toHaveProperty('clerkUserId');
    });
  });
});

describe('Security: account field NEVER exposed', () => {
  const roles = ['employee', 'hr', 'admin', 'superadmin'];

  roles.forEach(role => {
    it(`employeeDetailDTO (${role}, self) should not expose account`, () => {
      const result = employeeDetailDTO(mockEmployee, role, true);
      expect(result).not.toHaveProperty('account');
    });

    it(`employeeDetailDTO (${role}, other) should not expose account`, () => {
      const result = employeeDetailDTO(mockEmployee, role, false);
      expect(result).not.toHaveProperty('account');
    });
  });
});

describe('Security: passport only visible to authorized roles', () => {
  it('employee viewing others should NOT see passport', () => {
    const result = employeeDetailDTO(mockEmployee, 'employee', false);
    expect(result?.personal?.passport).toBeUndefined();
  });

  it('employee viewing self SHOULD see passport', () => {
    const result = employeeDetailDTO(mockEmployee, 'employee', true);
    expect(result.personal.passport.number).toBe('P1234567');
  });

  it('hr viewing others SHOULD see passport', () => {
    const result = employeeDetailDTO(mockEmployee, 'hr', false);
    expect(result.personal.passport).toBeDefined();
  });

  it('admin viewing others SHOULD see passport', () => {
    const result = employeeDetailDTO(mockEmployee, 'admin', false);
    expect(result.personal.passport.number).toBe('P1234567');
  });
});

describe('Security: salary only visible to authorized roles', () => {
  it('employee viewing others should NOT see salary', () => {
    const result = employeeDetailDTO(mockEmployee, 'employee', false);
    expect(result).not.toHaveProperty('salary');
  });

  it('employee viewing self SHOULD see salary', () => {
    const result = employeeDetailDTO(mockEmployee, 'employee', true);
    expect(result.salary).toBeDefined();
  });

  it('hr viewing others should NOT see salary', () => {
    const result = employeeDetailDTO(mockEmployee, 'hr', false);
    expect(result).not.toHaveProperty('salary');
  });

  it('admin viewing others SHOULD see salary', () => {
    const result = employeeDetailDTO(mockEmployee, 'admin', false);
    expect(result.salary).toBeDefined();
  });
});

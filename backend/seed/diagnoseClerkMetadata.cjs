/**
 * Diagnostic to check Clerk user metadata
 */

require('dotenv').config();
const { clerkClient } = require('@clerk/express');

async function diagnose() {
  console.log('=== CLERK METADATA DIAGNOSTIC ===\n');

  const clerkUserId = 'user_3ANkWuAQk8W6KxoaRPL1FM931Ia';

  try {
    const user = await clerkClient.users.getUser(clerkUserId);

    console.log('User found:', !!user);
    console.log('User ID (sub):', user.id);
    console.log('First Name:', user.firstName);
    console.log('Last Name:', user.lastName);
    console.log('Email:', user.emailAddresses[0]?.emailAddress);
    console.log('\n=== PUBLIC METADATA ===');
    console.log('Role:', user.publicMetadata?.role);
    console.log('CompanyId:', user.publicMetadata?.companyId);
    console.log('Company:', user.publicMetadata?.company);
    console.log('EmployeeId:', user.publicMetadata?.employeeId);
    console.log('\n=== UNSAFE METADATA ===');
    console.log('Role:', user.unsafeMetadata?.role);
    console.log('CompanyId:', user.unsafeMetadata?.companyId);
    console.log('\n=== FULL PUBLIC METADATA ===');
    console.log(JSON.stringify(user.publicMetadata, null, 2));

    // Check what database would be used
    const companyId = user.publicMetadata?.companyId || user.publicMetadata?.company;
    console.log('\n=== DATABASE CHECK ===');
    console.log('CompanyId that will be used:', companyId);
    console.log('Expected companyId: 69a52c6d838388b740e80723');
    console.log('Match:', companyId === '69a52c6d838388b740e80723');

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

diagnose().catch(console.error);

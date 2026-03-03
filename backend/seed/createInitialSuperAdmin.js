/**
 * Create Initial SuperAdmin
 * -------------------------
 * Run this script ONCE on a fresh database to bootstrap the first superadmin user.
 *
 * Prerequisites:
 *   1. The Clerk user must already exist in the Clerk dashboard
 *   2. Your .env must have MONGO_URI, MONGODB_URI, MONGODB_DATABASE, and CLERK_SECRET_KEY
 *
 * Usage:
 *   node backend/seed/createInitialSuperAdmin.js
 *
 * What this script does:
 *   1. Connects to MongoDB
 *   2. Asks for Clerk User ID and basic info
 *   3. Sets publicMetadata.role = "superadmin" on the Clerk user
 *   4. Inserts a SuperAdminUser document in MongoDB
 */

import { createClerkClient } from '@clerk/backend';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ── Validate env ─────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const DB_NAME   = process.env.MONGODB_DATABASE || 'AmasQIS';
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!MONGO_URI) {
  console.error('\n❌  MONGO_URI or MONGODB_URI is not set in .env\n');
  process.exit(1);
}
if (!CLERK_SECRET_KEY) {
  console.error('\n❌  CLERK_SECRET_KEY is not set in .env\n');
  process.exit(1);
}

// ── Inline SuperAdminUser schema ──────────────────────────────────────────────
const superAdminUserSchema = new mongoose.Schema({
  clerkUserId:      { type: String, required: true, unique: true, index: true },
  firstName:        { type: String, required: true, trim: true },
  lastName:         { type: String, required: true, trim: true },
  fullName:         { type: String, required: true, trim: true },
  email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:            { type: String, trim: true, default: null },
  gender:           { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'], required: true },
  profileImage:     { type: String, default: null },
  address:          { type: String, default: null },
  status:           { type: String, enum: ['active', 'inactive', 'suspended', 'pending'], default: 'active' },
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdminUser', default: null },
  creatorName:      { type: String, default: 'System Bootstrap' },
  updatedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdminUser', default: null },
  passwordLastReset:{ type: Date, default: null },
  inviteAccepted:   { type: Boolean, default: true },
  inviteAcceptedAt: { type: Date, default: Date.now },
  lastLogin:        { type: Date, default: null },
  loginCount:       { type: Number, default: 0 },
  isDeleted:        { type: Boolean, default: false },
  deletedAt:        { type: Date, default: null },
}, { timestamps: true });

// ── readline helper ───────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question, defaultVal = '') {
  return new Promise(resolve => {
    const prompt = defaultVal ? `${question} [${defaultVal}]: ` : `${question}: `;
    rl.question(prompt, answer => {
      resolve(answer.trim() || defaultVal);
    });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  CREATE INITIAL SUPERADMIN');
  console.log('='.repeat(60));
  console.log('\nThis script creates the first superadmin in a fresh database.');
  console.log('You must have already created the user in the Clerk dashboard.\n');

  // ── Step 1: Collect user details ──────────────────────────────────────────
  const clerkUserId = await ask('Clerk User ID (e.g. user_2abc123XYZ)');
  if (!clerkUserId.startsWith('user_')) {
    console.error('\n❌  That does not look like a Clerk User ID. It should start with "user_"');
    rl.close();
    process.exit(1);
  }

  const firstName = await ask('First name');
  const lastName  = await ask('Last name');
  const email     = await ask('Email address');
  const phone     = await ask('Phone number (optional)', '');
  const gender    = await ask('Gender (male/female/other/prefer_not_to_say)', 'prefer_not_to_say');

  const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
  if (!validGenders.includes(gender)) {
    console.error(`\n❌  Invalid gender. Must be one of: ${validGenders.join(', ')}`);
    rl.close();
    process.exit(1);
  }

  rl.close();

  console.log('\n' + '-'.repeat(60));
  console.log('  Summary of what will be created:');
  console.log('-'.repeat(60));
  console.log(`  Clerk User ID : ${clerkUserId}`);
  console.log(`  Name          : ${firstName} ${lastName}`);
  console.log(`  Email         : ${email}`);
  console.log(`  Phone         : ${phone || '(not set)'}`);
  console.log(`  Gender        : ${gender}`);
  console.log(`  MongoDB DB    : ${DB_NAME}`);
  console.log('-'.repeat(60));

  // ── Step 2: Connect MongoDB ───────────────────────────────────────────────
  console.log('\n[1/4] Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  console.log(`      Connected → ${mongoose.connection.host} / ${DB_NAME}`);

  // Check if a superadmin already exists with this clerkUserId
  const SuperAdminUser = mongoose.models.SuperAdminUser ||
    mongoose.model('SuperAdminUser', superAdminUserSchema);

  const existing = await SuperAdminUser.findOne({ clerkUserId }).lean();
  if (existing) {
    console.error(`\n❌  A SuperAdminUser with clerkUserId "${clerkUserId}" already exists.`);
    console.error(`    Name: ${existing.fullName}, Email: ${existing.email}`);
    console.error('    Use the dashboard to manage existing superadmins.\n');
    await mongoose.disconnect();
    process.exit(1);
  }

  // ── Step 3: Verify Clerk user and set metadata ───────────────────────────
  console.log('\n[2/4] Connecting to Clerk...');
  const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

  let clerkUser;
  try {
    clerkUser = await clerk.users.getUser(clerkUserId);
    console.log(`      Found Clerk user: ${clerkUser.firstName} ${clerkUser.lastName} (${clerkUser.primaryEmailAddress?.emailAddress})`);
  } catch (err) {
    console.error(`\n❌  Clerk user not found: ${err.message}`);
    console.error('    Make sure the Clerk User ID is correct and the user exists in your Clerk application.\n');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('\n[3/4] Setting publicMetadata.role = "superadmin" in Clerk...');
  try {
    const existingMeta = clerkUser.publicMetadata || {};
    await clerk.users.updateUser(clerkUserId, {
      publicMetadata: { ...existingMeta, role: 'superadmin' },
    });

    // Verify
    const verified = await clerk.users.getUser(clerkUserId);
    const actualRole = verified.publicMetadata?.role;
    if (actualRole === 'superadmin') {
      console.log('      ✅ Clerk metadata set and verified — role = "superadmin"');
    } else {
      console.warn(`      ⚠️  Metadata may not have propagated yet. Current role: "${actualRole}"`);
      console.warn('      The role will be correct when the user logs in.');
    }
  } catch (err) {
    console.error(`\n❌  Failed to update Clerk metadata: ${err.message}`);
    console.error('    You can manually set publicMetadata = {"role":"superadmin"} in the Clerk dashboard.\n');
    // Continue anyway — the MongoDB record is still useful
  }

  // ── Step 4: Insert MongoDB record ────────────────────────────────────────
  console.log('\n[4/4] Creating SuperAdminUser document in MongoDB...');
  const doc = await SuperAdminUser.create({
    clerkUserId,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email: email.toLowerCase().trim(),
    phone: phone || null,
    gender,
    status: 'active',
    inviteAccepted: true,
    inviteAcceptedAt: new Date(),
    creatorName: 'System Bootstrap',
  });

  console.log('      ✅ SuperAdminUser created in MongoDB');
  console.log(`      MongoDB ID: ${doc._id}`);

  // ── Done ─────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('  ✅ SUPERADMIN CREATED SUCCESSFULLY');
  console.log('='.repeat(60));
  console.log(`\n  Name       : ${firstName} ${lastName}`);
  console.log(`  Email      : ${email}`);
  console.log(`  Clerk ID   : ${clerkUserId}`);
  console.log(`  MongoDB ID : ${doc._id}`);
  console.log('\n  Next steps:');
  console.log('  1. Log in at your frontend URL with this email and the password set in Clerk');
  console.log('  2. You should see the SuperAdmin dashboard');
  console.log('  3. From the dashboard you can create companies and additional superadmins');
  console.log('\n' + '='.repeat(60) + '\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async err => {
  console.error('\n❌  Fatal error:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

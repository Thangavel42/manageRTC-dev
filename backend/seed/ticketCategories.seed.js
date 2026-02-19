/**
 * Ticket Categories Seed Data
 * Main Categories with Subcategories as per requirements
 */

const ticketCategoriesData = [
  {
    name: "Human Resources (HR)",
    description: "Covers all employee-related matters",
    icon: "ti ti-users",
    subCategories: [
      "Leave & Attendance",
      "Payroll & Payslip",
      "Benefits & Insurance",
      "Employee Information Update",
      "Policy Clarification",
      "Grievance / Complaint",
      "Exit & Resignation",
      "Performance Review"
    ]
  },
  {
    name: "IT Support",
    description: "Technical support and system access issues",
    icon: "ti ti-device-laptop",
    subCategories: [
      "System Access Issue",
      "Email Issue",
      "Software/Application Issue",
      "Hardware Issue",
      "Network / Internet Issue",
      "Account Unlock / Password Reset",
      "VPN / Remote Access"
    ]
  },
  {
    name: "Administration",
    description: "Facility and administrative support",
    icon: "ti ti-building",
    subCategories: [
      "Facility Issue",
      "Asset Request",
      "ID Card / Access Card",
      "Travel Request",
      "Meeting Room Booking Issue"
    ]
  },
  {
    name: "Finance",
    description: "Financial and accounting related matters",
    icon: "ti ti-currency-dollar",
    subCategories: [
      "Reimbursement",
      "Invoice Clarification",
      "Salary Discrepancy",
      "Tax Documents",
      "Advance Request"
    ]
  },
  {
    name: "Project / Operations",
    description: "Project management and operations support",
    icon: "ti ti-rocket",
    subCategories: [
      "Project Access Request",
      "Requirement Clarification",
      "Task Allocation Issue",
      "Client Escalation",
      "Deployment Issue"
    ]
  },
  {
    name: "Training & Development",
    description: "Learning and skill development",
    icon: "ti ti-graduation-cap",
    subCategories: [
      "Training Enrollment",
      "Certification Support",
      "Skill Development Request"
    ]
  },
  {
    name: "General",
    description: "General inquiries and suggestions",
    icon: "ti ti-message-circle",
    subCategories: [
      "General Inquiry",
      "Suggestion",
      "Other"
    ]
  }
];

/**
 * Seed ticket categories for a tenant
 * @param {string} tenantDbName - Tenant database name
 * @param {object} collections - Tenant collections object
 */
async function seedTicketCategories(tenantDbName, collections) {
  try {
    console.log(`\n📁 Seeding ticket categories for tenant: ${tenantDbName}`);

    // Check if categories already exist
    const existingCategories = await collections.ticketCategories.countDocuments();
    if (existingCategories > 0) {
      console.log(`✅ Ticket categories already exist (${existingCategories} found). Skipping seed.`);
      return;
    }

    // Prepare categories with subcategory objects
    const categoriesToInsert = ticketCategoriesData.map(cat => ({
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      subCategories: cat.subCategories.map(sub => ({
        name: sub,
        isActive: true
      })),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Insert categories
    const result = await collections.ticketCategories.insertMany(categoriesToInsert);
    console.log(`✅ Successfully seeded ${result.insertedCount} ticket categories`);

    // Log summary
    categoriesToInsert.forEach(cat => {
      console.log(`   - ${cat.name}: ${cat.subCategories.length} subcategories`);
    });

    return result;
  } catch (error) {
    console.error(`❌ Error seeding ticket categories for ${tenantDbName}:`, error);
    throw error;
  }
}

/**
 * Re-seed ticket categories (clears existing and adds new)
 * @param {string} tenantDbName - Tenant database name
 * @param {object} collections - Tenant collections object
 */
async function reseedTicketCategories(tenantDbName, collections) {
  try {
    console.log(`\n🔄 Re-seeding ticket categories for tenant: ${tenantDbName}`);

    // Clear existing categories
    const deleteResult = await collections.ticketCategories.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing categories`);

    // Seed new categories
    return await seedTicketCategories(tenantDbName, collections);
  } catch (error) {
    console.error(`❌ Error re-seeding ticket categories for ${tenantDbName}:`, error);
    throw error;
  }
}

// Export for use in other scripts
export { ticketCategoriesData, seedTicketCategories, reseedTicketCategories };

// Run directly if executed
if (import.meta.url === `file://${process.argv[1]}`) {
  import('../config/db.js').then(async ({ getTenantCollections, connectDB }) => {
    const tenantDbName = process.argv[2] || 'amc_user_001';

    try {
      // Force output to be visible immediately
      process.stdout.write('🔌 Connecting to database...\n');

      // Connect to database first
      await connectDB();

      process.stdout.write('✅ Database connected\n');

      const collections = getTenantCollections(tenantDbName);

      // Check existing categories first
      const existingCount = await collections.ticketCategories.countDocuments();
      process.stdout.write(`📊 Found ${existingCount} existing categories\n`);

      // Always use reseed to ensure categories are up to date
      await reseedTicketCategories(tenantDbName, collections);

      process.stdout.write('\n✨ Ticket categories seeding completed\n');
      process.exit(0);
    } catch (error) {
      process.stderr.write('\n❌ Seeding failed: ' + error.message + '\n');
      console.error(error);
      process.exit(1);
    }
  });
}

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
 * Seed ticket categories into the superadmin (AmasQIS) database.
 * Only seeds if categories don't already exist.
 * Called automatically on server startup.
 */
async function seedTicketCategories() {
  try {
    const { getsuperadminCollections } = await import('../config/db.js');
    const collections = getsuperadminCollections();

    // Check if categories already exist
    const existingCategories = await collections.ticketCategories.countDocuments();
    if (existingCategories > 0) {
      console.log(`✅ Ticket categories already exist (${existingCategories} found). Skipping seed.`);
      return;
    }

    console.log('📁 Seeding ticket categories into superadmin database...');

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
    console.error('❌ Error seeding ticket categories:', error);
    throw error;
  }
}

/**
 * Re-seed ticket categories (clears existing and adds new)
 */
async function reseedTicketCategories() {
  try {
    const { getsuperadminCollections } = await import('../config/db.js');
    const collections = getsuperadminCollections();

    console.log('🔄 Re-seeding ticket categories in superadmin database...');

    // Clear existing categories
    const deleteResult = await collections.ticketCategories.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing categories`);

    // Seed new categories
    return await seedTicketCategories();
  } catch (error) {
    console.error('❌ Error re-seeding ticket categories:', error);
    throw error;
  }
}

// Export for use in other scripts
export { ticketCategoriesData, seedTicketCategories, reseedTicketCategories };

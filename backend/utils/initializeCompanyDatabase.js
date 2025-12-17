// backend/utils/initializeCompanyDatabase.js
import { client } from "../config/db.js";

/**
 * Initialize a new database for a company with default collections and data
 * @param {string} companyId - The company's _id to use as database name
 * @returns {Promise<{done: boolean, error?: any}>}
 */
export const initializeCompanyDatabase = async (companyId) => {
  try {
    // Use company ID as database name
    const db = client.db(companyId);

    // Create essential collections with initial schema validation or indexes
    const collectionsToCreate = [
      "employees",
      "departments",
      "designations",
      "projects",
      "clients",
      "tasks",
      "attendance",
      "leaves",
      "leaveTypes",
      "leaveRequests",
      "invoices",
      "deals",
      "activities",
      "todos",
      "schedules",
      "assets",
      "assetCategories",
      "holidays",
      "meetings",
      "notifications",
      "skills",
      "salaryHistory",
      "pipelines",
      "stages",
      "conversations",
      "messages",
      "socialFeeds",
      "follows",
      "hashtags",
      "permissions",
      "policy",
      "notes",
      "candidates",
      "jobApplications",
      "performanceIndicators",
      "performanceAppraisals",
      "performanceReviews",
      "termination",
      "resignation",
      "stats",
    ];

    // Create all collections
    for (const collectionName of collectionsToCreate) {
      try {
        await db.createCollection(collectionName);
        console.log(`✅ Created collection: ${collectionName} in database: ${companyId}`);
      } catch (error) {
        // Collection might already exist, ignore the error
        if (error.code !== 48) {
          // 48 = NamespaceExists
          console.warn(`Warning creating ${collectionName}:`, error.message);
        }
      }
    }

    // Initialize default departments
    const departmentsCollection = db.collection("departments");
    const defaultDepartments = [
      { department: "Human Resources", createdAt: new Date() },
      { department: "Engineering", createdAt: new Date() },
      { department: "Sales", createdAt: new Date() },
      { department: "Marketing", createdAt: new Date() },
      { department: "Finance", createdAt: new Date() },
    ];

    await departmentsCollection.insertMany(defaultDepartments);
    console.log(`✅ Inserted default departments for company: ${companyId}`);

    // Initialize default leave types
    const leaveTypesCollection = db.collection("leaveTypes");
    const defaultLeaveTypes = [
      { name: "Sick Leave", days: 10, createdAt: new Date() },
      { name: "Casual Leave", days: 12, createdAt: new Date() },
      { name: "Paid Leave", days: 15, createdAt: new Date() },
      { name: "Maternity Leave", days: 90, createdAt: new Date() },
      { name: "Paternity Leave", days: 7, createdAt: new Date() },
    ];

    await leaveTypesCollection.insertMany(defaultLeaveTypes);
    console.log(`✅ Inserted default leave types for company: ${companyId}`);

    // Initialize default asset categories
    const assetCategoriesCollection = db.collection("assetCategories");
    const defaultAssetCategories = [
      { name: "Office Furniture", status: "active", createdAt: new Date() },
      { name: "Electronics", status: "active", createdAt: new Date() },
      { name: "Computers & Laptops", status: "active", createdAt: new Date() },
      { name: "Mobile Devices", status: "active", createdAt: new Date() },
      { name: "Vehicles", status: "active", createdAt: new Date() },
    ];

    await assetCategoriesCollection.insertMany(defaultAssetCategories);
    console.log(`✅ Inserted default asset categories for company: ${companyId}`);

    // Initialize stats collection with default values
    const statsCollection = db.collection("stats");
    await statsCollection.insertOne({
      totalEmployees: 0,
      activeEmployees: 0,
      totalProjects: 0,
      totalClients: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✅ Initialized stats for company: ${companyId}`);

    return {
      done: true,
      message: `Database ${companyId} initialized successfully`,
    };
  } catch (error) {
    console.error(`❌ Error initializing database for company ${companyId}:`, error);
    return {
      done: false,
      error: error.message,
    };
  }
};

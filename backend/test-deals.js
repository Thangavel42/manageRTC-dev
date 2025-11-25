import { MongoClient } from "mongodb";
// import * as dealService from "./services/deal/deal.services.js"; // Commented out to avoid import errors

// Simple Mongo-only test similar to test-activities.js
// Adjust these if needed
const uri = "mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/";
const companyId = "68443081dcdfe43152aebf80";

async function testDeals() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(companyId);
    const dealsCollection = db.collection("deals");

    // Test 1: Check if deals collection exists
    const collections = await db.listCollections().toArray();
    const hasDeals = collections.some((col) => col.name === "deals");
    console.log("Deals collection exists:", hasDeals);

    if (!hasDeals) {
      console.log("Creating deals collection (implicit on insert)...");
    }

    // Test 2: Insert a sample deal with new schema fields
    const sampleDeal = {
      name: "Test Deal - Website Redesign",
      initials: "WR",
      stage: "New",
      status: "Open",
      dealValue: 125000,
      probability: 75,
      expectedClosedDate: new Date("2025-02-10"),
      owner: {
        name: "John Doe",
        avatar: "https://example.com/avatar.jpg"
      },
      contact: {
        email: "john.doe@example.com",
        phone: "+1-555-0123"
      },
      address: "New York, United States",
      tags: ["Collab", "Promotion"],
      
      // Legacy fields for backward compatibility
      pipeline: "Sales",
      currency: "USD",
      dueDate: new Date("2025-01-25"),
      description: "This is a test deal for the HRMS system",
      companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      priority: "High",
    };

    const insertResult = await dealsCollection.insertOne(sampleDeal);
    console.log("Sample deal inserted:", insertResult.insertedId);

    // Test 2.5: Insert a legacy format deal for backward compatibility testing
    const legacyDeal = {
      name: "Legacy Deal - Cloud Backup",
      pipeline: "Sales",
      stage: "Prospect",
      status: "Open",
      value: 85000, // Old field name
      currency: "Dollar",
      dueDate: new Date("2025-01-30"),
      expectedClosingDate: new Date("2025-02-15"), // Old field name
      owner: "Jane Smith", // Old string format
      description: "This is a legacy format deal for backward compatibility testing",
      companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      tags: ["Rated"],
      priority: "Medium",
    };

    const legacyInsertResult = await dealsCollection.insertOne(legacyDeal);
    console.log("Legacy deal inserted:", legacyInsertResult.insertedId);

    // Test 3: Query deals
    const deals = await dealsCollection
      .find({ companyId, isDeleted: { $ne: true } })
      .toArray();

    console.log("Total deals found:", deals.length);
    console.log("Sample deal (new schema):", deals[0]);
    console.log("Legacy deal:", deals[1]);

    // Test 4: Get status statistics
    // const statusStats = await dealsCollection
    //   .aggregate([
    //     { $match: { companyId, isDeleted: { $ne: true } } },
    //     {
    //       $group: {
    //         _id: "$status",
    //         count: { $sum: 1 },
    //       },
    //     },
    //     { $sort: { count: -1 } },
    //   ])
    //   .toArray();

    // console.log("Deal status distribution:", statusStats);

    // Test 5: Get stage distribution
    // const stageStats = await dealsCollection
    //   .aggregate([
    //     { $match: { companyId, isDeleted: { $ne: true } } },
    //     { $group: { _id: "$stage", count: { $sum: 1 } } },
    //     { $sort: { count: -1 } },
    //   ])
    //   .toArray();

    // console.log("Deal stage distribution:", stageStats);

    // Test 6: Test new schema fields
    console.log("\n=== Testing New Schema Fields ===");
    
    // Test owner object structure
    // const dealsWithOwnerObjects = await dealsCollection.find({
    //   companyId,
    //   isDeleted: { $ne: true },
    //   "owner.name": { $exists: true }
    // }).toArray();
    // console.log("Deals with owner objects:", dealsWithOwnerObjects.length);
    
    // Test contact object structure
    // const dealsWithContact = await dealsCollection.find({
    //   companyId,
    //   isDeleted: { $ne: true },
    //   "contact.email": { $exists: true }
    // }).toArray();
    // console.log("Deals with contact info:", dealsWithContact.length);
    
    // Test dealValue field
    // const dealsWithDealValue = await dealsCollection.find({
    //   companyId,
    //   isDeleted: { $ne: true },
    //   dealValue: { $exists: true, $gt: 0 }
    // }).toArray();
    // console.log("Deals with dealValue:", dealsWithDealValue.length);
    
    // Test expectedClosedDate field
    // const dealsWithExpectedClosedDate = await dealsCollection.find({
    //   companyId,
    //   isDeleted: { $ne: true },
    //   expectedClosedDate: { $exists: true }
    // }).toArray();
    // console.log("Deals with expectedClosedDate:", dealsWithExpectedClosedDate.length);
    
    // Test initials field
    // const dealsWithInitials = await dealsCollection.find({
    //   companyId,
    //   isDeleted: { $ne: true },
    //   initials: { $exists: true, $ne: null }
    // }).toArray();
    // console.log("Deals with initials:", dealsWithInitials.length);
    
    // Test address field
    // const dealsWithAddress = await dealsCollection.find({
    //   companyId,
    //   isDeleted: { $ne: true },
    //   address: { $exists: true, $ne: null }
    // }).toArray();
    // console.log("Deals with address:", dealsWithAddress.length);

    // Test 7: Distinct owners and tags (updated for new schema)
    const ownerNames = await dealsCollection.distinct("owner.name", {
      companyId,
      isDeleted: { $ne: true },
      "owner.name": { $exists: true, $ne: null },
    });
    const tags = await dealsCollection.distinct("tags", {
      companyId,
      isDeleted: { $ne: true },
      tags: { $exists: true, $ne: null },
    });

    console.log("\nDeal owner names found:", ownerNames);
    console.log("Deal tags found:", tags);
    
    // Test 8: Validate required fields
    console.log("\n=== Validating Required Fields ===");
    const requiredFields = ['name', 'stage', 'dealValue', 'expectedClosedDate', 'owner', 'probability', 'status'];
    const sampleDealData = deals[0];
    
    requiredFields.forEach(field => {
      if (field === 'owner') {
        const hasOwner = sampleDealData.owner && sampleDealData.owner.name;
        console.log(`✓ ${field}: ${hasOwner ? 'Present' : 'Missing'}`);
      } else {
        const hasField = sampleDealData[field] !== undefined && sampleDealData[field] !== null;
        console.log(`✓ ${field}: ${hasField ? 'Present' : 'Missing'}`);
      }
    });
    
    // Test 9: Test service layer normalization
    console.log("\n=== Testing Service Layer Normalization ===");
    
    // Test new schema data
    const newSchemaData = {
      name: "Service Test Deal",
      initials: "ST",
      stage: "Proposal",
      status: "Open",
      dealValue: 200000,
      probability: 90,
      expectedClosedDate: "2025-03-01",
      owner: { name: "Service Tester", avatar: "avatar.jpg" },
      contact: { email: "test@example.com", phone: "555-0199" },
      address: "San Francisco, CA"
    };
    
    console.log("Testing new schema data normalization...");
    const newSchemaResult = await dealService.createDeal(companyId, newSchemaData);
    console.log("New schema result:", newSchemaResult.done ? "✓ Success" : "✗ Failed - " + newSchemaResult.error);
    
    // Test legacy data normalization
    const legacyData = {
      name: "Legacy Service Test",
      stage: "Won",
      status: "Won",
      value: 150000, // Old field
      probability: 100,
      expectedClosingDate: "2025-02-28", // Old field
      owner: "Legacy Owner", // Old string format
      pipeline: "Legacy Pipeline"
    };
    
    console.log("Testing legacy data normalization...");
    const legacyResult = await dealService.createDeal(companyId, legacyData);
    console.log("Legacy result:", legacyResult.done ? "✓ Success" : "✗ Failed - " + legacyResult.error);
    
    // Test 10: Final count
    const finalDeals = await dealsCollection
      .find({ companyId, isDeleted: { $ne: true } })
      .toArray();
    console.log("\nFinal total deals count:", finalDeals.length);
    
  } catch (error) {
    console.error("Error testing deals:", error);
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

testDeals();



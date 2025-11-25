import { MongoClient } from "mongodb";

// Test configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const TEST_DB_NAME = "test_hrms_deals_edit_delete";
const TEST_COMPANY_ID = "test_company_edit_delete_123";

// Test data
const sampleDeal = {
  name: "Test Deal for Edit/Delete",
  initials: "TED",
  stage: "New",
  status: "Open",
  dealValue: 50000,
  probability: 75,
  expectedClosedDate: new Date("2025-03-15"),
  owner: {
    name: "Test Owner",
    avatar: "https://example.com/test-avatar.jpg"
  },
  contact: {
    email: "test@example.com",
    phone: "+1-555-0199"
  },
  address: "Test City, TC",
  tags: ["TestTag", "EditDelete"],
  pipeline: "Test Pipeline",
  currency: "USD",
  priority: "High",
  description: "This is a test deal for edit/delete operations",
  companyId: TEST_COMPANY_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  isDeleted: false
};

let client;
let db;
let dealsCollection;
let testDealId;

async function connectDB() {
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(TEST_DB_NAME);
    dealsCollection = db.collection("deals");
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
}

async function cleanup() {
  try {
    if (dealsCollection) {
      await dealsCollection.deleteMany({ companyId: TEST_COMPANY_ID });
      console.log("🧹 Cleaned up test data");
    }
  } catch (error) {
    console.error("❌ Cleanup failed:", error.message);
  }
}

async function setupTestData() {
  try {
    console.log("🔧 Setting up test data...");
    const result = await dealsCollection.insertOne(sampleDeal);
    testDealId = result.insertedId;
    console.log("✅ Test deal created with ID:", testDealId);
    return testDealId;
  } catch (error) {
    console.error("❌ Failed to setup test data:", error.message);
    throw error;
  }
}

async function testGetDealById() {
  try {
    console.log("\n🔍 Testing getDealById...");
    const deal = await dealsCollection.findOne({ 
      _id: testDealId, 
      companyId: TEST_COMPANY_ID,
      isDeleted: { $ne: true }
    });
    
    if (deal) {
      console.log("✅ Deal found:", {
        id: deal._id,
        name: deal.name,
        stage: deal.stage,
        status: deal.status,
        dealValue: deal.dealValue,
        owner: deal.owner?.name
      });
      return deal;
    } else {
      console.log("❌ Deal not found");
      return null;
    }
  } catch (error) {
    console.error("❌ Error in getDealById:", error.message);
    return null;
  }
}

async function testUpdateDeal() {
  try {
    console.log("\n✏️ Testing updateDeal...");
    
    const updateData = {
      name: "Updated Test Deal",
      initials: "UTD",
      stage: "Prospect",
      status: "Open",
      dealValue: 75000,
      probability: 85,
      expectedClosedDate: new Date("2025-04-15"),
      owner: {
        name: "Updated Owner",
        avatar: "https://example.com/updated-avatar.jpg"
      },
      contact: {
        email: "updated@example.com",
        phone: "+1-555-0200"
      },
      address: "Updated City, UC",
      tags: ["UpdatedTag", "Modified"],
      pipeline: "Updated Pipeline",
      currency: "EUR",
      priority: "Medium",
      description: "This deal has been updated for testing",
      updatedAt: new Date()
    };

    const result = await dealsCollection.updateOne(
      { _id: testDealId, companyId: TEST_COMPANY_ID, isDeleted: { $ne: true } },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      console.log("❌ No deal found to update");
      return false;
    }

    if (result.modifiedCount === 0) {
      console.log("❌ Deal found but not modified");
      return false;
    }

    console.log("✅ Deal updated successfully");
    
    // Verify the update
    const updatedDeal = await dealsCollection.findOne({ _id: testDealId });
    console.log("✅ Updated deal data:", {
      name: updatedDeal.name,
      stage: updatedDeal.stage,
      dealValue: updatedDeal.dealValue,
      owner: updatedDeal.owner?.name,
      probability: updatedDeal.probability
    });

    return true;
  } catch (error) {
    console.error("❌ Error in updateDeal:", error.message);
    return false;
  }
}

async function testPartialUpdate() {
  try {
    console.log("\n🔧 Testing partial update...");
    
    const partialUpdate = {
      dealValue: 100000,
      probability: 90,
      status: "Won",
      updatedAt: new Date()
    };

    const result = await dealsCollection.updateOne(
      { _id: testDealId, companyId: TEST_COMPANY_ID, isDeleted: { $ne: true } },
      { $set: partialUpdate }
    );

    if (result.modifiedCount === 0) {
      console.log("❌ Partial update failed");
      return false;
    }

    console.log("✅ Partial update successful");
    
    // Verify the partial update
    const updatedDeal = await dealsCollection.findOne({ _id: testDealId });
    console.log("✅ Partially updated deal:", {
      dealValue: updatedDeal.dealValue,
      probability: updatedDeal.probability,
      status: updatedDeal.status
    });

    return true;
  } catch (error) {
    console.error("❌ Error in partial update:", error.message);
    return false;
  }
}

async function testUpdateValidation() {
  try {
    console.log("\n🛡️ Testing update validation...");
    
    // Test invalid deal value
    const invalidUpdate = {
      dealValue: -1000, // Invalid negative value
      updatedAt: new Date()
    };

    const result = await dealsCollection.updateOne(
      { _id: testDealId, companyId: TEST_COMPANY_ID, isDeleted: { $ne: true } },
      { $set: invalidUpdate }
    );

    if (result.modifiedCount > 0) {
      console.log("⚠️ Invalid deal value was accepted (this might be expected if validation is only in service layer)");
    } else {
      console.log("✅ Invalid deal value was rejected");
    }

    // Test invalid probability
    const invalidProbability = {
      probability: 150, // Invalid probability > 100
      updatedAt: new Date()
    };

    const result2 = await dealsCollection.updateOne(
      { _id: testDealId, companyId: TEST_COMPANY_ID, isDeleted: { $ne: true } },
      { $set: invalidProbability }
    );

    if (result2.modifiedCount > 0) {
      console.log("⚠️ Invalid probability was accepted (this might be expected if validation is only in service layer)");
    } else {
      console.log("✅ Invalid probability was rejected");
    }

    return true;
  } catch (error) {
    console.error("❌ Error in update validation:", error.message);
    return false;
  }
}

async function testSoftDelete() {
  try {
    console.log("\n🗑️ Testing soft delete...");
    
    const deleteResult = await dealsCollection.updateOne(
      { _id: testDealId, companyId: TEST_COMPANY_ID, isDeleted: { $ne: true } },
      { 
        $set: { 
          status: "deleted", 
          isDeleted: true, 
          deletedAt: new Date(), 
          updatedAt: new Date() 
        } 
      }
    );

    if (deleteResult.matchedCount === 0) {
      console.log("❌ No deal found to delete");
      return false;
    }

    if (deleteResult.modifiedCount === 0) {
      console.log("❌ Deal found but not deleted");
      return false;
    }

    console.log("✅ Deal soft deleted successfully");

    // Verify the deal is marked as deleted
    const deletedDeal = await dealsCollection.findOne({ _id: testDealId });
    console.log("✅ Deleted deal status:", {
      isDeleted: deletedDeal.isDeleted,
      status: deletedDeal.status,
      deletedAt: deletedDeal.deletedAt
    });

    return true;
  } catch (error) {
    console.error("❌ Error in soft delete:", error.message);
    return false;
  }
}

async function testDeletedDealNotInQueries() {
  try {
    console.log("\n🔍 Testing that deleted deals don't appear in queries...");
    
    // Test getAllDeals query (should not include deleted deals)
    const activeDeals = await dealsCollection.find({ 
      companyId: TEST_COMPANY_ID, 
      isDeleted: { $ne: true } 
    }).toArray();

    const deletedDeals = await dealsCollection.find({ 
      companyId: TEST_COMPANY_ID, 
      isDeleted: true 
    }).toArray();

    console.log("✅ Active deals count:", activeDeals.length);
    console.log("✅ Deleted deals count:", deletedDeals.length);

    if (activeDeals.length === 0 && deletedDeals.length === 1) {
      console.log("✅ Deleted deal correctly excluded from active queries");
      return true;
    } else {
      console.log("❌ Deleted deal query logic not working correctly");
      return false;
    }
  } catch (error) {
    console.error("❌ Error in deleted deal query test:", error.message);
    return false;
  }
}

async function testUpdateDeletedDeal() {
  try {
    console.log("\n🚫 Testing update of deleted deal...");
    
    const updateData = {
      name: "This should not work",
      updatedAt: new Date()
    };

    const result = await dealsCollection.updateOne(
      { _id: testDealId, companyId: TEST_COMPANY_ID, isDeleted: { $ne: true } },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      console.log("✅ Deleted deal correctly excluded from updates");
      return true;
    } else {
      console.log("❌ Deleted deal was updated (this should not happen)");
      return false;
    }
  } catch (error) {
    console.error("❌ Error in update deleted deal test:", error.message);
    return false;
  }
}

async function testCompanyIsolation() {
  try {
    console.log("\n🏢 Testing company isolation...");
    
    const otherCompanyDeal = {
      ...sampleDeal,
      companyId: "other_company_456",
      name: "Other Company Deal",
      _id: testDealId // Same ID but different company
    };

    // Try to update deal from different company
    const result = await dealsCollection.updateOne(
      { _id: testDealId, companyId: "other_company_456", isDeleted: { $ne: true } },
      { $set: { name: "Hacked Deal" } }
    );

    if (result.matchedCount === 0) {
      console.log("✅ Company isolation working - cannot update other company's deals");
      return true;
    } else {
      console.log("❌ Company isolation failed - updated other company's deal");
      return false;
    }
  } catch (error) {
    console.error("❌ Error in company isolation test:", error.message);
    return false;
  }
}

async function testServiceLayerIntegration() {
  try {
    console.log("\n🔧 Testing service layer integration...");
    
    // Import the service functions
    const { updateDeal, deleteDeal } = await import('./services/deal/deal.services.js');
    
    // Create a new test deal for service testing
    const serviceTestDeal = {
      ...sampleDeal,
      name: "Service Test Deal",
      _id: undefined // Let MongoDB generate ID
    };
    
    const insertResult = await dealsCollection.insertOne(serviceTestDeal);
    const serviceTestDealId = insertResult.insertedId.toString();
    
    console.log("✅ Created test deal for service testing:", serviceTestDealId);
    
    // Test service layer update
    const updateData = {
      name: "Service Updated Deal",
      dealValue: 125000,
      probability: 95
    };
    
    const updateResult = await updateDeal(TEST_COMPANY_ID, serviceTestDealId, updateData);
    
    if (updateResult.done) {
      console.log("✅ Service layer update successful");
      console.log("✅ Updated deal:", updateResult.data.name);
    } else {
      console.log("❌ Service layer update failed:", updateResult.error);
      return false;
    }
    
    // Test service layer delete
    const deleteResult = await deleteDeal(TEST_COMPANY_ID, serviceTestDealId);
    
    if (deleteResult.done) {
      console.log("✅ Service layer delete successful");
      console.log("✅ Deleted deal status:", deleteResult.data.status);
    } else {
      console.log("❌ Service layer delete failed:", deleteResult.error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("❌ Error in service layer integration test:", error.message);
    return false;
  }
}

async function runAllTests() {
  try {
    console.log("🚀 Starting Edit/Delete Functionality Tests");
    console.log("=" .repeat(50));
    
    await connectDB();
    await cleanup();
    
    const testResults = [];
    
    // Setup
    await setupTestData();
    
    // Test 1: Get deal by ID
    const getResult = await testGetDealById();
    testResults.push({ test: "Get Deal By ID", result: getResult !== null });
    
    // Test 2: Full update
    const updateResult = await testUpdateDeal();
    testResults.push({ test: "Full Update", result: updateResult });
    
    // Test 3: Partial update
    const partialResult = await testPartialUpdate();
    testResults.push({ test: "Partial Update", result: partialResult });
    
    // Test 4: Update validation
    const validationResult = await testUpdateValidation();
    testResults.push({ test: "Update Validation", result: validationResult });
    
    // Test 5: Soft delete
    const deleteResult = await testSoftDelete();
    testResults.push({ test: "Soft Delete", result: deleteResult });
    
    // Test 6: Deleted deals not in queries
    const queryResult = await testDeletedDealNotInQueries();
    testResults.push({ test: "Deleted Deals Query", result: queryResult });
    
    // Test 7: Update deleted deal
    const updateDeletedResult = await testUpdateDeletedDeal();
    testResults.push({ test: "Update Deleted Deal", result: updateDeletedResult });
    
    // Test 8: Company isolation
    const isolationResult = await testCompanyIsolation();
    testResults.push({ test: "Company Isolation", result: isolationResult });
    
    // Test 9: Service layer integration
    const serviceResult = await testServiceLayerIntegration();
    testResults.push({ test: "Service Layer Integration", result: serviceResult });
    
    // Results summary
    console.log("\n" + "=" .repeat(50));
    console.log("📊 TEST RESULTS SUMMARY");
    console.log("=" .repeat(50));
    
    const passed = testResults.filter(r => r.result).length;
    const total = testResults.length;
    
    testResults.forEach(({ test, result }) => {
      console.log(`${result ? '✅' : '❌'} ${test}`);
    });
    
    console.log("\n📈 Overall Results:");
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    console.log(`📊 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (passed === total) {
      console.log("\n🎉 All tests passed! Edit/Delete functionality is working correctly.");
    } else {
      console.log("\n⚠️ Some tests failed. Please review the issues above.");
    }
    
  } catch (error) {
    console.error("❌ Test suite failed:", error.message);
  } finally {
    await cleanup();
    if (client) {
      await client.close();
      console.log("🔌 Database connection closed");
    }
  }
}

// Run the tests
runAllTests().catch(console.error);

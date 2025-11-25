import { io } from "socket.io-client";

// Usage:
// 1) Start the server (npm start)
// 2) Set TOKEN from Clerk (admin/manager with companyId in publicMetadata) and run:
//    node backend/test/deals-test.js

const TEST_SERVER_URL = process.env.TEST_SERVER_URL || "http://localhost:5000";
const TOKEN = process.env.TOKEN || "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDExMUFBQSIsImtpZCI6Imluc18ydWhlckRvSzVNRnFUTERtUzRhQ0dXenB6Y2EiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwOi8vbG9jYWxob3N0OjMwMDAiLCJleHAiOjE3NTc2MTM0MDMsImZ2YSI6WzE3MTIsLTFdLCJpYXQiOjE3NTc2MTMzNDMsImlzcyI6Imh0dHBzOi8vdXAtc2tpbmstNC5jbGVyay5hY2NvdW50cy5kZXYiLCJuYmYiOjE3NTc2MTMzMzMsInNpZCI6InNlc3NfMzJWZkp2RHkwazVyYXRxR1ZYOTBLeHRhUXIxIiwic3RzIjoiYWN0aXZlIiwic3ViIjoidXNlcl8yeFZEZGk0ZEQxU1Z5UGxFYjJGcnFUT0VWRjgifQ.bjqNUG081-FIOxCy16TbYi_ODeLdriYmb1lCqnIJml4u5x0oUef1W911pY_LBCaS3JJVgOlkDPvtrN-A2zErHl0mBIYyhE-pOTHxeGGcliDOUPi3b08LVOMpib5MKhRYrzHR97l2itA8TUcI0FmfXY-ApwXEVR1uo02hYC50AV_sCjn5FWvyAGYJ-VqmoML0qI6A0_rl3Q0tiAznK4yU7n1MhtmDTKyiDJNuPjOE9afeUm6uO_GSmz5h4VxaKnSS_3LlRhjWwmeBjt5yCQ0eqvPmOMtj_P4FvnzO5lBIzmPmoAAGoz1FM_-I9mMi3Xptvny7YMS3N-P1t1xO3HjT8A"; // Clerk JWT with role/companyId in publicMetadata

if (!TOKEN) {
  console.warn("⚠️  Please set TOKEN env var to a valid Clerk JWT before running this test.");
}

const socket = io(TEST_SERVER_URL, {
  auth: { token: TOKEN },
});

let createdDealId = null;

const sampleDeal = {
  name: "Website Redesign",
  pipeline: "Sales",
  stage: "New",
  status: "Open",
  value: 450000,
  currency: "Dollar",
  dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  expectedClosingDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
  priority: "High",
  owner: "tester_user",
  tags: ["Collab"],
};

function createDeal() {
  return new Promise((resolve) => {
    console.log("🔄 Testing deal:create...");
    socket.emit("deal:create", sampleDeal);
    socket.once("deal:create-response", (response) => {
      if (response.done) {
        createdDealId = response.data._id;
        console.log("✅ Deal created:", createdDealId);
      } else {
        console.error("❌ Create failed:", response.error);
      }
      resolve();
    });
  });
}

function getAllDeals() {
  return new Promise((resolve) => {
    console.log("🔄 Testing deal:getAll...");
    socket.emit("deal:getAll", { status: "Open" });
    socket.once("deal:getAll-response", (response) => {
      if (response.done) {
        console.log("✅ Deals fetched:", response.data.length);
      } else {
        console.error("❌ GetAll failed:", response.error);
      }
      resolve();
    });
  });
}

function getDealById() {
  return new Promise((resolve) => {
    console.log("🔄 Testing deal:getById...");
    socket.emit("deal:getById", createdDealId);
    socket.once("deal:getById-response", (response) => {
      if (response.done) {
        console.log("✅ Deal fetched by id:", response.data?.name);
      } else {
        console.error("❌ GetById failed:", response.error);
      }
      resolve();
    });
  });
}

function updateDeal() {
  return new Promise((resolve) => {
    console.log("🔄 Testing deal:update...");
    socket.emit("deal:update", { dealId: createdDealId, update: { value: 475000, stage: "Proposal" } });
    socket.once("deal:update-response", (response) => {
      if (response.done) {
        console.log("✅ Deal updated:", response.data?.value, response.data?.stage);
      } else {
        console.error("❌ Update failed:", response.error);
      }
      resolve();
    });
  });
}

function deleteDeal() {
  return new Promise((resolve) => {
    console.log("🔄 Testing deal:delete...");
    socket.emit("deal:delete", { dealId: createdDealId });
    socket.once("deal:delete-response", (response) => {
      if (response.done) {
        console.log("✅ Deal soft-deleted");
      } else {
        console.error("❌ Delete failed:", response.error);
      }
      resolve();
    });
  });
}

async function run() {
  console.log("🧪 Starting Deals Module Socket Tests...\n");
  await createDeal();
  await getAllDeals();
  if (createdDealId) {
    await getDealById();
    await updateDeal();
    await deleteDeal();
  }
  console.log("\n🎉 Deals tests finished");
  socket.disconnect();
}

socket.on("connect", () => {
  console.log("✅ Connected as:", socket.id);
  run().catch((e) => {
    console.error(e);
    socket.disconnect();
  });
});

socket.on("connect_error", (err) => {
  console.error("❌ Connection error:", err.message);
});



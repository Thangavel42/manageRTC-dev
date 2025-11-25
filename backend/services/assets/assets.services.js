// backend/services/assets/assets.services.js
import { ObjectId } from "mongodb";
import { getTenantCollections } from "../../config/db.js";

/**
 * Get assets with pagination + filters.
 * params = { page = 1, pageSize = 10, filters = {}, sortBy = 'purchase_desc' }
 * filters: { status, search, purchaseDate: { from, to }, assetUser }
 */
export const getAssets = async (companyId, params = {}) => {
  const { page = 1, pageSize = 10, filters = {}, sortBy = "purchase_desc" } = params;
  const { employees } = getTenantCollections(companyId);

  // Build $match for asset-level fields
  const match = {};

  // Status
  if (filters.status && filters.status !== "All") {
    match["assets.status"] = filters.status;
  }

  // Search on assetName or serialNumber
  if (filters.search && String(filters.search).trim().length) {
    const q = String(filters.search).trim();
    match.$or = [
      { "assets.assetName": { $regex: q, $options: "i" } },
      { "assets.serialNumber": { $regex: q, $options: "i" } },
    ];
  }

  // Purchase date range
  if ((filters.purchaseDate && (filters.purchaseDate.from || filters.purchaseDate.to))) {
    const pd = {};
    if (filters.purchaseDate.from) pd.$gte = new Date(filters.purchaseDate.from);
    if (filters.purchaseDate.to) pd.$lte = new Date(filters.purchaseDate.to);
    match["assets.purchaseDate"] = pd;
  }

  // Filter by owner (employee) id
  if (filters.assetUser) {
    try {
     if (filters.assetUser) {
  match["_id"] = new ObjectId(filters.assetUser);
}
    } catch (e) {}
  }

  // Determine sort
  const sort = {};
  switch (sortBy) {
    case "purchase_asc":
      sort["purchaseDate"] = 1;
      break;
    case "purchase_desc":
      sort["purchaseDate"] = -1;
      break;
    case "warranty_asc":
      sort["warrantyEndDate"] = 1;
      break;
    case "warranty_desc":
      sort["warrantyEndDate"] = -1;
      break;
    case "name_asc":
      sort["assetName"] = 1;
      break;
    case "name_desc":
      sort["assetName"] = -1;
      break;
    default:
      sort["purchaseDate"] = -1;
  }

  // Build pipeline
  const pipeline = [
  { $unwind: "$assets" },
  {
    $addFields: {
      employeeId: "$_id",
      employeeName: { $concat: ["$firstName", " ", "$lastName"] },
      employeeAvatar: "$avatar",
    },
  },
  { $match: Object.keys(match).length ? match : {} },
  {
    $project: {
      _id: "$assets._id",
      assetName: "$assets.assetName",
      serialNumber: "$assets.serialNumber",
      purchaseFrom: "$assets.purchaseFrom",
      manufacture: "$assets.manufacture",
      model: "$assets.model",
      purchaseDate: "$assets.purchaseDate",
      warrantyMonths: "$assets.warrantyMonths",
      warrantyEndDate: "$assets.warrantyEndDate",
      status: "$assets.status",
      createdAt: "$assets.createdAt",
      updatedAt: "$assets.updatedAt",
      employeeId: "$employeeId",
      employeeName: "$employeeName",
      employeeAvatar: "$employeeAvatar",
    },
  },
  { $sort: sort },
  {
    $facet: {
      data: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
      total: [{ $count: "count" }],
    },
  },
];


  const agg = await employees.aggregate(pipeline).toArray();
  const data = agg[0]?.data || [];
  const totalCount = agg[0]?.total?.[0]?.count || 0;

  // Convert ObjectId to strings
  const formatted = data.map((a) => ({
    ...a,
    _id: a._id ? a._id.toString() : null,
    employeeId: a.employeeId ? a.employeeId.toString() : null,
  }));

  return {
    done: true,
    data: formatted,
    page,
    pageSize,
    totalCount,
  };
};

/**
 * Add asset to employee
 * assetData should include: assetName, purchaseDate (ISO string), warrantyMonths (number), serialNumber, manufacture, model, purchaseFrom, status
 */
export const addAsset = async (companyId, employeeId, assetData) => {
  const { employees } = getTenantCollections(companyId);

  // compute dates safely
  const purchaseDate = assetData.purchaseDate ? new Date(assetData.purchaseDate) : null;
  const warrantyMonths = Number(assetData.warrantyMonths || 0);

  let warrantyEndDate = null;
  if (purchaseDate && !isNaN(purchaseDate.getTime())) {
    warrantyEndDate = new Date(purchaseDate);
    warrantyEndDate.setMonth(warrantyEndDate.getMonth() + warrantyMonths);
  }

  const newAsset = {
    _id: new ObjectId(),
    assetName: String(assetData.assetName || "").trim(),
    serialNumber: assetData.serialNumber || null,
    purchaseFrom: assetData.purchaseFrom || null,
    manufacture: assetData.manufacture || null,
    model: assetData.model || null,
    purchaseDate,
    warrantyMonths,
    warrantyEndDate,
    status: assetData.status || "Active",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const res = await employees.updateOne(
    { _id: new ObjectId(employeeId) },
    { $push: { assets: newAsset } }
  );

  if (!res.matchedCount) throw new Error("Employee not found");

  return {
    done: true,
    data: { ...newAsset, _id: newAsset._id.toString(), employeeId: employeeId.toString() },
  };
};

/**
 * Update an asset.
 * - If newOwnerId provided and different: move asset between employees (transaction).
 * - If not, update fields on the containing employee doc using positional operator.
 * updateData may contain any asset fields (assetName, serialNumber, purchaseDate, warrantyMonths, status, etc.)
 */
export const updateAsset = async (companyId, assetId, updateData) => {
  const { employees } = getTenantCollections(companyId);

  // Fetch current asset + owner
  const assetDoc = await employees.findOne(
    { "assets._id": new ObjectId(assetId) },
    { projection: { _id: 1, assets: { $elemMatch: { _id: new ObjectId(assetId) } } } }
  );
  if (!assetDoc || !assetDoc.assets || !assetDoc.assets[0]) {
    throw new Error("Asset not found");
  }

  const ownerId = assetDoc._id;
  const existingAsset = assetDoc.assets[0];

  // Ownership transfer
  if (updateData.employeeId && String(updateData.employeeId) !== String(ownerId)) {
    const newOwnerId = new ObjectId(updateData.employeeId);
    const { employeeId, ...assetFields } = updateData;

    const mergedAsset = { ...existingAsset, ...assetFields, updatedAt: new Date() };

    // Sequential transfer (simpler, avoids fragile transaction code)
    await employees.updateOne(
      { _id: ownerId },
      { $pull: { assets: { _id: new ObjectId(assetId) } } }
    );
    await employees.updateOne(
      { _id: newOwnerId },
      { $push: { assets: mergedAsset } }
    );

    return { done: true, data: { ...mergedAsset, employeeId: newOwnerId.toString() } };
  }

  // Same-owner update
  const setObj = {};
  for (const key of Object.keys(updateData)) {
    if (["employeeId", "_id"].includes(key)) continue;
    let val = updateData[key];
    if (key === "purchaseDate" && val) val = new Date(val);
    if (key === "warrantyMonths") val = Number(val || 0);
    setObj[`assets.$.${key}`] = val;
  }

  // Warranty recalculation
  const pd = setObj["assets.$.purchaseDate"] || existingAsset.purchaseDate;
  const wm = setObj["assets.$.warrantyMonths"] ?? existingAsset.warrantyMonths ?? 0;
  if (pd) {
    const we = new Date(pd);
    we.setMonth(we.getMonth() + wm);
    setObj["assets.$.warrantyEndDate"] = we;
  }

  setObj["assets.$.updatedAt"] = new Date();

  await employees.updateOne(
    { "assets._id": new ObjectId(assetId) },
    { $set: setObj }
  );

  return { done: true, data: { ...existingAsset, ...updateData, _id: assetId.toString(), employeeId: ownerId.toString() } };
};


/**
 * Hard delete an asset by assetId.
 * If employeeId provided, will use that; otherwise it finds the owner first.
 */
export const deleteAsset = async (companyId, assetId, employeeId = null) => {
  const { employees } = getTenantCollections(companyId);

  let ownerQuery;
  if (employeeId) {
    ownerQuery = { _id: new ObjectId(employeeId) };
  } else {
    const owner = await employees.findOne({ "assets._id": new ObjectId(assetId) }, { projection: { _id: 1 } });
    if (!owner) throw new Error("Asset not found");
    ownerQuery = { _id: owner._id };
  }

  const res = await employees.updateOne(ownerQuery, { $pull: { assets: { _id: new ObjectId(assetId) } } });
  if (!res.matchedCount) throw new Error("Asset not found or already deleted");
  return { done: true };
};


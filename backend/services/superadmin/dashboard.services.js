import { getsuperadminCollections, getTenantCollections } from "../../config/db.js";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import dotenv from "dotenv";

dotenv.config();

// Get the base domain from environment or use default
const BASE_DOMAIN = process.env.DOMAIN || "amanagertc.com";

// Get dashboard statistics
export const getDashboardStats = async () => {
  try {
    const { companiesCollection, packagesCollection } = getsuperadminCollections();

    // Get companies stats
    const companiesStats = await companiesCollection.aggregate([
      {
        $facet: {
          totalCompanies: [{ $count: "count" }],
          activeCompanies: [
            { $match: { status: "Active" } },
            { $count: "count" }
          ],
          inactiveCompanies: [
            { $match: { status: "Inactive" } },
            { $count: "count" }
          ]
        }
      }
    ]).toArray();

    // Calculate total earnings (sum of all package prices for active companies)
    const earningsData = await companiesCollection.aggregate([
      {
        $lookup: {
          from: "packages",
          localField: "plan_id",
          foreignField: "plan_id",
          as: "package"
        }
      },
      { $unwind: "$package" },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: "$package.price" }
        }
      }
    ]).toArray();

    const stats = companiesStats[0];
    const totalEarnings = earningsData[0]?.totalEarnings || 0;

    return {
      done: true,
      data: {
        totalCompanies: stats.totalCompanies[0]?.count || 0,
        activeCompanies: stats.activeCompanies[0]?.count || 0,
        inactiveCompanies: stats.inactiveCompanies[0]?.count || 0,
        totalSubscribers: stats.activeCompanies[0]?.count || 0, // Using active companies as subscribers
        totalEarnings: totalEarnings
      }
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return { done: false, error: error.message };
  }
};

// Get weekly company registration data for chart
export const getWeeklyCompanyData = async () => {
  try {
    const { companiesCollection } = getsuperadminCollections();

    const weekStart = startOfWeek(new Date());
    const weekDays = [];

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      weekDays.push(subDays(new Date(), i));
    }

    const dailyData = await Promise.all(
      weekDays.map(async (day) => {
        const startOfDay = new Date(day.setHours(0, 0, 0, 0));
        const endOfDay = new Date(day.setHours(23, 59, 59, 999));

        const count = await companiesCollection.countDocuments({
          createdAt: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        });

        return count;
      })
    );

    return {
      done: true,
      data: dailyData
    };
  } catch (error) {
    console.error("Error fetching weekly company data:", error);
    return { done: false, error: error.message };
  }
};

// Get monthly revenue data
export const getMonthlyRevenueData = async () => {
  try {
    const { companiesCollection } = getsuperadminCollections();

    const monthlyData = await companiesCollection.aggregate([
      {
        $lookup: {
          from: "packages",
          localField: "plan_id",
          foreignField: "plan_id",
          as: "package"
        }
      },
      { $unwind: "$package" },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" }
          },
          income: { $sum: "$package.price" },
          expenses: { $sum: { $multiply: ["$package.price", 0.3] } } // 30% as expenses
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 }
    ]).toArray();

    // Fill missing months with 0
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const income = new Array(12).fill(0);
    const expenses = new Array(12).fill(0);

    for (const item of monthlyData) {
      const monthIndex = item._id.month - 1;
      income[monthIndex] = Math.round(item.income / 1000);
      expenses[monthIndex] = Math.round(item.expenses / 1000);
    }

    return {
      done: true,
      data: {
        income,
        expenses
      }
    };
  } catch (error) {
    console.error("Error fetching monthly revenue data:", error);
    return { done: false, error: error.message };
  }
};

// Get plan distribution data
export const getPlanDistribution = async () => {
  try {
    const { companiesCollection } = getsuperadminCollections();

    const planData = await companiesCollection.aggregate([
      {
        $group: {
          _id: "$plan_name",
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const totalCompanies = await companiesCollection.countDocuments();

    const distribution = planData.map(item => ({
      name: item._id || "Unknown",
      count: item.count,
      percentage: Math.round((item.count / totalCompanies) * 100)
    }));

    return {
      done: true,
      data: distribution
    };
  } catch (error) {
    console.error("Error fetching plan distribution:", error);
    return { done: false, error: error.message };
  }
};

// Get recent transactions
export const getRecentTransactions = async () => {
  try {
    const { companiesCollection } = getsuperadminCollections();

    const transactions = await companiesCollection.aggregate([
      {
        $lookup: {
          from: "packages",
          localField: "plan_id",
          foreignField: "plan_id",
          as: "package"
        }
      },
      { $unwind: "$package" },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $project: {
          name: 1,
          logo: 1,
          createdAt: 1,
          plan_name: 1,
          plan_type: 1,
          amount: "$package.price",
          transactionId: { $substr: [{ $toString: "$_id" }, 0, 6] }
        }
      }
    ]).toArray();

    console.log("Recent transactions raw data:", transactions);

    const formattedTransactions = transactions.map(transaction => {
      const logoPath = transaction.logo && transaction.logo.trim() !== ''
        ? transaction.logo
        : "assets/img/company/company-02.svg";

      return {
        id: transaction._id.toString(),
        company: transaction.name || "Unknown Company",
        logo: logoPath,
        transactionId: `#${transaction.transactionId}`,
        date: format(new Date(transaction.createdAt), "d MMM yyyy"),
        amount: `+$${transaction.amount}`,
        plan: `${transaction.plan_name || "Basic"} (${transaction.plan_type || "Monthly"})`
      };
    });

    console.log("Formatted recent transactions:", formattedTransactions);

    return {
      done: true,
      data: formattedTransactions
    };
  } catch (error) {
    console.error("Error fetching recent transactions:", error);
    return { done: false, error: error.message };
  }
};

// Get recently registered companies
export const getRecentlyRegistered = async () => {
  try {
    const { companiesCollection } = getsuperadminCollections();

    const companies = await companiesCollection.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $project: {
          name: 1,
          logo: 1,
          domain: 1,
          plan_name: 1,
          plan_type: 1,
          createdAt: 1,
          status: 1,
          email: 1,
          userCount: 1,  // ✅ PHASE 2: Include cached userCount from database
          userCountLastUpdated: 1
        }
      }
    ]).toArray();

    console.log("Recently registered companies raw data:", companies);

    // Fetch real user counts - use cached value if available, fallback to tenant DB
    const formattedCompanies = await Promise.all(
      companies.map(async (company) => {
        const logoPath = company.logo && company.logo.trim() !== ''
          ? company.logo
          : "assets/img/icons/company-icon-11.svg";

        // FIX #1: Use actual domain from database with BASE_DOMAIN from environment
        // If domain is not configured, show "Not configured" instead of fake .example.com
        const domainUrl = company.domain && company.domain.trim() !== ''
          ? `${company.domain}.${BASE_DOMAIN}`
          : 'Not configured';

        const planDisplay = company.plan_name && company.plan_type
          ? `${company.plan_name} (${company.plan_type})`
          : "Basic Plan";

        // FIX #2: Fetch real user count - use cached value with fallback to tenant DB
        // PERFORMANCE: If userCount exists in company document, use it directly
        // Only query tenant database if userCount is missing or potentially stale
        let userCount = 0;
        const USE_CACHED_USERCOUNT = true; // Set to false to always query tenant DB
        const USERCOUNT_STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

        if (USE_CACHED_USERCOUNT && company.userCount !== undefined && company.userCount !== null) {
          // Check if cached value is stale
          const isStale = !company.userCountLastUpdated ||
            (new Date() - new Date(company.userCountLastUpdated)) > USERCOUNT_STALE_MS;

          if (!isStale) {
            // Use cached value - much faster!
            userCount = company.userCount;
            console.log(`Using cached userCount for ${company.name}: ${userCount}`);
          } else {
            console.log(`Cached userCount stale for ${company.name}, querying tenant DB...`);
            // Fall through to tenant DB query
          }
        }

        // Fallback: Query tenant database if userCount is missing or stale
        if (userCount === 0 && (!company.userCount || company.userCount === undefined)) {
          try {
            const tenantCollections = getTenantCollections(company._id.toString());
            userCount = await tenantCollections.employees.countDocuments({
              status: "Active"
            });

            // Optionally: Update the cached value in the background
            companiesCollection.updateOne(
              { _id: company._id },
              { $set: { userCount, userCountLastUpdated: new Date() } }
            ).catch(() => {
              // Ignore update errors - this is just a cache warm-up
            });
          } catch (dbError) {
            // If tenant database doesn't exist or has an error, default to 0
            console.warn(`Failed to fetch user count for company ${company._id}:`, dbError.message);
            userCount = company.userCount || 0;
          }
        }

        return {
          id: company._id.toString(),
          name: company.name || "Unknown Company",
          logo: logoPath,
          domain: domainUrl,
          plan: planDisplay,
          users: userCount, // Now using cached data with fallback to real-time query
          registeredDate: format(new Date(company.createdAt), "d MMM yyyy")
        };
      })
    );

    console.log("Formatted recently registered companies:", formattedCompanies);

    return {
      done: true,
      data: formattedCompanies
    };
  } catch (error) {
    console.error("Error fetching recently registered companies:", error);
    return { done: false, error: error.message };
  }
};

// Get expired plans
export const getExpiredPlans = async () => {
  try {
    const { companiesCollection } = getsuperadminCollections();

    const expiredCompanies = await companiesCollection.aggregate([
      {
        $addFields: {
          expiryDate: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$plan_type", "Monthly"] },
                  then: { $add: ["$createdAt", 30 * 24 * 60 * 60 * 1000] } // 30 days
                },
                {
                  case: { $eq: ["$plan_type", "Yearly"] },
                  then: { $add: ["$createdAt", 365 * 24 * 60 * 60 * 1000] } // 365 days
                }
              ],
              default: { $add: ["$createdAt", 30 * 24 * 60 * 60 * 1000] }
            }
          }
        }
      },
      {
        $match: {
          expiryDate: { $lt: new Date() }
        }
      },
      { $limit: 5 },
      {
        $project: {
          name: 1,
          logo: 1,
          plan_name: 1,
          plan_type: 1,
          expiryDate: 1
        }
      }
    ]).toArray();

    console.log("Expired plans raw data:", expiredCompanies);

    const formattedExpired = expiredCompanies.map(company => {
      const logoPath = company.logo && company.logo.trim() !== ''
        ? company.logo
        : "assets/img/icons/company-icon-16.svg";

      return {
        id: company._id.toString(),
        name: company.name || "Unknown Company",
        logo: logoPath,
        plan: `${company.plan_name || "Basic"} (${company.plan_type || "Monthly"})`,
        expiredDate: format(new Date(company.expiryDate), "d MMM yyyy")
      };
    });

    console.log("Formatted expired plans:", formattedExpired);

    return {
      done: true,
      data: formattedExpired
    };
  } catch (error) {
    console.error("Error fetching expired plans:", error);
    return { done: false, error: error.message };
  }
};

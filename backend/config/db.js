import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is not set in environment variables');

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
});
let isConnected = false;
let isMongooseConnected = false;

export { client };

// Helper function to provide detailed error messages
const handleConnectionError = (error, clientType) => {
  const errorMsg = error.message || '';
  const errorCode = error.code || '';

  let troubleshootingTips = [];

  if (errorCode === 'ECONNREFUSED' || errorMsg.includes('querySrv') || errorMsg.includes('ENOTFOUND')) {
    troubleshootingTips.push('❌ Cannot connect to MongoDB Atlas cluster');
    troubleshootingTips.push('');
    troubleshootingTips.push('Possible causes:');
    troubleshootingTips.push('1. MongoDB Atlas cluster is PAUSED (common in free tier after inactivity)');
    troubleshootingTips.push('   → Go to https://cloud.mongodb.com/ and resume your cluster');
    troubleshootingTips.push('');
    troubleshootingTips.push('2. IP Address not whitelisted in MongoDB Atlas');
    troubleshootingTips.push('   → Go to Security → Network Access');
    troubleshootingTips.push('   → Add your current IP or use 0.0.0.0/0 (for testing only)');
    troubleshootingTips.push('');
    troubleshootingTips.push('3. DNS/Network issue');
    troubleshootingTips.push('   → Check your internet connection');
    troubleshootingTips.push('   → Try disabling VPN if connected');
    troubleshootingTips.push('   → Check if firewall is blocking MongoDB ports (27017)');
  } else if (errorMsg.includes('authentication') || errorMsg.includes('AuthenticationFailed')) {
    troubleshootingTips.push('❌ Authentication failed');
    troubleshootingTips.push('');
    troubleshootingTips.push('Possible causes:');
    troubleshootingTips.push('1. Incorrect username or password');
    troubleshootingTips.push('2. Special characters in password not URL-encoded');
    troubleshootingTips.push('3. Database user not created in MongoDB Atlas');
  } else {
    troubleshootingTips.push('❌ Unexpected MongoDB connection error');
  }

  logger.error(`Database Connection Error (${clientType})`, { error: errorMsg });
  console.error('\n' + troubleshootingTips.join('\n'));
}

export const connectDB = async () => {
  // Connect MongoDB native client
  if (!isConnected) {
    try {
      console.log('Connecting to MongoDB (Native Client)...');
      await client.connect();
      isConnected = true;
      logger.info('Connected to MongoDB (Native Client)');
      console.log('✅ MongoDB Native Client connected successfully');
    } catch (error) {
      handleConnectionError(error, 'Native Client');
      throw error;
    }
  }

  // Connect Mongoose (for REST API models)
  if (!isMongooseConnected) {
    try {
      // Extract database name from URI or use companyId as database
      // For multi-tenant, we'll connect to a default database and use discriminators
      const defaultDbName = process.env.MONGODB_DATABASE || 'AmasQIS';

      console.log(`Connecting to MongoDB (Mongoose) - Database: ${defaultDbName}...`);
      await mongoose.connect(uri, {
        dbName: defaultDbName,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
      });
      isMongooseConnected = true;
      logger.info(`Connected to MongoDB (Mongoose) - Database: ${defaultDbName}`);
      console.log(`✅ MongoDB Mongoose connected successfully to database: ${defaultDbName}`);

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        logger.error('Mongoose connection error', { error: err.message });
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('Mongoose disconnected');
        isMongooseConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('Mongoose reconnected');
        isMongooseConnected = true;
      });
    } catch (error) {
      handleConnectionError(error, 'Mongoose');
      throw error;
    }
  }
};

export const getTenantCollections = (tenantDbName) => {
  if (!isConnected) {
    throw new Error('MongoDB client not connected yet. Call connectDB() first.');
  }
  if (!tenantDbName) {
    throw new Error('Company ID (tenantDbName) is required. Please ensure your Clerk user has companyId set in publicMetadata.');
  }
  const db = client.db(tenantDbName);
  return {
    // Existing collections
    stats: db.collection('stats'),
    companies: db.collection('companies'),
    details: db.collection('details'), // for company details
    contacts: db.collection('contacts'),
    details: db.collection('details'), // for contact details
    leads: db.collection('leads'),
    kanbanBoards: db.collection('kanbanBoards'),
    kanbanColumns: db.collection('kanbanColumns'),
    kanbanCards: db.collection('kanbanCards'),

    // Admin dashboard collections
    employees: db.collection('employees'),
    projects: db.collection('projects'),
    clients: db.collection('clients'),
    tasks: db.collection('tasks'),
    taskstatus: db.collection('taskstatus'),
    attendance: db.collection('attendance'),
    attendanceAudit: db.collection('attendanceAudit'), // Phase 3: Attendance audit logging
    departments: db.collection('departments'),
    leaves: db.collection('leaves'),
    leaveRequests: db.collection('leaves'),
    leaveTypes: db.collection('leaveTypes'),
    approvals: db.collection('approvals'),
    invoices: db.collection('invoices'),
    deals: db.collection('deals'),
    activities: db.collection('activities'),
    todos: db.collection('todos'),
    schedules: db.collection('schedules'),
    birthdays: db.collection('birthdays'),
    jobs: db.collection('jobApplications'),
    jobApplications: db.collection('jobApplications'), // Add explicit mapping for admin stats
    earnings: db.collection('earnings'),
    payrolls: db.collection('payrolls'),
    payroll: db.collection('payrolls'),

    // employee dashboard collection
    skills: db.collection('skills'),
    salaryHistory: db.collection('salaryHistory'),
    meetings: db.collection('meetings'),
    notifications: db.collection('notifications'),

    //Pipeline Collections
    pipelines: db.collection('pipelines'),
    stages: db.collection('stages'),

    //Chat Collections
    conversations: db.collection('conversations'),
    messages: db.collection('messages'),

    //Social Feed
    socialFeeds: db.collection('socialFeeds'),
    follows: db.collection('follows'),
    hashtags: db.collection('hashtags'),

    // hr employee section collection
    hr: db.collection('hr'),
    permissions: db.collection('permissions'),
    policy: db.collection('policy'),
    policies: db.collection('policy'), // Add explicit mapping for policy REST API
    designations: db.collection('designations'),
    assets: db.collection('assets'),
    assetCategories: db.collection('assetCategories'),
    assetusers: db.collection('assetusers'),
    holidays: db.collection('holidays'),
    holidayTypes: db.collection('holidayTypes'),
    shifts: db.collection('shifts'),
    batches: db.collection('batches'),
    batchAssignmentHistory: db.collection('batchAssignmentHistory'),

    // Leave Ledger (balance history)
    leaveLedger: db.collection('leaveLedger'),

    // Custom Leave Policies
    customLeavePolicies: db.collection('custom_leave_policies'),

    // Time Tracking
    timeEntries: db.collection('timeEntries'),

    // Overtime
    overtimeRequests: db.collection('overtimeRequests'),

    // Timesheets
    weeklyTimesheets: db.collection('weeklyTimesheets'),
    timesheetEntries: db.collection('timesheetEntries'),

    // Audit Logs
    auditLogs: db.collection('auditLogs'),

    // invoice section
    addInvoices: db.collection('invoices'),

    termination: db.collection('termination'),
    resignation: db.collection('resignation'),

    // notes - application
    notes: db.collection('notes'),
    projectNotes: db.collection('projectnotes'),
    candidates: db.collection('candidates'),

    performanceIndicators: db.collection('performanceIndicators'),
    performanceAppraisals: db.collection('performanceAppraisals'),
    performanceReviews: db.collection('performanceReviews'),
    // Performance Management Collections
    goalTypes: db.collection('goalTypes'),
    goalTrackings: db.collection('goalTrackings'),
    promotions: db.collection('promotions'),
    //profile collection
    profile: db.collection('profile'),
    tickets: db.collection('tickets'),
    // jobs collection
    jobs: db.collection('jobs'),
    candidates: db.collection('candidates'),
    trainers: db.collection('trainers'),
    trainingtypes: db.collection('trainingtypes'),
    trainings: db.collection('trainings'),
    // Sub-contracts
    subcontracts: db.collection('subcontracts'),
    // Project contracts (worker assignments)
    projectcontracts: db.collection('projectcontracts'),

    // Change Requests (employee-submitted requests for HR approval)
    changeRequests: db.collection('changeRequests'),
  };
};

export const getsuperadminCollections = () => {
  if (!isConnected) {
    throw new Error('MongoDB client not connected yet. Call connectDB() first.');
  }
  const db = client.db('AmasQIS');
  return {
    stats: db.collection('stats'),
    companiesCollection: db.collection('companies'),
    contacts: db.collection('contacts'),
    packagesCollection: db.collection('packages'),
    subscriptionsCollection: db.collection('subscriptions'),
    trainingtypes: db.collection('trainingtypes'),
    trainers: db.collection('trainers'),
    trainings: db.collection('trainings'),
    ticketCategories: db.collection('ticketCategories'),
  };
};

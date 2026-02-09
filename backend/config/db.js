import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const uri =
  process.env.MONGODB_URI || 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';

const client = new MongoClient(uri);
let isConnected = false;
let isMongooseConnected = false;

export { client };

export const connectDB = async () => {
  // Connect MongoDB native client
  if (!isConnected) {
    try {
      await client.connect();
      isConnected = true;
      logger.info('Connected to MongoDB (Native Client)');
    } catch (error) {
      logger.error('Database Connection Error (Native Client)', { error: error.message });
      throw error;
    }
  }

  // Connect Mongoose (for REST API models)
  if (!isMongooseConnected) {
    try {
      // Extract database name from URI or use companyId as database
      // For multi-tenant, we'll connect to a default database and use discriminators
      const defaultDbName = process.env.MONGODB_DATABASE || 'AmasQIS';

      await mongoose.connect(uri, {
        dbName: defaultDbName,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
      });
      isMongooseConnected = true;
      logger.info(`Connected to MongoDB (Mongoose) - Database: ${defaultDbName}`);

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
      logger.error('Database Connection Error (Mongoose)', { error: error.message });
      throw error;
    }
  }
};

export const getTenantCollections = (tenantDbName) => {
  if (!isConnected) {
    throw new Error('MongoDB client not connected yet. Call connectDB() first.');
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
    holidays: db.collection('holidays'),
    holidayTypes: db.collection('holidayTypes'),
    shifts: db.collection('shifts'),
    batches: db.collection('batches'),
    batchAssignmentHistory: db.collection('batchAssignmentHistory'),

    // Time Tracking
    timeEntries: db.collection('timeEntries'),

    // Overtime
    overtimeRequests: db.collection('overtimeRequests'),

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
    ticketCategories: db.collection('ticketCategories'),
    // jobs collection
    jobs: db.collection('jobs'),
    candidates: db.collection('candidates'),
    trainers: db.collection('trainers'),
    trainingtypes: db.collection('trainingtypes'),
    trainings: db.collection('trainings'),
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
  };
};

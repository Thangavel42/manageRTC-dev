import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['Software', 'Hardware', 'Networking', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations']
  },
  jobType: { 
    type: String, 
    required: true,
    enum: ['Full Time', 'Part Time', 'Contract', 'Internship', 'Freelance'],
    default: 'Full Time'
  },
  jobLevel: { 
    type: String, 
    required: true,
    enum: ['Entry Level', 'Mid Level', 'Senior Level', 'Lead', 'Manager', 'Director'],
    default: 'Mid Level'
  },
  experience: { 
    type: String, 
    required: true,
    enum: ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'],
    default: '1-3 years'
  },
  qualification: { 
    type: String, 
    required: true,
    enum: ['High School', 'Bachelor Degree', 'Master Degree', 'PhD', 'Others'],
    default: 'Bachelor Degree'
  },
  gender: { 
    type: String, 
    required: true,
    enum: ['Any', 'Male', 'Female'],
    default: 'Any'
  },
  minSalary: { type: Number, required: true },
  maxSalary: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  salaryPeriod: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  requiredSkills: [{ type: String }],
  location: {
    address: { type: String, required: true },
    country: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    zipCode: { type: String, required: true },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  status: { 
    type: String, 
    required: true,
    enum: ['Draft', 'Published', 'Closed', 'Expired', 'Cancelled'],
    default: 'Draft'
  },
  postedDate: { type: Date, default: Date.now },
  expiredDate: { type: Date, required: true },
  closedDate: { type: Date },
  image: { type: String, default: 'assets/img/icons/default-job.svg' },
  applicantsCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  createdBy: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    avatar: { type: String, default: 'assets/img/profiles/avatar-01.jpg' }
  },
  updatedBy: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String },
    avatar: { type: String, default: 'assets/img/profiles/avatar-01.jpg' }
  },
  companyId: { type: String, required: true },
  department: { type: String, default: 'HR' },
  isRemote: { type: Boolean, default: false },
  isUrgent: { type: Boolean, default: false },
  benefits: [{ type: String }],
  responsibilities: [{ type: String }],
  requirements: [{ type: String }],
  tags: [{ type: String }],
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Indexes for better performance
jobSchema.index({ jobId: 1 }, { unique: true });
jobSchema.index({ status: 1 });
jobSchema.index({ category: 1 });
jobSchema.index({ jobType: 1 });
jobSchema.index({ 'location.city': 1 });
jobSchema.index({ 'location.country': 1 });
jobSchema.index({ postedDate: -1 });
jobSchema.index({ companyId: 1 });
jobSchema.index({ isActive: 1 });

// Virtual for formatted salary range
jobSchema.virtual('salaryRange').get(function() {
  const formatSalary = (amount) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}k`;
    }
    return amount.toString();
  };
  
  const min = formatSalary(this.minSalary);
  const max = formatSalary(this.maxSalary);
  const period = this.salaryPeriod === 'yearly' ? '/year' : '/month';
  
  return `${min} - ${max} ${this.currency} ${period}`;
});

// Virtual for location string
jobSchema.virtual('locationString').get(function() {
  return `${this.location.city}, ${this.location.state}, ${this.location.country}`;
});

// Virtual for applicants display
jobSchema.virtual('applicantsDisplay').get(function() {
  return `${this.applicantsCount} Applicants`;
});

// Pre-save middleware to generate jobId
jobSchema.pre('save', function(next) {
  if (!this.jobId) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    this.jobId = `JOB-${timestamp}-${random}`;
  }
  next();
});

// Method to check if job is expired
jobSchema.methods.isExpired = function() {
  return new Date() > this.expiredDate;
};

// Method to update status based on dates
jobSchema.methods.updateStatus = function() {
  if (this.isExpired() && this.status === 'Published') {
    this.status = 'Expired';
    this.closedDate = new Date();
  }
  return this.save();
};

export default mongoose.model('Job', jobSchema);
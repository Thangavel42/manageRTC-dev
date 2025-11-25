import mongoose from 'mongoose';

const performanceReviewSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    index: true
  },
  
  employeeId: {
    type: String,
    required: true,
    trim: true
  },
  
  // Employee Basic Information
  employeeInfo: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    empId: {
      type: String,
      required: true,
      trim: true
    },
    department: {
      type: String,
      required: true,
      trim: true
    },
    designation: {
      type: String,
      required: true,
      trim: true
    },
    qualification: {
      type: String,
      trim: true
    },
    dateOfJoin: {
      type: Date
    },
    dateOfConfirmation: {
      type: Date
    },
    previousExperience: {
      type: String,
      trim: true
    },
    reportingOfficer: {
      name: {
        type: String,
        trim: true
      },
      designation: {
        type: String,
        trim: true
      }
    }
  },
  
  // Professional Excellence
  professionalExcellence: [{
    keyResultArea: {
      type: String,
      required: true,
      trim: true
    },
    keyPerformanceIndicator: {
      type: String,
      required: true,
      trim: true
    },
    weightage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    selfScore: {
      percentage: {
        type: Number,
        min: 0,
        max: 100
      },
      points: {
        type: Number,
        min: 0
      }
    },
    reportingOfficerScore: {
      percentage: {
        type: Number,
        min: 0,
        max: 100
      },
      points: {
        type: Number,
        min: 0
      }
    }
  }],
  
  // Personal Excellence
  personalExcellence: [{
    personalAttribute: {
      type: String,
      required: true,
      trim: true
    },
    keyIndicator: {
      type: String,
      required: true,
      trim: true
    },
    weightage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    selfScore: {
      percentage: {
        type: Number,
        min: 0,
        max: 100
      },
      points: {
        type: Number,
        min: 0
      }
    },
    reportingOfficerScore: {
      percentage: {
        type: Number,
        min: 0,
        max: 100
      },
      points: {
        type: Number,
        min: 0
      }
    }
  }],
  
  // Special Initiatives and Achievements
  specialInitiatives: [{
    selfComment: {
      type: String,
      trim: true
    },
    reportingOfficerComment: {
      type: String,
      trim: true
    },
    hodComment: {
      type: String,
      trim: true
    }
  }],
  
  // Role Alterations
  roleAlterations: [{
    selfComment: {
      type: String,
      trim: true
    },
    reportingOfficerComment: {
      type: String,
      trim: true
    },
    hodComment: {
      type: String,
      trim: true
    }
  }],
  
  // Strengths and Areas for Improvement
  strengthsAndImprovements: {
    self: [{
      strengths: {
        type: String,
        trim: true
      },
      areasForImprovement: {
        type: String,
        trim: true
      }
    }],
    reportingOfficer: [{
      strengths: {
        type: String,
        trim: true
      },
      areasForImprovement: {
        type: String,
        trim: true
      }
    }],
    hod: [{
      strengths: {
        type: String,
        trim: true
      },
      areasForImprovement: {
        type: String,
        trim: true
      }
    }]
  },
  
  // Personal Goals
  personalGoals: [{
    goalAchievedLastYear: {
      type: String,
      trim: true
    },
    goalSetForCurrentYear: {
      type: String,
      trim: true
    }
  }],
  
  // Personal Updates
  personalUpdates: [{
    category: {
      type: String,
      trim: true
    },
    lastYear: {
      yesNo: {
        type: String,
        enum: ['Yes', 'No']
      },
      details: {
        type: String,
        trim: true
      }
    },
    currentYear: {
      yesNo: {
        type: String,
        enum: ['Yes', 'No']
      },
      details: {
        type: String,
        trim: true
      }
    }
  }],
  
  // Professional Goals
  professionalGoals: {
    achievedLastYear: [{
      selfComment: {
        type: String,
        trim: true
      },
      reportingOfficerComment: {
        type: String,
        trim: true
      },
      hodComment: {
        type: String,
        trim: true
      }
    }],
    forthcomingYear: [{
      selfComment: {
        type: String,
        trim: true
      },
      reportingOfficerComment: {
        type: String,
        trim: true
      },
      hodComment: {
        type: String,
        trim: true
      }
    }]
  },
  
  // Training Requirements
  trainingRequirements: [{
    selfComment: {
      type: String,
      trim: true
    },
    reportingOfficerComment: {
      type: String,
      trim: true
    },
    hodComment: {
      type: String,
      trim: true
    }
  }],
  
  // General Comments
  generalComments: [{
    self: {
      type: String,
      trim: true
    },
    reportingOfficer: {
      type: String,
      trim: true
    },
    hod: {
      type: String,
      trim: true
    }
  }],
  
  // RO's Use Only
  roUseOnly: [{
    category: {
      type: String,
      trim: true
    },
    yesNo: {
      type: String,
      enum: ['Yes', 'No']
    },
    details: {
      type: String,
      trim: true
    }
  }],
  
  // HRD's Use Only
  hrdUseOnly: [{
    parameter: {
      type: String,
      trim: true
    },
    availablePoints: {
      type: Number,
      min: 0
    },
    pointsScored: {
      type: Number,
      min: 0
    },
    reportingOfficerComment: {
      type: String,
      trim: true
    }
  }],
  
  // Signatures
  signatures: {
    employee: {
      name: {
        type: String,
        trim: true
      },
      signature: {
        type: String,
        trim: true
      },
      date: {
        type: Date
      }
    },
    reportingOfficer: {
      name: {
        type: String,
        trim: true
      },
      signature: {
        type: String,
        trim: true
      },
      date: {
        type: Date
      }
    },
    hod: {
      name: {
        type: String,
        trim: true
      },
      signature: {
        type: String,
        trim: true
      },
      date: {
        type: Date
      }
    },
    hrd: {
      name: {
        type: String,
        trim: true
      },
      signature: {
        type: String,
        trim: true
      },
      date: {
        type: Date
      }
    }
  },
  
  status: {
    type: String,
    enum: ['Draft', 'In Progress', 'Completed', 'Approved'],
    default: 'Draft',
    required: true,
    index: true
  },
  
  reviewPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  
  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(doc, ret) {
      ret.id = ret._id?.toString();
      // Format dates for frontend
      if (ret.employeeInfo?.dateOfJoin) ret.employeeInfo.dateOfJoin = ret.employeeInfo.dateOfJoin.toISOString().split('T')[0];
      if (ret.employeeInfo?.dateOfConfirmation) ret.employeeInfo.dateOfConfirmation = ret.employeeInfo.dateOfConfirmation.toISOString().split('T')[0];
      if (ret.reviewPeriod?.startDate) ret.reviewPeriod.startDate = ret.reviewPeriod.startDate.toISOString().split('T')[0];
      if (ret.reviewPeriod?.endDate) ret.reviewPeriod.endDate = ret.reviewPeriod.endDate.toISOString().split('T')[0];
      return ret;
    }
  }
});

// Ensure id is set if someone creates a doc with only _id
performanceReviewSchema.pre('validate', function (next) {
  if (!this.id && this._id) {
    this.id = this._id.toString();
  }
  next();
});

// Indexes for common queries
performanceReviewSchema.index({ companyId: 1, createdAt: -1 });
performanceReviewSchema.index({ companyId: 1, status: 1 });
performanceReviewSchema.index({ companyId: 1, employeeId: 1 });
performanceReviewSchema.index({ companyId: 1, 'employeeInfo.department': 1 });
performanceReviewSchema.index({ companyId: 1, isDeleted: 1 });

// Keep updatedAt in sync
performanceReviewSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});
performanceReviewSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

export default mongoose.models.PerformanceReview || mongoose.model('PerformanceReview', performanceReviewSchema);
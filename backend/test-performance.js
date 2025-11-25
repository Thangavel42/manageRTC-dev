// Simple test script to verify performance module APIs
const API_BASE_URL = 'http://localhost:5000/api';

const testHeaders = {
  'Content-Type': 'application/json',
  'x-dev-company-id': '68443081dcdfe43152aebf80',
  'x-dev-role': 'admin',
};

async function testGoalTypeAPI() {
  console.log('Testing Goal Type API...');
  
  try {
    // Test creating a goal type
    const createResponse = await fetch(`${API_BASE_URL}/performance/goal-types/goal-types`, {
      method: 'POST',
      headers: testHeaders,
      body: JSON.stringify({
        type: 'Test Goal Type',
        description: 'This is a test goal type for performance management',
        status: 'Active'
      })
    });
    
    const createResult = await createResponse.json();
    console.log('Create Goal Type Result:', createResult);
    
    if (createResult.done) {
      // Test getting all goal types
      const getAllResponse = await fetch(`${API_BASE_URL}/performance/goal-types/goal-types`, {
        method: 'GET',
        headers: testHeaders
      });
      
      const getAllResult = await getAllResponse.json();
      console.log('Get All Goal Types Result:', getAllResult);
    }
    
  } catch (error) {
    console.error('Error testing Goal Type API:', error);
  }
}

async function testGoalTrackingAPI() {
  console.log('Testing Goal Tracking API...');
  
  try {
    // Test creating a goal tracking
    const createResponse = await fetch(`${API_BASE_URL}/performance/goal-trackings/goal-trackings`, {
      method: 'POST',
      headers: testHeaders,
      body: JSON.stringify({
        goalType: 'Development Goals',
        subject: 'Learn React',
        targetAchievement: 'Complete React course',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        description: 'Learn React fundamentals',
        status: 'Active',
        progress: 'In Progress',
        progressPercentage: 30
      })
    });
    
    const createResult = await createResponse.json();
    console.log('Create Goal Tracking Result:', createResult);
    
  } catch (error) {
    console.error('Error testing Goal Tracking API:', error);
  }
}

async function testPerformanceIndicatorAPI() {
  console.log('Testing Performance Indicator API...');
  
  try {
    // Test creating a performance indicator
    const createResponse = await fetch(`${API_BASE_URL}/performance/indicators/performance-indicators`, {
      method: 'POST',
      headers: testHeaders,
      body: JSON.stringify({
        designation: 'Software Developer',
        department: 'Engineering',
        approvedBy: 'John Doe',
        role: 'Manager',
        image: 'user-01.jpg',
        createdDate: '2024-01-01',
        status: 'Active',
        indicators: [
          {
            name: 'Code Quality',
            description: 'Maintain high code quality standards',
            weight: 30,
            target: '95%'
          }
        ]
      })
    });
    
    const createResult = await createResponse.json();
    console.log('Create Performance Indicator Result:', createResult);
    
  } catch (error) {
    console.error('Error testing Performance Indicator API:', error);
  }
}

async function testPerformanceAppraisalAPI() {
  console.log('Testing Performance Appraisal API...');
  
  try {
    // Test creating a performance appraisal
    const createResponse = await fetch(`${API_BASE_URL}/performance/appraisals/performance-appraisals`, {
      method: 'POST',
      headers: testHeaders,
      body: JSON.stringify({
        employeeId: 'EMP001',
        name: 'Jane Smith',
        designation: 'Software Developer',
        department: 'Engineering',
        image: 'user-02.jpg',
        appraisalDate: '2024-01-01',
        appraisalPeriod: {
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        },
        status: 'Draft'
      })
    });
    
    const createResult = await createResponse.json();
    console.log('Create Performance Appraisal Result:', createResult);
    
  } catch (error) {
    console.error('Error testing Performance Appraisal API:', error);
  }
}

async function testPerformanceReviewAPI() {
  console.log('Testing Performance Review API...');
  
  try {
    // Test creating a performance review
    const createResponse = await fetch(`${API_BASE_URL}/performance/reviews/performance-reviews`, {
      method: 'POST',
      headers: testHeaders,
      body: JSON.stringify({
        employeeId: 'EMP001',
        employeeInfo: {
          name: 'Jane Smith',
          empId: 'EMP001',
          department: 'Engineering',
          designation: 'Software Developer',
          qualification: 'B.Tech Computer Science',
          dateOfJoin: '2023-01-01',
          dateOfConfirmation: '2023-07-01',
          previousExperience: '2 years',
          reportingOfficer: {
            name: 'John Doe',
            designation: 'Team Lead'
          }
        },
        status: 'Draft',
        reviewPeriod: {
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      })
    });
    
    const createResult = await createResponse.json();
    console.log('Create Performance Review Result:', createResult);
    
  } catch (error) {
    console.error('Error testing Performance Review API:', error);
  }
}

async function runAllTests() {
  console.log('Starting Performance Module API Tests...\n');
  
  await testGoalTypeAPI();
  console.log('\n');
  
  await testGoalTrackingAPI();
  console.log('\n');
  
  await testPerformanceIndicatorAPI();
  console.log('\n');
  
  await testPerformanceAppraisalAPI();
  console.log('\n');
  
  await testPerformanceReviewAPI();
  console.log('\n');
  
  console.log('All tests completed!');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  runAllTests().catch(console.error);
}

module.exports = {
  testGoalTypeAPI,
  testGoalTrackingAPI,
  testPerformanceIndicatorAPI,
  testPerformanceAppraisalAPI,
  testPerformanceReviewAPI,
  runAllTests
};

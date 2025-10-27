const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class PerformanceAppraisalService {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-dev-company-id': '68443081dcdfe43152aebf80',
      'x-dev-role': 'admin',
    };
  }

  async getAllPerformanceAppraisals(filters?: any) {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.employeeId) queryParams.append('employeeId', filters.employeeId);
      if (filters?.department) queryParams.append('department', filters.department);
      if (filters?.designation) queryParams.append('designation', filters.designation);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);

      const response = await fetch(`${API_BASE_URL}/performance/appraisals/performance-appraisals?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching performance appraisals:', error);
      throw error;
    }
  }

  async getPerformanceAppraisalById(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/appraisals/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching performance appraisal:', error);
      throw error;
    }
  }

  async createPerformanceAppraisal(data: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/appraisals/performance-appraisals`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      console.log('Performance Appraisal Response status:', response.status, 'Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Performance Appraisal Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Create Performance Appraisal Service Response:', result);
      return result;
    } catch (error) {
      console.error('Error creating performance appraisal:', error);
      throw error;
    }
  }

  async updatePerformanceAppraisal(id: string, data: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/appraisals/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error updating performance appraisal:', error);
      throw error;
    }
  }

  async deletePerformanceAppraisal(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/appraisals/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      console.log('Delete Performance Appraisal Response status:', response.status, 'Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete Performance Appraisal Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Delete Performance Appraisal Service Response:', result);
      return result;
    } catch (error) {
      console.error('Error deleting performance appraisal:', error);
      throw error;
    }
  }
}

export default new PerformanceAppraisalService();
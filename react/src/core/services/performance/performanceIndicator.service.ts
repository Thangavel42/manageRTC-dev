const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class PerformanceIndicatorService {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-dev-company-id': '68443081dcdfe43152aebf80',
      'x-dev-role': 'admin',
    };
  }

  async getAllPerformanceIndicators(filters?: any) {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.designation) queryParams.append('designation', filters.designation);
      if (filters?.department) queryParams.append('department', filters.department);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);

      const response = await fetch(`${API_BASE_URL}/performance/indicators/performance-indicators?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching performance indicators:', error);
      throw error;
    }
  }

  async getPerformanceIndicatorById(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/indicators/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching performance indicator:', error);
      throw error;
    }
  }

  async createPerformanceIndicator(data: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/indicators/performance-indicators`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      console.log('Performance Indicator Response status:', response.status, 'Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Performance Indicator Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Create Performance Indicator Service Response:', result);
      return result;
    } catch (error) {
      console.error('Error creating performance indicator:', error);
      throw error;
    }
  }

  async updatePerformanceIndicator(id: string, data: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/indicators/${id}`, {
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
      console.error('Error updating performance indicator:', error);
      throw error;
    }
  }

  async deletePerformanceIndicator(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/indicators/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      console.log('Delete Performance Indicator Response status:', response.status, 'Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete Performance Indicator Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Delete Performance Indicator Service Response:', result);
      return result;
    } catch (error) {
      console.error('Error deleting performance indicator:', error);
      throw error;
    }
  }
}

export default new PerformanceIndicatorService();
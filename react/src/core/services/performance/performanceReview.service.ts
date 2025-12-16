const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class PerformanceReviewService {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-dev-company-id': '68443081dcdfe43152aebf80',
      'x-dev-role': 'admin',
    };
  }

  async getAllPerformanceReviews(filters?: any) {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.employeeId) queryParams.append('employeeId', filters.employeeId);
      if (filters?.department) queryParams.append('department', filters.department);
      if (filters?.designation) queryParams.append('designation', filters.designation);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);

      const response = await fetch(`${API_BASE_URL}/performance/reviews/performance-reviews?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching performance reviews:', error);
      throw error;
    }
  }

  async getPerformanceReviewById(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/reviews/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching performance review:', error);
      throw error;
    }
  }

  async createPerformanceReview(data: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/reviews/performance-reviews`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      console.log('Performance Review Response status:', response.status, 'Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Performance Review Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Create Performance Review Service Response:', result);
      return result;
    } catch (error) {
      console.error('Error creating performance review:', error);
      throw error;
    }
  }

  async updatePerformanceReview(id: string, data: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/reviews/${id}`, {
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
      console.error('Error updating performance review:', error);
      throw error;
    }
  }

  async deletePerformanceReview(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/reviews/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting performance review:', error);
      throw error;
    }
  }
}

export default new PerformanceReviewService();
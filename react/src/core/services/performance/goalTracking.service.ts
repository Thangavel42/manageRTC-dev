const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class GoalTrackingService {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-dev-company-id': '68443081dcdfe43152aebf80',
      'x-dev-role': 'admin',
    };
  }

  async getAllGoalTrackings(filters?: any) {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.goalType) queryParams.append('goalType', filters.goalType);
      if (filters?.assignedTo) queryParams.append('assignedTo', filters.assignedTo);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);

      const response = await fetch(`${API_BASE_URL}/performance/goal-trackings/goal-trackings?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching goal trackings:', error);
      throw error;
    }
  }

  async getGoalTrackingById(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/goal-trackings/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching goal tracking:', error);
      throw error;
    }
  }

  async createGoalTracking(data: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/goal-trackings/goal-trackings`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      console.log('Goal Tracking Response status:', response.status, 'Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Goal Tracking Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Create Goal Tracking Service Response:', result);
      return result;
    } catch (error) {
      console.error('Error creating goal tracking:', error);
      throw error;
    }
  }

  async updateGoalTracking(id: string, data: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/goal-trackings/${id}`, {
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
      console.error('Error updating goal tracking:', error);
      throw error;
    }
  }

  async deleteGoalTracking(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/goal-trackings/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      console.log('Delete Goal Tracking Response status:', response.status, 'Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete Goal Tracking Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Delete Goal Tracking Service Response:', result);
      return result;
    } catch (error) {
      console.error('Error deleting goal tracking:', error);
      throw error;
    }
  }
}

export default new GoalTrackingService();

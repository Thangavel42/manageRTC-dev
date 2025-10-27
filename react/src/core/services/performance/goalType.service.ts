const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class GoalTypeService {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-dev-company-id': '68443081dcdfe43152aebf80',
      'x-dev-role': 'admin',
    };
  }

  async getAllGoalTypes(filters?: any) {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);

      const response = await fetch(`${API_BASE_URL}/performance/goal-types/goal-types?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching goal types:', error);
      throw error;
    }
  }

  async getGoalTypeById(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/goal-types/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching goal type:', error);
      throw error;
    }
  }

  async createGoalType(data: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/goal-types/goal-types`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      console.log('Response status:', response.status, 'Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Create Goal Type Service Response:', result);
      return result;
    } catch (error) {
      console.error('Error creating goal type:', error);
      throw error;
    }
  }

  async updateGoalType(id: string, data: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/goal-types/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      console.log('Update Response status:', response.status, 'Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Update Goal Type Service Response:', result);
      return result;
    } catch (error) {
      console.error('Error updating goal type:', error);
      throw error;
    }
  }

  async deleteGoalType(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/goal-types/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      console.log('Delete Response status:', response.status, 'Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Delete Goal Type Service Response:', result);
      return result;
    } catch (error) {
      console.error('Error deleting goal type:', error);
      throw error;
    }
  }
}

export default new GoalTypeService();

import { apiService } from './api.service';
import { User } from '../types';

interface AuthResponse {
  user: User;
  token: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  businessName: string;
  phone: string;
}

class AuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    // Mock implementation for demo
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (email === 'demo@business.com' && password === 'demo1234') {
      return {
        token: 'mock_token_12345',
        user: {
          id: 'user_1',
          email,
          phone: '050-1234567',
          name: 'ישראל ישראלי',
          role: 'business',
          businessName: 'עסק לדוגמה בע"מ',
          rating: 4.8,
          totalDeliveries: 147,
          createdAt: new Date().toISOString(),
        },
      };
    }

    throw new Error('אימייל או סיסמה שגויים');
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 1200));

    return {
      token: 'mock_token_new_user',
      user: {
        id: `user_${Date.now()}`,
        email: data.email,
        phone: data.phone,
        name: data.name,
        role: 'business',
        businessName: data.businessName,
        rating: 5,
        totalDeliveries: 0,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async forgotPassword(email: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    // Mock: sends reset email
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    // In production this would call apiService.patch('/auth/profile', data)
    return data as User;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  async logout(): Promise<void> {
    // Optionally notify server
  }
}

export const authService = new AuthService();

// ============================================================
// AUTH SERVICE - אשדוד-שליח Courier App
// ============================================================

import { apiService } from './api.service';
import { Courier } from '../types';

interface LoginResponse {
  token: string;
  courier: Courier;
}

interface RegisterData {
  name: string;
  phone: string;
  email: string;
  password: string;
  vehicleType: string;
  vehiclePlate?: string;
}

class AuthService {
  async login(phone: string, password: string): Promise<LoginResponse> {
    return apiService.post<LoginResponse>('/courier/auth/login', { phone, password });
  }

  async register(data: RegisterData): Promise<LoginResponse> {
    return apiService.post<LoginResponse>('/courier/auth/register', data);
  }

  async logout(): Promise<void> {
    try {
      await apiService.post('/courier/auth/logout');
    } catch {
      // Ignore logout errors - we still clear local storage
    }
  }

  async refreshToken(): Promise<{ token: string }> {
    return apiService.post<{ token: string }>('/courier/auth/refresh');
  }

  async updateStatus(status: 'available' | 'busy' | 'offline'): Promise<void> {
    return apiService.patch('/courier/status', { status });
  }

  async updateProfile(data: Partial<Courier>): Promise<Courier> {
    return apiService.put<Courier>('/courier/profile', data);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return apiService.post('/courier/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  async requestPasswordReset(phone: string): Promise<void> {
    return apiService.post('/courier/auth/reset-password', { phone });
  }

  async verifyOtp(phone: string, otp: string): Promise<{ token: string }> {
    return apiService.post<{ token: string }>('/courier/auth/verify-otp', { phone, otp });
  }

  async uploadAvatar(imageUri: string): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    } as unknown as Blob);
    return apiService.uploadFile<{ avatarUrl: string }>('/courier/avatar', formData);
  }
}

export const authService = new AuthService();
export default authService;

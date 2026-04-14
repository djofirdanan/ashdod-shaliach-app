// ============================================================
// DELIVERY SERVICE - אשדוד-שליח Courier App
// ============================================================

import { apiService } from './api.service';
import { Delivery, DeliveryStatus, EarningsSummary, ProofOfDelivery } from '../types';

class DeliveryService {
  async getActiveDeliveries(): Promise<Delivery[]> {
    return apiService.get<Delivery[]>('/courier/deliveries/active');
  }

  async getDelivery(id: string): Promise<Delivery> {
    return apiService.get<Delivery>(`/courier/deliveries/${id}`);
  }

  async acceptDelivery(deliveryId: string): Promise<Delivery> {
    return apiService.post<Delivery>(`/courier/deliveries/${deliveryId}/accept`);
  }

  async declineDelivery(deliveryId: string): Promise<void> {
    return apiService.post(`/courier/deliveries/${deliveryId}/decline`);
  }

  async updateStatus(deliveryId: string, status: DeliveryStatus): Promise<Delivery> {
    return apiService.patch<Delivery>(`/courier/deliveries/${deliveryId}/status`, { status });
  }

  async submitProof(deliveryId: string, proof: ProofOfDelivery): Promise<Delivery> {
    if (proof.photoUri) {
      // Upload photo first
      const formData = new FormData();
      formData.append('photo', {
        uri: proof.photoUri,
        type: 'image/jpeg',
        name: `proof_${deliveryId}.jpg`,
      } as unknown as Blob);
      if (proof.signature) {
        formData.append('signature', proof.signature);
      }
      formData.append('location', JSON.stringify(proof.location));
      formData.append('timestamp', proof.timestamp);
      if (proof.notes) {
        formData.append('notes', proof.notes);
      }
      return apiService.uploadFile<Delivery>(
        `/courier/deliveries/${deliveryId}/proof`,
        formData
      );
    }
    return apiService.post<Delivery>(`/courier/deliveries/${deliveryId}/proof`, proof);
  }

  async getHistory(page = 1, limit = 20): Promise<Delivery[]> {
    return apiService.get<Delivery[]>('/courier/deliveries/history', { page, limit });
  }

  async getEarningsSummary(): Promise<EarningsSummary> {
    return apiService.get<EarningsSummary>('/courier/earnings/summary');
  }

  async reportIssue(deliveryId: string, issue: string, description: string): Promise<void> {
    return apiService.post(`/courier/deliveries/${deliveryId}/issue`, { issue, description });
  }

  async getEstimatedEarnings(deliveryId: string): Promise<{ estimate: number }> {
    return apiService.get<{ estimate: number }>(
      `/courier/deliveries/${deliveryId}/earnings-estimate`
    );
  }
}

export const deliveryService = new DeliveryService();
export default deliveryService;

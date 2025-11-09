/**
 * API Service Layer
 * Handles all HTTP requests to the backend API
 */

import axios, { AxiosError } from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  Livestream,
  ApiResponse,
  GetLivestreamsParams,
  GetParticipantsParams,
  StreamState,
  JoinLivestreamRequest,
  JoinLivestreamResponse,
  LeaveLivestreamRequest,
  CreateLivestreamRequest,
  Participant,
} from '../types/api.types';

/**
 * Axios instance configured for API requests
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api/v1', // Vite proxy will forward to http://localhost:3001
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

/**
 * Error handler for API requests
 */
const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;
    const errorMessage =
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      axiosError.message ||
      'An unexpected error occurred';

    throw new Error(errorMessage);
  }

  throw new Error('An unexpected error occurred');
};

/**
 * API Service
 */
export const apiService = {
  /**
   * Create a new livestream
   */
  async createLivestream(request: CreateLivestreamRequest): Promise<Livestream> {
    try {
      const response = await apiClient.post<ApiResponse<Livestream>>('/livestreams', request);

      if (!response.data.success) {
        throw new Error('Failed to create livestream');
      }

      return response.data.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Delete a livestream
   */
  async deleteLivestream(livestreamId: string, requestingUserId: string): Promise<void> {
    try {
      await apiClient.delete(`/livestreams/${livestreamId}`, {
        data: { requestingUserId },
      });
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get livestreams with optional filters
   */
  async getLivestreams(params?: GetLivestreamsParams): Promise<{ data: Livestream[]; count: number }> {
    try {
      const response = await apiClient.get<ApiResponse<Livestream[]>>('/livestreams', {
        params: {
          status: params?.status,
          limit: params?.limit,
          offset: params?.offset,
        },
      });

      if (!response.data.success) {
        throw new Error('Failed to fetch livestreams');
      }

      return {
        data: response.data.data,
        count: response.data.count || response.data.data.length,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get a single livestream by ID
   */
  async getLivestream(id: string): Promise<Livestream> {
    try {
      const response = await apiClient.get<ApiResponse<Livestream>>(`/livestreams/${id}`);

      if (!response.data.success) {
        throw new Error('Failed to fetch livestream');
      }

      return response.data.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get stream state (ephemeral Redis data)
   */
  async getStreamState(id: string): Promise<StreamState> {
    try {
      const response = await apiClient.get<ApiResponse<StreamState>>(`/livestreams/${id}/state`);

      if (!response.data.success) {
        throw new Error('Failed to fetch stream state');
      }

      return response.data.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Join a livestream
   */
  async joinLivestream(
    livestreamId: string,
    request: JoinLivestreamRequest
  ): Promise<ApiResponse<JoinLivestreamResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<JoinLivestreamResponse>>(
        `/livestreams/${livestreamId}/join`,
        request
      );

      if (!response.data.success) {
        throw new Error('Failed to join livestream');
      }

      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Leave a livestream
   */
  async leaveLivestream(livestreamId: string, userId: string): Promise<void> {
    try {
      const request: LeaveLivestreamRequest = { userId };
      await apiClient.post(`/livestreams/${livestreamId}/leave`, request);
    } catch (error) {
      // Don't throw on leave errors - just log them
      console.error('Failed to leave livestream:', error);
    }
  },

  /**
   * Get participants for a livestream
   */
  async getParticipants(
    livestreamId: string,
    params?: GetParticipantsParams
  ): Promise<{ data: Participant[]; count: number }> {
    try {
      const response = await apiClient.get<ApiResponse<Participant[]>>(
        `/livestreams/${livestreamId}/participants`,
        {
          params: {
            status: params?.status,
            role: params?.role,
            limit: params?.limit,
            offset: params?.offset,
          },
        }
      );

      if (!response.data.success) {
        throw new Error('Failed to fetch participants');
      }

      return {
        data: response.data.data,
        count: response.data.count || response.data.data.length,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get('http://localhost:3001/health');
      return response.status === 200;
    } catch {
      return false;
    }
  },
};

export default apiService;

import { Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

@Injectable()
export class HttpService {
  async request(config: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
    auth?: {
      type: 'basic' | 'bearer';
      username?: string;
      password?: string;
      token?: string;
    };
  }): Promise<{ status: number; data: any; headers: Record<string, string> }> {
    // Validate URL
    try {
      new URL(config.url);
    } catch {
      throw new Error('Некорректный URL');
    }

    // Block internal network requests for security
    const url = new URL(config.url);
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (blockedHosts.includes(url.hostname) || url.hostname.startsWith('192.168.') || url.hostname.startsWith('10.')) {
      throw new Error('Запросы к внутренней сети запрещены');
    }

    const axiosConfig: AxiosRequestConfig = {
      url: config.url,
      method: config.method,
      headers: config.headers || {},
      timeout: config.timeout || 30000,
      validateStatus: () => true, // Don't throw on any status
    };

    if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      axiosConfig.data = config.body;
    }

    // Handle authentication
    if (config.auth) {
      if (config.auth.type === 'basic') {
        axiosConfig.auth = {
          username: config.auth.username || '',
          password: config.auth.password || '',
        };
      } else if (config.auth.type === 'bearer' && config.auth.token) {
        axiosConfig.headers!['Authorization'] = `Bearer ${config.auth.token}`;
      }
    }

    try {
      const response: AxiosResponse = await axios(axiosConfig);

      return {
        status: response.status,
        data: response.data,
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Время ожидания запроса истекло');
        }
        if (error.code === 'ENOTFOUND') {
          throw new Error('Хост не найден');
        }
        throw new Error(`HTTP ошибка: ${error.message}`);
      }
      throw error;
    }
  }

  async get(url: string, headers?: Record<string, string>): Promise<any> {
    const result = await this.request({ url, method: 'GET', headers });
    return result.data;
  }

  async post(url: string, body: any, headers?: Record<string, string>): Promise<any> {
    const result = await this.request({ url, method: 'POST', body, headers });
    return result.data;
  }
}

import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GoogleSheetsService {
  async execute(config: {
    action: 'append' | 'read' | 'update';
    spreadsheetId: string;
    range: string;
    values?: any[][];
    credentials: {
      accessToken: string;
    };
  }): Promise<{ success: boolean; data?: any }> {
    const { action, spreadsheetId, range, values, credentials } = config;

    if (!credentials?.accessToken) {
      throw new Error('Требуется токен доступа Google');
    }

    const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;

    const headers = {
      Authorization: `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (action) {
        case 'read': {
          const response = await axios.get(
            `${baseUrl}/values/${encodeURIComponent(range)}`,
            { headers }
          );
          return {
            success: true,
            data: response.data.values || [],
          };
        }

        case 'append': {
          if (!values || values.length === 0) {
            throw new Error('Данные для добавления не указаны');
          }
          const response = await axios.post(
            `${baseUrl}/values/${encodeURIComponent(range)}:append`,
            { values },
            {
              headers,
              params: {
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
              },
            }
          );
          return {
            success: true,
            data: response.data,
          };
        }

        case 'update': {
          if (!values || values.length === 0) {
            throw new Error('Данные для обновления не указаны');
          }
          const response = await axios.put(
            `${baseUrl}/values/${encodeURIComponent(range)}`,
            { values },
            {
              headers,
              params: {
                valueInputOption: 'USER_ENTERED',
              },
            }
          );
          return {
            success: true,
            data: response.data,
          };
        }

        default:
          throw new Error(`Неизвестное действие: ${action}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Ошибка Google Sheets: ${message}`);
      }
      throw error;
    }
  }

  async getSpreadsheetInfo(
    spreadsheetId: string,
    accessToken: string
  ): Promise<any> {
    try {
      const response = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Ошибка получения информации о таблице: ${error.message}`);
    }
  }
}

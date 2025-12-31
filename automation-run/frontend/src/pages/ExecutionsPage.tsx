import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlayCircleIcon,
  XCircleIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { executionsApi } from '@/services/api';
import type { Execution, ExecutionStatus } from '@/types';
import clsx from 'clsx';

const statusConfig: Record<
  ExecutionStatus,
  { label: string; icon: any; color: string }
> = {
  pending: { label: 'Ожидание', icon: ClockIcon, color: 'text-gray-500' },
  running: { label: 'Выполняется', icon: PlayCircleIcon, color: 'text-blue-500' },
  success: { label: 'Успешно', icon: CheckCircleIcon, color: 'text-green-500' },
  error: { label: 'Ошибка', icon: ExclamationCircleIcon, color: 'text-red-500' },
  cancelled: { label: 'Отменено', icon: XCircleIcon, color: 'text-gray-500' },
};

export default function ExecutionsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['executions', page, statusFilter],
    queryFn: async () => {
      const response = await executionsApi.getAll({
        page,
        limit: 20,
        status: statusFilter || undefined,
      });
      return response.data;
    },
  });

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}мс`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}с`;
    return `${Math.floor(ms / 60000)}м ${Math.floor((ms % 60000) / 1000)}с`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">История запусков</h1>
          <p className="text-gray-600">Просматривайте историю выполнения автоматизаций</p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="input py-2"
          >
            <option value="">Все статусы</option>
            <option value="success">Успешно</option>
            <option value="error">Ошибка</option>
            <option value="running">Выполняется</option>
            <option value="pending">Ожидание</option>
            <option value="cancelled">Отменено</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="card animate-pulse">
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      ) : data?.executions && data.executions.length > 0 ? (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Автоматизация
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Длительность
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.executions.map((execution: Execution) => {
                  const status = statusConfig[execution.status];
                  const StatusIcon = status.icon;
                  const workflowName =
                    typeof execution.workflowId === 'object'
                      ? execution.workflowId.name
                      : 'Автоматизация';

                  return (
                    <tr
                      key={execution._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/dashboard/executions/${execution._id}`}
                          className="font-medium text-gray-900 hover:text-primary-600"
                        >
                          {workflowName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={clsx('flex items-center gap-2', status.color)}>
                          <StatusIcon className="h-5 w-5" />
                          <span className="text-sm">{status.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {execution.duration
                          ? formatDuration(execution.duration)
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(execution.createdAt), 'd MMM yyyy HH:mm', {
                          locale: ru,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary"
              >
                Назад
              </button>
              <span className="flex items-center px-4 text-sm text-gray-500">
                Страница {page} из {data.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="btn-secondary"
              >
                Вперед
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-12">
          <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Нет запусков
          </h3>
          <p className="text-gray-500">
            Запуски появятся после активации автоматизаций
          </p>
        </div>
      )}
    </div>
  );
}

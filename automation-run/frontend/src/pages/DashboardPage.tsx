import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BoltIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { usersApi, executionsApi, workflowsApi } from '@/services/api';
import type { UserStats, ActivityStats, Workflow } from '@/types';

export default function DashboardPage() {
  const { data: stats } = useQuery<UserStats>({
    queryKey: ['userStats'],
    queryFn: async () => {
      const response = await usersApi.getStats();
      return response.data;
    },
  });

  const { data: activity } = useQuery<ActivityStats[]>({
    queryKey: ['activity'],
    queryFn: async () => {
      const response = await executionsApi.getActivity(14);
      return response.data;
    },
  });

  const { data: workflowsData } = useQuery<{ workflows: Workflow[] }>({
    queryKey: ['recentWorkflows'],
    queryFn: async () => {
      const response = await workflowsApi.getAll({ limit: 5 });
      return response.data;
    },
  });

  const { data: execStats } = useQuery({
    queryKey: ['executionStats'],
    queryFn: async () => {
      const response = await executionsApi.getStats();
      return response.data;
    },
  });

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Панель управления</h1>
          <p className="text-gray-600">
            Обзор ваших автоматизаций и активности
          </p>
        </div>
        <Link to="/dashboard/workflows/new" className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Новая автоматизация
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <BoltIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Автоматизации</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.workflowsCount || 0}
                {stats?.limits.workflowsLimit !== -1 && (
                  <span className="text-sm font-normal text-gray-500">
                    /{stats?.limits.workflowsLimit}
                  </span>
                )}
              </p>
            </div>
          </div>
          {stats?.limits.workflowsLimit !== -1 && (
            <div className="mt-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all"
                  style={{
                    width: `${getUsagePercentage(
                      stats?.workflowsCount || 0,
                      stats?.limits.workflowsLimit || 1
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <PlayIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Выполнений за месяц</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.executionsThisMonth || 0}
                {stats?.limits.executionsLimit !== -1 && (
                  <span className="text-sm font-normal text-gray-500">
                    /{stats?.limits.executionsLimit}
                  </span>
                )}
              </p>
            </div>
          </div>
          {stats?.limits.executionsLimit !== -1 && (
            <div className="mt-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{
                    width: `${getUsagePercentage(
                      stats?.executionsThisMonth || 0,
                      stats?.limits.executionsLimit || 1
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Успешных</p>
              <p className="text-2xl font-bold text-gray-900">
                {execStats?.success || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <ExclamationCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">С ошибками</p>
              <p className="text-2xl font-bold text-gray-900">
                {execStats?.error || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity chart */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Активность за 14 дней
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activity || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getDate()}.${date.getMonth() + 1}`;
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                labelFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('ru-RU');
                }}
              />
              <Line
                type="monotone"
                dataKey="success"
                name="Успешно"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="error"
                name="Ошибки"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent workflows */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Недавние автоматизации
          </h2>
          <Link
            to="/dashboard/workflows"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Все автоматизации →
          </Link>
        </div>
        {workflowsData?.workflows && workflowsData.workflows.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {workflowsData.workflows.map((workflow) => (
              <Link
                key={workflow._id}
                to={`/dashboard/workflows/${workflow._id}`}
                className="flex items-center justify-between py-4 hover:bg-gray-50 -mx-6 px-6 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      workflow.isActive ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{workflow.name}</p>
                    <p className="text-sm text-gray-500">
                      {workflow.executionCount} выполнений
                    </p>
                  </div>
                </div>
                <span
                  className={`badge ${
                    workflow.status === 'active'
                      ? 'badge-success'
                      : workflow.status === 'error'
                      ? 'badge-error'
                      : 'badge-gray'
                  }`}
                >
                  {workflow.status === 'active'
                    ? 'Активен'
                    : workflow.status === 'error'
                    ? 'Ошибка'
                    : 'Черновик'}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BoltIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              У вас пока нет автоматизаций
            </p>
            <Link to="/dashboard/workflows/new" className="btn-primary">
              Создать первую
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

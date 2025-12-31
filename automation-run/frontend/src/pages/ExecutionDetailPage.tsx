import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlayCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { executionsApi } from '@/services/api';
import type { Execution, ExecutionStatus, StepLog } from '@/types';
import clsx from 'clsx';

const statusConfig: Record<
  ExecutionStatus,
  { label: string; icon: any; bgColor: string; textColor: string }
> = {
  pending: {
    label: 'Ожидание',
    icon: ClockIcon,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
  running: {
    label: 'Выполняется',
    icon: PlayCircleIcon,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  success: {
    label: 'Успешно',
    icon: CheckCircleIcon,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  error: {
    label: 'Ошибка',
    icon: ExclamationCircleIcon,
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
  cancelled: {
    label: 'Отменено',
    icon: XCircleIcon,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
};

export default function ExecutionDetailPage() {
  const { id } = useParams();
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const { data: execution, isLoading } = useQuery<Execution>({
    queryKey: ['execution', id],
    queryFn: async () => {
      const response = await executionsApi.getById(id!);
      return response.data;
    },
  });

  const toggleStep = (nodeId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}мс`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}с`;
    return `${Math.floor(ms / 60000)}м ${Math.floor((ms % 60000) / 1000)}с`;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="h-32 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!execution) {
    return <div>Выполнение не найдено</div>;
  }

  const status = statusConfig[execution.status];
  const StatusIcon = status.icon;
  const workflowName =
    typeof execution.workflowId === 'object'
      ? execution.workflowId.name
      : 'Автоматизация';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard/executions"
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{workflowName}</h1>
          <p className="text-gray-500 text-sm">
            {format(new Date(execution.createdAt), 'd MMMM yyyy HH:mm:ss', {
              locale: ru,
            })}
          </p>
        </div>
        <div
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg',
            status.bgColor,
            status.textColor
          )}
        >
          <StatusIcon className="h-5 w-5" />
          <span className="font-medium">{status.label}</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <p className="text-sm text-gray-500">Длительность</p>
          <p className="text-2xl font-bold text-gray-900">
            {execution.duration ? formatDuration(execution.duration) : '-'}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Шаги выполнено</p>
          <p className="text-2xl font-bold text-gray-900">
            {execution.steps?.length || 0}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">ID выполнения</p>
          <p className="text-sm font-mono text-gray-700 truncate">
            {execution._id}
          </p>
        </div>
      </div>

      {/* Error message */}
      {execution.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium mb-2">Ошибка выполнения</h3>
          <p className="text-red-700 text-sm">{execution.error}</p>
        </div>
      )}

      {/* Trigger data */}
      {execution.triggerData &&
        Object.keys(execution.triggerData).length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Данные триггера</h3>
            <pre className="bg-gray-50 rounded-lg p-4 text-sm overflow-x-auto">
              {JSON.stringify(execution.triggerData, null, 2)}
            </pre>
          </div>
        )}

      {/* Steps */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Шаги выполнения</h3>
        <div className="space-y-2">
          {execution.steps?.map((step: StepLog, index: number) => {
            const stepStatus = statusConfig[step.status];
            const StepIcon = stepStatus.icon;
            const isExpanded = expandedSteps.has(step.nodeId);

            return (
              <div
                key={step.nodeId}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleStep(step.nodeId)}
                  className={clsx(
                    'w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors',
                    stepStatus.bgColor.replace('100', '50')
                  )}
                >
                  <div
                    className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      stepStatus.bgColor
                    )}
                  >
                    <span className={clsx('text-sm font-medium', stepStatus.textColor)}>
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{step.nodeName}</p>
                    <p className="text-sm text-gray-500 capitalize">
                      {step.nodeType.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {step.duration && (
                      <span className="text-sm text-gray-500">
                        {formatDuration(step.duration)}
                      </span>
                    )}
                    <StepIcon className={clsx('h-5 w-5', stepStatus.textColor)} />
                    {isExpanded ? (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 mb-1">Начало</p>
                        <p className="font-medium">
                          {step.startedAt
                            ? format(
                                new Date(step.startedAt),
                                'HH:mm:ss.SSS',
                                { locale: ru }
                              )
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Окончание</p>
                        <p className="font-medium">
                          {step.finishedAt
                            ? format(
                                new Date(step.finishedAt),
                                'HH:mm:ss.SSS',
                                { locale: ru }
                              )
                            : '-'}
                        </p>
                      </div>
                    </div>

                    {step.error && (
                      <div className="mt-4">
                        <p className="text-red-600 font-medium mb-1">Ошибка</p>
                        <p className="text-red-700 text-sm">{step.error}</p>
                      </div>
                    )}

                    {step.output && (
                      <div className="mt-4">
                        <p className="text-gray-500 mb-1">Результат</p>
                        <pre className="bg-white rounded border p-3 text-xs overflow-x-auto">
                          {JSON.stringify(step.output, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {(!execution.steps || execution.steps.length === 0) && (
            <p className="text-gray-500 text-center py-4">
              Нет шагов выполнения
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

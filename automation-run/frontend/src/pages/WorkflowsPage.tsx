import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  BoltIcon,
  EllipsisVerticalIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { workflowsApi } from '@/services/api';
import type { Workflow } from '@/types';
import { Menu } from '@headlessui/react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function WorkflowsPage() {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['workflows', page],
    queryFn: async () => {
      const response = await workflowsApi.getAll({ page, limit: 10 });
      return response.data;
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => workflowsApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Автоматизация активирована');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка активации');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => workflowsApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Автоматизация деактивирована');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => workflowsApi.duplicate(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Автоматизация скопирована');
      navigate(`/dashboard/workflows/${response.data._id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workflowsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Автоматизация удалена');
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Удалить автоматизацию "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Автоматизации</h1>
          <p className="text-gray-600">
            Управляйте своими автоматизациями
          </p>
        </div>
        <Link to="/dashboard/workflows/new" className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Новая автоматизация
        </Link>
      </div>

      {isLoading ? (
        <div className="card animate-pulse">
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      ) : data?.workflows && data.workflows.length > 0 ? (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Название
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Запуски
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Обновлен
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.workflows.map((workflow: Workflow) => (
                  <tr
                    key={workflow._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/dashboard/workflows/${workflow._id}`}
                        className="flex items-center gap-3"
                      >
                        <div
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            workflow.isActive ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        />
                        <div>
                          <p className="font-medium text-gray-900 hover:text-primary-600">
                            {workflow.name}
                          </p>
                          {workflow.description && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {workflow.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`badge ${
                          workflow.status === 'active'
                            ? 'badge-success'
                            : workflow.status === 'error'
                            ? 'badge-error'
                            : workflow.status === 'paused'
                            ? 'badge-warning'
                            : 'badge-gray'
                        }`}
                      >
                        {workflow.status === 'active'
                          ? 'Активен'
                          : workflow.status === 'error'
                          ? 'Ошибка'
                          : workflow.status === 'paused'
                          ? 'Приостановлен'
                          : 'Черновик'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {workflow.executionCount}
                      </div>
                      <div className="text-xs text-gray-500">
                        {workflow.successCount} успешно / {workflow.errorCount} ошибок
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(workflow.updatedAt), 'd MMM yyyy', {
                        locale: ru,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Menu as="div" className="relative inline-block text-left">
                        <Menu.Button className="p-2 hover:bg-gray-100 rounded-lg">
                          <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
                        </Menu.Button>
                        <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-1 z-10">
                          {workflow.isActive ? (
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() =>
                                    deactivateMutation.mutate(workflow._id)
                                  }
                                  className={`${
                                    active ? 'bg-gray-100' : ''
                                  } w-full text-left px-4 py-2 text-sm flex items-center gap-2`}
                                >
                                  <PauseIcon className="h-4 w-4" />
                                  Деактивировать
                                </button>
                              )}
                            </Menu.Item>
                          ) : (
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() =>
                                    activateMutation.mutate(workflow._id)
                                  }
                                  className={`${
                                    active ? 'bg-gray-100' : ''
                                  } w-full text-left px-4 py-2 text-sm flex items-center gap-2`}
                                >
                                  <PlayIcon className="h-4 w-4" />
                                  Активировать
                                </button>
                              )}
                            </Menu.Item>
                          )}
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() =>
                                  duplicateMutation.mutate(workflow._id)
                                }
                                className={`${
                                  active ? 'bg-gray-100' : ''
                                } w-full text-left px-4 py-2 text-sm flex items-center gap-2`}
                              >
                                <DocumentDuplicateIcon className="h-4 w-4" />
                                Дублировать
                              </button>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() =>
                                  handleDelete(workflow._id, workflow.name)
                                }
                                className={`${
                                  active ? 'bg-gray-100' : ''
                                } w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-red-600`}
                              >
                                <TrashIcon className="h-4 w-4" />
                                Удалить
                              </button>
                            )}
                          </Menu.Item>
                        </Menu.Items>
                      </Menu>
                    </td>
                  </tr>
                ))}
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
          <BoltIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Нет автоматизаций
          </h3>
          <p className="text-gray-500 mb-6">
            Создайте свою первую автоматизацию
          </p>
          <Link to="/dashboard/workflows/new" className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Создать автоматизацию
          </Link>
        </div>
      )}
    </div>
  );
}

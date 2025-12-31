import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckIcon } from '@heroicons/react/24/outline';
import { subscriptionsApi, paymentsApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { PlanDetails } from '@/types';
import clsx from 'clsx';

export default function SubscriptionPage() {
  const user = useAuthStore((state) => state.user);

  const { data: currentSub } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const response = await subscriptionsApi.getCurrent();
      return response.data;
    },
  });

  const { data: plans } = useQuery<Record<string, PlanDetails>>({
    queryKey: ['plans'],
    queryFn: async () => {
      const response = await subscriptionsApi.getPlans();
      return response.data;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ['paymentHistory'],
    queryFn: async () => {
      const response = await paymentsApi.getHistory({ limit: 10 });
      return response.data;
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (plan: string) => paymentsApi.createCheckout(plan),
    onSuccess: (response) => {
      window.location.href = response.data.url;
    },
    onError: () => {
      toast.error('Ошибка создания платежа');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => subscriptionsApi.cancel(false),
    onSuccess: () => {
      toast.success('Подписка будет отменена в конце периода');
    },
  });

  const plansArray = plans
    ? [
        { key: 'free', ...plans.free },
        { key: 'pro', ...plans.pro },
        { key: 'enterprise', ...plans.enterprise },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Подписка</h1>
        <p className="text-gray-600">Управляйте своим тарифным планом</p>
      </div>

      {/* Current plan */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Текущий тариф
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900 capitalize">
              {currentSub?.subscription?.plan || 'Free'}
            </p>
            <p className="text-gray-500">
              {currentSub?.subscription?.status === 'active'
                ? 'Активен'
                : 'Не активен'}
            </p>
          </div>
          {currentSub?.subscription?.plan !== 'free' && (
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
            >
              Отменить подписку
            </button>
          )}
        </div>

        {/* Usage */}
        {currentSub?.usage && (
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Автоматизации</p>
              <p className="text-xl font-semibold">
                {currentSub.usage.workflowsCount}
                {currentSub.usage.limits.workflowsLimit !== -1 && (
                  <span className="text-gray-400 text-sm font-normal">
                    /{currentSub.usage.limits.workflowsLimit}
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Выполнений в месяц</p>
              <p className="text-xl font-semibold">
                {currentSub.usage.executionsThisMonth}
                {currentSub.usage.limits.executionsLimit !== -1 && (
                  <span className="text-gray-400 text-sm font-normal">
                    /{currentSub.usage.limits.executionsLimit}
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Хранилище</p>
              <p className="text-xl font-semibold">
                {Math.round(currentSub.usage.storageUsed)} МБ
                {currentSub.usage.limits.storageLimit !== -1 && (
                  <span className="text-gray-400 text-sm font-normal">
                    /{currentSub.usage.limits.storageLimit} МБ
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Тарифные планы
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {plansArray.map((plan) => {
            const isCurrent = user?.plan === plan.key;
            const isHigher =
              (plan.key === 'pro' && user?.plan === 'free') ||
              (plan.key === 'enterprise' &&
                (user?.plan === 'free' || user?.plan === 'pro'));

            return (
              <div
                key={plan.key}
                className={clsx(
                  'rounded-xl p-6',
                  isCurrent
                    ? 'bg-primary-50 border-2 border-primary-500'
                    : 'bg-white border-2 border-gray-200'
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    {plan.name}
                  </h3>
                  {isCurrent && (
                    <span className="badge badge-success">Текущий</span>
                  )}
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">
                    {plan.price.toLocaleString()} ₽
                  </span>
                  <span className="text-gray-500">/месяц</span>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features?.map((feature: string) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isHigher && (
                  <button
                    onClick={() => checkoutMutation.mutate(plan.key)}
                    disabled={checkoutMutation.isPending}
                    className="w-full btn-primary"
                  >
                    {checkoutMutation.isPending
                      ? 'Загрузка...'
                      : 'Перейти на ' + plan.name}
                  </button>
                )}

                {isCurrent && (
                  <button disabled className="w-full btn-secondary opacity-50">
                    Текущий план
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment history */}
      {payments?.payments && payments.payments.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            История платежей
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Дата
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Описание
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Сумма
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.payments.map((payment: any) => (
                  <tr key={payment._id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(payment.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {payment.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {payment.amount.toLocaleString()} {payment.currency}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'badge',
                          payment.status === 'succeeded' && 'badge-success',
                          payment.status === 'failed' && 'badge-error',
                          payment.status === 'pending' && 'badge-warning'
                        )}
                      >
                        {payment.status === 'succeeded'
                          ? 'Оплачено'
                          : payment.status === 'failed'
                          ? 'Ошибка'
                          : 'Ожидание'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usersApi, authApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

interface ProfileForm {
  name: string;
}

interface PasswordForm {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const queryClient = useQueryClient();

  const profileForm = useForm<ProfileForm>({
    defaultValues: { name: user?.name || '' },
  });

  const passwordForm = useForm<PasswordForm>();

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name: string }) => usersApi.updateMe(data),
    onSuccess: (response) => {
      updateUser({ name: response.data.name });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('Профиль обновлен');
    },
    onError: () => {
      toast.error('Ошибка обновления профиля');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { oldPassword: string; newPassword: string }) =>
      authApi.changePassword(data),
    onSuccess: () => {
      passwordForm.reset();
      toast.success('Пароль изменен');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка смены пароля');
    },
  });

  const onProfileSubmit = (data: ProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    changePasswordMutation.mutate({
      oldPassword: data.oldPassword,
      newPassword: data.newPassword,
    });
  };

  const tabs = [
    { key: 'profile', label: 'Профиль' },
    { key: 'security', label: 'Безопасность' },
    { key: 'notifications', label: 'Уведомления' },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
        <p className="text-gray-600">Управляйте настройками аккаунта</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="card max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Личные данные
          </h2>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="input bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email нельзя изменить
              </p>
            </div>

            <div>
              <label className="label">Имя</label>
              <input
                {...profileForm.register('name', { required: true })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Тарифный план</label>
              <input
                type="text"
                value={user?.plan?.toUpperCase() || 'FREE'}
                disabled
                className="input bg-gray-50"
              />
            </div>

            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="btn-primary"
            >
              {updateProfileMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </button>
          </form>
        </div>
      )}

      {/* Security tab */}
      {activeTab === 'security' && (
        <div className="card max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Смена пароля
          </h2>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div>
              <label className="label">Текущий пароль</label>
              <input
                type="password"
                {...passwordForm.register('oldPassword', { required: true })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Новый пароль</label>
              <input
                type="password"
                {...passwordForm.register('newPassword', {
                  required: true,
                  minLength: 8,
                })}
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Минимум 8 символов
              </p>
            </div>

            <div>
              <label className="label">Подтверждение пароля</label>
              <input
                type="password"
                {...passwordForm.register('confirmPassword', { required: true })}
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="btn-primary"
            >
              {changePasswordMutation.isPending
                ? 'Сохранение...'
                : 'Изменить пароль'}
            </button>
          </form>

          <hr className="my-8" />

          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Активные сессии
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            Управление активными сессиями будет добавлено в ближайшее время.
          </p>
        </div>
      )}

      {/* Notifications tab */}
      {activeTab === 'notifications' && (
        <div className="card max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Уведомления
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Email уведомления</p>
                <p className="text-sm text-gray-500">
                  Получать уведомления об ошибках и важных событиях
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Telegram уведомления</p>
                <p className="text-sm text-gray-500">
                  Получать уведомления в Telegram
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Маркетинговые письма</p>
                <p className="text-sm text-gray-500">
                  Новости, обновления и специальные предложения
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          <button className="btn-primary mt-6">Сохранить настройки</button>
        </div>
      )}
    </div>
  );
}

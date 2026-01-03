import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import api from '@/services/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Токен верификации не найден');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await api.get(`/auth/verify-email?token=${token}`);
      setStatus('success');
      setMessage(response.data.message || 'Email успешно подтверждён!');
    } catch (error: any) {
      setStatus('error');
      setMessage(
        error.response?.data?.message || 'Ошибка при подтверждении email'
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <ArrowPathIcon className="w-16 h-16 mx-auto text-indigo-500 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mt-6">
              Подтверждаем email...
            </h1>
            <p className="text-gray-600 mt-2">Пожалуйста, подождите</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-6">
              Email подтверждён!
            </h1>
            <p className="text-gray-600 mt-2">{message}</p>
            <Link
              to="/login"
              className="inline-block mt-6 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
            >
              Войти в аккаунт
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <XCircleIcon className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-6">
              Ошибка верификации
            </h1>
            <p className="text-gray-600 mt-2">{message}</p>
            <div className="mt-6 space-y-3">
              <Link
                to="/login"
                className="block px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
              >
                Войти в аккаунт
              </Link>
              <Link
                to="/resend-verification"
                className="block px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
              >
                Отправить письмо повторно
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

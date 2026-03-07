import React, { useState } from 'react';
import { Screen, User } from '../types';
import { auth } from '../utils/api';

interface LoginScreenProps {
  navigateTo: (screen: Screen) => void;
  onLogin?: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigateTo, onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await auth.login(username, password);

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        if (onLogin) {
          onLogin(response.data.user);
        } else {
          navigateTo(Screen.Dashboard);
        }
      } else {
        setError('فشل تسجيل الدخول');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'فشل تسجيل الدخول. تحقق من اسم المستخدم وكلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-black">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border dark:border-amber-800/50">
        <div className="text-center">
          <img src="https://picsum.photos/100/100" alt="Logo" className="w-24 h-24 mx-auto rounded-full mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-amber-400">
            تسجيل الدخول
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            مرحباً بك في نظام إدارة المطاعم
          </p>
        </div>

        {error && (
          <div className="p-3 rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-center">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-800 rounded-t-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm"
                placeholder="اسم المستخدم"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-800 rounded-b-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm"
                placeholder="كلمة المرور"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-amber-600 dark:hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  جاري التحميل...
                </span>
              ) : (
                'دخول'
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>بيانات الدخول الافتراضية:</p>
          <p className="font-mono mt-1">admin / admin123</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

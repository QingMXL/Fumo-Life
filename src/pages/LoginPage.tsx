import React, { useMemo, useState } from 'react';
import { type Language } from '@/types';
import { loginWithUsername, registerWithUsername } from '@/services/auth';

interface LoginPageProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onLoginSuccess: () => void;
}

const WELCOME = {
  zh: '欢迎进入Fumo² Life，与幻想乡相连',
  en: 'Welcome to Fumo² Life, link to Gensokyo',
  ja: 'Fumo² Lifeへようこそ、幻想郷とつながろう',
} as const;

export const LoginPage: React.FC<LoginPageProps> = ({
  language,
  onLanguageChange,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('神社客');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const labels = useMemo(
    () => ({
      title: language === 'zh' ? '账号登录' : language === 'ja' ? 'ログイン' : 'Sign in',
      subtitle: WELCOME[language],
      username: language === 'zh' ? '用户名' : language === 'ja' ? 'ユーザー名' : 'Username',
      password: language === 'zh' ? '密码' : language === 'ja' ? 'パスワード' : 'Password',
      submit: isRegister
        ? language === 'zh'
          ? '注册'
          : language === 'ja'
            ? '新規登録'
            : 'Register'
        : language === 'zh'
          ? '登录'
          : language === 'ja'
            ? 'ログイン'
            : 'Login',
      switch: isRegister
        ? language === 'zh'
          ? '已有账号？去登录'
          : language === 'ja'
            ? 'アカウントあり？ログインへ'
            : 'Already registered? Login'
        : language === 'zh'
          ? '没有账号？去注册'
          : language === 'ja'
            ? 'アカウント作成はこちら'
            : 'No account? Register',
    }),
    [isRegister, language]
  );

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      if (isRegister) await registerWithUsername(username, password);
      else await loginWithUsername(username, password);
      onLoginSuccess();
    } catch (e: any) {
      setError(String(e?.message ?? e ?? 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 pt-10 pb-6 max-w-md mx-auto">
      <div className="flex justify-end gap-2 mb-6">
        {(['zh', 'ja', 'en'] as const).map(lang => (
          <button
            key={lang}
            type="button"
            onClick={() => onLanguageChange(lang)}
            className={`px-2 py-1 text-xs rounded-full stitched-border ${
              language === lang ? 'bg-cream-text text-white' : 'bg-white'
            }`}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="stitched-card">
        <h1 className="text-2xl font-black">Fumo² Life</h1>
        <p className="text-sm opacity-70 mt-2">{labels.subtitle}</p>
        <h2 className="font-bold mt-4">{labels.title}</h2>

        <div className="mt-4 space-y-3">
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder={labels.username}
            className="w-full bg-white stitched-border rounded-xl px-3 py-2 text-sm outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={labels.password}
            className="w-full bg-white stitched-border rounded-xl px-3 py-2 text-sm outline-none"
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
        </div>

        {error ? <p className="text-xs text-red-500 mt-3">{error}</p> : null}

        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="w-full mt-4 bg-cream-text text-white py-2.5 rounded-full font-bold disabled:opacity-60"
        >
          {loading ? '...' : labels.submit}
        </button>
        <button
          type="button"
          onClick={() => setIsRegister(v => !v)}
          className="w-full mt-2 text-xs opacity-70 hover:opacity-100"
        >
          {labels.switch}
        </button>
      </div>
    </div>
  );
};


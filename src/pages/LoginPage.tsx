import React, { useMemo, useState } from 'react';
import { type Language } from '@/types';
import { cn } from '@/lib/utils';
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
    <div className="mx-auto min-h-screen max-w-md pb-8">
      <header className="fumo-header-sky px-4 pb-16 pt-8 text-center">
        <h1 className="fumo-title-app text-2xl font-black">Fumo² Life</h1>
        <p className="mx-auto mt-2 max-w-[18rem] text-xs font-bold leading-relaxed text-white/85">
          {labels.subtitle}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          {(['zh', 'ja', 'en'] as const).map(lang => (
            <button
              key={lang}
              type="button"
              onClick={() => onLanguageChange(lang)}
              className={cn(
                'rounded-full border-2 border-white/50 px-3 py-1 text-[10px] font-extrabold backdrop-blur-sm transition-colors',
                language === lang ? 'bg-white/35 text-white' : 'bg-white/15 text-white/90'
              )}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <div className="fumo-page-sheet -mt-10 mx-4 px-4 pb-6 pt-6">
      <div className="stitched-card border-cream-border/90">
        <h2 className="text-lg font-black text-cream-text">{labels.title}</h2>
        <div className="mt-5 space-y-3">
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
          className="mt-5 w-full rounded-full bg-cream-text py-3 text-sm font-extrabold text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
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
    </div>
  );
};


import React, { useState } from 'react';
import { User } from '../types';
import { Loader2, Mail, Building2, User as UserIcon, Briefcase } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    company: '',
    department: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        const user = await res.json();
        onLogin(user);
      } else {
        const err = await res.json();
        alert(err.error || 'Authentication failed');
      }
    } catch (error) {
      alert('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-4 relative overflow-hidden">
      <div className="absolute -left-20 top-20 w-80 opacity-10 pointer-events-none hidden lg:block">
        <img src="/앵커 나현.png" alt="" className="w-full h-auto object-contain grayscale opacity-50" referrerPolicy="no-referrer" />
      </div>
      <div className="absolute -right-20 bottom-10 w-64 opacity-10 pointer-events-none hidden lg:block">
        <img src="/앵커 나현.png" alt="" className="w-full h-auto object-contain" referrerPolicy="no-referrer" />
      </div>
      
      <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] border border-gold-100 shadow-2xl shadow-gold-500/10 relative z-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gold-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-gold-600/20 shimmer-gold">
            <span className="text-white font-serif font-bold text-4xl italic">Z</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-zinc-900">Zen4U Journalist Pro</h1>
          <p className="text-zinc-500 text-sm mt-3 font-serif italic">
            {isLogin ? 'Welcome back, Reporter.' : 'Join the professional network.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
                <input
                  type="text"
                  placeholder="소속 회사 (Company)"
                  required
                  className="w-full bg-gold-50/30 border border-gold-100 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-gold-500 focus:bg-white transition-all outline-none"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
                <input
                  type="text"
                  placeholder="부서 (Department)"
                  required
                  className="w-full bg-gold-50/30 border border-gold-100 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-gold-500 focus:bg-white transition-all outline-none"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
                <input
                  type="text"
                  placeholder="이름 (Name)"
                  required
                  className="w-full bg-gold-50/30 border border-gold-100 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-gold-500 focus:bg-white transition-all outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </>
          )}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
            <input
              type="email"
              placeholder="이메일 주소 (Email)"
              required
              className="w-full bg-gold-50/30 border border-gold-100 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-gold-500 focus:bg-white transition-all outline-none"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-gold-600/20 hover:bg-gold-700 transition-all flex items-center justify-center gap-3 text-lg shimmer-gold"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (isLogin ? '로그인 (Login)' : '회원가입 (Sign Up)')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-zinc-400 hover:text-gold-600 transition-colors font-bold"
          >
            {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    </div>
  );
}

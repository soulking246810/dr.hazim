import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Lock, LogIn } from 'lucide-react';

const Login = () => {
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/dashboard';

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        fullName: '',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            console.log('Attempting login...', formData.username);
            await login(formData.username, formData.password);
            console.log('Login successful');
            toast.success('تم تسجيل الدخول بنجاح');

            navigate(from, { replace: true });
        } catch (error) {
            console.error('Auth error:', error);
            let msg = error.message;
            if (msg.includes('Email not confirmed')) msg = 'يرجى تأكيد البريد الإلكتروني (أو قم بتعطيل Confirm Email في Supabase)';
            if (msg.includes('Invalid login credentials')) msg = 'اسم المستخدم أو كلمة المرور غير صحيحة';
            toast.error(msg || 'حدث خطأ ما');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-primary-200/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[0%] left-[0%] w-[40%] h-[40%] bg-gold-200/20 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden z-10 border border-slate-100">
                <div className="p-8 text-center bg-gradient-to-br from-primary-600 to-primary-800 text-white">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center backdrop-blur-sm mb-4">
                        <span className="text-2xl font-bold">حج</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">تعليمات الحج</h2>
                    <p className="text-primary-100 text-sm">أهلاً بك في منصة التعلم والمتابعة</p>
                </div>

                <div className="p-8">
                    <div className="text-center mb-6">
                        <h3 className="font-bold text-slate-800 text-lg">تسجيل الدخول</h3>
                        <p className="text-slate-500 text-sm">أدخل بياناتك للمتابعة</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">اسم المستخدم</label>
                            <div className="relative">
                                <User className="w-5 h-5 absolute right-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                                    placeholder="username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">كلمة المرور</label>
                            <div className="relative">
                                <Lock className="w-5 h-5 absolute right-3 top-3 text-slate-400" />
                                <input
                                    type="password"
                                    required
                                    className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 transition-all flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    دخول
                                    <LogIn className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;

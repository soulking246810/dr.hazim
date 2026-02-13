import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { BookOpen, CheckCircle, Bell, Calendar, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const Dashboard = () => {
    const { profile, user } = useAuth();
    const [stats, setStats] = useState({
        quranParts: 0,
        completedLessons: 0,
        totalLessons: 0,
        unreadNotifications: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchStats();
            fetchRecentActivity();
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            const { count: quranCount } = await supabase
                .from('quran_parts')
                .select('*', { count: 'exact', head: true })
                .eq('selected_by', user.id);

            const { count: completedCount } = await supabase
                .from('user_progress')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('completed', true);

            const { count: totalOptions } = await supabase
                .from('options')
                .select('*', { count: 'exact', head: true });

            const { count: notifCount } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            setStats({
                quranParts: quranCount || 0,
                completedLessons: completedCount || 0,
                totalLessons: totalOptions || 0,
                unreadNotifications: notifCount || 0
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentActivity = async () => {
        try {
            const { data, error } = await supabase
                .from('user_progress')
                .select(`
                    id,
                    completed,
                    completed_at,
                    option_id,
                    options:option_id (title)
                `)
                .eq('user_id', user.id)
                .eq('completed', true)
                .order('completed_at', { ascending: false })
                .limit(5);

            if (!error && data) {
                setRecentActivity(data);
            }
        } catch (error) {
            console.error('Error fetching recent activity:', error);
        }
    };

    const completionPercentage = stats.totalLessons > 0
        ? Math.round((stats.completedLessons / stats.totalLessons) * 100)
        : 0;

    const StatCard = ({ title, value, icon: Icon, colorClass, bgClass, description }) => (
        <div className="relative overflow-hidden bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 group">
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-10 transition-transform group-hover:scale-110 ${bgClass}`}></div>
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl ${bgClass} ${colorClass} bg-opacity-10`}>
                        <Icon className="w-6 h-6" />
                    </div>
                </div>
                <div>
                    <h3 className="text-slate-500 font-medium mb-1 text-sm">{title}</h3>
                    <p className="text-3xl font-bold text-slate-800">{value}</p>
                    {description && <p className="text-xs text-slate-400 mt-2">{description}</p>}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Welcome Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 p-8 shadow-xl text-white">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-20 -mt-20 mix-blend-overlay"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-10 -mb-10 mix-blend-overlay"></div>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-bold mb-2">مرحباً بك، {profile?.full_name} 👋</h2>
                        <p className="text-primary-100 text-lg max-w-xl leading-relaxed opacity-90">
                            تابع تعلمك ومتابعتك في تعليمات الحج. كل خطوة تقربك نحو الإتقان.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link to="/quran-tracking" className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 text-sm border border-white/10">
                                <Calendar className="w-4 h-4" />
                                <span>متابعة الختمات</span>
                            </Link>
                            <Link to="/pages/library" className="bg-white text-primary-700 hover:bg-primary-50 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary-900/20 text-sm">
                                تصفح المكتبة
                            </Link>
                        </div>
                    </div>

                    {/* Circle Progress Widget */}
                    <div className="hidden md:flex flex-col items-center bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                        <div className="relative w-24 h-24 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    className="text-white/20"
                                    strokeWidth="8"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="42"
                                    cx="48"
                                    cy="48"
                                />
                                <circle
                                    className="text-white transition-all duration-1000 ease-out"
                                    strokeWidth="8"
                                    strokeDasharray={264}
                                    strokeDashoffset={264 - (264 * completionPercentage) / 100}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="42"
                                    cx="48"
                                    cy="48"
                                />
                            </svg>
                            <span className="absolute text-xl font-bold">{completionPercentage}%</span>
                        </div>
                        <span className="text-sm font-medium mt-2 text-white/90">إجمالي التقدم</span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="الأجزاء المحجوزة"
                    value={stats.quranParts}
                    icon={BookOpen}
                    bgClass="bg-blue-500"
                    colorClass="text-blue-600"
                    description="الأجزاء التي حجزتها في الختمات"
                />
                <StatCard
                    title="الدروس المكتملة"
                    value={stats.completedLessons}
                    icon={CheckCircle}
                    bgClass="bg-emerald-500"
                    colorClass="text-emerald-600"
                    description={`${Math.max(0, stats.totalLessons - stats.completedLessons)} درس متبقي للإتمام`}
                />
                <StatCard
                    title="التنبيهات الجديدة"
                    value={stats.unreadNotifications}
                    icon={Bell}
                    bgClass="bg-amber-500"
                    colorClass="text-amber-600"
                    description="إشعارات تحتاج إلى انتباهك"
                />
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <List className="w-5 h-5 text-primary-500" />
                        <span>نشاطك الأخير</span>
                    </h3>
                </div>

                <div className="space-y-3">
                    {recentActivity.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">لم تكمل أي دروس بعد. ابدأ من المكتبة!</p>
                            <Link to="/pages/library" className="inline-block mt-3 text-primary-600 hover:text-primary-700 font-medium text-sm">
                                تصفح المكتبة ←
                            </Link>
                        </div>
                    ) : (
                        recentActivity.map((activity) => (
                            <div key={activity.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                                    <CheckCircle className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-700 text-sm group-hover:text-primary-700 transition-colors">
                                        {activity.options?.title || 'درس مكتمل'}
                                    </h4>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {activity.completed_at
                                            ? formatDistanceToNow(new Date(activity.completed_at), { addSuffix: true, locale: ar })
                                            : 'مكتمل'}
                                    </p>
                                </div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    مكتمل
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

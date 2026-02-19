import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { BookOpen, Bell, List } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const { profile, user } = useAuth();
    const [stats, setStats] = useState({
        quranParts: 0,
        totalLessons: 0,
        unreadNotifications: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initial fetch
        fetchStats();

        // Realtime subscriptions
        const quranSubscription = supabase
            .channel('public:quran_parts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'quran_parts' }, () => {
                fetchQuranStats();
            })
            .subscribe();

        const notifSubscription = supabase
            .channel('public:notifications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: user ? `user_id=eq.${user.id}` : undefined }, () => {
                if (user) fetchNotificationStats();
            })
            .subscribe();

        // Lessons subscription (options)
        const optionsSubscription = supabase
            .channel('public:options')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'options' }, () => {
                fetchLessonStats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(quranSubscription);
            supabase.removeChannel(notifSubscription);
            supabase.removeChannel(optionsSubscription);
        };
    }, [user]);

    const fetchStats = async () => {
        await Promise.all([
            fetchQuranStats(),
            fetchLessonStats(),
            fetchNotificationStats()
        ]);
        setLoading(false);
    };

    const fetchQuranStats = async () => {
        let count = 0;

        if (user) {
            const { count: c } = await supabase
                .from('quran_parts')
                .select('*', { count: 'exact', head: true })
                .eq('selected_by', user.id);
            count = c;
        } else {
            const deviceId = localStorage.getItem('quran_app_device_id');
            if (deviceId) {
                const { count: c } = await supabase
                    .from('quran_parts')
                    .select('*', { count: 'exact', head: true })
                    .eq('device_id', deviceId);
                count = c;
            }
        }

        setStats(prev => ({ ...prev, quranParts: count || 0 }));
    };

    const fetchLessonStats = async () => {
        const { count } = await supabase
            .from('options')
            .select('*', { count: 'exact', head: true });

        setStats(prev => ({ ...prev, totalLessons: count || 0 }));
    };

    const fetchNotificationStats = async () => {
        if (!user) {
            setStats(prev => ({ ...prev, unreadNotifications: 0 }));
            return;
        }

        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        setStats(prev => ({ ...prev, unreadNotifications: count || 0 }));
    };

    const StatCard = ({ title, value, icon: Icon, colorClass, bgClass, description }) => (
        <div className="relative overflow-hidden bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 group">
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-10 transition-transform group-hover:scale-110 ${bgClass}`}></div>
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl ${bgClass} ${colorClass} bg-opacity-10`}>
                        <Icon className="w-6 h-6" />
                    </div>
                </div>
                <div>
                    <h3 className="text-slate-500 font-medium mb-1 text-sm">{title}</h3>
                    <p className="text-3xl font-bold text-slate-800">{loading ? '...' : value}</p>
                    {description && <p className="text-xs text-slate-400 mt-2">{description}</p>}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 sm:space-y-8 animate-fade-in pb-10">
            {/* Welcome Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 p-6 sm:p-8 shadow-xl text-white">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-20 -mt-20 mix-blend-overlay"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-10 -mb-10 mix-blend-overlay"></div>
                </div>

                <div className="relative z-10">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">قافلة المتعهد الحاج د. حازم محمد خضير الطائي</h2>
                    <p className="text-primary-100 text-base sm:text-lg max-w-xl leading-relaxed opacity-90">
                        "الحج لقاء الله" خدمة الحاج شرف لنا وسبب توفيقنا ووسيلة قربنا لله عز وجل
                    </p>
                    <div className="mt-5 sm:mt-6 flex flex-wrap gap-3">
                        <Link to="/quran-tracking" className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-4 sm:px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 text-sm border border-white/10">
                            {/* <Calendar className="w-4 h-4" /> */}
                            <span>متابعة الختمات</span>
                        </Link>
                        <Link to="/pages/library" className="bg-white text-primary-700 hover:bg-primary-50 px-4 sm:px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary-900/20 text-sm">
                            تصفح المكتبة
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <StatCard
                    title="الأجزاء المحجوزة"
                    value={stats.quranParts}
                    icon={BookOpen}
                    bgClass="bg-blue-500"
                    colorClass="text-blue-600"
                    description="الأجزاء التي حجزتها في الختمات"
                />
                <StatCard
                    title="إجمالي الدروس"
                    value={stats.totalLessons}
                    icon={List}
                    bgClass="bg-emerald-500"
                    colorClass="text-emerald-600"
                    description="جميع الدروس المتاحة في المكتبة"
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
        </div>
    );
};

export default Dashboard;

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, BookOpen, BarChart3, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AdminDashboard = () => {
    const [stats, setStats] = useState({ users: 0, pages: 0, options: 0, quranSelected: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const [usersRes, pagesRes, optionsRes, quranRes] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('pages').select('*', { count: 'exact', head: true }),
                supabase.from('options').select('*', { count: 'exact', head: true }),
                supabase.from('quran_parts').select('*', { count: 'exact', head: true }).not('selected_by', 'is', null),
            ]);

            setStats({
                users: usersRes.count || 0,
                pages: pagesRes.count || 0,
                options: optionsRes.count || 0,
                quranSelected: quranRes.count || 0,
            });
        } catch (error) {
            console.error('Error fetching admin stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const adminCards = [
        {
            to: '/admin/content',
            icon: FileText,
            title: 'إدارة المحتوى',
            description: 'إضافة وتعديل الصفحات، القوائم، والدروس.',
            color: 'primary',
            stat: `${stats.pages} صفحة، ${stats.options} درس`
        },
        {
            to: '/admin/users',
            icon: Users,
            title: 'إدارة المستخدمين',
            description: 'إنشاء وتعديل وحذف حسابات المستخدمين.',
            color: 'purple',
            stat: `${stats.users} مستخدم`
        },
        {
            to: '/quran-tracking',
            icon: BookOpen,
            title: 'متابعة الختمات',
            description: 'إدارة الختمات وإعادة تعيين الأجزاء.',
            color: 'amber',
            stat: `${stats.quranSelected} / 30 جزء محجوز`
        },
    ];

    const colorMap = {
        primary: {
            bg: 'bg-primary-50',
            text: 'text-primary-600',
            hover: 'hover:border-primary-500',
            groupHoverBg: 'group-hover:bg-primary-600',
        },
        purple: {
            bg: 'bg-purple-50',
            text: 'text-purple-600',
            hover: 'hover:border-purple-500',
            groupHoverBg: 'group-hover:bg-purple-600',
        },
        amber: {
            bg: 'bg-amber-50',
            text: 'text-amber-600',
            hover: 'hover:border-amber-500',
            groupHoverBg: 'group-hover:bg-amber-600',
        },
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">لوحة تحكم المشرف</h1>
                    <p className="text-slate-500 mt-1">إدارة كاملة للمنصة والمحتوى والمستخدمين</p>
                </div>
                <button
                    onClick={fetchStats}
                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                    title="تحديث الإحصائيات"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'المستخدمين', value: stats.users, icon: Users, color: 'text-purple-600 bg-purple-50' },
                    { label: 'الصفحات', value: stats.pages, icon: FileText, color: 'text-primary-600 bg-primary-50' },
                    { label: 'الدروس', value: stats.options, icon: BarChart3, color: 'text-blue-600 bg-blue-50' },
                    { label: 'أجزاء محجوزة', value: stats.quranSelected, icon: BookOpen, color: 'text-amber-600 bg-amber-50' },
                ].map((item, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                        <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-3`}>
                            <item.icon className="w-5 h-5" />
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{loading ? '...' : item.value}</p>
                        <p className="text-xs text-slate-500 mt-1">{item.label}</p>
                    </div>
                ))}
            </div>

            {/* Admin Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {adminCards.map((card) => {
                    const colors = colorMap[card.color];
                    return (
                        <Link
                            key={card.to}
                            to={card.to}
                            className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 ${colors.hover} hover:shadow-md transition-all group`}
                        >
                            <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center ${colors.text} ${colors.groupHoverBg} group-hover:text-white transition-colors mb-4`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">{card.title}</h3>
                            <p className="text-slate-500 mt-2 text-sm">{card.description}</p>
                            {!loading && (
                                <p className="text-xs text-primary-600 mt-3 font-medium">{card.stat}</p>
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminDashboard;

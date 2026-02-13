import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Bell, Check } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const NotificationsPanel = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (user) {
            fetchNotifications();
            subscribeToNotifications();
        }
    }, [user]);

    const fetchNotifications = async () => {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (data) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        }
    };

    const subscribeToNotifications = () => {
        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    setNotifications(prev => [payload.new, ...prev]);
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const markAsRead = async (id) => {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllRead = async () => {
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full border-2 border-white">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-scale-in origin-top-left">
                        <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-700">التنبيهات</h3>
                            <button onClick={markAllRead} className="text-xs text-primary-600 hover:text-primary-700">تحديد الكل كمقروء</button>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">لا توجد تنبيهات جديدة</div>
                            ) : (
                                notifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        onClick={() => markAsRead(notif.id)}
                                        className={clsx(
                                            "p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer",
                                            !notif.is_read ? "bg-primary-50/30" : ""
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={clsx("font-bold text-sm", !notif.is_read ? "text-primary-700" : "text-slate-700")}>{notif.title}</h4>
                                            {!notif.is_read && <span className="w-2 h-2 bg-primary-500 rounded-full"></span>}
                                        </div>
                                        <p className="text-sm text-slate-500">{notif.message}</p>
                                        <span className="text-xs text-slate-400 mt-2 block">
                                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ar })}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationsPanel;

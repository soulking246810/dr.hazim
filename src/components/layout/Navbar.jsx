import { useAuth } from '../../hooks/useAuth';
import { Menu, User } from 'lucide-react';
import NotificationsPanel from '../NotificationsPanel';

const Navbar = ({ onMenuClick }) => {
    const { user, profile } = useAuth();

    return (
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
            <button
                onClick={onMenuClick}
                className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
                <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1"></div>

            <div className="flex items-center gap-4">
                <NotificationsPanel />

                <div className="text-left hidden md:block">
                    <p className="text-sm font-bold text-slate-800">{profile?.full_name || user?.email}</p>
                    <p className="text-xs text-slate-500">{profile?.role === 'admin' ? 'مدير النظام' : 'مستخدم'}</p>
                </div>
                <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center border border-primary-200">
                    <User className="w-5 h-5" />
                </div>
            </div>
        </header>
    );
};

export default Navbar;

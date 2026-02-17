import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { BookOpen, LayoutDashboard, LogOut, Users, List, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

const Sidebar = ({ onNavigate }) => {
    const { user, isAdmin, logout } = useAuth();

    const navItems = [
        { to: '/dashboard', label: 'الصفحة الرئيسية', icon: LayoutDashboard },
        { to: '/quran-tracking', label: 'الختمات القرآنية الجماعية', icon: BookOpen },
        { to: '/pages/library', label: 'المكتبة', icon: List },
    ];

    const adminItems = [
        { to: '/admin', label: 'لوحة الإدارة', icon: ShieldCheck },
        { to: '/admin/users', label: 'إدارة المستخدمين', icon: Users },
        { to: '/admin/participation', label: 'سجل المشاركين', icon: BookOpen },
    ];

    return (
        <aside className="bg-slate-900 text-white h-screen sticky top-0 flex flex-col transition-all duration-300 shadow-2xl overflow-hidden font-sans">
            {/* Logo Area */}
            <div className="p-8 flex items-center gap-4 border-b border-slate-800/50">
                <div className="relative group">
                    <div className="absolute inset-0 bg-primary-500 blur-md rounded-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                    <div className="relative w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-primary-50 font-bold text-xl shadow-lg border border-primary-400/20">
                        حج
                    </div>
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white tracking-wide">تعليمات الحج</h1>
                    <p className="text-xs text-slate-400 font-medium">للتعلم والمتابعة</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">القائمة الرئيسية</p>
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                            clsx(
                                'flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group whitespace-nowrap relative overflow-hidden',
                                isActive
                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/30'
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-300 rounded-r-full"></div>
                                )}
                                <item.icon className={clsx("w-5 h-5 shrink-0 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                                <span className="font-semibold">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}

                {isAdmin && (
                    <>
                        <div className="my-4 border-t border-slate-800/50"></div>
                        <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">الإدارة</p>
                        {adminItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={onNavigate}
                                className={({ isActive }) =>
                                    clsx(
                                        'flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group whitespace-nowrap relative overflow-hidden',
                                        isActive
                                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/30'
                                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                                    )
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-300 rounded-r-full"></div>
                                        )}
                                        <item.icon className={clsx("w-5 h-5 shrink-0 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                                        <span className="font-semibold">{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </>
                )}
            </nav>

            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                {user ? (
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 w-full px-4 py-3.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-2xl transition-colors whitespace-nowrap font-medium group"
                    >
                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                            <LogOut className="w-4 h-4 shrink-0" />
                        </div>
                        <span>تسجيل الخروج</span>
                    </button>
                ) : (
                    <NavLink
                        to="/login"
                        className="flex items-center gap-3 w-full px-4 py-3.5 text-slate-400 hover:bg-slate-800/50 hover:text-white rounded-2xl transition-colors whitespace-nowrap font-medium group"
                    >
                        <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                            <ShieldCheck className="w-4 h-4 shrink-0" />
                        </div>
                        <span>دخول المشرفين</span>
                    </NavLink>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;

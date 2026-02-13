import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const MainLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    const closeSidebar = () => setIsSidebarOpen(false);

    // Close sidebar on route change
    // (handled by onNavigate prop)

    return (
        <div className="min-h-screen bg-slate-50 flex" dir="rtl">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-64 shrink-0">
                <Sidebar />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeSidebar}></div>
                    <div className="absolute right-0 top-0 h-full w-72 animate-slide-in-right">
                        <Sidebar onNavigate={closeSidebar} />
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <Navbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

                <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;

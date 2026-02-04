import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings as Gear, Activity, Megaphone } from 'lucide-react';

const Layout = () => {
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Дашборд', icon: LayoutDashboard },
        { path: '/lead-magnets', label: 'Магниты', icon: FileText },
        { path: '/broadcasts', label: 'Рассылки', icon: Megaphone },
        { path: '/context', label: 'Контекст', icon: Activity },
        { path: '/settings', label: 'Настройки', icon: Gear },
        { path: '/logs', label: 'Логи', icon: Activity },
    ];

    return (
        <div className="min-h-screen pb-24 relative overflow-hidden">
            {/* Background glows */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1]">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[100px]" />
            </div>

            <header className="glass-panel m-4 mb-6 px-4 py-4 backdrop-blur-md sticky top-4 z-20 border-border/50">
                <h1 className="text-xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                    Dragon Admin
                </h1>
            </header>

            <main className="px-4 relative z-10">
                <Outlet />
            </main>

            <nav className="fixed bottom-4 left-4 right-4 glass-panel border border-border/50 flex justify-around py-3 z-20 shadow-neon/20">
                {navItems.map(({ path, label, icon: Icon }) => {
                    const isActive = location.pathname === path;
                    return (
                        <Link
                            key={path}
                            to={path}
                            className={`flex flex-col items-center p-2 text-xs transition-all duration-300 ${isActive
                                ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                : 'text-text-muted hover:text-text'
                                }`}
                        >
                            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="mt-1 font-medium">{label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

export default Layout;

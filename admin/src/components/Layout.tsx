import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings as Gear, Activity, Megaphone } from 'lucide-react';

const Layout = () => {
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Дашборд', icon: LayoutDashboard },
        { path: '/context', label: 'Контекст', icon: Activity },
        { path: '/lead-magnets', label: 'Магниты', icon: FileText },
        { path: '/broadcasts', label: 'Рассылки', icon: Megaphone },
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
                            className={`flex flex-col items-center justify-center p-2 text-xs transition-all duration-300 w-16 ${isActive
                                ? 'text-primary transform -translate-y-2'
                                : 'text-text-muted hover:text-text'
                                }`}
                        >
                            <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary/20 shadow-neon border border-primary/30' : ''}`}>
                                <Icon size={isActive ? 20 : 22} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={`mt-1 font-medium text-[10px] whitespace-nowrap overflow-hidden text-ellipsis max-w-full transition-opacity duration-300 ${isActive ? 'opacity-100 font-bold' : 'opacity-70'}`}>
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

export default Layout;

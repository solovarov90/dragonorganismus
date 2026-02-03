import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings } from 'lucide-react';

const Layout = () => {
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Overview', icon: LayoutDashboard },
        { path: '/lead-magnets', label: 'Lead Magnets', icon: FileText },
        { path: '/context', label: 'Author/Product', icon: Settings },
    ];

    return (
        <div className="min-h-screen pb-20">
            <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
                <h1 className="text-lg font-bold text-gray-800">Bot Admin</h1>
            </header>

            <main className="p-4">
                <Outlet />
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 safe-area-bottom">
                {navItems.map(({ path, label, icon: Icon }) => (
                    <Link
                        key={path}
                        to={path}
                        className={`flex flex-col items-center p-2 text-xs ${location.pathname === path ? 'text-blue-600' : 'text-gray-500'
                            }`}
                    >
                        <Icon size={24} />
                        <span className="mt-1">{label}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
};

export default Layout;

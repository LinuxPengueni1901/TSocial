import { Home, Hash, Bell, Mail, Bookmark, User, Plus, LogOut, LogIn, ShieldCheck } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { usePosts } from '../context/PostContext';

const GUEST_NAV_ITEMS = [
    { icon: Home, label: 'Ana Sayfa', path: '/' },
    { icon: Hash, label: 'Keşfet', path: '/explore' },
];

const AUTH_NAV_ITEMS = [
    { icon: Home, label: 'Ana Sayfa', path: '/' },
    { icon: Hash, label: 'Keşfet', path: '/explore' },
    { icon: Bell, label: 'Bildirimler', path: '/notifications' },
    { icon: Plus, label: 'Oluştur', path: '/', special: true },
    { icon: Mail, label: 'Mesajlar', path: '/messages' },
    { icon: Bookmark, label: 'Kaydedilenler', path: '/bookmarks' },
    { icon: User, label: 'Profil', path: '/profile' },
];

export function FloatingDock() {
    const { logout, authenticated } = useAuth();
    const { userProfile } = usePosts();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    let navItems = authenticated ? [...AUTH_NAV_ITEMS] : [...GUEST_NAV_ITEMS];

    if (authenticated && userProfile && userProfile.handle === 'tsocial') {
        // Insert Admin before Profile (last item)
        navItems.splice(navItems.length - 1, 0, { icon: ShieldCheck, label: 'Admin', path: '/admin' });
    }

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-auto">
            <div className="flex items-center gap-1 sm:gap-2 bg-background/80 backdrop-blur-xl border border-white/20 dark:border-white/10 px-3 sm:px-4 py-3 rounded-2xl shadow-2xl ring-1 ring-black/5">
                {navItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.path}
                        className={({ isActive }) =>
                            clsx(
                                "relative group p-2.5 sm:p-3 rounded-xl transition-all duration-300 ease-out hover:-translate-y-2",
                                item.special ? "bg-primary text-primary-foreground shadow-lg hover:shadow-primary/50 mx-1" :
                                    isActive ? "bg-secondary text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                            )
                        }
                    >
                        <item.icon className={clsx("w-5 h-5 sm:w-6 sm:h-6", item.special && "w-6 h-6 sm:w-7 sm:h-7")} />

                        {/* Tooltip */}
                        <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60]">
                            {item.label}
                        </span>
                    </NavLink>
                ))}

                <div className="w-px h-8 bg-border/50 mx-1 sm:mx-2" />

                {/* Auth Action Button */}
                {authenticated ? (
                    <button
                        onClick={handleLogout}
                        className="relative group p-2.5 sm:p-3 rounded-xl transition-all duration-300 ease-out hover:-translate-y-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                        <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60]">
                            Çıkış Yap
                        </span>
                    </button>
                ) : (
                    <button
                        onClick={() => navigate('/login')}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 whitespace-nowrap"
                    >
                        <LogIn className="w-5 h-5" />
                        <span className="hidden sm:inline">Giriş Yap</span>
                    </button>
                )}
            </div>
        </div>
    );
}

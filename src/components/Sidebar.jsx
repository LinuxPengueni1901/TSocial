import { Home, Hash, Bell, Mail, Bookmark, User, FileText, MoreHorizontal, ShieldCheck } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { usePosts } from '../context/PostContext';

const NAV_ITEMS = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Hash, label: 'Explore', path: '/explore' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Mail, label: 'Messages', path: '/messages' },
    { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
    { icon: User, label: 'Profile', path: '/profile' },
];

export function Sidebar() {
    const { userProfile } = usePosts();

    const navItems = [
        { icon: Home, label: 'Ana Sayfa', path: '/' },
        { icon: Hash, label: 'Keşfet', path: '/explore' },
        { icon: Bell, label: 'Bildirimler', path: '/notifications' },
        { icon: Mail, label: 'Mesajlar', path: '/messages' },
        { icon: Bookmark, label: 'Yer İşaretleri', path: '/bookmarks' },
        { icon: User, label: 'Profil', path: '/profile' },
    ];

    if (userProfile?.handle === 'tsocial') {
        navItems.push({ icon: ShieldCheck, label: 'Admin Paneli', path: '/admin' });
    }
    return (
        <div className="hidden md:flex flex-col h-screen sticky top-0 w-[275px] px-4 py-4 border-r border-border bg-background/50 backdrop-blur-md">
            {/* Logo */}
            <div className="mb-8 px-4">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    TSocial
                </h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            clsx(
                                "flex items-center gap-4 px-4 py-3 rounded-full text-xl font-medium transition-colors duration-200",
                                isActive
                                    ? "bg-primary/10 text-primary font-bold"
                                    : "text-foreground hover:bg-secondary/50 hover:text-primary"
                            )
                        }
                    >
                        <item.icon className="w-7 h-7" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}

                <button className="flex items-center gap-4 px-4 py-3 rounded-full text-xl font-medium text-foreground hover:bg-secondary/50 transition-colors duration-200 w-full">
                    <MoreHorizontal className="w-7 h-7" />
                    <span>More</span>
                </button>
            </nav>

            {/* Post Button */}
            <div className="px-2 mb-8">
                <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg py-3 rounded-full shadow-lg transition-transform active:scale-95">
                    Post
                </button>
            </div>

            {/* User Profile Mini */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-full hover:bg-secondary/50 cursor-pointer transition-colors">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                    {userProfile?.avatar ? (
                        <img src={userProfile.avatar} alt={userProfile.handle} className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-6 h-6 text-slate-500" />
                    )}
                </div>
                <div className="flex flex-col flex-1">
                    <span className="font-bold text-sm truncate max-w-[120px]">{userProfile?.name || 'Misafir'}</span>
                    <span className="text-muted-foreground text-sm">@{userProfile?.handle || 'guest'}</span>
                </div>
                {userProfile?.isAdmin && <ShieldCheck className="w-4 h-4 text-primary" />}
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </div>
        </div>
    );
}

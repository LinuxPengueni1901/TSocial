import { useState, useEffect } from 'react';
import { Users, FileText, TrendingUp, ShieldAlert, Trash2, Search, Shield } from 'lucide-react';
import clsx from 'clsx';

const API_URL = "http://localhost:5000/api";

export function Admin() {
    const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0, postsToday: 0 });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [view, setView] = useState('users'); // 'users' or 'appeals'
    const [appeals, setAppeals] = useState([]);

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { 'Authorization': `Bearer ${token}` };

                const [statsRes, usersRes] = await Promise.all([
                    fetch(`${API_URL}/admin/stats`, { headers }),
                    fetch(`${API_URL}/admin/users`, { headers })
                ]);

                if (statsRes.ok && usersRes.ok) {
                    const [statsData, usersData] = await Promise.all([
                        statsRes.json(),
                        usersRes.json()
                    ]);
                    setStats(statsData);
                    setUsers(usersData);
                }

                // Fetch Appeals
                const appealsRes = await fetch(`${API_URL}/admin/appeals`, { headers });
                if (appealsRes.ok) {
                    const appealsData = await appealsRes.json();
                    setAppeals(appealsData);
                }
            } catch (error) {
                console.error("Admin fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
    }, []);

    const handleToggleRole = async (user) => {
        const newIsAdmin = !user.isAdmin;
        const action = newIsAdmin ? "yetki vermek" : "yetkiyi kaldırmak";
        if (!window.confirm(`${user.name} kullanıcısına admin ${action} istediğinizden emin misiniz?`)) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/admin/users/${user.id}/role`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isAdmin: newIsAdmin })
            });

            if (res.ok) {
                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isAdmin: newIsAdmin } : u));
            } else {
                const err = await res.json();
                alert(err.error || "İşlem başarısız.");
            }
        } catch (error) {
            console.error("Role toggle error:", error);
        }
    };

    const handleToggleSuspension = async (user) => {
        const token = localStorage.getItem('token');
        if (user.isSuspended) {
            // Unsuspend
            if (!window.confirm(`${user.name} kullanıcısının engelini kaldırmak istediğinizden emin misiniz?`)) return;
            try {
                const res = await fetch(`${API_URL}/admin/users/${user.id}/unsuspend`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isSuspended: false, suspension_reason: null } : u));
                }
            } catch (error) { console.error("Unsuspend error:", error); }
        } else {
            // Suspend
            const reason = window.prompt(`${user.name} kullanıcısını neden askıya alıyorsunuz?`, "Kural ihlali.");
            if (reason === null) return; // Cancelled

            try {
                const res = await fetch(`${API_URL}/admin/users/${user.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ reason })
                });

                if (res.ok) {
                    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isSuspended: true, suspension_reason: reason } : u));
                } else {
                    const err = await res.json();
                    alert(err.error || "İşlem başarısız.");
                }
            } catch (error) {
                console.error("Suspend error:", error);
            }
        }
    };

    const handleResolveAppeal = async (userId, action) => {
        const token = localStorage.getItem('token');
        const confirmMsg = action === 'approve'
            ? "Bu itirazı onaylayıp hesabı açmak istediğinizden emin misiniz?"
            : "Bu itirazı reddetmek istediğinizden emin misiniz? Kullanıcı bir daha itiraz edemeyecek.";

        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await fetch(`${API_URL}/admin/appeals/${userId}/resolve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action })
            });

            if (res.ok) {
                // If approved, update users list if needed (unsuspend)
                if (action === 'approve') {
                    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isSuspended: false, appeal_status: null } : u));
                }
                // Always remove from appeals list
                setAppeals(prev => prev.filter(a => a.id !== userId));
            } else {
                const err = await res.json();
                alert(err.error || "İşlem başarısız.");
            }
        } catch (error) {
            console.error("Resolve appeal error:", error);
        }
    };

    const filteredUsers = users.filter(u =>
        (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.handle || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="font-black text-primary animate-pulse">ADMIN PANELİ YÜKLENİYOR...</div>
            </div>
        </div>
    );

    return (
        <div className="pb-20 px-2 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/10 rounded-2xl">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-black">Admin Paneli</h1>
                    <p className="text-muted-foreground font-medium">Platform yönetimi ve istatistikler.</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Toplam Kullanıcı', value: stats.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Toplam Gönderi', value: stats.totalPosts, icon: FileText, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                    { label: 'Bugünkü Gönderiler', value: stats.postsToday, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
                ].map((stat, i) => (
                    <div key={i} className="bg-card/40 border border-white/5 rounded-[2rem] p-6 hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className={clsx("p-4 rounded-2xl", stat.bg)}>
                                <stat.icon className={clsx("w-6 h-6", stat.color)} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                                <p className="text-3xl font-black">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* User Management */}
            <div className="bg-card/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-xl">
                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex bg-secondary/30 p-1 rounded-2xl">
                        <button
                            onClick={() => setView('users')}
                            className={clsx(
                                "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                                view === 'users' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Kullanıcılar
                        </button>
                        <button
                            onClick={() => setView('appeals')}
                            className={clsx(
                                "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                                view === 'appeals' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            İtirazlar
                            {appeals.length > 0 && (
                                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                                    {appeals.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {view === 'users' && (
                        <div className="relative w-full md:w-64 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Kullanıcı ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-secondary/50 border border-white/5 rounded-xl py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                            />
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    {view === 'users' ? (
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-white/5">
                                    <th className="px-6 py-4">Kullanıcı</th>
                                    <th className="px-6 py-4">Katılım</th>
                                    <th className="px-6 py-4">Gönderiler</th>
                                    <th className="px-6 py-4">Yetki</th>
                                    <th className="px-6 py-4 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center font-bold text-xs">
                                                        {user.name ? user.name[0] : '?'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-bold text-sm">{user.name || 'İsimsiz'}</div>
                                                            {user.isSuspended && (
                                                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 text-[8px] font-black uppercase">Askıda</span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">@{user.handle || 'bilinmiyor'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium">{user.joinDate || '-'}</td>
                                            <td className="px-6 py-4 text-sm font-bold">{user.postsCount || '0'}</td>
                                            <td className="px-6 py-4">
                                                <span className={clsx(
                                                    "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest",
                                                    user.isAdmin ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-500"
                                                )}>
                                                    {user.isAdmin ? 'Admin' : 'Kullanıcı'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleToggleRole(user)}
                                                        className={clsx(
                                                            "p-2 rounded-lg transition-all",
                                                            user.isAdmin ? "text-red-500 hover:bg-red-500/10" : "text-blue-500 hover:bg-blue-500/10"
                                                        )}
                                                        title={user.isAdmin ? "Yetkiyi Kaldır" : "Yetki Ver"}
                                                    >
                                                        <Shield className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleSuspension(user)}
                                                        className={clsx(
                                                            "p-2 rounded-lg transition-all",
                                                            user.isSuspended ? "text-green-500 hover:bg-green-500/10" : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                                        )}
                                                        title={user.isSuspended ? "Engeli Kaldır" : "Hesabı Askıya Al"}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-muted-foreground font-medium">
                                            Kullanıcı bulunamadı.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-6">
                            {appeals.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {appeals.map(appeal => (
                                        <div key={appeal.id} className="bg-secondary/20 border border-white/5 rounded-3xl p-6 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary">
                                                        {appeal.name ? appeal.name[0] : '?'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold">{appeal.name}</div>
                                                        <div className="text-xs text-muted-foreground tracking-wide">@{appeal.handle}</div>
                                                    </div>
                                                </div>
                                                <div className="px-2 py-1 rounded bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase">BEKLEMEDE</div>
                                            </div>

                                            <div className="space-y-4 pt-2">
                                                <div>
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Askıya Alma Sebebi</p>
                                                    <p className="text-sm bg-red-500/5 p-3 rounded-xl border border-red-500/10 italic text-muted-foreground">"{appeal.suspension_reason}"</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Kullanıcı İtirazı</p>
                                                    <p className="text-sm bg-primary/5 p-4 rounded-2xl border border-primary/10 font-medium">{appeal.appeal_text}</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-3 pt-2">
                                                <button
                                                    onClick={() => handleResolveAppeal(appeal.id, 'approve')}
                                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-500/10 active:scale-95 text-sm"
                                                >
                                                    Onayla & Aç
                                                </button>
                                                <button
                                                    onClick={() => handleResolveAppeal(appeal.id, 'reject')}
                                                    className="flex-1 bg-secondary hover:bg-red-500/10 hover:text-red-500 text-muted-foreground font-bold py-3 rounded-xl transition-all active:scale-95 text-sm"
                                                >
                                                    Reddet
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-secondary/10 rounded-[2rem] border border-dashed border-white/5">
                                    <div className="text-4xl mb-4">✨</div>
                                    <p className="text-muted-foreground font-medium">Bekleyen itiraz bulunmuyor.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

import { ArrowLeft, Calendar, Link as LinkIcon, MapPin, Grid, Layers, Heart, Image as ImageIcon, ShieldAlert, Mail } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Post } from '../components/Post';
import { EditProfileModal } from '../components/EditProfileModal';
import clsx from 'clsx';
import { useState, useEffect } from 'react';
import { usePosts } from '../context/PostContext';
import { useAuth } from '../context/AuthContext';

export function Profile() {
    const navigate = useNavigate();
    const location = useLocation();
    const { posts, userProfile: myProfile } = usePosts();
    const { user: authUser } = useAuth();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Get handle from query param or use logged in user's handle
    const queryParams = new URLSearchParams(location.search);
    const viewHandle = queryParams.get('handle') || authUser?.handle;

    const isOwnProfile = !queryParams.get('handle') || queryParams.get('handle') === authUser?.handle;

    // Hooks must be at the top level
    const [activeTab, setActiveTab] = useState('Gönderiler');
    const [tabContent, setTabContent] = useState([]);
    const [tabLoading, setTabLoading] = useState(false);

    useEffect(() => {
        const fetchTabContent = async () => {
            if (!viewHandle) return;
            if (activeTab === 'Gönderiler' || activeTab === 'Medya') {
                setTabContent([]); // We filter from global posts
                return;
            }

            setTabLoading(true);
            try {
                const token = localStorage.getItem('token');
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const endpoint = activeTab === 'Beğeniler' ? 'likes' : 'replies';
                const res = await fetch(`http://localhost:5000/api/profile/${endpoint}?handle=${viewHandle}`, { headers });

                if (res.ok) {
                    const data = await res.json();
                    setTabContent(data);
                }
            } catch (error) {
                console.error(`Error fetching ${activeTab}:`, error);
            } finally {
                setTabLoading(false);
            }
        };

        fetchTabContent();
    }, [activeTab, viewHandle]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!viewHandle) {
                setLoading(false);
                return;
            }

            // If it's my profile and we have userProfile in context, use it
            if (isOwnProfile && myProfile) {
                setProfileData(myProfile);
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`http://localhost:5000/api/profile?handle=${viewHandle}`);
                if (res.ok) {
                    const data = await res.json();
                    setProfileData(data);
                }
            } catch (error) {
                console.error("Profile fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [viewHandle, myProfile, isOwnProfile]);

    // Use current profile data for posts filtering
    const effectiveProfile = profileData; // Don't fallback to myProfile here, we want the specific user we're viewing

    if (loading) {
        return <div className="flex justify-center p-20"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
    }

    if (!effectiveProfile) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4 text-3xl">🔍</div>
                <h2 className="text-xl font-bold">Profil bulunamadı</h2>
                <p className="text-muted-foreground font-medium">Bu kullanıcı artık mevcut değil veya bir hata oluştu.</p>
                <button onClick={() => navigate('/')} className="mt-6 bg-primary text-primary-foreground px-6 py-2 rounded-xl font-bold hover:scale-105 transition-transform">Ana Sayfaya Dön</button>
            </div>
        );
    }


    // Filter posts based on active tab
    const getDisplayPosts = () => {
        let basePosts;
        if (activeTab === 'Gönderiler') {
            basePosts = posts.filter(p => p.handle === effectiveProfile.handle && !p.parent_id);
        } else if (activeTab === 'Medya') {
            basePosts = posts.filter(p => p.handle === effectiveProfile.handle && p.image);
        } else {
            basePosts = tabContent; // Beğeniler or Yanıtlar (already from separate API)
        }

        // Synchronize with global posts to get latest like/bookmark state
        return basePosts.map(bp => posts.find(p => p.id === bp.id) || bp);
    };

    const displayPosts = getDisplayPosts();

    const TABS = [
        { label: 'Gönderiler', icon: Grid },
        { label: 'Yanıtlar', icon: Layers },
        { label: 'Medya', icon: ImageIcon },
        { label: 'Beğeniler', icon: Heart }
    ];

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-4 border-b border-white/5">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold leading-5">{effectiveProfile.name}</h2>
                    <span className="text-sm text-muted-foreground">{effectiveProfile.postsCount || '0'} gönderi</span>
                </div>
            </div>

            {/* Cover Image */}
            <div className="h-48 rounded-b-[2.5rem] bg-gradient-to-r from-primary/80 to-purple-600/80 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
            </div>

            {/* Profile Details */}
            <div className="px-5 relative z-10">
                <div className="flex justify-between items-end -mt-16 mb-4">
                    <div className="w-32 h-32 rounded-[2rem] border-[6px] border-background bg-slate-200 overflow-hidden shadow-2xl">
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 shadow-inner">
                            {effectiveProfile.avatar ? (
                                <img src={effectiveProfile.avatar} alt={effectiveProfile.handle} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl font-bold text-primary">{effectiveProfile.name[0]}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 mb-2">
                        {!isOwnProfile && (
                            <button
                                onClick={() => navigate(`/messages?user=${effectiveProfile.handle}`)}
                                className="flex items-center gap-2 border border-primary font-bold rounded-2xl px-6 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 transition-all shadow-lg active:scale-95"
                            >
                                <Mail className="w-4 h-4" />
                                <span>Mesaj Gönder</span>
                            </button>
                        )}
                        {isOwnProfile && effectiveProfile.handle === 'tsocial' && (
                            <button
                                onClick={() => navigate('/admin')}
                                className="flex items-center gap-2 border border-red-500/20 font-bold rounded-2xl px-6 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all shadow-lg active:scale-95"
                            >
                                <ShieldAlert className="w-4 h-4" />
                                <span>Admin Paneli</span>
                            </button>
                        )}
                        {isOwnProfile && (
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="border border-white/10 font-bold rounded-2xl px-6 py-2.5 bg-card hover:bg-secondary transition-all active:scale-95 shadow-lg"
                            >
                                Profili Düzenle
                            </button>
                        )}
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black">{effectiveProfile.name}</h1>
                        {(() => {
                            if (!effectiveProfile || !effectiveProfile.last_active) return (
                                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider bg-secondary/50 px-2 py-1 rounded-lg">
                                    Aktif: Yakın zamanda
                                </div>
                            );

                            const dateStr = effectiveProfile.last_active.includes(' ') && !effectiveProfile.last_active.includes('T')
                                ? effectiveProfile.last_active.replace(' ', 'T') + 'Z'
                                : effectiveProfile.last_active;

                            const lastActive = new Date(dateStr);
                            if (isNaN(lastActive.getTime())) return null;

                            const now = new Date();
                            const diffMins = Math.floor((now - lastActive) / 60000);
                            if (diffMins < 2) {
                                return (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 rounded-full">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="text-[10px] text-green-500 font-black uppercase tracking-wider">Çevrimiçi</span>
                                    </div>
                                );
                            } else {
                                let timeStr = "";
                                if (diffMins < 60) timeStr = `${diffMins} dk önce`;
                                else if (diffMins < 1440) timeStr = `${Math.floor(diffMins / 60)} sa önce`;
                                else timeStr = lastActive.toLocaleDateString();
                                return (
                                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider bg-secondary/50 px-2 py-1 rounded-lg">
                                        Aktif: {timeStr}
                                    </div>
                                );
                            }
                        })()}
                    </div>
                    <div className="text-muted-foreground font-medium">@{effectiveProfile.handle}</div>
                </div>

                <div className="mt-4 text-base leading-relaxed font-medium">
                    {effectiveProfile.bio || 'Henüz biyografi eklenmemiş.'}
                </div>

                <div className="flex flex-wrap gap-4 mt-4 text-muted-foreground text-sm font-medium">
                    {effectiveProfile.location && (
                        <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            <span>{effectiveProfile.location}</span>
                        </div>
                    )}
                    {effectiveProfile.website && (
                        <div className="flex items-center gap-1.5">
                            <LinkIcon className="w-4 h-4" />
                            <a href={`https://${effectiveProfile.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                {effectiveProfile.website}
                            </a>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>{effectiveProfile.joinDate || 'Yeni Üye'} tarihinde katıldı</span>
                    </div>
                </div>

                {/* Enhanced Stats Cards */}
                <div className="grid grid-cols-3 gap-4 mt-8">
                    <div className="bg-card/40 backdrop-blur-md border border-white/5 p-4 rounded-3xl text-center group hover:bg-primary/10 transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-lg shadow-black/5">
                        <div className="text-2xl font-black text-foreground group-hover:text-primary transition-colors">{effectiveProfile.postsCount || '0'}</div>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Gönderi</div>
                    </div>
                    <div className="bg-card/40 backdrop-blur-md border border-white/5 p-4 rounded-3xl text-center group hover:bg-primary/10 transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-lg shadow-black/5">
                        <div className="text-2xl font-black text-foreground group-hover:text-primary transition-colors">{effectiveProfile.followers || '0'}</div>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Takipçi</div>
                    </div>
                    <div className="bg-card/40 backdrop-blur-md border border-white/5 p-4 rounded-3xl text-center group hover:bg-primary/10 transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-lg shadow-black/5">
                        <div className="text-2xl font-black text-foreground group-hover:text-primary transition-colors">{effectiveProfile.following || '0'}</div>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Takip</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5 mt-6 mb-4 px-2">
                {TABS.map((tab) => (
                    <div
                        key={tab.label}
                        onClick={() => setActiveTab(tab.label)}
                        className="flex-1 hover:bg-secondary/30 transition-colors rounded-t-2xl cursor-pointer text-center py-4 relative group"
                    >
                        <div className="flex flex-col items-center gap-1">
                            <tab.icon className={clsx("w-5 h-5", activeTab === tab.label ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                            <span className={clsx("font-bold text-xs uppercase tracking-wider", activeTab === tab.label ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>
                                {tab.label}
                            </span>
                        </div>
                        {activeTab === tab.label && (
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-t-full"></div>
                        )}
                    </div>
                ))}
            </div>

            {/* User Posts Content */}
            <div className="space-y-4 px-2">
                {tabLoading ? (
                    <div className="flex justify-center p-10"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                ) : displayPosts.length > 0 ? (
                    displayPosts.map(post => <Post key={post.id} {...post} />)
                ) : (
                    <div className="text-center py-20 bg-card/10 rounded-[2.5rem] border border-white/5 mx-2">
                        <div className="text-4xl mb-4">📭</div>
                        <h3 className="text-lg font-bold">Burada henüz bir şey yok</h3>
                        <p className="text-muted-foreground text-sm">Hala keşfedilecek çok şey var!</p>
                    </div>
                )}
            </div>

            {isOwnProfile && (
                <EditProfileModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                />
            )}
        </div>
    );
}

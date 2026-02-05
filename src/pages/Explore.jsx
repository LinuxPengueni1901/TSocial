import { useState, useEffect } from 'react';
import { Search as SearchIcon, TrendingUp, MoreHorizontal, Sparkles } from 'lucide-react';
import { Post } from '../components/Post';
import clsx from 'clsx';
import { usePosts } from '../context/PostContext';

const CATEGORIES = ['Sana Özel', 'Gündem', 'Haberler', 'Spor', 'Eğlence'];

export function Explore() {
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('Sana Özel');
    const [data, setData] = useState({ posts: [], trending: [] });
    const [loading, setLoading] = useState(true);
    const { posts: globalPosts } = usePosts();

    const fetchExplore = async (q = '', category = 'Sana Özel') => {
        setLoading(true);
        try {
            // Only search if user explicitly typed a query
            const res = await fetch(`http://localhost:5000/api/explore${q ? `?q=${q}` : ''}`);
            const result = await res.json();

            // For categories other than 'Sana Özel', we show filtered mock result or empty state
            // (In a real app, this would be a specific category endpoint)
            if (category !== 'Sana Özel' && !q) {
                setData({ posts: [], trending: result.trending });
            } else {
                setData(result);
            }
        } catch (error) {
            console.error("Explore fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchExplore(query, activeCategory);
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [query, activeCategory]);

    return (
        <div className="pb-24">
            {/* Search Header */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl p-4 space-y-4 border-b border-white/5">
                <div className="relative group">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="TSocial'da Ara"
                        className="w-full bg-secondary/70 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:bg-background focus:ring-2 focus:ring-primary transition-all text-lg shadow-inner"
                    />
                </div>

                {/* Categories (Tabs) - Now Functional */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => {
                                setActiveCategory(cat);
                                setQuery(''); // Clear search when switching categories
                            }}
                            className={clsx(
                                "px-6 py-2.5 rounded-full whitespace-nowrap text-sm font-black transition-all duration-300",
                                activeCategory === cat
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105"
                                    : "bg-card/50 text-muted-foreground hover:bg-secondary hover:text-foreground hover:scale-105"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 mt-6">
                {/* Trending Section */}
                {!query && activeCategory === 'Sana Özel' && (
                    <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-black mb-5 flex items-center gap-2 px-1">
                            <TrendingUp className="w-6 h-6 text-primary" />
                            Trendler
                        </h2>
                        <div className="bg-card/40 backdrop-blur-md border border-white/10 rounded-[2.5rem] overflow-hidden shadow-xl shadow-black/5">
                            {data.trending.map((item, idx) => (
                                <div
                                    key={item.id}
                                    onClick={() => setQuery(item.tag)}
                                    className={clsx(
                                        "p-6 hover:bg-primary/5 transition-all cursor-pointer group flex justify-between items-center",
                                        idx !== data.trending.length - 1 && "border-b border-white/5"
                                    )}
                                >
                                    <div>
                                        <div className="text-xs font-bold text-primary/70 uppercase tracking-wider mb-1">Gündem</div>
                                        <div className="font-black text-xl text-foreground group-hover:text-primary transition-colors">{item.tag}</div>
                                        <div className="text-sm text-muted-foreground mt-1">{item.count} gönderi</div>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-secondary/50 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                                        <SearchIcon className="w-5 h-5 text-primary" />
                                    </div>
                                </div>
                            ))}
                            <button className="w-full p-4 text-primary font-bold text-sm hover:bg-primary/5 transition-colors border-t border-white/5">
                                Daha fazla göster
                            </button>
                        </div>
                    </div>
                )}

                {/* Content Section */}
                <div className="animate-in fade-in duration-700">
                    <div className="flex items-center justify-between mb-6 px-1">
                        <h2 className="text-2xl font-black">
                            {query ? `"${query}" Sonuçları` : activeCategory === 'Sana Özel' ? 'Sizin İçin' : activeCategory}
                        </h2>
                        {loading && (
                            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                        )}
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-40 bg-card/20 rounded-3xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {data.posts.length > 0 ? (
                                data.posts.map(post => {
                                    // Sync with global posts
                                    const syncedPost = globalPosts.find(p => p.id === post.id) || post;
                                    return <Post key={syncedPost.id} {...syncedPost} />;
                                })
                            ) : (
                                <div className="text-center py-24 px-10 bg-card/20 border border-white/5 rounded-[3rem]">
                                    <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🏜️</div>
                                    <h3 className="text-xl font-bold mb-2">Henüz bir sonuç yok</h3>
                                    <p className="text-muted-foreground">Aradığınız kriterlere uygun gönderi bulamadık. Başka bir şey aramaya ne dersiniz?</p>
                                    <button
                                        onClick={() => { setQuery(''); setActiveCategory('Sana Özel'); }}
                                        className="mt-8 bg-primary text-primary-foreground font-black px-8 py-3 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                                    >
                                        Ana Akışa Dön
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

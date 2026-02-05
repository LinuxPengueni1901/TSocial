import { useState, useEffect } from 'react';
import { Post } from '../components/Post';
import { Bookmark } from 'lucide-react';
import { usePosts } from '../context/PostContext';

export function Bookmarks() {
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const { posts } = usePosts();

    useEffect(() => {
        const fetchBookmarks = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setLoading(false);
                    return;
                }

                const res = await fetch('http://localhost:5000/api/bookmarks', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    setBookmarks(data);
                }
            } catch (error) {
                console.error("Error fetching bookmarks:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBookmarks();
    }, []);

    const displayPosts = bookmarks.map(bp => posts.find(p => p.id === bp.id) || bp);

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 px-2">
                <div className="p-3 bg-primary/10 rounded-2xl">
                    <Bookmark className="w-6 h-6 text-primary filled" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Yer İşaretleri</h1>
                    <p className="text-sm text-muted-foreground">Kaydettiğin gönderiler burada görünür.</p>
                </div>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center p-20">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : displayPosts.length > 0 ? (
                    displayPosts.map(post => (
                        <Post key={post.id} {...post} />
                    ))
                ) : (
                    <div className="text-center py-24 bg-card/20 rounded-[3rem] border border-white/5 mx-2">
                        <div className="text-6xl mb-6">🔖</div>
                        <h3 className="text-xl font-bold">Henüz bir şey kaydetmedin</h3>
                        <p className="text-muted-foreground mt-2 font-medium px-10">
                            Beğendiğin gönderileri daha sonra kolayca bulmak için yer işaretlerine ekle.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

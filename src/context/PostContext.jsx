import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const PostContext = createContext();
const API_URL = "http://localhost:5000/api";

export function PostProvider({ children }) {
    const { token: authToken } = useAuth();
    const [posts, setPosts] = useState([]);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Initial Data Fetch & Auth Sync
    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                const token = authToken || localStorage.getItem('token');
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

                // Fetch posts
                const postsRes = await fetch(`${API_URL}/posts`, { headers });
                if (postsRes.ok && isMounted) {
                    const postsData = await postsRes.json();
                    setPosts(postsData);
                }

                // Fetch profile if logged in
                if (token) {
                    const profileRes = await fetch(`${API_URL}/profile`, { headers });
                    if (profileRes.ok && isMounted) {
                        const profileData = await profileRes.json();
                        setUserProfile(profileData);
                    } else if (profileRes.status === 401 && isMounted) {
                        setUserProfile(null);
                    }
                } else if (isMounted) {
                    setUserProfile(null);
                }
            } catch (error) {
                console.error("Data fetch error:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();

        return () => { isMounted = false; };
    }, [authToken]);

    const addPost = async (content, image = null, parent_id = null) => {
        try {
            const token = authToken || localStorage.getItem('token');
            const res = await fetch(`${API_URL}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content, image, parent_id })
            });
            const newPost = await res.json();

            // If it's a reply, update parent post comments count locally
            if (parent_id) {
                setPosts(prev => prev.map(p =>
                    p.id === parent_id
                        ? { ...p, stats: { ...p.stats, comments: (p.stats?.comments || 0) + 1 } }
                        : p
                ));
            }

            setPosts(prev => [newPost, ...prev]);
            return newPost;
        } catch (error) {
            console.error("Error adding post:", error);
        }
    };

    const likePost = async (id) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch(`${API_URL}/posts/${id}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();

            if (data.success) {
                setPosts(prev => prev.map(post => {
                    if (post.id === id) {
                        return {
                            ...post,
                            isLiked: data.liked,
                            stats: {
                                ...post.stats,
                                likes: data.liked ? (post.stats?.likes || 0) + 1 : Math.max(0, (post.stats?.likes || 0) - 1)
                            }
                        };
                    }
                    return post;
                }));
            }
        } catch (error) {
            console.error("Error liking post:", error);
        }
    };

    const bookmarkPost = async (id) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch(`${API_URL}/posts/${id}/bookmark`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();

            if (data.success) {
                setPosts(prev => prev.map(post => {
                    if (post.id === id) {
                        return {
                            ...post,
                            isBookmarked: data.bookmarked
                        };
                    }
                    return post;
                }));
            }
        } catch (error) {
            console.error("Error bookmarking post:", error);
        }
    };

    const updateProfile = async (newData) => {
        try {
            const token = localStorage.getItem('token');
            // Optimistic update
            setUserProfile(prev => ({ ...prev, ...newData }));

            await fetch(`${API_URL}/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newData)
            });
        } catch (error) {
            console.error("Error updating profile:", error);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-background flex items-center justify-center text-primary font-bold">Yükleniyor...</div>;
    }

    return (
        <PostContext.Provider value={{ posts, addPost, likePost, bookmarkPost, userProfile, updateProfile }}>
            {children}
        </PostContext.Provider>
    );
}

export const usePosts = () => useContext(PostContext);

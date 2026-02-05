import { CreatePost } from "../components/CreatePost";
import { Post } from "../components/Post";
import { usePosts } from "../context/PostContext";
import { Sparkles } from 'lucide-react';

export function Home() {
    const { posts } = usePosts();

    return (
        <div className="pb-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 px-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                    Akış
                </h1>
                <button className="p-2 rounded-full hover:bg-secondary/50 transition-colors text-primary">
                    <Sparkles className="w-6 h-6" />
                </button>
            </div>

            <CreatePost />

            <div className="space-y-4">
                {posts.map(post => (
                    <Post key={post.id} {...post} />
                ))}
            </div>
        </div>
    );
}

import { MessageCircle, Repeat2, Heart, Share, MoreHorizontal, Bookmark, Check } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { usePosts } from '../context/PostContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ReplyModal } from './ReplyModal';

export function Post({
    id,
    username,
    handle,
    avatar,
    time,
    content,
    image,
    isLiked,
    isBookmarked,
    stats = { comments: 0, reposts: 0, likes: 0, views: 0 }
}) {
    const { likePost, bookmarkPost } = usePosts();
    const { authenticated } = useAuth();
    const navigate = useNavigate();
    const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleLike = () => {
        if (!authenticated) {
            navigate('/login');
            return;
        }
        likePost(id);
    };

    const handleBookmark = () => {
        if (!authenticated) {
            navigate('/login');
            return;
        }
        bookmarkPost(id);
    };

    const handleReply = (e) => {
        e.stopPropagation();
        if (!authenticated) {
            navigate('/login');
            return;
        }
        setIsReplyModalOpen(true);
    };

    const handleShare = (e) => {
        e.stopPropagation();
        const url = `${window.location.origin}/post/${id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const profilePath = `/profile?handle=${handle}`;

    return (
        <>
            <article className="bg-card/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5 mb-4 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                        <Link to={profilePath} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-400 p-[2px] hover:scale-105 transition-transform active:scale-95">
                            <div className="w-full h-full rounded-xl overflow-hidden bg-background">
                                {avatar ? (
                                    <img src={avatar} alt={handle} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                                        {username ? username[0] : '?'}
                                    </div>
                                )}
                            </div>
                        </Link>
                        <div>
                            <Link to={profilePath} className="font-bold text-lg leading-tight hover:underline block">{username}</Link>
                            <div className="text-sm text-muted-foreground">@{handle} · {time}</div>
                        </div>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleBookmark(); }}
                        className={clsx(
                            "p-2 rounded-xl transition-all active:scale-90",
                            isBookmarked ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                        )}
                    >
                        <Bookmark className={clsx("w-5 h-5", isBookmarked && "fill-current")} />
                    </button>
                </div>

                <div className="text-lg leading-normal mb-4 whitespace-pre-wrap pl-1">
                    {content}
                </div>

                {image && (
                    <div className="rounded-2xl overflow-hidden mb-4 shadow-md border border-border/50">
                        <img src={image} alt="Post content" className="w-full h-auto object-cover max-h-[500px]" />
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between px-2 pt-2 border-t border-white/5">
                    <button
                        onClick={handleReply}
                        className="flex items-center gap-2 text-muted-foreground hover:text-blue-400 transition-colors group"
                    >
                        <div className="p-2 rounded-xl group-hover:bg-blue-400/10 transition-colors">
                            <MessageCircle className="w-5 h-5" />
                        </div>
                        <span className="font-medium">{stats.comments}</span>
                    </button>

                    <button
                        onClick={() => !authenticated && navigate('/login')}
                        className="flex items-center gap-2 text-muted-foreground hover:text-green-400 transition-colors group"
                    >
                        <div className="p-2 rounded-xl group-hover:bg-green-400/10 transition-colors">
                            <Repeat2 className="w-5 h-5" />
                        </div>
                        <span className="font-medium">{stats.reposts}</span>
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); handleLike(); }}
                        className={clsx(
                            "flex items-center gap-2 transition-colors group",
                            isLiked ? "text-pink-500" : "text-muted-foreground hover:text-pink-500"
                        )}
                    >
                        <div className="p-2 rounded-xl group-hover:bg-pink-500/10 transition-colors">
                            <Heart className={clsx("w-5 h-5", isLiked && "fill-current")} />
                        </div>
                        <span className="font-medium">{stats.likes}</span>
                    </button>

                    <button
                        onClick={handleShare}
                        className={clsx(
                            "flex items-center gap-2 transition-colors group relative",
                            copied ? "text-green-500" : "text-muted-foreground hover:text-primary"
                        )}
                    >
                        <div className={clsx("p-2 rounded-xl transition-colors", copied ? "bg-green-500/10" : "group-hover:bg-primary/10")}>
                            {copied ? <Check className="w-5 h-5" /> : <Share className="w-5 h-5" />}
                        </div>
                        {copied && (
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap animate-bounce">
                                Kopyalandı!
                            </span>
                        )}
                    </button>
                </div>
            </article>

            <ReplyModal
                isOpen={isReplyModalOpen}
                onClose={() => setIsReplyModalOpen(false)}
                parentPost={{ id, username, handle, avatar, content }}
            />
        </>
    );
}

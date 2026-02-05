import { useState } from 'react';
import { X, Image as ImageIcon, Smile } from 'lucide-react';
import { usePosts } from '../context/PostContext';
import EmojiPicker from 'emoji-picker-react';
import clsx from 'clsx';

export function ReplyModal({ isOpen, onClose, parentPost }) {
    const [content, setContent] = useState("");
    const [showEmoji, setShowEmoji] = useState(false);
    const { addPost } = usePosts();
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!content.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await addPost(content, null, parentPost.id);
            setContent("");
            onClose();
        } catch (error) {
            console.error("Reply error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEmojiClick = (emojiData) => {
        setContent(prev => prev + emojiData.emoji);
        setShowEmoji(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-xl bg-card border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <span className="font-bold">Yanıtla</span>
                    <div className="w-10"></div>
                </div>

                <div className="p-6">
                    {/* Parent Post Preview */}
                    <div className="flex gap-4 mb-6 opacity-60 relative">
                        <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-border/50" />
                        <div className="w-12 h-12 rounded-2xl bg-secondary overflow-hidden flex-shrink-0">
                            {parentPost.avatar ? (
                                <img src={parentPost.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-lg">
                                    {parentPost.username[0]}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-bold flex items-center gap-1">
                                {parentPost.username}
                                <span className="text-muted-foreground font-medium text-sm">@{parentPost.handle}</span>
                            </div>
                            <p className="text-sm line-clamp-2 mt-1">{parentPost.content}</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">
                            S
                        </div>
                        <div className="flex-1">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Yanıtını paylaş..."
                                className="w-full bg-transparent border-none outline-none text-lg resize-none min-h-[120px]"
                                autoFocus
                            />

                            <div className="flex items-center justify-between mt-4 border-t border-white/5 pt-4">
                                <div className="flex items-center gap-2">
                                    <button className="p-2.5 rounded-xl hover:bg-primary/10 text-primary transition-all group">
                                        <ImageIcon className="w-5 h-5 group-hover:scale-110" />
                                    </button>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowEmoji(!showEmoji)}
                                            className={clsx(
                                                "p-2.5 rounded-xl transition-all group",
                                                showEmoji ? "bg-primary/20 text-primary" : "hover:bg-primary/10 text-primary"
                                            )}
                                        >
                                            <Smile className="w-5 h-5 group-hover:scale-110" />
                                        </button>
                                        {showEmoji && (
                                            <div className="absolute bottom-full mb-4 left-0 z-[110]">
                                                <EmojiPicker
                                                    onEmojiClick={handleEmojiClick}
                                                    theme="dark"
                                                    autoFocusSearch={false}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={!content.trim() || isSubmitting}
                                    className="bg-primary text-primary-foreground px-8 py-2.5 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-primary/20"
                                >
                                    {isSubmitting ? 'Gönderiliyor...' : 'Yanıtla'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { Image as ImageIcon, Smile, Send, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { usePosts } from '../context/PostContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import EmojiPicker from 'emoji-picker-react';

export function CreatePost() {
    const [content, setContent] = useState("");
    const [image, setImage] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const { addPost, userProfile } = usePosts();
    const { authenticated } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const emojiPickerRef = useRef(null);

    // Close emoji picker on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSubmit = () => {
        if (!authenticated) {
            navigate('/login');
            return;
        }
        if (!content.trim() && !image) return;
        addPost(content, image);
        setContent("");
        setImage(null);
    };

    const handleImageClick = () => {
        if (!authenticated) {
            navigate('/login');
            return;
        }
        fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const onEmojiClick = (emojiData) => {
        setContent(prev => prev + emojiData.emoji);
    };

    return (
        <div className="bg-card/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5 mb-8 shadow-lg shadow-black/5">
            <div className="flex gap-4">
                <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-400 p-[2px]">
                        <div className="w-full h-full rounded-xl bg-background flex items-center justify-center overflow-hidden">
                            {userProfile?.avatar ? (
                                <img src={userProfile.avatar} alt={userProfile.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="font-bold text-primary">
                                    {userProfile?.name ? userProfile.name[0] : '?'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex-1">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={authenticated ? "Neler oluyor?" : "Paylaşmak için giriş yapın"}
                        className="w-full bg-transparent border-none focus:ring-0 text-xl placeholder:text-muted-foreground resize-none min-h-[50px] outline-none py-2"
                        onClick={() => !authenticated && navigate('/login')}
                    />

                    {image && (
                        <div className="relative mt-2 mb-4 rounded-2xl overflow-hidden border border-white/10 group">
                            <img src={image} alt="Preview" className="w-full h-auto max-h-80 object-cover" />
                            <button
                                onClick={() => setImage(null)}
                                className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur-md rounded-full text-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                        <div className="flex gap-1 text-primary items-center relative">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*"
                            />
                            <button
                                onClick={handleImageClick}
                                className="p-2 rounded-xl hover:bg-primary/10 transition-colors"
                            >
                                <ImageIcon className="w-5 h-5" />
                            </button>
                            <div ref={emojiPickerRef}>
                                <button
                                    onClick={() => authenticated ? setShowEmojiPicker(!showEmojiPicker) : navigate('/login')}
                                    className="p-2 rounded-xl hover:bg-primary/10 transition-colors"
                                >
                                    <Smile className="w-5 h-5" />
                                </button>
                                {showEmojiPicker && (
                                    <div className="absolute bottom-full left-0 z-50 mb-2">
                                        <EmojiPicker
                                            onEmojiClick={onEmojiClick}
                                            theme="dark"
                                            width={300}
                                            height={400}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={authenticated && !content.trim() && !image}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-2 rounded-xl transition-all shadow-lg hover:shadow-primary/25 flex items-center gap-2"
                        >
                            <span>{authenticated ? 'Paylaş' : 'Giriş Yap'}</span>
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

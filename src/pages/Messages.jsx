import { useState, useEffect, useRef } from 'react';
import { Search, Send, User, ArrowLeft, MoreVertical, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

const API_URL = "http://localhost:5000/api";

export default function Messages() {
    const { user: authUser, token } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const messagesEndRef = useRef(null);
    const scrollAreaRef = useRef(null);
    const location = useLocation();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const res = await fetch(`${API_URL}/messages`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) {
                    setConversations(data);

                    // Handle pre-selected user from URL
                    const params = new URLSearchParams(location.search);
                    const targetHandle = params.get('user');
                    if (targetHandle) {
                        const existing = data.find(c => c.handle === targetHandle);
                        if (existing) {
                            setActiveChat(existing);
                        } else {
                            // If not in conversations, fetch basic info to start new shadow chat
                            const profileRes = await fetch(`${API_URL}/profile?handle=${targetHandle}`);
                            if (profileRes.ok) {
                                const profileData = await profileRes.json();
                                setActiveChat(profileData);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Fetch conversations error:", error);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchConversations();
    }, [token, location.search]);

    useEffect(() => {
        if (!activeChat) return;

        const fetchMessages = async () => {
            try {
                const res = await fetch(`${API_URL}/messages/${activeChat.handle}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) setMessages(data);
            } catch (error) {
                console.error("Fetch messages error:", error);
            }
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 3000); // Polling for new messages
        return () => clearInterval(interval);
    }, [activeChat, token]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const filteredConversations = conversations.filter(conv =>
        conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.handle.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat) return;

        const msgContent = newMessage;
        setNewMessage("");

        try {
            const res = await fetch(`${API_URL}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ receiverHandle: activeChat.handle, content: msgContent })
            });

            if (res.ok) {
                const sentMsg = await res.json();
                setMessages(prev => [...prev, sentMsg]);

                // If it was a new shadow chat, add to conversations list if not there
                if (!conversations.find(c => c.handle === activeChat.handle)) {
                    setConversations(prev => [activeChat, ...prev]);
                }
            }
        } catch (error) {
            console.error("Send message error:", error);
        }
    };

    if (!token) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-10">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                    <User className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-black mb-4 font-outfit">Mesajlaşmak için giriş yapın</h2>
                <button
                    onClick={() => navigate('/login')}
                    className="bg-primary text-primary-foreground font-black px-8 py-3 rounded-2xl shadow-lg hover:scale-105 transition-transform"
                >
                    Giriş Yap
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-140px)] bg-card/20 backdrop-blur-sm border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
            {/* Conversation List */}
            <div className={clsx(
                "w-full md:w-80 border-r border-white/5 flex flex-col transition-all",
                activeChat ? "hidden md:flex" : "flex"
            )}>
                <div className="p-6 border-b border-white/5">
                    <h2 className="text-2xl font-black mb-4">Mesajlar</h2>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Kişilerde ara"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-secondary/50 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
                    {filteredConversations.length === 0 ? (
                        <div className="text-center py-10 px-6">
                            <p className="text-muted-foreground text-sm">
                                {searchQuery ? "Sonuç bulunamadı." : "Henüz bir konuşma yok. Keşfet'ten birileriyle tanışabilirsin!"}
                            </p>
                        </div>
                    ) : (
                        filteredConversations.map(conv => (
                            <button
                                key={conv.id || conv.handle}
                                onClick={() => setActiveChat(conv)}
                                className={clsx(
                                    "w-full flex items-center gap-3 p-3 rounded-2xl transition-all group",
                                    activeChat?.handle === conv.handle ? "bg-primary/10 border border-primary/20" : "hover:bg-white/5 border border-transparent"
                                )}
                            >
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-400 p-[2px]">
                                    <div className="w-full h-full rounded-[14px] overflow-hidden bg-background">
                                        {conv.avatar ? (
                                            <img src={conv.avatar} alt={conv.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-primary font-black uppercase text-lg">
                                                {conv.name[0]}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="font-bold text-foreground group-hover:text-primary transition-colors">{conv.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">@{conv.handle}</div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={clsx(
                "flex-1 flex flex-col bg-card/10 backdrop-blur-xl",
                !activeChat ? "hidden md:flex items-center justify-center" : "flex"
            )}>
                {activeChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-card/60 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setActiveChat(null)}
                                    className="md:hidden p-2 rounded-xl hover:bg-white/10 transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div className="w-10 h-10 rounded-xl bg-secondary/50 overflow-hidden">
                                    {activeChat.avatar ? (
                                        <img src={activeChat.avatar} alt={activeChat.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-primary font-black">
                                            {activeChat.name[0]}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="font-black leading-tight text-foreground">{activeChat.name}</div>
                                    <div className="flex items-center gap-1.5">
                                        {(() => {
                                            if (!activeChat || !activeChat.last_active) return <span className="text-xs text-muted-foreground font-bold">Son görülme: Yakın zamanda</span>;

                                            const dateStr = activeChat.last_active.includes(' ') && !activeChat.last_active.includes('T')
                                                ? activeChat.last_active.replace(' ', 'T') + 'Z'
                                                : activeChat.last_active;

                                            const lastActive = new Date(dateStr);
                                            if (isNaN(lastActive.getTime())) return <span className="text-xs text-muted-foreground font-bold">Son görülme: Yakın zamanda</span>;

                                            const now = new Date();
                                            const diffMs = now - lastActive;
                                            const diffMins = Math.floor(diffMs / 60000);

                                            if (diffMins < 2) {
                                                return (
                                                    <>
                                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                        <span className="text-xs text-green-500 font-bold">Çevrimiçi</span>
                                                    </>
                                                );
                                            } else {
                                                let timeStr = "";
                                                if (diffMins < 60) timeStr = `${diffMins} dk önce`;
                                                else if (diffMins < 1440) timeStr = `${Math.floor(diffMins / 60)} sa önce`;
                                                else timeStr = lastActive.toLocaleDateString();

                                                return (
                                                    <>
                                                        <div className="w-2 h-2 rounded-full bg-zinc-500"></div>
                                                        <span className="text-xs text-muted-foreground font-bold">Son görülme: {timeStr}</span>
                                                    </>
                                                );
                                            }
                                        })()}
                                    </div>
                                </div>
                            </div>
                            <button className="p-2 rounded-xl hover:bg-white/10 text-muted-foreground transition-colors">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div
                            ref={scrollAreaRef}
                            className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar scroll-smooth"
                        >
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={clsx(
                                        "flex flex-col gap-1 max-w-[80%] animate-in fade-in slide-in-from-bottom-2",
                                        msg.sender_id === authUser.id ? "ml-auto items-end" : "items-start"
                                    )}
                                >
                                    <div className={clsx(
                                        "px-5 py-3 rounded-3xl text-sm font-medium shadow-sm",
                                        msg.sender_id === authUser.id
                                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                                            : "bg-secondary text-foreground rounded-tl-sm border border-white/5"
                                    )}>
                                        {msg.content}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground px-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="p-6 bg-card/60 backdrop-blur-md border-t border-white/5">
                            <div className="flex gap-3 items-center bg-secondary/50 p-2 rounded-[1.5rem] border border-white/5 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Bir mesaj yazın..."
                                    className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-2 text-sm outline-none font-medium"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="p-3 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:scale-100 shadow-lg shadow-primary/20 active:scale-95"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="text-center p-10 animate-in fade-in zoom-in-95 duration-500">
                        <div className="relative mb-6 mx-auto w-24 h-24">
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
                            <div className="relative w-24 h-24 bg-card border border-white/10 rounded-[2rem] flex items-center justify-center shadow-2xl">
                                <Send className="w-10 h-10 text-primary -rotate-12 translate-x-1" />
                                <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-500 opacity-50" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-black mb-2">Henüz bir mesaj seçilmedi</h2>
                        <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
                            Mevcut konuşmalarından birini seç veya keşfet'ten birileriyle yeni bir sohbete başla.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

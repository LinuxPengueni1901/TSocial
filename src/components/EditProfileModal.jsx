import { useState } from 'react';
import { X, Camera } from 'lucide-react';
import { usePosts } from '../context/PostContext';

export function EditProfileModal({ isOpen, onClose }) {
    const { userProfile, updateProfile } = usePosts();
    const [formData, setFormData] = useState({
        name: userProfile.name,
        bio: userProfile.bio,
        location: userProfile.location,
        website: userProfile.website,
    });

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        updateProfile(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-lg bg-card border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                        <div className="flex items-center gap-4">
                            <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-xl font-bold">Profili Düzenle</h2>
                        </div>
                        <button
                            type="submit"
                            className="bg-primary text-primary-foreground font-bold px-6 py-2 rounded-xl hover:bg-primary/90 transition-colors"
                        >
                            Kaydet
                        </button>
                    </div>

                    {/* Banner Edit (Mock) */}
                    <div className="h-32 bg-gradient-to-r from-primary/50 to-purple-600/50 relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <button type="button" className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                                <Camera className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Avatar Edit (Mock) */}
                    <div className="px-6 -mt-12 relative flex justify-start mb-6">
                        <div className="w-24 h-24 rounded-2xl border-4 border-card bg-slate-200 overflow-hidden relative group">
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 font-bold text-2xl">
                                {formData.name[0]}
                            </div>
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-5 h-5 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Fields */}
                    <div className="px-6 pb-8 space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">İsim</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-secondary/50 border border-border/50 rounded-2xl px-4 py-3 focus:border-primary focus:ring-0 outline-none transition-colors"
                                placeholder="İsminiz"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Biyografi</label>
                            <textarea
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                className="w-full bg-secondary/50 border border-border/50 rounded-2xl px-4 py-3 focus:border-primary focus:ring-0 outline-none transition-colors resize-none h-24"
                                placeholder="Kendinizden bahsedin"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Konum</label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="w-full bg-secondary/50 border border-border/50 rounded-2xl px-4 py-3 focus:border-primary focus:ring-0 outline-none transition-colors"
                                placeholder="Konum ekleyin"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Web Sitesi</label>
                            <input
                                type="text"
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                className="w-full bg-secondary/50 border border-border/50 rounded-2xl px-4 py-3 focus:border-primary focus:ring-0 outline-none transition-colors"
                                placeholder="Web siteniz"
                            />
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

import { Bell, Settings, Sparkles } from 'lucide-react';

export function Notifications() {
    return (
        <div className="pb-20 animate-in fade-in duration-700">
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-4 py-3 flex justify-between items-center border-b border-white/5">
                <h2 className="text-2xl font-black">Bildirimler</h2>
                <button className="p-2 rounded-full hover:bg-secondary/50 transition-colors">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>

            <div className="flex gap-2 px-4 mt-4 mb-6 overflow-x-auto pb-2 no-scrollbar">
                {['Tümü', 'Onaylanmış', 'Bahsedenler'].map((tab, i) => (
                    <button
                        key={tab}
                        className={clsx(
                            "px-6 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all",
                            i === 0 ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-card text-muted-foreground hover:bg-secondary"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Empty State */}
            <div className="flex flex-col items-center justify-center py-24 px-10 text-center">
                <div className="relative mb-8">
                    <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl"></div>
                    <div className="relative w-24 h-24 bg-card border border-white/10 rounded-3xl flex items-center justify-center">
                        <Bell className="w-10 h-10 text-primary" />
                        <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 opacity-50" />
                    </div>
                </div>
                <h3 className="text-xl font-black mb-2">Henüz bildirim yok</h3>
                <p className="text-muted-foreground text-base max-w-xs leading-relaxed">
                    Burada görünecek bir şey olduğunda seni hemen haberdar edeceğiz!
                </p>
            </div>
        </div>
    );
}

import clsx from 'clsx';

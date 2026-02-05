import { Rocket, Sparkles } from 'lucide-react';

export function ComingSoon() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in duration-700">
            <div className="relative mb-10 group">
                <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-all"></div>
                <div className="relative w-28 h-28 bg-card border border-white/10 rounded-[2rem] flex items-center justify-center shadow-2xl">
                    <Rocket className="w-12 h-12 text-primary animate-bounce" />
                    <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 opacity-50" />
                </div>
            </div>

            <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                Çok Yakında
            </h1>

            <p className="text-muted-foreground text-xl max-w-md font-medium leading-relaxed">
                TSocial deneyimini mükemmelleştirmek için bu sayfa üzerinde çalışıyoruz. Takipte kalın! 🚀
            </p>

            <div className="mt-12 flex gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-100"></div>
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-200"></div>
            </div>
        </div>
    );
}

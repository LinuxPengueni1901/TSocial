import { Search, MoreHorizontal } from 'lucide-react';

export function RightSidebar() {
    return (
        <div className="hidden lg:flex flex-col h-screen sticky top-0 w-[350px] px-4 py-2 border-l border-border bg-background/50 backdrop-blur-md">
            {/* Search Bar */}
            <div className="sticky top-0 bg-background/95 backdrop-blur py-2 z-10 mb-4">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-3 bg-secondary/50 border-none rounded-full text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:bg-background transition-all"
                        placeholder="Search TSocial"
                    />
                </div>
            </div>

            {/* Premium Upgrade Box */}
            <div className="bg-secondary/30 rounded-2xl p-4 mb-4 border border-border/50">
                <h2 className="font-bold text-xl mb-2">Subscribe to Premium</h2>
                <p className="text-muted-foreground mb-4">
                    Subscribe to unlock new features and get a verified badge.
                </p>
                <button className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-full hover:bg-primary/90 transition-colors">
                    Subscribe
                </button>
            </div>

            {/* Trending Topics */}
            <div className="bg-secondary/30 rounded-2xl pt-4 pb-2 border border-border/50 mb-4">
                <h2 className="font-bold text-xl px-4 mb-4">Trends for you</h2>
                <div className="hover:bg-secondary/50 px-4 py-3 cursor-pointer transition-colors relative">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Programming · Trending</span>
                        <MoreHorizontal className="h-4 w-4 hover:text-primary" />
                    </div>
                    <div className="font-bold text-base">#ReactJS</div>
                    <div className="text-xs text-muted-foreground">50.4K posts</div>
                </div>
                <div className="hover:bg-secondary/50 px-4 py-3 cursor-pointer transition-colors relative">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Technology · Trending</span>
                        <MoreHorizontal className="h-4 w-4 hover:text-primary" />
                    </div>
                    <div className="font-bold text-base">#AI</div>
                    <div className="text-xs text-muted-foreground">120K posts</div>
                </div>
                <div className="hover:bg-secondary/50 px-4 py-3 cursor-pointer transition-colors relative rounded-b-2xl">
                    <div className="text-primary text-sm">Show more</div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 text-xs text-muted-foreground leading-5">
                <span className="hover:underline cursor-pointer mr-2">Terms of Service</span>
                <span className="hover:underline cursor-pointer mr-2">Privacy Policy</span>
                <span className="hover:underline cursor-pointer mr-2">Cookie Policy</span>
                <span className="hover:underline cursor-pointer mr-2">Accessibility</span>
                <span>© 2026 TSocial Corp.</span>
            </div>
        </div>
    );
}

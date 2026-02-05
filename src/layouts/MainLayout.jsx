import { Outlet } from "react-router-dom";
import { FloatingDock } from "../components/FloatingDock";

export function MainLayout() {
    return (
        <div className="min-h-screen bg-background text-foreground relative pb-24">
            {/* Animated Background Mesh */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[100px] animate-pulse"></div>
            </div>

            <main className="container mx-auto max-w-2xl px-4 pt-4">
                <Outlet />
            </main>

            <FloatingDock />
        </div>
    );
}

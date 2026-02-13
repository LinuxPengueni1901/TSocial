import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-4xl">⚠️</div>
                    <h1 className="text-2xl font-black mb-4">Bir Şeyler Ters Gitti</h1>
                    <p className="text-muted-foreground mb-8 max-w-md">
                        Uygulama beklenmedik bir hata ile karşılaştı. Lütfen sayfayı yenilemeyi deneyin.
                    </p>
                    <pre className="bg-secondary/50 p-4 rounded-2xl text-xs text-left overflow-auto max-w-full mb-8 max-h-40 border border-white/5">
                        {this.state.error?.toString()}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-3 rounded-2xl transition-all shadow-lg"
                    >
                        Sayfayı Yenile
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

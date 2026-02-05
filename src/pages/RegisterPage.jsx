import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, User as UserIcon, Lock, AtSign } from 'lucide-react';

export function RegisterPage() {
    const [name, setName] = useState('');
    const [handle, setHandle] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await register(name, handle, password);
        setLoading(false);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error || 'Kayıt başarısız oldu.');
        }
    };

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-card/50 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent mb-2">
                        Hesap Oluştur
                    </h1>
                    <p className="text-muted-foreground">TSocial dünyasına katılın</p>
                </div>

                {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-2xl mb-6 border border-destructive/20 text-center font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="relative group">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ad Soyad"
                            className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-lg"
                        />
                    </div>

                    <div className="relative group">
                        <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            required
                            value={handle}
                            onChange={(e) => setHandle(e.target.value)}
                            placeholder="Kullanıcı adı"
                            className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-lg"
                        />
                    </div>

                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Şifre"
                            className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-lg"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-2xl text-lg shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Hesap oluşturuluyor...' : 'Kayıt Ol'}
                        <UserPlus className="w-5 h-5" />
                    </button>
                </form>

                <div className="mt-8 text-center text-muted-foreground">
                    Zaten hesabınız var mı? <Link to="/login" className="text-primary font-bold hover:underline">Giriş Yap</Link>
                </div>
            </div>
        </div>
    );
}

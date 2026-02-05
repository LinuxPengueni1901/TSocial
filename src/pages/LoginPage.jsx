import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, User as UserIcon, Lock } from 'lucide-react';

export function LoginPage() {
    const [handle, setHandle] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [suspension, setSuspension] = useState(null);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuspension(null);
        setLoading(true);
        const result = await login(handle, password);
        setLoading(false);

        if (result.success) {
            navigate('/');
        } else if (result.isSuspended) {
            setSuspension(result.suspensionDetails);
        } else {
            setError(result.error || 'Giriş başarısız oldu.');
        }
    };

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-card/50 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent mb-2">
                        Hoş Geldiniz
                    </h1>
                    <p className="text-muted-foreground">TSocial dünyasına giriş yapın</p>
                </div>

                {suspension ? (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                        {!suspension.showAppealForm ? (
                            <>
                                <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl text-center">
                                    <h2 className="text-xl font-black text-amber-500 mb-4 tracking-tight">Hesabınız askıya alındı.</h2>
                                    <div className="text-sm text-muted-foreground leading-relaxed text-left space-y-4">
                                        <p>Merhaba <strong>{suspension.userName}</strong>,</p>
                                        <p>
                                            <strong>@{suspension.suspendedBy}</strong> kullanıcı adlı {suspension.adminName} TSocial yetkilisi hesabınızı
                                            <span className="text-amber-500 font-bold italic mx-1">"{suspension.reason}"</span>
                                            nedeniyle askıya aldı.
                                        </p>

                                        {suspension.appealStatus === 'pending' && (
                                            <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl">
                                                <p className="font-bold text-primary">İtirazınız Değerlendiriliyor</p>
                                                <p className="text-xs mt-1">Gönderdiğiniz itiraz metni TSocial yetkilileri tarafından inceleniyor. Lütfen bekleyin.</p>
                                            </div>
                                        )}

                                        {suspension.appealStatus === 'rejected' && (
                                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                                <p className="font-bold text-red-500">İtirazınız Reddedildi</p>
                                                <p className="text-xs mt-1">Maalesef itirazınız kabul edilmedi. Hesabınız kapalı kalmaya devam edecektir.</p>
                                            </div>
                                        )}

                                        <p className="font-bold text-primary">TSocial Ekibi</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {!suspension.appealStatus && (
                                        <button
                                            onClick={() => setSuspension(prev => ({ ...prev, showAppealForm: true }))}
                                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
                                        >
                                            İtiraz Et
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setSuspension(null)}
                                        className="w-full text-muted-foreground hover:text-foreground text-sm font-medium transition-colors p-2"
                                    >
                                        Vazgeç ve Geri Dön
                                    </button>
                                </div>
                            </>
                        ) : (
                            <AppealForm
                                suspension={suspension}
                                handle={handle}
                                password={password}
                                onCancel={() => setSuspension(prev => ({ ...prev, showAppealForm: false }))}
                                onSuccess={() => setSuspension(prev => ({ ...prev, appealStatus: 'pending', showAppealForm: false }))}
                            />
                        )}
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-2xl mb-6 border border-destructive/20 text-center font-medium">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="relative group">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
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
                                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                                <LogIn className="w-5 h-5" />
                            </button>
                        </form>

                        <div className="mt-8 text-center text-muted-foreground">
                            Hesabınız yok mu? <Link to="/register" className="text-primary font-bold hover:underline">Hesap Oluştur</Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function AppealForm({ suspension, handle, password, onCancel, onSuccess }) {
    const [appealText, setAppealText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { submitAppeal } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (appealText.trim().length < 10) {
            setError('Lütfen durumunuzu açıklayan en az 10 karakterlik bir metin girin.');
            return;
        }

        setLoading(true);
        setError('');
        const result = await submitAppeal(handle, password, appealText);
        setLoading(false);

        if (result.success) {
            onSuccess();
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="text-center">
                <h2 className="text-xl font-black mb-2">İtiraz Formu</h2>
                <p className="text-sm text-muted-foreground">Neden hesabınızın açılması gerektiğini kısaca açıklayın.</p>
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-2xl border border-destructive/20 text-center">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                    required
                    value={appealText}
                    onChange={(e) => setAppealText(e.target.value)}
                    placeholder="İtiraz gerekçeniz..."
                    rows={5}
                    className="w-full bg-secondary/50 border border-white/10 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary transition-all resize-none text-sm"
                />

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground font-bold py-3 rounded-xl transition-all"
                    >
                        Vazgeç
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-8 rounded-xl transition-all disabled:opacity-50"
                    >
                        {loading ? 'Gönderiliyor...' : 'Gönder'}
                    </button>
                </div>
            </form>
        </div>
    );
}

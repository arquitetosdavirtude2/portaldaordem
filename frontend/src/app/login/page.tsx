
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
    const router = useRouter();
    const [identificacao, setIdentificacao] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState('');
    const [carregando, setCarregando] = useState(false);

    useEffect(() => {
        const access = localStorage.getItem('acesso');
        if (access) {
            router.push('/dashboard');
        }
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro('');
        setCarregando(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: identificacao, senha }),
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('acesso', JSON.stringify({
                    // Stores username and state scope if exists
                    login: identificacao,
                    tipo: data.tipo,
                    role: data.role,
                    // Take the first state as default for now, or 'BR' if admin/all
                    estado: data.allowed_states && data.allowed_states.length > 0 ? data.allowed_states[0] : 'BR',
                    allowed_states: data.allowed_states
                }));
                router.push('/dashboard');
            } else {
                setErro(data.message || 'Credenciais inválidas.');
            }
        } catch (error) {
            setErro('Erro de conexão com o Templo. Verifique sua internet.');
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-masonic-blue relative overflow-hidden font-serif text-gray-100 selection:bg-masonic-gold selection:text-masonic-blue">

            {/* Background Texture/Overlay */}
            <div className="absolute inset-0 opacity-5 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-masonic-gold/5 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none animate-pulse duration-[5000ms]"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none"></div>

            {/* Watermark/Symbol Container */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                <div className="relative w-[600px] h-[600px] animate-[spin_60s_linear_infinite]">
                    <Image
                        src="/logo-gomb.png"
                        alt="Watermark"
                        fill
                        className="object-contain grayscale"
                    />
                </div>
            </div>

            {/* Login Box */}
            <div className="z-10 bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-md relative animate-in fade-in zoom-in duration-500">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-2xl pointer-events-none"></div>

                {/* Header / Logo Place */}
                <div className="flex flex-col items-center mb-8 relative z-10">
                    <div className="w-24 h-24 mb-6 relative drop-shadow-[0_0_15px_rgba(212,175,55,0.3)] filter hover:scale-105 transition-transform duration-500">
                        <Image
                            src="/logo-gomb.png"
                            alt="GOMB Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-masonic-gold text-center tracking-[0.2em] uppercase mb-2 drop-shadow-md font-serif">
                        GOMB
                    </h1>
                    <p className="text-[10px] text-gray-400 uppercase tracking-[0.4em] text-center border-t border-masonic-gold/20 pt-2 px-4">
                        Grande Oriente Maçônico do Brasil
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                    <div className="space-y-1">
                        <label className="block text-masonic-gold/80 text-[10px] uppercase tracking-widest font-bold ml-1">
                            Usuário / Email
                        </label>
                        <div className="relative group">
                            <input
                                type="text"
                                value={identificacao}
                                onChange={(e) => setIdentificacao(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-lg text-gray-100 p-3 pl-10 focus:outline-none focus:border-masonic-gold focus:bg-black/50 transition-all tracking-wider placeholder-gray-600 text-sm font-sans"
                                placeholder="Digite sua identificação"
                            />
                            <span className="absolute left-3 top-3 text-gray-500 group-focus-within:text-masonic-gold transition-colors">👤</span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-masonic-gold/80 text-[10px] uppercase tracking-widest font-bold ml-1">
                            Palavra de Passe
                        </label>
                        <div className="relative group">
                            <input
                                type="password"
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-lg text-gray-100 p-3 pl-10 focus:outline-none focus:border-masonic-gold focus:bg-black/50 transition-all placeholder-gray-600 text-sm font-sans"
                                placeholder="••••••••"
                            />
                            <span className="absolute left-3 top-3 text-gray-500 group-focus-within:text-masonic-gold transition-colors">🔒</span>
                        </div>
                    </div>

                    {erro && (
                        <div className="bg-red-900/20 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg text-center animate-pulse flex items-center justify-center gap-2">
                            <span>⚠️</span> {erro}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={carregando}
                        className="w-full bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-500 text-white font-bold py-3 rounded-lg border border-yellow-500/50 shadow-[0_4px_14px_0_rgba(234,179,8,0.39)] hover:shadow-[0_6px_20px_rgba(234,179,8,0.23)] transform active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-xs mt-4 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {carregando ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Verificando...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                Adentrar o Templo
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </span>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-4 border-t border-white/5 text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest hover:text-masonic-gold transition-colors cursor-default">
                        Painel Administrativo Federal
                    </p>
                </div>
            </div>

            <footer className="absolute bottom-4 text-[9px] text-gray-600 uppercase tracking-widest">
                &copy; {new Date().getFullYear()} GOMB &bull; Todos os direitos reservados
            </footer>
        </div>
    );
}

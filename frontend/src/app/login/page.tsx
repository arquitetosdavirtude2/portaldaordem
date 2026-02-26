
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
                    login: identificacao,
                    tipo: data.tipo,
                    role: data.role,
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#0f1a3a] to-black relative overflow-hidden font-serif text-gray-100 selection:bg-masonic-gold selection:text-masonic-blue">

            {/* Background Texture/Overlay */}
            <div className="absolute inset-0 opacity-10 bg-[url('/texture-noise.png')] pointer-events-none mix-blend-overlay"></div>
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-masonic-gold/5 rounded-full blur-[150px] pointer-events-none"></div>

            {/* Watermark/Symbol Container */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05]">
                <div className="relative w-[700px] h-[700px]">
                    <Image
                        src="/logo-gomb.png"
                        alt="Watermark"
                        fill
                        className="object-contain grayscale"
                    />
                </div>
            </div>

            {/* Login Box */}
            <div className="z-10 bg-[#121c33]/80 backdrop-blur-md border border-white/5 p-8 sm:p-10 rounded-xl shadow-2xl w-full max-w-[420px] relative">

                {/* Header / Logo Place */}
                <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 mb-4 relative drop-shadow-md">
                        <Image
                            src="/logo-gomb.png"
                            alt="GOMB Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-masonic-gold text-center tracking-[0.2em] uppercase mb-1 drop-shadow-sm font-serif">
                        GOMB
                    </h1>
                    <p className="text-[9px] text-gray-400 uppercase tracking-[0.3em] text-center border-t border-masonic-gold/20 pt-2 px-2">
                        Grande Oriente Maçônico do Brasil
                    </p>
                </div>

                {/* Acesso Federal Badge */}
                <div className="flex justify-center mb-8">
                    <span className="bg-[#1a284e] text-[#6b8cff] border border-[#2d4077] text-[10px] px-6 py-1.5 font-bold uppercase tracking-widest rounded-sm shadow-inner">
                        Acesso Federal
                    </span>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-1">
                        <label className="block text-masonic-gold text-[10px] uppercase tracking-widest font-bold ml-1">
                            Usuário / Email
                        </label>
                        <input
                            type="text"
                            value={identificacao}
                            onChange={(e) => setIdentificacao(e.target.value)}
                            className="w-full bg-[#0a1122]/80 border border-white/5 rounded-md text-gray-200 p-2.5 px-4 focus:outline-none focus:border-masonic-gold/50 transition-all text-sm font-sans placeholder-gray-600"
                            placeholder="Digite seu usuário"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-masonic-gold text-[10px] uppercase tracking-widest font-bold ml-1">
                            Palavra de Passe
                        </label>
                        <input
                            type="password"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            className="w-full bg-[#0a1122]/80 border border-white/5 rounded-md text-gray-200 p-2.5 px-4 focus:outline-none focus:border-masonic-gold/50 transition-all text-sm font-sans placeholder-gray-600 tracking-widest"
                            placeholder="••••••••"
                        />
                    </div>

                    {erro && (
                        <div className="bg-red-900/40 border border-red-500/50 text-red-400 text-xs p-2 rounded text-center">
                            {erro}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={carregando}
                        className="w-full bg-[#c28f11] hover:bg-[#a87a0b] text-white font-bold py-3 rounded-md shadow-md transform active:scale-[0.98] transition-all uppercase tracking-widest text-xs mt-2 disabled:opacity-50"
                    >
                        {carregando ? "Carregando..." : "Adentrar"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-[9px] text-[#5c6a91] uppercase tracking-[0.2em]">
                        Sistema Interno de Gestão
                    </p>
                </div>
            </div>
        </div>
    );
}


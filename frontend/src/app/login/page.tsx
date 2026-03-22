
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
    const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

    useEffect(() => {
        const access = localStorage.getItem('acesso');
        if (access) {
            // Use window.location.replace to completely nuke the history state 
            // and avoid the SPA back-button trap
            window.location.replace('/dashboard');
        } else {
            setHasCheckedAuth(true);
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro('');
        setCarregando(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/auth/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: identificacao, senha }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                setErro(errorData.detail || errorData.message || `Erro do Servidor (${response.status})`);
                return;
            }

            const data = await response.json();

            if (data.success) {
                // ... same logic ...
                const userRole = data.role === 'admin' ? 'admin' : (data.role || 'mestre');
                const userTipo = data.tipo || 'leitor';
                const states = Array.isArray(data.allowed_states) ? data.allowed_states : [];
                const estadoDefault = states.length > 0 ? states[0] : 'BR';

                localStorage.setItem('acesso', JSON.stringify({
                    login: identificacao,
                    tipo: userTipo,
                    role: userRole,
                    estado: estadoDefault,
                    allowed_states: states,
                    loja_id: data.loja_id || null,
                    loja_nome: data.loja_nome || null,
                    loja_numero: data.loja_numero || null,
                    loja_cidade: data.loja_cidade || null,
                    nome: data.nome || null,
                    cargo: data.cargo || null
                }));

                window.location.href = '/dashboard';
            } else {
                setErro(data.message || 'Credenciais inválidas.');
            }
        } catch (error) {
            console.error('Login Error:', error);
            setErro('Erro de conexão com o Templo. Verifique seu servidor.');
        } finally {
            setCarregando(false);
        }
    };

    if (!hasCheckedAuth) {
        return <div className="min-h-screen bg-[#0a1536]" />; // Blank screen prevents flicker
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_#1c3879_0%,_#0a1536_40%,_#000000_100%)] relative overflow-hidden font-serif">

            {/* Fundo Marca D'água */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                <div className="relative w-[800px] h-[800px]">
                    <Image
                        src="/logo-gomb.png"
                        alt="Watermark"
                        fill
                        className="object-contain grayscale"
                    />
                </div>
            </div>

            {/* Container Principal do Login */}
            <div className="z-10 bg-[#151f38] border border-[#2a3a5f] p-8 sm:p-10 shadow-[0_0_80px_rgba(0,0,0,0.8)] rounded-xl w-full max-w-[400px] relative">

                {/* Cabeçalho */}
                <div className="flex flex-col items-center mb-5">
                    <div className="w-20 h-20 mb-3 relative drop-shadow-md">
                        <Image
                            src="/logo-gomb.png"
                            alt="GOMB Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-[#d4af37] text-center tracking-[0.15em] uppercase mb-1 drop-shadow-xl font-serif">
                        GOMB
                    </h1>
                    <p className="text-[7.5px] text-[#b38e2d] uppercase tracking-[0.25em] text-center px-2">
                        Grande Oriente Maçônico do Brasil
                    </p>
                </div>

                {/* Badge Acesso Restrito */}
                <div className="flex justify-center mb-8">
                    <span className="bg-[#1a2f6c] text-[#739aff] text-[9px] px-4 py-1.5 font-bold uppercase tracking-widest rounded-sm shadow-inner">
                        Acesso Restrito
                    </span>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    {/* Input Usuário */}
                    <div className="space-y-1">
                        <label className="block text-[#d4af37] text-[9px] uppercase tracking-widest font-bold ml-1">
                            Usuário / Email
                        </label>
                        <input
                            type="text"
                            value={identificacao}
                            onChange={(e) => setIdentificacao(e.target.value)}
                            className="w-full bg-[#0d1426] border border-[#1d2b48] rounded-[4px] text-gray-300 p-2.5 text-center focus:outline-none focus:border-[#d4af37]/50 transition-all text-sm font-sans placeholder-[#3b4c6b]"
                            placeholder="Digite seu usuário"
                        />
                    </div>

                    {/* Input Senha */}
                    <div className="space-y-1">
                        <label className="block text-[#d4af37] text-[9px] uppercase tracking-widest font-bold ml-1">
                            Palavra de Passe
                        </label>
                        <input
                            type="password"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            className="w-full bg-[#0d1426] border border-[#1d2b48] rounded-[4px] text-gray-300 p-2.5 text-center focus:outline-none focus:border-[#d4af37]/50 transition-all text-sm font-sans placeholder-[#3b4c6b] tracking-[0.3em]"
                            placeholder="••••••••"
                        />
                    </div>

                    {erro && (
                        <div className="bg-red-900/40 border border-red-500/50 text-red-400 text-xs p-2 rounded text-center">
                            {erro}
                        </div>
                    )}

                    {/* Botão Adentrar */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={carregando}
                            className="w-full bg-[#d48c00] hover:bg-[#b07400] text-black font-extrabold py-2.5 rounded-[4px] shadow-lg transform active:scale-[0.98] transition-all uppercase tracking-[0.15em] text-[11px] disabled:opacity-50"
                        >
                            {carregando ? "Carregando..." : "Adentrar"}
                        </button>
                    </div>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[8px] text-[#4a5f87] uppercase tracking-[0.2em] font-sans">
                        Sistema Interno de Gestão
                    </p>
                </div>
            </div>
        </div>
    );
}


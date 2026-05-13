'use client';

import { useEffect, useState } from 'react';
import DashboardTrabalhos from '@/components/trabalhos/DashboardTrabalhos';
import { useRouter } from 'next/navigation';

export default function TrabalhosPage() {
    const [acesso, setAcesso] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const auth = localStorage.getItem('acesso');
        if (!auth) {
            router.push('/');
            return;
        }
        setAcesso(JSON.parse(auth));
    }, [router]);

    if (!acesso) return null;

    const displayTitle = acesso.loja_nome 
        ? `${acesso.loja_nome}${acesso.loja_numero ? ` Nº ${acesso.loja_numero}` : ''}`
        : 'Trabalhos & Preleções';

    return (
        <main className="min-h-screen bg-[#0a1536] text-white selection:bg-yellow-500/30 relative">
            {/* Background Fix */}
            <div className="fixed inset-0 bg-[#0a1536] bg-gradient-to-br from-[#0a1536] via-[#1c3879] to-black -z-10 w-full h-full"></div>
            
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-10 pb-20 relative z-10">
                {/* Custom Header Section */}
                <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
                            <div className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.25em] border border-yellow-500/50 text-yellow-500 bg-yellow-500/10">
                                Escola de Mistérios
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-yellow-500 tracking-tight leading-tight uppercase drop-shadow-lg">
                                {displayTitle}
                            </h1>
                            <div className="text-[10px] text-gray-400 font-sans tracking-[0.2em] uppercase font-bold opacity-70">
                                {acesso.loja_cidade || acesso.estado}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg border border-white/10 transition-all text-[10px] font-bold uppercase tracking-wider h-11"
                            >
                                Painel Principal
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.removeItem('acesso');
                                    router.push('/');
                                }}
                                className="px-5 py-2.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg border border-red-500/20 transition-all text-[10px] font-bold uppercase tracking-wider h-11"
                            >
                                Sair
                            </button>
                        </div>
                    </div>
                </div>

                {/* Hero Content */}
                <div className="mb-12 animate-in fade-in slide-in-from-left-4 duration-1000">
                    <h2 className="text-4xl font-serif font-medium tracking-tight text-white mb-2 uppercase">
                        Minha Evolução
                    </h2>
                    <p className="text-gray-400 text-sm md:text-base max-w-2xl font-light leading-relaxed">
                        Gerencie sua jornada no Grau de {acesso.status || 'Aprendiz'}. Acompanhe estudos, 
                        assista conteúdos exclusivos e submeta seus trabalhos para avaliação.
                    </p>
                </div>

                <DashboardTrabalhos acesso={acesso} />
            </div>
        </main>
    );
}

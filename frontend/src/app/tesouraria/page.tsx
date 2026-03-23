'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardFinanceiro from '@/components/tesouraria/DashboardFinanceiro';
import ListaTransacoes from '@/components/tesouraria/ListaTransacoes';
import GestaoIrmaosFinanceiro from '@/components/tesouraria/GestaoIrmaosFinanceiro';

interface Acesso {
    estado: string;
    tipo: string;
    role?: string;
    loja_id?: number | null;
    loja_nome?: string | null;
    loja_numero?: string | null;
    loja_cidade?: string | null;
    nome?: string;
}

export default function TesourariaPage() {
    const router = useRouter();
    const [acesso, setAcesso] = useState<Acesso | null>(null);
    const [abaAtiva, setAbaAtiva] = useState<'geral' | 'irmaos'>('geral');
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        const acessoSalvo = localStorage.getItem('acesso');
        if (!acessoSalvo) {
            router.push('/');
            return;
        }

        const acessoObj: Acesso = JSON.parse(acessoSalvo);
        
        // Verifica se tem permissão (Tesoureiro ou Mestre/Admin)
        const podeAcessar = acessoObj.role === 'admin' || 
                           acessoObj.role === 'loja' || 
                           acessoObj.role === 'tesoureiro';
                           
        if (!podeAcessar) {
            router.push('/dashboard');
            return;
        }

        setAcesso(acessoObj);
        setCarregando(false);
    }, [router]);

    if (carregando || !acesso) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0a1536]">
                <p className="text-xl text-yellow-500 font-serif animate-pulse">Iniciando Tesouraria...</p>
            </div>
        );
    }

    const displayTitle = acesso.loja_nome 
        ? `${acesso.loja_nome}${acesso.loja_numero ? ` Nº ${acesso.loja_numero}` : ''}`
        : 'Tesouraria';

    return (
        <div className="min-h-screen flex flex-col relative font-serif text-gray-100 overflow-x-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a1536] via-[#1c3879] to-black z-0 fixed"></div>

            <div className="z-10 w-full max-w-7xl mx-auto p-4 sm:p-6 relative">
                {/* Header Section */}
                <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden mb-6">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
                            <div className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border border-yellow-500/50 text-yellow-500 bg-yellow-500/10">
                                Gestão Financeira
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-yellow-500 tracking-tight leading-tight uppercase drop-shadow-lg">
                                {displayTitle}
                            </h1>
                            <div className="text-[11px] text-gray-400 font-sans tracking-widest uppercase font-bold">
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

                    {/* Navigation Tabs */}
                    <div className="flex border-t border-white/5 bg-black/20">
                        <button
                            onClick={() => setAbaAtiva('geral')}
                            className={`flex-1 py-4 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 ${abaAtiva === 'geral' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                        >
                            Fluxo de Caixa
                        </button>
                        <button
                            onClick={() => setAbaAtiva('irmaos')}
                            className={`flex-1 py-4 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 ${abaAtiva === 'irmaos' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                        >
                            Joias & Mensalidades
                        </button>
                    </div>

                    <div className="p-6 md:p-8">
                        {abaAtiva === 'geral' ? (
                            <DashboardFinanceiro acesso={acesso} />
                        ) : (
                            <GestaoIrmaosFinanceiro acesso={acesso} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

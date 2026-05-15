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

    // Check if user is an officer (WM or Wardens)
    const isDiretoria = acesso.cargo?.toLowerCase().includes('venerável') || 
                        acesso.cargo?.toLowerCase().includes('vigilante') ||
                        acesso.role === 'admin' || acesso.role === 'loja';

    const displayTitle = isDiretoria 
        ? `Gestão de Trabalhos - ${acesso.loja_nome || 'Loja'}`
        : `Minha Evolução - ${acesso.nome || 'Irmão'}`;

    return (
        <main className="min-h-screen w-full flex flex-col font-sans text-gray-100 selection:bg-yellow-500 selection:text-black relative">
            {/* Global Background Fix */}
            <style dangerouslySetInnerHTML={{ __html: `
                html, body { 
                    background-color: #0a1536 !important; 
                    margin: 0 !important; 
                    padding: 0 !important;
                    overflow-x: hidden !important;
                    width: 100% !important;
                }
            ` }} />
            
            {/* Optimized Fixed Background */}
            <div className="fixed inset-0 bg-[#0a1536] bg-gradient-to-br from-[#0a1536] via-[#1c3879] to-black -z-10 w-full h-full"></div>
            <div className="fixed inset-0 bg-[url('/texture-noise.png')] opacity-[0.03] -z-10 pointer-events-none w-full h-full"></div>
            <div className="fixed inset-0 bg-[url('/bg-columns.png')] bg-cover bg-center bg-no-repeat opacity-[0.10] -z-10 pointer-events-none w-full h-full mix-blend-luminosity mix-blend-screen"></div>

            <div className="z-10 w-full max-w-7xl mx-auto p-4 sm:p-6 relative">
                {/* Header Section (Consistent with Tesouraria) */}
                <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden mb-6">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-yellow-500/30 overflow-hidden flex-shrink-0 bg-white/5 p-1 shadow-[0_0_20px_rgba(234,179,8,0.15)] transition-transform hover:scale-105 duration-500 flex items-center justify-center">
                                <img src="/logo-gomb.png" alt="GOMB Logo" className="w-full h-full object-cover drop-shadow-lg rounded-full" />
                            </div>
                            <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
                                {isDiretoria && (
                                    <div className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.25em] border border-yellow-500/50 text-yellow-500 bg-yellow-500/10 mb-1">
                                        Painel de Gestão
                                    </div>
                                )}
                                <h1 className="text-2xl md:text-3xl font-bold text-yellow-500 tracking-tight leading-tight uppercase drop-shadow-lg">
                                    {isDiretoria ? 'Gestão de Trabalhos' : 'Minha Evolução'}
                                </h1>
                                <div className="text-[10px] text-gray-400 font-sans tracking-[0.2em] uppercase font-bold opacity-70">
                                    {acesso.nome} • Grau de {acesso.status || acesso.grau_nome || 'Aprendiz'} • {acesso.loja_nome || 'Arquitetos da Virtude'}
                                </div>
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

                    <div className="p-6 md:p-8 pt-0">
                        <DashboardTrabalhos acesso={acesso} isDiretoria={isDiretoria} />
                    </div>
                </div>
            </div>
        </main>
    );
}

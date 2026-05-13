'use client';

import { useState } from 'react';

interface DashboardTrabalhosProps {
    acesso: any;
    isDiretoria?: boolean;
}

export default function DashboardTrabalhos({ acesso, isDiretoria }: DashboardTrabalhosProps) {
    const [tabAtiva, setTabAtivo] = useState<'trabalhos' | 'prelecoes'>('trabalhos');
    
    // Initial suggested list
    const trabalhosAprendiz = [
        { id: 0, titulo: "Minha Iniciação", status: "pendente" },
        { id: 1, titulo: "Dualidade do Grau", status: "pendente" },
        { id: 2, titulo: "Avental Maçônico", status: "pendente" },
        { id: 3, titulo: "Colunas", status: "pendente" },
        { id: 4, titulo: "Luvas", status: "pendente" },
        { id: 5, titulo: "Trabalho 6", status: "pendente" },
        { id: 6, titulo: "Trabalho 7", status: "pendente" },
        { id: 7, titulo: "Trabalho 8", status: "pendente" },
        { id: 8, titulo: "Trabalho 9", status: "pendente" },
        { id: 9, titulo: "Trabalho 10", status: "pendente" },
        { id: 10, titulo: "Trabalho 11", status: "pendente" },
        { id: 11, titulo: "Trabalho 12", status: "pendente" },
        { id: 12, titulo: "Trabalho 13", status: "pendente" },
    ];

    const prelecoesAprendiz = Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        titulo: `${i + 1}ª Sessão da 1ª Preleção`,
        status: "pendente"
    }));

    const progressWorks = 0;
    const totalWorks = trabalhosAprendiz.length;
    const progressPrelect = 0;
    const totalPrelect = prelecoesAprendiz.length;

    return (
        <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Navigation Tabs (Top Aligned like Treasury) */}
            <div className="flex border-b border-white/5 bg-black/10 -mx-6 md:-mx-8 mb-6">
                <button
                    onClick={() => setTabAtivo('trabalhos')}
                    className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 ${
                        tabAtiva === 'trabalhos' 
                        ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5' 
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                >
                    📜 Trabalhos
                </button>
                <button
                    onClick={() => setTabAtivo('prelecoes')}
                    className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 ${
                        tabAtiva === 'prelecoes' 
                        ? 'border-blue-500 text-blue-500 bg-blue-500/5' 
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                >
                    📖 Preleções
                </button>
            </div>

            {/* Compact Progress Indicators */}
            {!isDiretoria && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/[0.02] border border-white/5 px-4 py-3 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex flex-col">
                            <span className="text-[8px] uppercase font-bold text-gray-500 tracking-widest">Progresso Trabalhos</span>
                            <span className="text-[11px] font-medium text-yellow-500/80">{progressWorks}/{totalWorks}</span>
                        </div>
                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden max-w-[120px]">
                            <div className="h-full bg-yellow-500/50" style={{ width: `${(progressWorks/totalWorks)*100}%` }}></div>
                        </div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 px-4 py-3 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex flex-col">
                            <span className="text-[8px] uppercase font-bold text-gray-500 tracking-widest">Progresso Preleções</span>
                            <span className="text-[11px] font-medium text-blue-400/80">{progressPrelect}/{totalPrelect}</span>
                        </div>
                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden max-w-[120px]">
                            <div className="h-full bg-blue-500/50" style={{ width: `${(progressPrelect/totalPrelect)*100}%` }}></div>
                        </div>
                    </div>
                </div>
            )}

            {/* List Section */}
            <div className="grid grid-cols-1 gap-2">
                {(tabAtiva === 'trabalhos' ? trabalhosAprendiz : prelecoesAprendiz).map((item) => (
                    <div 
                        key={item.id}
                        className="group flex items-center justify-between p-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-lg transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`text-sm ${tabAtiva === 'trabalhos' ? 'text-yellow-500/40' : 'text-blue-500/40'}`}>
                                {tabAtiva === 'trabalhos' ? '📜' : '📖'}
                            </div>
                            <div>
                                <h4 className="text-[12px] font-medium text-gray-200 group-hover:text-yellow-500/80 transition-colors tracking-tight">
                                    {item.titulo}
                                </h4>
                                <p className="text-[8px] text-gray-600 uppercase tracking-widest font-bold">Aprendiz</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-[8px] text-gray-600 uppercase tracking-[0.2em] font-bold opacity-50">Status</span>
                                <span className="text-[9px] text-red-500/50 font-bold uppercase tracking-tight">Pendente</span>
                            </div>
                            <button className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] font-bold uppercase tracking-[0.15em] rounded-md border border-white/10 transition-all text-gray-400 hover:text-white">
                                {isDiretoria ? 'Ver Inscritos' : 'Iniciar'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

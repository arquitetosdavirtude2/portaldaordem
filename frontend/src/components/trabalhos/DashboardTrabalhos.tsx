'use client';

import { useState, useEffect } from 'react';

interface DashboardTrabalhosProps {
    acesso: any;
}

export default function DashboardTrabalhos({ acesso }: DashboardTrabalhosProps) {
    const [tabAtiva, setTabAtivo] = useState<'trabalhos' | 'prelecoes'>('trabalhos');
    
    // Lista inicial sugerida baseada no áudio (será refinada com a lista oficial)
    const trabalhosAprendiz = [
        { id: 0, titulo: "Minha Iniciação", obrigatorio: true },
        { id: 1, titulo: "Dualidade do Grau", obrigatorio: true },
        { id: 2, titulo: "Avental Maçônico", obrigatorio: true },
        { id: 3, titulo: "Colunas", obrigatorio: true },
        { id: 4, titulo: "Luvas", obrigatorio: true },
        { id: 5, titulo: "Trabalho 6", obrigatorio: true },
        { id: 6, titulo: "Trabalho 7", obrigatorio: true },
        { id: 7, titulo: "Trabalho 8", obrigatorio: true },
        { id: 8, titulo: "Trabalho 9", obrigatorio: true },
        { id: 9, titulo: "Trabalho 10", obrigatorio: true },
        { id: 10, titulo: "Trabalho 11", obrigatorio: true },
        { id: 11, titulo: "Trabalho 12", obrigatorio: true },
        { id: 12, titulo: "Trabalho 13", obrigatorio: true },
    ];

    const prelecoesAprendiz = Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        titulo: `${i + 1}ª Sessão da 1ª Preleção`,
        obrigatorio: true
    }));

    const progressWorks = 0; // Temporário
    const totalWorks = trabalhosAprendiz.length;
    const progressPrelect = 0; // Temporário
    const totalPrelect = prelecoesAprendiz.length;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150">
            {/* Progression Bar Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/[0.03] border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Progresso de Trabalhos</h3>
                        <span className="text-sm font-medium text-yellow-500">{progressWorks} / {totalWorks}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-1000"
                            style={{ width: `${(progressWorks / totalWorks) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="bg-white/[0.03] border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Progresso de Preleções</h3>
                        <span className="text-sm font-medium text-blue-400">{progressPrelect} / {totalPrelect}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000"
                            style={{ width: `${(progressPrelect / totalPrelect) * 100}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex gap-1 p-1 bg-white/[0.02] border border-white/5 rounded-xl w-fit">
                <button
                    onClick={() => setTabAtivo('trabalhos')}
                    className={`px-8 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                        tabAtiva === 'trabalhos' 
                        ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' 
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                >
                    📜 Trabalhos
                </button>
                <button
                    onClick={() => setTabAtivo('prelecoes')}
                    className={`px-8 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                        tabAtiva === 'prelecoes' 
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                >
                    📖 Preleções
                </button>
            </div>

            {/* List Section */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 min-h-[400px]">
                <div className="grid grid-cols-1 gap-4">
                    {(tabAtiva === 'trabalhos' ? trabalhosAprendiz : prelecoesAprendiz).map((item) => (
                        <div 
                            key={item.id}
                            className="group flex flex-col md:flex-row justify-between items-center gap-4 p-4 bg-black/40 border border-white/5 rounded-xl hover:border-yellow-500/30 transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                                    tabAtiva === 'trabalhos' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-400'
                                }`}>
                                    {tabAtiva === 'trabalhos' ? '📜' : '📖'}
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-white group-hover:text-yellow-500 transition-colors">
                                        {item.titulo}
                                    </h4>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Grau de Aprendiz</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Status</span>
                                    <span className="text-[10px] text-red-500/70 font-medium uppercase tracking-tighter">Pendente</span>
                                </div>
                                <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[9px] font-bold uppercase tracking-widest rounded-lg border border-white/10 transition-all">
                                    Iniciar Estudo
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState, useRef, useEffect } from 'react';

interface DashboardTrabalhosProps {
    acesso: any;
    isDiretoria?: boolean;
}

export default function DashboardTrabalhos({ acesso, isDiretoria }: DashboardTrabalhosProps) {
    const [grauAtivo, setGrauAtivo] = useState<number>(1); // 1=Aprendiz, 2=Companheiro, 3=Mestre
    const [tabAtiva, setTabAtivo] = useState<'trabalhos' | 'prelecoes'>('trabalhos');
    const [itemEmEstudo, setItemEmEstudo] = useState<any>(null);
    const [videoConcluido, setVideoConcluido] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const lastTimeRef = useRef(0);

    // Initial suggested list (filtered by degree later)
    const todosTrabalhos = [
        { id: 0, titulo: "Minha Iniciação", status: "pendente", grau: 1, tipo: 'trabalho' },
        { id: 1, titulo: "Dualidade do Grau", status: "pendente", grau: 1, tipo: 'trabalho' },
        { id: 2, titulo: "Avental Maçônico", status: "pendente", grau: 1, tipo: 'trabalho' },
        { id: 3, titulo: "Colunas", status: "pendente", grau: 1, tipo: 'trabalho' },
        { id: 4, titulo: "Luvas", status: "pendente", grau: 1, tipo: 'trabalho' },
        { id: 5, titulo: "Trabalho 6", status: "pendente", grau: 1, tipo: 'trabalho' },
        // ... more for grau 2 and 3 would go here
    ];

    const todasPrelecoes = Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        titulo: `${i + 1}ª Sessão da 1ª Preleção`,
        status: "pendente",
        grau: 1,
        tipo: 'prelecao'
    }));

    const itensFiltrados = (tabAtiva === 'trabalhos' ? todosTrabalhos : todasPrelecoes)
        .filter(item => item.grau === grauAtivo);

    const progressWorks = 0;
    const totalWorks = todosTrabalhos.filter(t => t.grau === grauAtivo).length;
    
    // Video Progress Logic
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            if (video.currentTime > lastTimeRef.current + 2) {
                video.currentTime = lastTimeRef.current;
            } else {
                lastTimeRef.current = video.currentTime;
            }
        };

        const handleEnded = () => {
            setVideoConcluido(true);
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('ended', handleEnded);
        
        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('ended', handleEnded);
        };
    }, [itemEmEstudo]);

    const userGrau = 1; // Temporário, viria do acesso.status

    return (
        <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Degree Navigation (Top Level) */}
            <div className="flex gap-4 mb-6 border-b border-white/5 pb-4">
                {[
                    { id: 1, label: 'Aprendiz' },
                    { id: 2, label: 'Companheiro' },
                    { id: 3, label: 'Mestre' }
                ].map(g => (
                    <button
                        key={g.id}
                        onClick={() => setGrauAtivo(g.id)}
                        disabled={!isDiretoria && g.id > userGrau}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all border ${
                            grauAtivo === g.id 
                            ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' 
                            : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'
                        } disabled:opacity-20 disabled:cursor-not-allowed`}
                    >
                        {g.label}
                    </button>
                ))}
            </div>

            {/* Sub-Tabs (Works / Prelections) */}
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
            {!isDiretoria && grauAtivo === userGrau && (
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
                </div>
            )}

            {/* List Section */}
            {itensFiltrados.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                    {itensFiltrados.map((item) => (
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
                                <button 
                                    onClick={() => {
                                        setItemEmEstudo(item);
                                        setVideoConcluido(false);
                                        lastTimeRef.current = 0;
                                    }}
                                    className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] font-bold uppercase tracking-[0.15em] rounded-md border border-white/10 transition-all text-gray-400 hover:text-white"
                                >
                                    {isDiretoria ? 'Ver Inscritos' : 'Iniciar Estudo'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                    <span className="text-4xl mb-4 opacity-20">🗝️</span>
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Conteúdo não disponível para este grau</p>
                </div>
            )}

            {/* Study Modal Overlay */}
            {itemEmEstudo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setItemEmEstudo(null)}></div>
                    
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl relative z-10 flex flex-col">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div>
                                <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest block mb-1">Modo de Estudo • {itemEmEstudo.titulo}</span>
                                <h3 className="text-lg font-medium text-white uppercase tracking-tight">Vídeo Aula & Conteúdo</h3>
                            </div>
                            <button 
                                onClick={() => setItemEmEstudo(null)}
                                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-all"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Video Section */}
                            <div className="aspect-video bg-black rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative group">
                                <video 
                                    ref={videoRef}
                                    className="w-full h-full"
                                    controls
                                    controlsList="nodownload nofullscreen"
                                    src="/sample-video.mp4" // Placeholder
                                >
                                    Seu navegador não suporta vídeos.
                                </video>
                                {!videoConcluido && (
                                    <div className="absolute top-4 right-4 px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full backdrop-blur-md">
                                        <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-widest">Estudo em progresso - Não pule o vídeo</span>
                                    </div>
                                )}
                            </div>

                            {/* Quiz / Action Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Documentação de Apoio</h4>
                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between hover:bg-white/[0.05] transition-all cursor-pointer group">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">📄</span>
                                            <span className="text-[11px] font-medium text-gray-300 group-hover:text-white transition-colors">Resumo_Sessao.pdf</span>
                                        </div>
                                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Abrir</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Verificação de Conhecimento</h4>
                                    <div className={`p-6 rounded-2xl border transition-all ${
                                        videoConcluido 
                                        ? 'bg-emerald-500/5 border-emerald-500/20' 
                                        : 'bg-white/[0.01] border-white/5 opacity-50 grayscale'
                                    }`}>
                                        <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                                            {videoConcluido 
                                                ? 'Parabéns por completar o estudo! Responda ao quiz abaixo para liberar o envio do seu trabalho.'
                                                : 'Assista o vídeo até o final para liberar o questionário de verificação.'}
                                        </p>
                                        <button 
                                            disabled={!videoConcluido}
                                            className="w-full py-3 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-20 disabled:grayscale-0"
                                        >
                                            Iniciar Quiz
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

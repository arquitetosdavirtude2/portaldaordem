'use client';

import { useEffect, useRef, useState } from 'react';

interface JornadaItem {
    id: number;
    titulo: string;
    tipo: string;
    grau: number;
    ordem: number;
    descricao_jornada?: string;
    imagem_jornada_url?: string;
    progresso?: {
        status: 'pendente' | 'em_estudo' | 'concluido';
        data_conclusao?: string;
    };
}

interface ModalJornadaProps {
    itens: JornadaItem[];
    tipo: 'trabalho' | 'prelecao';
    onClose: () => void;
    onIniciarEstudo?: (item: JornadaItem) => void;
}

const GRAU_LABELS: Record<number, string> = { 1: 'Aprendiz', 2: 'Companheiro', 3: 'Mestre' };

const IMAGE_MAP: Record<string, string> = {
    'iniciação': '/initiation_light.png',
    'aprendiz': '/rough_stone.png',
    'companheiro': '/polished_stone.png',
    'mestre': '/masonic_temple.png'
};

export default function ModalJornada({ itens, tipo, onClose, onIniciarEstudo }: ModalJornadaProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [revealing, setRevealing] = useState<number | null>(null);

    if (!itens) return null;

    // Filtrar apenas itens do tipo correto e ordenar (Case-insensitive)
    const jornada = [...itens]
        .filter(i => i.tipo?.toLowerCase().includes(tipo?.toLowerCase().replace('s', ''))) // Suporta 'trabalho' e 'trabalhos'
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    const concluidos = jornada.filter(j => j.progresso?.status === 'concluido').length;
    const total = jornada.length;
    const progressoGlobal = total > 0 ? (concluidos / total) * 100 : 0;

    const getSymbolImage = (item: JornadaItem, isConcluido?: boolean) => {
        const title = item.titulo.toLowerCase();
        if (title.includes('iniciação')) return isConcluido ? IMAGE_MAP['iniciação'] : '/initiation_dark.png';
        if (item.grau === 1) return IMAGE_MAP['aprendiz'];
        if (item.grau === 2) return IMAGE_MAP['companheiro'];
        return IMAGE_MAP['mestre'];
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-700">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={onClose}></div>
            
            {/* Modal Container */}
            <div className="bg-[#020205] border border-white/10 rounded-[2.5rem] w-full max-w-7xl h-full max-h-[92vh] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,0.9)] relative z-10 flex flex-col">
                
                {/* === Nebula Background Layer === */}
                <div className="absolute inset-0 opacity-70 pointer-events-none overflow-hidden">
                    <img 
                        src="/nebula_bg.png" 
                        alt="Nebula" 
                        className="w-full h-full object-cover scale-105 animate-slow-glow brightness-110 contrast-110"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                </div>

                {/* === HEADER === */}
                <div className="p-8 pb-4 border-b border-white/5 flex justify-between items-center relative z-20">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-light text-white uppercase tracking-[-0.05em] mb-1 flex items-center gap-3">
                            <span className="text-yellow-500/50">✨</span> Minha Jornada Maçônica
                        </h2>
                        <div className="flex items-center gap-4">
                            <div className="w-64 h-0.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-200 transition-all duration-1000 shadow-[0_0_10px_rgba(234,179,8,0.5)]" style={{ width: `${progressoGlobal}%` }} />
                            </div>
                            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-[0.3em]">{concluidos} / {total} Conhecimentos Revelados</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-all cursor-pointer group">
                        <span className="group-hover:rotate-90 transition-transform duration-300">✕</span>
                    </button>
                </div>

                {/* === SKILL TREE CONTENT === */}
                <div 
                    ref={containerRef}
                    className="flex-1 overflow-y-auto p-12 md:p-24 relative z-10 scrollbar-hide"
                >
                    {jornada.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                            <div className="w-32 h-32 rounded-full border border-yellow-500/10 flex items-center justify-center p-6 opacity-20 animate-slow-glow">
                                <img src="/logo-gomb.png" alt="Lodge Logo" className="w-full h-full object-contain grayscale invert" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-light text-gray-400 uppercase tracking-widest">O Firmamento está Vazio</h3>
                                <p className="text-[10px] text-gray-600 uppercase tracking-widest">Aguarde a diretoria traçar o seu caminho nas estrelas.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-40 relative">
                            {jornada.map((item, idx) => {
                                const isConcluido = item.progresso?.status === 'concluido';
                                const isBloqueado = idx > 0 && jornada[idx - 1].progresso?.status !== 'concluido' && !isConcluido;
                                const isAtual = !isConcluido && !isBloqueado;
                                const imgUrl = getSymbolImage(item, isConcluido);
                                const isLeft = idx % 2 === 0;

                                return (
                                    <div 
                                        key={item.id}
                                        className={`flex items-center w-full ${isLeft ? 'justify-start' : 'justify-end'} relative group`}
                                    >
                                        {/* Connector Line to next node */}
                                        {idx < jornada.length - 1 && (
                                            <div 
                                                className={`absolute top-[60%] w-[50%] h-[1px] bg-gradient-to-r from-yellow-500/20 to-transparent z-0
                                                    ${isLeft ? 'left-[20%] rotate-[25deg]' : 'right-[20%] rotate-[-25deg]'}`}
                                            />
                                        )}

                                        <div className={`flex items-center gap-12 max-w-3xl ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                                            
                                            {/* === NODE (STAR / SYMBOL) === */}
                                            <div className="relative group">
                                                {/* Aura effects */}
                                                <div className={`absolute -inset-10 rounded-full blur-3xl transition-all duration-1000 ${
                                                    isConcluido ? 'bg-yellow-500/10' : isAtual ? 'bg-blue-500/5 animate-slow-glow' : 'bg-transparent'
                                                }`} />
                                                
                                                {/* Organic Node Image */}
                                                <div className={`relative z-10 w-72 h-72 md:w-80 md:h-80 transition-all duration-1000 ${
                                                    isBloqueado ? 'grayscale brightness-[0.2] scale-90' 
                                                    : isConcluido ? 'drop-shadow-[0_0_40px_rgba(234,179,8,0.2)] scale-100' 
                                                    : 'drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] scale-95'
                                                }`}>
                                                    <div className="w-full h-full relative" style={{
                                                        maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
                                                        WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)'
                                                    }}>
                                                        <img 
                                                            src={imgUrl} 
                                                            alt={item.titulo} 
                                                            className={`w-full h-full object-contain transition-all duration-1000 ${
                                                                isBloqueado ? 'blur-sm' : 'blur-0'
                                                            }`}
                                                        />
                                                        
                                                        {/* Lock Overlay */}
                                                        {isBloqueado && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                                <span className="text-2xl opacity-20">🔒</span>
                                                            </div>
                                                        )}

                                                        {/* Reveal Animation Overlay */}
                                                        {revealing === item.id && (
                                                            <div className="absolute inset-0 bg-white animate-reveal-flash z-50" />
                                                        )}
                                                    </div>

                                                    {/* Status Pulse for Current */}
                                                    {isAtual && (
                                                        <div className="absolute inset-10 rounded-full border border-blue-400/20 animate-ping opacity-30" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* === INFO SIDE === */}
                                            <div className={`space-y-3 w-80 md:w-96 ${isLeft ? 'text-left' : 'text-right'}`}>
                                                <div className="space-y-1">
                                                    <span className={`text-[8px] font-bold uppercase tracking-[0.4em] ${isConcluido ? 'text-yellow-500' : 'text-gray-500'}`}>
                                                        {GRAU_LABELS[item.grau]} • Nível {idx + 1}
                                                    </span>
                                                    <h3 className={`text-2xl md:text-3xl font-light uppercase tracking-tighter leading-tight transition-all duration-700 ${
                                                        isBloqueado ? 'text-gray-800' : 'text-white'
                                                    }`}>
                                                        {isBloqueado ? 'Oculto por Névoa' : item.titulo}
                                                    </h3>
                                                </div>

                                                {!isBloqueado && (
                                                    <div className={`space-y-4 animate-in fade-in duration-1000 ${isLeft ? 'slide-in-from-left-4' : 'slide-in-from-right-4'}`}>
                                                        <p className="text-gray-400 text-[11px] leading-relaxed font-light line-clamp-3 group-hover:line-clamp-none transition-all">
                                                            {item.descricao_jornada || 'A sabedoria aguarda o buscador sincero para ser revelada.'}
                                                        </p>
                                                        
                                                        {isConcluido && (
                                                            <div className={`flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest text-emerald-500/70 ${isLeft ? '' : 'justify-end'}`}>
                                                                <span className="w-4 h-4 rounded-full border border-emerald-500/20 flex items-center justify-center text-[8px]">✓</span>
                                                                Revelado em {item.progresso?.data_conclusao ? new Date(item.progresso.data_conclusao).toLocaleDateString() : '---'}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* End spacing */}
                    <div className="h-40" />
                </div>
            </div>

            <style>{`
                @keyframes reveal-flash {
                    0% { opacity: 0; }
                    20% { opacity: 1; }
                    100% { opacity: 0; }
                }
                .animate-reveal-flash {
                    animation: reveal-flash 1.5s ease-out forwards;
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                
                @keyframes slow-glow {
                    0%, 100% { opacity: 0.3; transform: scale(1.05); }
                    50% { opacity: 0.5; transform: scale(1.08); }
                }
                .animate-slow-glow {
                    animation: slow-glow 15s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}

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

    if (!itens) return null;

    // Filtrar apenas itens do tipo correto e ordenar (Case-insensitive)
    const jornada = [...itens]
        .filter(i => i.tipo?.toLowerCase().includes(tipo?.toLowerCase().replace('s', ''))) // Suporta 'trabalho' e 'trabalhos'
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    const concluidos = jornada.filter(j => j.progresso?.status === 'concluido').length;
    const total = jornada.length;
    const progressoGlobal = total > 0 ? (concluidos / total) * 100 : 0;

    const getSymbolImage = (item: JornadaItem) => {
        const title = item.titulo.toLowerCase();
        if (title.includes('iniciação')) return IMAGE_MAP['iniciação'];
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
                        <h2 className="text-3xl font-light text-white uppercase tracking-[-0.05em] mb-1 flex items-center gap-4">
                            <img src="/logo-gomb.png" alt="GOMB" className="w-10 h-10 object-contain opacity-80 brightness-200" />
                            Minha Jornada Maçônica
                        </h2>
                        <div className="flex items-center gap-4">
                            <div className="w-64 h-0.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-200 transition-all duration-1000 shadow-[0_0_10px_rgba(234,179,8,0.5)]" style={{ width: `${progressoGlobal}%` }} />
                            </div>
                            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-[0.3em]">{concluidos} / {total} Graus de Luz</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-all cursor-pointer group">
                        <span className="group-hover:rotate-90 transition-transform duration-300">✕</span>
                    </button>
                </div>

                {/* === STAR MAP CONTENT === */}
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
                        <div className="flex flex-col gap-56 relative">
                            {jornada.map((item, idx) => {
                                const isConcluido = item.progresso?.status === 'concluido';
                                const isBloqueado = idx > 0 && jornada[idx - 1].progresso?.status !== 'concluido' && !isConcluido;
                                const isAtual = !isConcluido && !isBloqueado;
                                const imgUrl = getSymbolImage(item);
                                const isLeft = idx % 2 === 0;

                                return (
                                    <div 
                                        key={item.id}
                                        className={`flex items-center w-full ${isLeft ? 'justify-start' : 'justify-end'} relative group`}
                                    >
                                        {/* Organic Connection Line */}
                                        {idx < jornada.length - 1 && (
                                            <div 
                                                className={`absolute top-[80%] w-[60%] h-[2px] blur-[1px] bg-gradient-to-r from-yellow-500/10 via-white/5 to-transparent z-0
                                                    ${isLeft ? 'left-[15%] rotate-[15deg]' : 'right-[15%] rotate-[-15deg]'}`}
                                            />
                                        )}

                                        <div className={`flex items-center gap-16 max-w-4xl ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                                            
                                            {/* === COSMIC NODE (NO CIRCLES) === */}
                                            <div className="relative">
                                                {/* Ethereal Glow */}
                                                <div className={`absolute -inset-20 rounded-full blur-[100px] transition-all duration-[2s] ${
                                                    isConcluido ? 'bg-yellow-500/15' : isAtual ? 'bg-blue-500/10 animate-slow-glow' : 'bg-transparent'
                                                }`} />
                                                
                                                {/* Organic Shaped Image */}
                                                <div className={`relative z-10 w-72 h-56 md:w-96 md:h-72 transition-all duration-[1.5s] ease-out overflow-visible
                                                    ${isBloqueado || !isConcluido ? 'grayscale brightness-[0.05] opacity-30 scale-95' : 'grayscale-0 brightness-100 opacity-90 scale-100'}
                                                `}>
                                                    {/* Masked Image (Organic Shape) */}
                                                    <div 
                                                        className="w-full h-full relative"
                                                        style={{
                                                            maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
                                                            WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)'
                                                        }}
                                                    >
                                                        <img 
                                                            src={imgUrl} 
                                                            alt={item.titulo} 
                                                            className="w-full h-full object-contain filter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                                                        />
                                                    </div>

                                                    {/* Floating Stars around the node */}
                                                    <div className="absolute -top-4 -right-4 w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]" />
                                                    <div className="absolute -bottom-8 -left-4 w-1 h-1 bg-yellow-500/50 rounded-full animate-ping shadow-[0_0_10px_yellow]" />
                                                </div>
                                            </div>

                                            {/* === DISSEMINATED INFO SIDE === */}
                                            <div className={`space-y-6 w-96 md:w-[28rem] ${isLeft ? 'text-left' : 'text-right'}`}>
                                                <div className="space-y-2">
                                                    <div className={`flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.5em] ${isConcluido ? 'text-yellow-500/60' : 'text-gray-600'} ${isLeft ? '' : 'flex-row-reverse'}`}>
                                                        <span>{GRAU_LABELS[item.grau]}</span>
                                                        <span className="w-8 h-[1px] bg-white/10" />
                                                        <span>Estágio {idx + 1}</span>
                                                    </div>
                                                    <h3 className={`text-3xl md:text-5xl font-light uppercase tracking-[-0.08em] leading-none transition-all duration-1000 ${
                                                        isBloqueado || !isConcluido ? 'text-gray-900' : 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                                                    }`}>
                                                        {item.titulo}
                                                    </h3>
                                                </div>

                                                <div className="space-y-6">
                                                    <div className={`h-[1px] w-32 bg-gradient-to-r from-yellow-500/20 to-transparent ${isLeft ? '' : 'ml-auto rotate-180'}`} />
                                                    <p className={`text-gray-400 text-xs md:text-sm leading-relaxed font-light italic tracking-wide transition-all duration-1000 ${isBloqueado || !isConcluido ? 'opacity-20' : 'opacity-100'}`}>
                                                        "{item.descricao_jornada || 'O caminho se revela àqueles que buscam a luz com persistência e silêncio.'}"
                                                    </p>
                                                    
                                                    {isConcluido && (
                                                        <div className={`flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest text-emerald-500/50 ${isLeft ? '' : 'justify-end'}`}>
                                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                            Conhecimento Consolidado
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* End spacing */}
                    <div className="h-64" />
                </div>
            </div>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                
                @keyframes slow-glow {
                    0%, 100% { opacity: 0.3; transform: scale(1); filter: blur(80px); }
                    50% { opacity: 0.6; transform: scale(1.1); filter: blur(100px); }
                }
                .animate-slow-glow {
                    animation: slow-glow 20s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}

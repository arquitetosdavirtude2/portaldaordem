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
        quiz_score?: number;
    };
}

interface ModalJornadaProps {
    itens: JornadaItem[];
    tipo: 'trabalho' | 'prelecao';
    onClose: () => void;
    onIniciarEstudo?: (item: JornadaItem) => void;
}

const GRAU_LABELS: Record<number, string> = { 1: 'Aprendiz', 2: 'Companheiro', 3: 'Mestre' };

// Emojis/símbolos maçônicos por grau e ordem
const MASONIC_SYMBOLS = [
    '⚒️', '🪨', '📐', '🏛️', '🕯️', '⚖️', '📜', '🗝️', '☀️', '⭐', '🌙', '🔺', '🧭', '⚔️', '👁️'
];

export default function ModalJornada({ itens, tipo, onClose, onIniciarEstudo }: ModalJornadaProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeIdx, setActiveIdx] = useState<number | null>(null);
    const [revealing, setRevealing] = useState<number | null>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Filtrar apenas itens do tipo correto e ordenar
    const jornada = [...itens]
        .filter(i => i.tipo === tipo)
        .sort((a, b) => a.ordem - b.ordem);

    const concluidos = jornada.filter(j => j.progresso?.status === 'concluido').length;
    const total = jornada.length;
    const progressoGlobal = total > 0 ? (concluidos / total) * 100 : 0;

    // Achar o primeiro pendente para focar
    useEffect(() => {
        const primeiroPendente = jornada.findIndex(j => j.progresso?.status !== 'concluido');
        if (primeiroPendente !== -1) {
            setActiveIdx(primeiroPendente);
        } else if (jornada.length > 0) {
            setActiveIdx(jornada.length - 1);
        }
    }, [jornada.length]);

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-500">
            <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={onClose}></div>
            
            <div className="bg-[#050505] border border-white/10 rounded-[3rem] w-full max-w-6xl h-full max-h-[90vh] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] relative z-10 flex flex-col">
                
                {/* === HEADER === */}
                <div className="p-10 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-black via-white/[0.02] to-black">
                    <div>
                        <h2 className="text-3xl font-serif text-white uppercase tracking-tighter mb-2">Jornada de Conhecimento</h2>
                        <div className="flex items-center gap-4">
                            <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500 transition-all duration-1000" style={{ width: `${progressoGlobal}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{concluidos} de {total} Etapas Concluídas</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-all cursor-pointer">✕</button>
                </div>

                {/* === CONTENT (Timeline Scroll) === */}
                <div 
                    ref={containerRef}
                    className="flex-1 overflow-y-auto p-12 md:p-20 space-y-24 scrollbar-hide"
                >
                    {jornada.map((item, idx) => {
                        const isConcluido = item.progresso?.status === 'concluido';
                        const isBloqueado = idx > 0 && jornada[idx - 1].progresso?.status !== 'concluido' && !isConcluido;
                        const isAtual = !isConcluido && !isBloqueado;
                        const symbol = MASONIC_SYMBOLS[idx % MASONIC_SYMBOLS.length];

                        return (
                            <div 
                                key={item.id}
                                ref={el => { itemRefs.current[idx] = el; }}
                                className={`relative flex flex-col items-center transition-all duration-1000 ${
                                    isBloqueado ? 'grayscale opacity-30 scale-95' : 'opacity-100'
                                }`}
                            >
                                {/* Vertical Connector Line */}
                                {idx < jornada.length - 1 && (
                                    <div className="absolute top-32 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-white/10 via-white/5 to-transparent" />
                                )}

                                <div className="flex flex-col md:flex-row items-center gap-12 w-full max-w-4xl">
                                    
                                    {/* === SYMBOL SIDE === */}
                                    <div className="w-52 h-52 flex-shrink-0 relative">
                                        {/* Outer glow rings */}
                                        {isAtual && (
                                            <>
                                                <div className="absolute inset-0 rounded-full border border-yellow-500/20 animate-ping opacity-20" />
                                                <div className="absolute -inset-4 rounded-full border border-yellow-500/10 animate-pulse" />
                                            </>
                                        )}

                                        {/* Main Circle */}
                                        <div className={`w-full h-full rounded-full border-2 flex items-center justify-center relative z-10 overflow-hidden transition-all duration-700 ${
                                            isConcluido ? 'border-yellow-500 bg-yellow-500/5' 
                                            : isAtual ? 'border-amber-400/50 bg-amber-400/5' 
                                            : 'border-white/5 bg-white/2'
                                        }`}>
                                            
                                            {/* PENDENTE STATE */}
                                            {!isConcluido && (
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className={`text-6xl ${isBloqueado ? 'opacity-20' : 'opacity-60'}`}>
                                                        {isBloqueado ? '🔒' : symbol}
                                                    </span>
                                                    <button 
                                                        onClick={() => onIniciarEstudo?.(item)}
                                                        className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-1.5 bg-yellow-500 text-black text-[9px] font-bold uppercase tracking-widest rounded-full hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/30"
                                                    >
                                                        Iniciar Estudo
                                                    </button>
                                                </div>
                                            )}

                                            {/* CONCLUÍDO STATE */}
                                            {isConcluido && (
                                                <div className="w-52 h-52 relative flex items-center justify-center">
                                                    <div className="absolute inset-0 rounded-full bg-gradient-radial from-yellow-600/10 to-transparent" />
                                                    
                                                    <div
                                                        className="text-[90px] leading-none"
                                                        style={{
                                                            filter: 'sepia(0.4) drop-shadow(0 0 12px rgba(202,162,48,0.4)) brightness(0.9)',
                                                        }}
                                                    >
                                                        {item.imagem_jornada_url ? (
                                                            <img 
                                                                src={item.imagem_jornada_url}
                                                                className="w-36 h-36 object-contain opacity-80"
                                                                alt=""
                                                            />
                                                        ) : symbol}
                                                    </div>

                                                    {/* Checkmark badge */}
                                                    <div className="absolute -bottom-2 -right-2 w-9 h-9 bg-yellow-500 border-2 border-[#0a0a0a] rounded-full flex items-center justify-center shadow-xl">
                                                        <span className="text-xs text-black font-bold">✓</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* === TEXT SIDE === */}
                                    <div className={`flex-1 ${isBloqueado ? 'opacity-40' : ''} transition-opacity duration-500`}>
                                        {/* Step number */}
                                        <p className={`text-[9px] font-bold uppercase tracking-[0.3em] mb-2 ${
                                            isConcluido ? 'text-yellow-500/70' : isAtual ? 'text-amber-400' : 'text-gray-700'
                                        }`}>
                                            {GRAU_LABELS[item.grau]} · Etapa {idx + 1}
                                        </p>

                                        {/* Title */}
                                        <h3 className={`text-xl font-serif mb-3 leading-tight ${
                                            isConcluido ? 'text-white/80' 
                                            : isAtual ? 'text-white' 
                                            : 'text-gray-600'
                                        }`}>
                                            {isBloqueado ? '████████████' : item.titulo}
                                        </h3>

                                        {/* Description */}
                                        {item.descricao_jornada && (
                                            <div className={`text-sm leading-relaxed ${
                                                isBloqueado ? 'blur-sm select-none' 
                                                : isConcluido ? 'text-gray-400' 
                                                : 'text-gray-300'
                                            }`}>
                                                {isBloqueado
                                                    ? 'Este conhecimento ainda não foi revelado a você. Complete as etapas anteriores para desbloquear.'
                                                    : item.descricao_jornada
                                                }
                                            </div>
                                        )}

                                        {/* Status pill */}
                                        <div className="mt-4 flex items-center gap-3">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                                                isConcluido
                                                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                                                : isAtual
                                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                                                : 'bg-white/5 border-white/5 text-gray-700'
                                            }`}>
                                                {isConcluido ? '✓ Concluído' : isAtual ? '◆ Objetivo Atual' : '○ Bloqueado'}
                                            </span>

                                            {isConcluido && item.progresso?.data_conclusao && (
                                                <span className="text-[9px] text-gray-600">
                                                    {new Date(item.progresso.data_conclusao).toLocaleDateString('pt-BR')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* End marker */}
                    {jornada.length > 0 && (
                        <div className="flex flex-col items-center pt-4 pb-8">
                            <div className="w-px h-12 bg-gradient-to-b from-white/5 to-transparent" />
                            <div className="w-16 h-16 rounded-full border border-yellow-500/20 bg-yellow-500/5 flex items-center justify-center">
                                <span className="text-2xl opacity-40">⭐</span>
                            </div>
                            <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold mt-4">
                                {concluidos === total ? 'Jornada Completa' : 'A jornada continua...'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .bg-gradient-radial {
                    background-image: radial-gradient(var(--tw-gradient-stops));
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .transition-all.duration-2000 { transition-duration: 2000ms; }
            `}</style>
        </div>
    );
}

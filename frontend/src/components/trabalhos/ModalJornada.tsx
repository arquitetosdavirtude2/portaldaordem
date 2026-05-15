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
    'iniciação': '/initiation.png',
    'aprendiz': '/apprentice.png',
    'companheiro': '/fellowcraft.png',
    'mestre': '/master.png'
};

export default function ModalJornada({ itens, tipo, onClose, onIniciarEstudo }: ModalJornadaProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [revealing, setRevealing] = useState<number | null>(null);

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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-500">
            <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={onClose}></div>
            
            <div className="bg-[#050505] border border-white/10 rounded-[3rem] w-full max-w-6xl h-full max-h-[90vh] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] relative z-10 flex flex-col">
                
                {/* === HEADER === */}
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-black via-white/[0.02] to-black">
                    <div>
                        <h2 className="text-2xl font-light text-white uppercase tracking-tighter mb-2">Jornada de Conhecimento</h2>
                        <div className="flex items-center gap-4">
                            <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500 transition-all duration-1000" style={{ width: `${progressoGlobal}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{concluidos} de {total} Etapas Descobertas</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-all cursor-pointer">✕</button>
                </div>

                {/* === CONTENT (Timeline Scroll) === */}
                <div 
                    ref={containerRef}
                    className="flex-1 overflow-y-auto p-12 md:p-20 space-y-32 scrollbar-hide bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.03)_0%,transparent_70%)]"
                >
                    {jornada.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-20 h-20 rounded-full border border-white/5 flex items-center justify-center text-4xl opacity-20">📜</div>
                            <h3 className="text-xl font-light text-gray-500 uppercase tracking-widest">Nenhuma etapa cadastrada</h3>
                            <p className="text-[10px] text-gray-700 uppercase tracking-widest">Aguarde a diretoria definir o caminho da sua jornada.</p>
                        </div>
                    ) : (
                        jornada.map((item, idx) => {
                            const isConcluido = item.progresso?.status === 'concluido';
                            const isBloqueado = idx > 0 && jornada[idx - 1].progresso?.status !== 'concluido' && !isConcluido;
                            const isAtual = !isConcluido && !isBloqueado;
                            const imgUrl = getSymbolImage(item);

                            return (
                                <div 
                                    key={item.id}
                                    className={`relative flex flex-col items-center transition-all duration-1000 ${
                                        isBloqueado ? 'opacity-30' : 'opacity-100'
                                    }`}
                                >
                                    {/* Vertical Connector */}
                                    {idx < jornada.length - 1 && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-[1px] h-32 bg-gradient-to-b from-white/10 to-transparent" />
                                    )}

                                    <div className="flex flex-col md:flex-row items-center gap-16 w-full max-w-5xl">
                                        
                                        {/* === SYMBOL SIDE === */}
                                        <div className="w-[400px] h-[400px] flex-shrink-0 relative group">
                                            {/* Outer glow rings */}
                                            {isAtual && (
                                                <>
                                                    <div className="absolute inset-0 rounded-full border border-yellow-500/10 animate-ping opacity-20" />
                                                    <div className="absolute -inset-8 rounded-full border border-yellow-500/5 animate-pulse" />
                                                </>
                                            )}

                                            {/* Main Image Container */}
                                            <div className={`w-full h-full relative z-10 overflow-hidden rounded-3xl border border-white/5 transition-all duration-1000 ${
                                                isBloqueado ? 'grayscale brightness-[0.2] blur-[2px]' 
                                                : isConcluido ? 'grayscale-0 brightness-100 shadow-[0_0_50px_rgba(234,179,8,0.2)]' 
                                                : 'grayscale brightness-50'
                                            }`}>
                                                <img 
                                                    src={imgUrl} 
                                                    alt={item.titulo} 
                                                    className={`w-full h-full object-cover transition-all duration-1000 ${
                                                        isBloqueado ? 'opacity-50' : 'opacity-100'
                                                    }`}
                                                />
                                                
                                                {/* Silhouette Glow Effect (CSS Overlay) */}
                                                {isBloqueado && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                        <div className="w-64 h-64 border-2 border-yellow-500/20 rounded-full animate-pulse shadow-[0_0_100px_rgba(234,179,8,0.1)]" />
                                                    </div>
                                                )}

                                                {/* Reveal Overlay Animation */}
                                                {revealing === item.id && (
                                                    <div className="absolute inset-0 bg-white animate-reveal-flash z-50" />
                                                )}
                                            </div>

                                            {/* Action Button for Current */}
                                            {isAtual && (
                                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-20">
                                                    <button 
                                                        onClick={() => onIniciarEstudo?.(item)}
                                                        className="px-8 py-3 bg-yellow-500 text-black text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-yellow-400 transition-all shadow-[0_0_30px_rgba(234,179,8,0.5)] cursor-pointer"
                                                    >
                                                        Iniciar Trabalho
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* === TEXT SIDE === */}
                                        <div className={`flex-1 transition-all duration-1000 ${isBloqueado ? 'opacity-20 translate-x-10' : 'opacity-100 translate-x-0'}`}>
                                            <div className="space-y-6">
                                                <div className="space-y-1">
                                                    <span className={`text-[9px] font-bold uppercase tracking-[0.4em] ${isConcluido ? 'text-yellow-500' : 'text-gray-500'}`}>
                                                        {GRAU_LABELS[item.grau]} • Etapa {idx + 1}
                                                    </span>
                                                    <h3 className="text-4xl font-light text-white uppercase tracking-tighter leading-none">
                                                        {isBloqueado ? 'Conhecimento Oculto' : item.titulo}
                                                    </h3>
                                                </div>

                                                {!isBloqueado && (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-1000">
                                                        <div className="w-12 h-[1px] bg-yellow-500/50" />
                                                        <p className="text-gray-400 text-sm leading-relaxed font-light max-w-lg">
                                                            {item.descricao_jornada || 'Nenhuma descrição detalhada disponível para esta etapa da jornada.'}
                                                        </p>
                                                        
                                                        {isConcluido && (
                                                            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-emerald-500">
                                                                <span className="w-5 h-5 rounded-full border border-emerald-500/30 flex items-center justify-center text-[10px]">✓</span>
                                                                Conhecimento Revelado em {item.progresso?.data_conclusao ? new Date(item.progresso.data_conclusao).toLocaleDateString() : '---'}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {isBloqueado && (
                                                    <p className="text-[10px] text-gray-700 uppercase tracking-widest italic">
                                                        A luz ainda não tocou este caminho...
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* End spacing */}
                    <div className="h-20" />
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
            `}</style>
        </div>
    );
}

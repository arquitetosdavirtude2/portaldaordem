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
    'iniciação': 'https://www.portaldaordem.com.br/initiation_light.png',
    'aprendiz': 'https://www.portaldaordem.com.br/rough_stone.png',
    'companheiro': 'https://www.portaldaordem.com.br/polished_stone.png',
    'mestre': 'https://www.portaldaordem.com.br/masonic_temple.png'
};

export default function ModalJornada({ itens, tipo, onClose, onIniciarEstudo }: ModalJornadaProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [revealing, setRevealing] = useState<number | null>(null);
    const [activeNodeIndex, setActiveNodeIndex] = useState<number>(0);
    const [nodePositions, setNodePositions] = useState<Array<{ x: number; y: number }>>([]);

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
        if (title.includes('iniciação')) return isConcluido ? IMAGE_MAP['iniciação'] : 'https://www.portaldaordem.com.br/initiation_dark.png';
        if (title.includes('dualidade') || title.includes('mosaico') || title.includes('piso')) {
            return isConcluido ? 'https://www.portaldaordem.com.br/fellowcraft_light.png' : 'https://www.portaldaordem.com.br/fellowcraft_dark.png';
        }
        if (item.grau === 1) return IMAGE_MAP['aprendiz'];
        if (item.grau === 2) return IMAGE_MAP['companheiro'];
        return IMAGE_MAP['mestre'];
    };

    // Recalculate physical positions of the nodes relative to the scrollable container
    const updatePositions = () => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        
        const nodes = container.querySelectorAll('[data-jornada-node]');
        const positions = Array.from(nodes).map(node => {
            const nodeRect = node.getBoundingClientRect();
            // Calculate relative coordinates inside scrollable pane
            return {
                x: nodeRect.left - rect.left + nodeRect.width / 2 + container.scrollLeft,
                y: nodeRect.top - rect.top + nodeRect.height / 2 + container.scrollTop
            };
        });
        setNodePositions(positions);
    };

    // Calculate node coordinates on render and on viewport dimensions changes
    useEffect(() => {
        updatePositions();
        window.addEventListener('resize', updatePositions);
        
        // Setup observer to detect which node is currently centered in viewport
        const container = containerRef.current;
        if (!container) return;

        const observerOptions = {
            root: container,
            rootMargin: '-35% 0px -35% 0px',
            threshold: 0.2
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const idxStr = entry.target.getAttribute('data-idx');
                    if (idxStr !== null) {
                        setActiveNodeIndex(parseInt(idxStr, 10));
                    }
                }
            });
        }, observerOptions);

        const rows = container.querySelectorAll('[data-jornada-row]');
        rows.forEach(row => observer.observe(row));

        return () => {
            window.removeEventListener('resize', updatePositions);
            observer.disconnect();
        };
    }, [jornada.length]);

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-700">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={onClose}></div>

            {/* Modal Container */}
            <div className="bg-[#020205] border border-white/10 rounded-[2.5rem] w-full max-w-7xl h-full max-h-[92vh] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,0.9)] relative z-10 flex flex-col">

                {/* === Nebula Background Layer === */}
                <div className="absolute inset-0 opacity-50 pointer-events-none overflow-hidden">
                    <img 
                        src="https://www.portaldaordem.com.br/nebula_bg.png" 
                        alt="Nebula" 
                        className="w-full h-full object-cover scale-110 animate-galaxy-expand brightness-110"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                </div>

                {/* === HEADER === */}
                <div className="p-8 pb-4 border-b border-white/5 flex justify-between items-center relative z-20">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-light text-white uppercase tracking-[-0.05em] mb-1 flex items-center gap-3">
                            <img src="/logo-gomb.png" alt="GOMB" className="journey-header-logo" /> Minha Jornada Maçônica
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
                    onScroll={updatePositions}
                    className="flex-1 overflow-y-auto p-12 md:p-24 relative z-10 scrollbar-hide"
                >
                    {jornada.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                            <div className="w-32 h-32 rounded-full border border-yellow-500/10 flex items-center justify-center p-6 opacity-20 animate-slow-glow">
                                <img src="https://www.portaldaordem.com.br/logo-gomb.png" alt="Lodge Logo" className="w-full h-full object-contain grayscale invert" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-light text-gray-400 uppercase tracking-widest">O Firmamento está Vazio</h3>
                                <p className="text-[10px] text-gray-600 uppercase tracking-widest">Aguarde a diretoria traçar o seu caminho nas estrelas.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="relative min-h-[500px]">
                            
                            {/* === CELESTIAL CONSTELLATION SVG LAYER === */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                                {nodePositions.map((pos, idx) => {
                                    if (idx >= nodePositions.length - 1) return null;
                                    const nextPos = nodePositions[idx + 1];
                                    const item = jornada[idx];
                                    const nextItem = jornada[idx + 1];
                                    
                                    const isCurrentConcluido = item.progresso?.status === 'concluido';
                                    const isNextConcluido = nextItem.progresso?.status === 'concluido';
                                    const isFocused = activeNodeIndex === idx || activeNodeIndex === idx + 1;
                                    
                                    // Celestial line theme styling based on progress
                                    let strokeColor = 'rgba(180, 200, 255, 0.08)'; // Bloqueada/Inativa
                                    let strokeWidth = 1.0;
                                    let filter = 'none';

                                    if (isCurrentConcluido) {
                                        if (isNextConcluido) {
                                            // Concluída (Golden glow style)
                                            strokeColor = 'rgba(255, 230, 170, 0.55)';
                                            strokeWidth = 1.3;
                                            filter = 'drop-shadow(0 0 8px rgba(255, 220, 160, 0.45))';
                                        } else {
                                            // Revelada/Ativa
                                            strokeColor = 'rgba(255, 255, 230, 0.35)';
                                            strokeWidth = 1.1;
                                            filter = 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.2))';
                                        }
                                    }

                                    // Spline control points for an organic celestial constellation route
                                    const midX = (pos.x + nextPos.x) / 2;
                                    const midY = (pos.y + nextPos.y) / 2;
                                    
                                    const q1X = (pos.x + midX) / 2 + (idx % 2 === 0 ? 30 : -30);
                                    const q1Y = (pos.y + midY) / 2 - 15;
                                    
                                    const q2X = (midX + nextPos.x) / 2 + (idx % 2 === 0 ? -30 : 30);
                                    const q2Y = (midY + nextPos.y) / 2 + 15;

                                    return (
                                        <g key={`path-${idx}`}>
                                            {/* Main Constellation Line */}
                                            <path
                                                d={`M ${pos.x} ${pos.y} Q ${q1X} ${q1Y}, ${midX} ${midY} T ${nextPos.x} ${nextPos.y}`}
                                                fill="none"
                                                stroke={strokeColor}
                                                strokeWidth={strokeWidth}
                                                style={{
                                                    filter,
                                                    transition: 'all 0.8s ease'
                                                }}
                                            />
                                            
                                            {/* Intermediate small stars mapping natural patterns */}
                                            <circle
                                                cx={q1X}
                                                cy={q1Y}
                                                r={1.2}
                                                fill={isCurrentConcluido ? 'rgba(255, 236, 190, 0.8)' : 'rgba(180, 200, 255, 0.2)'}
                                                style={{ transition: 'all 0.8s ease' }}
                                            />
                                            <circle
                                                cx={midX}
                                                cy={midY}
                                                r={1.8}
                                                fill={isCurrentConcluido ? 'rgba(255, 230, 170, 0.9)' : 'rgba(180, 200, 255, 0.3)'}
                                                style={{ transition: 'all 0.8s ease' }}
                                            />
                                            <circle
                                                cx={q2X}
                                                cy={q2Y}
                                                r={1.2}
                                                fill={isCurrentConcluido ? 'rgba(255, 236, 190, 0.8)' : 'rgba(180, 200, 255, 0.2)'}
                                                style={{ transition: 'all 0.8s ease' }}
                                            />
                                        </g>
                                    );
                                })}
                            </svg>

                            <div className="flex flex-col gap-40 relative z-10">
                                {jornada.map((item, idx) => {
                                    const isConcluido = item.progresso?.status === 'concluido';
                                    const isBloqueado = idx > 0 && jornada[idx - 1].progresso?.status !== 'concluido' && !isConcluido;
                                    const isAtual = !isConcluido && !isBloqueado;
                                    const imgUrl = getSymbolImage(item, isConcluido);
                                    const isLeft = idx % 2 === 0;
                                    const isFocused = activeNodeIndex === idx;

                                    return (
                                        <div
                                            key={item.id}
                                            data-jornada-row
                                            data-idx={idx}
                                            className={`flex items-center w-full ${isLeft ? 'justify-start' : 'justify-end'} relative group transition-all duration-1000 ${isFocused ? 'is-focused' : ''}`}
                                        >
                                            <div className={`flex items-center gap-2 max-w-4xl relative ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>

                                                {/* === NODE (STAR / SYMBOL) === */}
                                                <div className="relative group" data-jornada-node>
                                                    {/* Aura effects */}
                                                    <div className={`absolute -inset-10 rounded-full blur-3xl transition-all duration-1000 ${
                                                        isConcluido 
                                                            ? 'bg-yellow-500/10' 
                                                            : isFocused 
                                                                ? 'bg-blue-500/10 animate-slow-glow' 
                                                                : 'bg-transparent'
                                                    }`} />

                                                     {/* Organic Node Image */}
                                                    <div className={`relative z-10 w-72 h-72 md:w-80 md:h-80 transition-all duration-1000 ${
                                                        isConcluido 
                                                            ? 'drop-shadow-[0_0_40px_rgba(255,255,255,0.15)] scale-100'
                                                            : isFocused 
                                                                ? 'drop-shadow-[0_0_60px_rgba(100,120,180,0.25)] scale-[1.02]'
                                                                : 'drop-shadow-[0_0_40px_rgba(100,120,180,0.1)] scale-95 opacity-65'
                                                    }`}>
                                                        {/* Subtle glow background integrated with nebula color */}
                                                        {!isConcluido && (
                                                            <div className="absolute inset-0 rounded-full bg-[#0a0a1a]/60 blur-3xl" />
                                                        )}
                                                        
                                                        {/* Skyrim Star Node Core */}
                                                        {!item.titulo.toLowerCase().includes('iniciação') && (
                                                            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none transition-all duration-1000 ${
                                                                isConcluido 
                                                                    ? 'journey-node active' 
                                                                    : isAtual 
                                                                        ? 'journey-node revealed animate-pulse'
                                                                        : 'journey-node'
                                                            }`} />
                                                        )}

                                                        <div className="w-full h-full relative" style={{
                                                            maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
                                                            WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                                                        }}>
                                                            <img
                                                                src={imgUrl}
                                                                alt={item.titulo}
                                                                className={`w-full h-full object-contain transition-all duration-1000 ${
                                                                    !isConcluido 
                                                                        ? 'brightness-[1.25] contrast-[1.1] opacity-45 grayscale-[0.5]' 
                                                                        : 'brightness-110'
                                                                }`}
                                                            />

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
                                                <div className={`work-text w-80 md:w-[32.5rem] text-left relative -top-8 transition-all duration-1000 flex flex-col justify-center ${isFocused ? 'opacity-100 scale-100' : 'opacity-40 scale-95'} ${isBloqueado ? 'is-locked' : 'is-active'}`}>
                                                    <div className="space-y-1">
                                                        <span className={`work-kicker block transition-all duration-700 ${isConcluido ? '!text-yellow-500/80' : ''} pl-6`}>
                                                            {GRAU_LABELS[item.grau]} • Nível {idx + 1}
                                                        </span>
                                                        <h3 className={`work-title text-2xl md:text-3xl font-light uppercase tracking-tighter leading-tight transition-all duration-700 ${isBloqueado ? 'text-gray-800' : 'text-white'} pl-6`}>
                                                            {isBloqueado ? 'Oculto pelas Sombras' : item.titulo}
                                                        </h3>
                                                    </div>

                                                    {!isBloqueado && (
                                                        <div className={`work-description-wrapper pl-6 animate-in fade-in duration-1000 mt-2`}>
                                                            <div className="work-description">
                                                                {(item.descricao_jornada || 'A sabedoria aguarda o buscador sincero para ser revelada.')
                                                                    .split(/\r?\n\s*\r?\n/)
                                                                    .filter(Boolean)
                                                                    .map((para, pIdx) => (
                                                                        <p key={pIdx}>{para}</p>
                                                                    ))
                                                                }
                                                            </div>

                                                            {isConcluido && (
                                                                <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest text-emerald-500/70 mt-6 pl-6">
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
                        </div>
                    )}

                    {/* End spacing */}
                    <div className="h-40" />
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Libre+Baskerville:ital@0;1&family=Spectral:ital,wght@0,300;0,400;1,400&display=swap');

                @keyframes reveal-flash {
                    0% { opacity: 0; }
                    20% { opacity: 1; }
                    100% { opacity: 0; }
                }
                .animate-reveal-flash {
                    animation: reveal-flash 1.5s ease-out forwards;
                }
                @keyframes galaxy-expand {
                    0% { transform: scale(1); opacity: 0.4; }
                    50% { opacity: 0.6; }
                    100% { transform: scale(1.15); opacity: 0.4; }
                }
                .animate-galaxy-expand {
                    animation: galaxy-expand 40s linear infinite;
                }
                
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                
                @keyframes slow-glow {
                    0%, 100% { opacity: 0.3; transform: scale(1.02); }
                    50% { opacity: 0.5; transform: scale(1.05); }
                }
                .animate-slow-glow {
                    animation: slow-glow 15s ease-in-out infinite;
                }

                .journey-header-logo {
                    width: 28px;
                    height: 28px;
                    object-fit: contain;
                    flex-shrink: 0;
                }

                /* Celestial Skyrim Star Nodes */
                .journey-node {
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    border-radius: 999px;
                    background: rgba(180, 200, 255, 0.2);
                    box-shadow: 0 0 8px rgba(180, 200, 255, 0.2);
                    transition: all 0.8s ease;
                }
                
                .journey-node.revealed {
                    background: rgba(255, 255, 230, 0.75);
                    box-shadow: 
                        0 0 12px rgba(255, 255, 230, 0.7),
                        0 0 24px rgba(255, 255, 255, 0.35);
                }

                .journey-node.active {
                    background: rgba(255, 236, 190, 0.95);
                    box-shadow:
                        0 0 14px rgba(255, 236, 190, 0.95),
                        0 0 32px rgba(212, 175, 55, 0.65),
                        0 0 60px rgba(212, 175, 55, 0.3);
                }

                .work-text.is-locked .work-title {
                    color: rgba(190, 200, 220, 0.14) !important;
                    opacity: 0.35;
                    text-shadow: none;
                }

                .work-text.is-locked .work-kicker {
                    color: rgba(210, 215, 230, 0.22) !important;
                    opacity: 0.5;
                }

                /* Premium Liturgical Typography Layout - Classic Clean Left Alignment */
                .work-text {
                    text-align: left;
                    max-width: 520px;
                }

                .work-kicker,
                .work-title,
                .work-description,
                .work-description p {
                    margin-left: 0;
                    margin-right: 0;
                    text-align: left;
                }

                .work-kicker {
                    font-family: "Cinzel", serif;
                    font-size: 0.68rem;
                    letter-spacing: 0.38em;
                    text-transform: uppercase;
                    color: rgba(210, 215, 230, 0.52);
                }

                .work-title {
                    font-family: "Cinzel", serif;
                    margin-bottom: 1rem;
                    color: rgba(248, 248, 252, 0.9);
                    text-shadow: 0 0 14px rgba(255, 255, 255, 0.08);
                }

                /* Resumed/Recolhido with Fade Transition */
                .work-description-wrapper {
                    position: relative;
                    overflow: hidden;
                    max-height: 4.8em;
                    opacity: 0.68;
                    transition:
                        max-height 0.9s cubic-bezier(0.25, 1, 0.5, 1),
                        opacity 0.65s ease,
                        filter 0.65s ease;
                    filter: blur(0px);
                }

                .is-focused .work-description-wrapper,
                .group:hover .work-description-wrapper {
                    max-height: 600px;
                    opacity: 0.9;
                    filter: blur(0);
                }

                /* Fade overlay for normal state */
                .work-description-wrapper::after {
                    content: "";
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    height: 2.4em;
                    pointer-events: none;
                    background: linear-gradient(
                        to bottom,
                        rgba(2, 2, 5, 0),
                        rgba(2, 2, 5, 0.95)
                    );
                    transition: opacity 0.45s ease;
                    opacity: 1;
                }

                .is-focused .work-description-wrapper::after,
                .group:hover .work-description-wrapper::after {
                    opacity: 0;
                }

                /* Smooth vertical shift reveal and color transitions */
                .work-description {
                    transform: translateY(4px);
                    transition:
                        color 0.55s ease,
                        opacity 0.55s ease,
                        max-height 0.85s ease,
                        transform 0.65s ease;
                }

                .is-focused .work-description,
                .group:hover .work-description {
                    transform: translateY(0);
                }

                /* Cormorant & EB Garamond Liturgical paragraph details */
                .work-description p {
                    font-family: "Cormorant Garamond", "EB Garamond", "Spectral", serif;
                    font-size: clamp(0.9rem, 0.82vw, 1rem);
                    line-height: 1.62;
                    letter-spacing: 0.01em;
                    font-weight: 300;
                    color: rgba(220, 224, 235, 0.58);
                    margin: 0 0 0.82rem;
                    transition: color 0.55s ease;
                }

                .work-description p:last-child {
                    margin-bottom: 0;
                }

                /* Glow transition to active/softer light text on focus or hover */
                .is-focused .work-description p,
                .group:hover .work-description p {
                    color: rgba(238, 240, 246, 0.76);
                }`}</style>
        </div>
    );
}

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
    'iniciação': 'https://www.portaldaordem.com.br/initiation_light.jpg?v=3',
    'aprendiz': 'https://www.portaldaordem.com.br/rough_stone.png',
    'companheiro': 'https://www.portaldaordem.com.br/polished_stone.png',
    'mestre': 'https://www.portaldaordem.com.br/masonic_temple.png'
};

const getPessoaIdFromLocalStorage = (): string => {
    try {
        const userStr = localStorage.getItem('usuario_logado');
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user.id) return user.id.toString();
            if (user.pessoa_id) return user.pessoa_id.toString();
        }
    } catch (e) {}
    return ''; // fallback
};

export default function ModalJornada({ itens, tipo, onClose, onIniciarEstudo }: ModalJornadaProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    
    // Animation & UX states
    const [targetNode, setTargetNode] = useState<number>(0);
    const [isNewReveal, setIsNewReveal] = useState<boolean>(false);
    const [animationProgress, setAnimationProgress] = useState<number>(1); // 0 to 1
    const [starPos, setStarPos] = useState<{x: number, y: number} | null>(null);
    const [showSupernova, setShowSupernova] = useState<boolean>(false);
    
    // Core visual states
    const [activeNodeIndex, setActiveNodeIndex] = useState<number>(0);
    const [nodePositions, setNodePositions] = useState<Array<{ x: number; y: number }>>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [constellationReady, setConstellationReady] = useState(false);
    
    const pathRefs = useRef<(SVGPathElement | null)[]>([]);

    useEffect(() => {
        const timer = setTimeout(() => setIsOpen(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 500);
    };

    if (!itens) return null;

    const jornada = [...itens]
        .filter(i => i.tipo?.toLowerCase().includes(tipo?.toLowerCase().replace('s', '')))
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

    // Determine target node on mount
    useEffect(() => {
        if (jornada.length === 0) return;
        
        let tgt = -1;
        let isNew = false;
        const pessoaId = getPessoaIdFromLocalStorage();

        // 1. First unseen completed
        for (let i = 0; i < jornada.length; i++) {
            if (jornada[i].progresso?.status === 'concluido') {
                const key = pessoaId ? `jornada_reveal_visto_${pessoaId}_${jornada[i].id}` : `jornada_reveal_visto_${jornada[i].id}`;
                if (!localStorage.getItem(key)) {
                    tgt = i;
                    isNew = true;
                    break;
                }
            }
        }

        // 2. Fallback to first 'em_estudo'
        if (tgt === -1) {
            for (let i = 0; i < jornada.length; i++) {
                if (jornada[i].progresso?.status === 'em_estudo') {
                    tgt = i;
                    break;
                }
            }
        }
        
        // 3. Fallback to last 'concluido'
        if (tgt === -1) {
            for (let i = jornada.length - 1; i >= 0; i--) {
                if (jornada[i].progresso?.status === 'concluido') {
                    tgt = i;
                    break;
                }
            }
        }

        if (tgt === -1) tgt = 0;

        setTargetNode(tgt);
        setIsNewReveal(isNew);
        if (isNew) {
            setAnimationProgress(0); // Will trigger animation
        } else {
            setAnimationProgress(1); // Already completed
        }
    }, [jornada]);

    // Recalculate physical positions
    const updatePositions = () => {
        if (!contentRef.current) return;
        const content = contentRef.current;
        const rect = content.getBoundingClientRect();
        
        const anchors = content.querySelectorAll('.work-node-anchor');
        if (anchors.length === 0) return;
        const positions = Array.from(anchors).map(anchor => {
            const anchorRect = anchor.getBoundingClientRect();
            return {
                x: anchorRect.left - rect.left + anchorRect.width / 2,
                y: anchorRect.top - rect.top + anchorRect.height / 2
            };
        });
        const hasValidPos = positions.some(p => p.x !== 0 || p.y !== 0);
        if (!hasValidPos) return;
        setNodePositions(positions);
        setConstellationReady(true);
    };

    useEffect(() => {
        updatePositions();
        window.addEventListener('resize', updatePositions);
        
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(() => {
            updatePositions();
        });
        resizeObserver.observe(container);

        const rowsToObserve = container.querySelectorAll('[data-jornada-row]');
        rowsToObserve.forEach(row => resizeObserver.observe(row));
        
        const observerOptions = {
            root: container,
            rootMargin: '-35% 0px -35% 0px',
            threshold: 0.2
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const idxStr = entry.target.getAttribute('data-idx');
                    if (idxStr !== null && animationProgress === 1) {
                        setActiveNodeIndex(parseInt(idxStr, 10));
                    }
                }
            });
        }, observerOptions);

        const rows = container.querySelectorAll('[data-jornada-row]');
        rows.forEach(row => observer.observe(row));

        const timer1 = setTimeout(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => updatePositions());
            });
        }, 150);
        const timer2 = setTimeout(updatePositions, 600);
        const timer3 = setTimeout(updatePositions, 1200);

        return () => {
            window.removeEventListener('resize', updatePositions);
            resizeObserver.disconnect();
            observer.disconnect();
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, [jornada.length, isOpen, animationProgress]);

    // Handle Star Animation & Scrolling
    useEffect(() => {
        if (!constellationReady || nodePositions.length === 0) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Determine if we need to animate or just scroll
        if (animationProgress === 0 && isNewReveal && targetNode > 0 && !prefersReducedMotion) {
            let startTime: number | null = null;
            let animationFrameId: number;
            
            // Total duration: base + 0.8s per node, max 3s
            const duration = Math.min(1000 + targetNode * 800, 3000); 
            
            let totalLength = 0;
            const segmentLengths: number[] = [];
            for (let i = 0; i < targetNode; i++) {
                const len = pathRefs.current[i]?.getTotalLength() || 0;
                segmentLengths.push(len);
                totalLength += len;
            }

            if (totalLength === 0) {
                // Paths not measured yet
                return;
            }

            const animate = (timestamp: number) => {
                if (!startTime) startTime = timestamp;
                const progress = Math.min((timestamp - startTime) / duration, 1);
                
                // Ease in out cubic
                const easeProgress = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                
                setAnimationProgress(easeProgress);
                setActiveNodeIndex(targetNode); // Keep focus on target during animation
                
                let traveled = easeProgress * totalLength;
                let currentSeg = 0;
                while (currentSeg < targetNode && traveled > segmentLengths[currentSeg]) {
                    traveled -= segmentLengths[currentSeg];
                    currentSeg++;
                }
                
                if (currentSeg < targetNode && pathRefs.current[currentSeg]) {
                    const pt = pathRefs.current[currentSeg]!.getPointAtLength(traveled);
                    setStarPos({ x: pt.x, y: pt.y });
                    
                    if (containerRef.current) {
                        const containerHalf = containerRef.current.clientHeight / 2;
                        // Smoothly ease scroll to track star
                        containerRef.current.scrollTop = pt.y - containerHalf;
                    }
                }

                if (progress < 1) {
                    animationFrameId = requestAnimationFrame(animate);
                } else {
                    setAnimationProgress(1);
                    setStarPos(null); // Hide star after completion
                    triggerSupernova();
                }
            };
            
            animationFrameId = requestAnimationFrame(animate);
            return () => cancelAnimationFrame(animationFrameId);
        } else if (animationProgress === 1 || prefersReducedMotion) {
            // Just scroll smoothly
            if (prefersReducedMotion) setAnimationProgress(1);
            setActiveNodeIndex(targetNode);
            
            const tgtNode = nodePositions[targetNode];
            if (tgtNode && containerRef.current) {
                const containerHalf = containerRef.current.clientHeight / 2;
                containerRef.current.scrollTo({
                    top: tgtNode.y - containerHalf,
                    behavior: 'smooth'
                });
            }
            
            if (isNewReveal) {
                triggerSupernova();
            }
        }
    }, [constellationReady, nodePositions, targetNode, animationProgress, isNewReveal]);

    const triggerSupernova = () => {
        setShowSupernova(true);
        const pessoaId = getPessoaIdFromLocalStorage();
        const item = jornada[targetNode];
        if (item) {
            const key = pessoaId ? `jornada_reveal_visto_${pessoaId}_${item.id}` : `jornada_reveal_visto_${item.id}`;
            localStorage.setItem(key, "true");
        }
        
        setTimeout(() => setShowSupernova(false), 2500);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-700">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={handleClose}></div>

            <div className={`journey-modal ${isOpen && !isClosing ? 'is-open' : ''} ${isClosing ? 'is-closing' : ''} bg-[#020205] border border-white/10 rounded-[2.5rem] w-full max-w-7xl h-full max-h-[92vh] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,0.9)] relative z-10 flex flex-col`}>
                
                {/* Nebula Background Layer */}
                <div className="absolute inset-0 opacity-50 pointer-events-none overflow-hidden">
                    <img 
                        src="https://www.portaldaordem.com.br/nebula_bg.png" 
                        alt="Nebula" 
                        className="journey-modal-background w-full h-full object-cover scale-110 animate-galaxy-expand brightness-[1.3] saturate-[1.3]"
                    />
                    <div className="journey-background-overlay absolute inset-0 bg-[#030612]/50 pointer-events-none" />
                    
                    {/* Masonic Symbols Background */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none mix-blend-screen masonic-bg-symbol">
                        <svg className="w-[800px] h-[800px] opacity-20 text-yellow-500/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5">
                            <path d="M12 2 L22 20 L2 20 Z" />
                            <path d="M12 22 L2 4 L22 4 Z" />
                        </svg>
                    </div>
                </div>

                {/* HEADER */}
                <div className="journey-header p-8 pb-4 border-b border-white/5 flex justify-between items-center relative z-20">
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
                    <button onClick={handleClose} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-all cursor-pointer group">
                        <span className="group-hover:rotate-90 transition-transform duration-300">✕</span>
                    </button>
                </div>

                {/* SKILL TREE CONTENT */}
                <div
                    ref={containerRef}
                    onScroll={updatePositions}
                    className="flex-1 overflow-y-auto p-12 md:p-24 relative z-10 scrollbar-hide scroll-smooth"
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
                        <div ref={contentRef} className="relative min-h-[500px]">
                            
                            {/* CELESTIAL CONSTELLATION SVG LAYER */}
                            <svg className={`journey-constellation-layer absolute inset-0 w-full h-full pointer-events-none overflow-visible transition-opacity duration-700 ${constellationReady ? 'opacity-100' : 'opacity-0'}`}>
                                
                                {nodePositions.map((pos, idx) => {
                                    if (idx >= nodePositions.length - 1) return null;
                                    const nextPos = nodePositions[idx + 1];
                                    const item = jornada[idx];
                                    const nextItem = jornada[idx + 1];
                                    
                                    const isCurrentConcluido = item.progresso?.status === 'concluido';
                                    const isNextConcluido = nextItem.progresso?.status === 'concluido';
                                    const isNextActive = nextItem.progresso?.status === 'em_estudo';
                                    
                                    const isConnectionCompleted = isCurrentConcluido && isNextConcluido;
                                    const isConnectionActive = isCurrentConcluido && isNextActive;
                                    const isConnectionNext = isCurrentConcluido && !isNextConcluido && !isConnectionActive;

                                    const startX = pos.x;
                                    const startY = pos.y;
                                    const endX = nextPos.x;
                                    const endY = nextPos.y;

                                    // Create a smooth organic bezier curve that avoids text
                                    // By anchoring the curve control points straight up/down, it guarantees a clean arc
                                    const curveOffset = Math.abs(endY - startY) * 0.4;
                                    const cp1X = startX;
                                    const cp1Y = startY + curveOffset;
                                    const cp2X = endX;
                                    const cp2Y = endY - curveOffset;

                                    const pathD = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
                                    
                                    // Calc dash offset for progressive animation
                                    const pathLen = pathRefs.current[idx]?.getTotalLength() || 1000;
                                    let dashOffset = 0;
                                    if (animationProgress < 1) {
                                        if (idx >= targetNode) {
                                            dashOffset = pathLen; // hidden
                                        } else {
                                            // calculate total length to target
                                            let totalToTarget = 0;
                                            for(let k=0; k<targetNode; k++) totalToTarget += (pathRefs.current[k]?.getTotalLength() || 0);
                                            
                                            let traveled = animationProgress * totalToTarget;
                                            let lenBeforeThis = 0;
                                            for(let k=0; k<idx; k++) lenBeforeThis += (pathRefs.current[k]?.getTotalLength() || 0);
                                            
                                            let traveledOnThis = traveled - lenBeforeThis;
                                            if (traveledOnThis <= 0) dashOffset = pathLen;
                                            else if (traveledOnThis >= pathLen) dashOffset = 0;
                                            else dashOffset = pathLen - traveledOnThis;
                                        }
                                    }

                                    return (
                                        <g key={`path-${idx}`}>
                                            {/* Base solid line */}
                                            <path
                                                ref={(el) => { pathRefs.current[idx] = el; }}
                                                d={pathD}
                                                fill="none"
                                                strokeDasharray={pathLen}
                                                strokeDashoffset={dashOffset}
                                                className={`journey-connection ${
                                                    isConnectionCompleted
                                                        ? 'is-completed'
                                                        : isConnectionActive
                                                            ? 'is-active is-revealed'
                                                            : isConnectionNext
                                                                ? 'is-dormant is-next'
                                                                : 'is-locked'
                                                }`}
                                                style={{ transition: animationProgress < 1 ? 'none' : 'stroke-dashoffset 0.5s ease-out' }}
                                            />
                                        </g>
                                    );
                                })}
                            </svg>

                            {/* Guiding Star (during animation) */}
                            {starPos && animationProgress < 1 && (
                                <div 
                                    className="absolute w-4 h-4 rounded-full bg-white z-[160] shadow-[0_0_30px_10px_rgba(255,255,255,0.8),0_0_60px_20px_rgba(255,215,0,0.6)] animate-pulse"
                                    style={{
                                        left: starPos.x,
                                        top: starPos.y,
                                        transform: 'translate(-50%, -50%)',
                                    }}
                                />
                            )}

                            {/* Main Star Nodes (HTML div elements positioned dynamically on coordinates) */}
                            {constellationReady && nodePositions.map((pos, idx) => {
                                 const item = jornada[idx];
                                 if (!item) return null;
                                 const isConcluido = item.progresso?.status === 'concluido';
                                 const isBloqueado = idx > 0 && jornada[idx - 1].progresso?.status !== 'concluido' && !isConcluido;
                                 const isAtual = !isConcluido && !isBloqueado;
                                 
                                 const isStarCompleted = isConcluido;
                                 const isStarActive = isAtual;
                                 const isStarRevealed = isStarCompleted || isStarActive;
                                 
                                 // Hide star node if animation hasn't reached it yet
                                 if (animationProgress < 1 && idx > targetNode) return null;

                                 return (
                                     <div
                                         key={`star-node-${idx}`}
                                         className={`journey-node ${isStarCompleted ? 'is-completed' : ''} ${isStarActive ? 'is-active' : ''} ${isStarRevealed ? 'is-revealed' : 'is-dormant'}`}
                                         style={{
                                             left: `${pos.x}px`,
                                             top: `${pos.y}px`,
                                         }}
                                     >
                                         <div className="star-ray-h" />
                                         <div className="star-ray-v" />
                                         <div className="star-core" />
                                     </div>
                                 );
                             })}

                            <div className="flex flex-col gap-40 relative z-10">
                                {jornada.map((item, idx) => {
                                    const isConcluido = item.progresso?.status === 'concluido';
                                    const isBloqueado = idx > 0 && jornada[idx - 1].progresso?.status !== 'concluido' && !isConcluido;
                                    const isAtual = !isConcluido && !isBloqueado;
                                    const imgUrl = getSymbolImage(item, isConcluido);
                                    const isLeft = idx % 2 === 0;
                                    const isFocused = activeNodeIndex === idx;

                                    const isTarget = idx === targetNode;
                                    const isSupernova = isTarget && showSupernova;

                                    return (
                                        <div
                                            key={item.id}
                                            data-jornada-row
                                            data-idx={idx}
                                            className={`flex items-center w-full ${isLeft ? 'justify-start' : 'justify-end'} relative group transition-all duration-1000 ${isFocused ? 'is-focused' : ''} ${isSupernova ? 'z-50' : 'z-10'}`}
                                        >
                                            <div className={`flex items-center gap-12 max-w-4xl relative ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>

                                                {/* NODE (STAR / SYMBOL) */}
                                                <div className="relative group" data-jornada-node>
                                                     {/* Anchor on the side of the image to make line perfectly weave */}
                                                     <div
                                                         className="work-node-anchor absolute pointer-events-none"
                                                         data-work-id={item.id}
                                                         style={{
                                                             top: '50%',
                                                             left: isLeft ? '-40px' : 'auto',
                                                             right: !isLeft ? '-40px' : 'auto',
                                                             transform: 'translateY(-50%)',
                                                             width: 0,
                                                             height: 0,
                                                             opacity: 0,
                                                             visibility: 'hidden' as const
                                                         }}
                                                     />
                                                    
                                                    {/* Aura glow - only for completed, positioned behind everything */}
                                                    {isConcluido && (
                                                        <div className={`absolute -inset-12 rounded-full blur-[60px] bg-yellow-500/8 pointer-events-none transition-all duration-1000 ${isSupernova ? 'bg-yellow-400/40 blur-[100px] scale-150' : ''}`} style={{ zIndex: -1 }} />
                                                    )}

                                                    {/* Supernova Flash Element */}
                                                    {isSupernova && (
                                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white rounded-full blur-[80px] opacity-0 animate-supernova-explosion pointer-events-none z-[100]" />
                                                    )}

                                                     {/* Organic Node Image */}
                                                    <div className={`journey-work-image work-image relative z-10 w-72 h-72 md:w-80 md:h-80 transition-all duration-[1.5s] ease-out ${
                                                        isConcluido 
                                                            ? `drop-shadow-[0_0_40px_rgba(255,255,255,0.15)] ${isSupernova ? 'scale-110 brightness-[1.5] saturate-[1.5]' : 'scale-100'}`
                                                            : isAtual 
                                                                ? 'drop-shadow-[0_0_60px_rgba(100,120,180,0.25)] scale-[1.02]'
                                                                : 'drop-shadow-[0_0_40px_rgba(100,120,180,0.1)] scale-95 opacity-80'
                                                    }`}>
                                                        <div className="w-full h-full relative" style={{
                                                            maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
                                                            WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                                                        }}>
                                                            <img
                                                                src={imgUrl}
                                                                alt={item.titulo}
                                                                className={`w-full h-full object-contain transition-all duration-[2s] ease-out ${
                                                                    isConcluido 
                                                                        ? `brightness-110 drop-shadow-[0_0_20px_rgba(255,220,150,0.2)] ${isSupernova ? 'saturate-[2] brightness-[1.8]' : 'saturate-100'}`
                                                                        : isAtual
                                                                            ? 'grayscale brightness-[0.7] opacity-60'
                                                                            : 'grayscale brightness-[0.4] opacity-30'
                                                                }`}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* INFO SIDE */}
                                                <div className={`journey-work-text work-text w-80 md:w-[32.5rem] text-left relative -top-8 transition-all duration-1000 flex flex-col justify-center ${isBloqueado ? 'opacity-60 scale-95 is-locked' : 'opacity-100 scale-100 is-active'} ${isSupernova ? 'drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]' : ''}`}>
                                                    <div className="space-y-1">
                                                        <span className={`work-kicker block transition-all duration-700 ${isConcluido ? '!text-yellow-500/80' : ''} pl-6`}>
                                                            {GRAU_LABELS[item.grau]} • Nível {idx + 1}
                                                        </span>
                                                        <h3 className={`work-title text-2xl md:text-3xl font-light uppercase tracking-tighter leading-tight transition-all duration-700 ${isBloqueado ? 'text-gray-800' : 'text-white'} pl-6`}>
                                                            {isBloqueado ? 'Oculto em Trevas' : item.titulo}
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

                @keyframes supernova-explosion {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                    20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                    60% { opacity: 0.8; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                }

                .animate-supernova-explosion {
                    animation: supernova-explosion 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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

                /* Celestial Constellation Layer Layering */
                .journey-constellation-layer {
                    position: absolute;
                    inset: 0;
                    z-index: 2;
                    pointer-events: none;
                }

                .journey-work-image {
                    position: relative;
                    z-index: 3;
                }

                .journey-work-text {
                    position: relative;
                    z-index: 4;
                }

                /* General Modal Open and Close transitions */
                .journey-modal {
                    opacity: 0;
                    transform: scale(0.965) translateY(18px);
                    filter: blur(10px);
                    transition:
                        opacity 0.9s ease,
                        transform 1s cubic-bezier(0.16, 1, 0.3, 1),
                        filter 1s ease;
                    will-change: opacity, transform, filter;
                }

                .journey-modal.is-open {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                    filter: blur(0);
                }

                .journey-modal.is-closing {
                    opacity: 0 !important;
                    transform: scale(0.975) translateY(10px) !important;
                    filter: blur(8px) !important;
                    transition:
                        opacity 0.45s ease,
                        transform 0.5s ease,
                        filter 0.5s ease !important;
                }

                /* Overlay Veil dissolving transition */
                .journey-modal::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    z-index: 20;
                    pointer-events: none;
                    background:
                        radial-gradient(circle at 38% 42%, rgba(255,255,255,0.10), transparent 0%),
                        radial-gradient(circle at center, rgba(12,16,32,0.18), rgba(0,0,0,0.88) 72%);
                    opacity: 1;
                    backdrop-filter: blur(8px);
                    transition:
                        opacity 1.4s ease 0.25s,
                        backdrop-filter 1.4s ease 0.25s;
                }

                .journey-modal.is-open::before {
                    opacity: 0;
                    backdrop-filter: blur(0);
                }

                /* Masonic Esquadro & Compasso backdrop symbol */
                .masonic-bg-symbol {
                    opacity: 0;
                    filter: blur(4px) drop-shadow(0 0 0 rgba(255,220,160,0));
                    transform: scale(0.96);
                    transition:
                        opacity 1.2s ease 0.35s,
                        filter 1.4s ease 0.35s,
                        transform 1.4s ease 0.35s;
                }

                .journey-modal.is-open .masonic-bg-symbol {
                    opacity: 0.20 !important;
                    filter: blur(0) drop-shadow(0 0 12px rgba(255,220,160,0.18)) !important;
                    transform: scale(1);
                }

                /* Header cascading appearance */
                .journey-header {
                    opacity: 0;
                    transform: translateY(-10px);
                    filter: blur(4px);
                    transition:
                        opacity 0.8s ease 0.25s,
                        transform 0.8s ease 0.25s,
                        filter 0.8s ease 0.25s;
                    will-change: opacity, transform, filter;
                }

                .journey-modal.is-open .journey-header {
                    opacity: 1;
                    transform: translateY(0);
                    filter: blur(0);
                }

                /* Work Image cascading silhouetted appearance */
                .work-image {
                    opacity: 0;
                    transform: scale(0.94) translateY(14px);
                    filter: blur(8px) brightness(0.65);
                    transition:
                        opacity 1s ease 0.45s,
                        transform 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.45s,
                        filter 1.2s ease 0.45s;
                    will-change: opacity, transform, filter;
                }

                .journey-modal.is-open .work-image {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                    filter: blur(0) brightness(1);
                }

                /* Realistic Celestial Skyrim Star Nodes (HTML div elements positioned dynamically) */
                .journey-node {
                    position: absolute;
                    width: 32px;
                    height: 32px;
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                    z-index: 30;
                }

                .journey-node .star-core {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: 4px;
                    height: 4px;
                    transform: translate(-50%, -50%);
                    border-radius: 50%;
                    background: rgba(245, 248, 255, 0.95);
                    box-shadow:
                        0 0 6px rgba(245, 248, 255, 0.9),
                        0 0 16px rgba(200, 220, 255, 0.45),
                        0 0 30px rgba(160, 190, 255, 0.18);
                    transition: all 0.6s ease;
                }

                .journey-node .star-ray-h {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: 26px;
                    height: 1px;
                    transform: translate(-50%, -50%);
                    background: linear-gradient(to right, transparent, rgba(245, 248, 255, 0.9), transparent);
                    transition: all 0.6s ease;
                }

                .journey-node .star-ray-v {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: 1px;
                    height: 26px;
                    transform: translate(-50%, -50%);
                    background: linear-gradient(to bottom, transparent, rgba(245, 248, 255, 0.9), transparent);
                    transition: all 0.6s ease;
                }

                /* Dormant stars */
                .journey-node.is-dormant,
                .journey-node.is-next,
                .journey-node.is-locked {
                    opacity: 0.72;
                }

                .journey-node.is-dormant .star-core,
                .journey-node.is-next .star-core,
                .journey-node.is-locked .star-core {
                    background: rgba(220, 230, 245, 0.78);
                    box-shadow:
                        0 0 6px rgba(220, 230, 245, 0.55),
                        0 0 15px rgba(160, 185, 230, 0.22);
                }

                .journey-node.is-dormant .star-ray-h,
                .journey-node.is-next .star-ray-h,
                .journey-node.is-locked .star-ray-h {
                    background: linear-gradient(to right, transparent, rgba(200, 220, 255, 0.4), transparent);
                }

                .journey-node.is-dormant .star-ray-v,
                .journey-node.is-next .star-ray-v,
                .journey-node.is-locked .star-ray-v {
                    background: linear-gradient(to bottom, transparent, rgba(200, 220, 255, 0.4), transparent);
                }

                /* Active and Revealed star styling */
                .journey-node.is-completed {
                    opacity: 1;
                    animation: realisticStarPulse 2.0s ease-in-out infinite;
                }

                .journey-node.is-completed .star-core {
                    background: rgba(255, 250, 220, 1) !important;
                    box-shadow:
                        0 0 10px rgba(255, 245, 210, 1),
                        0 0 26px rgba(255, 225, 140, 0.95),
                        0 0 55px rgba(255, 180, 70, 0.45) !important;
                    width: 5px !important;
                    height: 5px !important;
                }

                .journey-node.is-completed .star-ray-h {
                    background: linear-gradient(to right, transparent, rgba(255, 245, 210, 1), transparent) !important;
                    width: 44px !important;
                    height: 1px !important;
                }

                .journey-node.is-completed .star-ray-v {
                    background: linear-gradient(to bottom, transparent, rgba(255, 245, 210, 1), transparent) !important;
                    width: 1px !important;
                    height: 44px !important;
                }

                .journey-node.is-active,
                .journey-node.is-revealed {
                    opacity: 1;
                    animation: realisticStarPulse 2.8s ease-in-out infinite;
                }

                .journey-node.is-active .star-core,
                .journey-node.is-revealed .star-core {
                    background: rgba(255, 246, 220, 1);
                    box-shadow:
                        0 0 8px rgba(255, 246, 220, 0.95),
                        0 0 22px rgba(255, 220, 150, 0.58),
                        0 0 44px rgba(255, 190, 90, 0.28);
                }

                .journey-node.is-active .star-ray-h,
                .journey-node.is-revealed .star-ray-h {
                    background: linear-gradient(to right, transparent, rgba(255, 240, 210, 0.95), transparent);
                }

                .journey-node.is-active .star-ray-v,
                .journey-node.is-revealed .star-ray-v {
                    background: linear-gradient(to bottom, transparent, rgba(255, 240, 210, 0.95), transparent);
                }

                @keyframes realisticStarPulse {
                    0% {
                        transform: translate(-50%, -50%) scale(0.96);
                        filter: brightness(0.95);
                    }
                    50% {
                        transform: translate(-50%, -50%) scale(1.18);
                        filter: brightness(1.35);
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(0.96);
                        filter: brightness(0.95);
                    }
                }

                /* CONTINUOUS SOLID LINES (No Dashes unless animating) */
                .journey-connection {
                    /* Solid line by default via strokeDasharray handled in React */
                    transition: stroke-dashoffset 0.5s ease-out;
                    will-change: stroke-dashoffset, opacity, filter;
                }

                .journey-modal.is-open .journey-connection.is-locked {
                    stroke: rgba(160, 185, 230, 0.16) !important;
                    stroke-width: 1.5 !important;
                    opacity: 0.38 !important;
                    filter: drop-shadow(0 0 2px rgba(180, 200, 255, 0.08)) !important;
                }

                .journey-modal.is-open .journey-connection.is-dormant,
                .journey-modal.is-open .journey-connection.is-next {
                    stroke: rgba(185, 205, 240, 0.36) !important;
                    stroke-width: 1.7 !important;
                    opacity: 0.78 !important;
                    filter: drop-shadow(0 0 5px rgba(175, 205, 255, 0.18)) !important;
                }

                .journey-modal.is-open .journey-connection.is-active,
                .journey-modal.is-open .journey-connection.is-revealed {
                    stroke: rgba(255, 238, 200, 0.88) !important;
                    stroke-width: 2 !important;
                    opacity: 1 !important;
                    filter:
                        drop-shadow(0 0 7px rgba(255, 238, 200, 0.62))
                        drop-shadow(0 0 18px rgba(255, 210, 130, 0.32)) !important;
                }

                .journey-modal.is-open .journey-connection.is-completed {
                    stroke: rgba(255, 235, 180, 0.85) !important;
                    stroke-width: 1.8 !important;
                    opacity: 0.90 !important;
                    filter:
                        drop-shadow(0 0 6px rgba(255, 230, 160, 0.65))
                        drop-shadow(0 0 18px rgba(255, 180, 70, 0.3)) !important;
                }

                /* Locked work titles and kicker states */
                .work-text.is-locked .work-title {
                    color: rgba(215, 222, 240, 0.28) !important;
                    opacity: 0.62;
                    text-shadow: 0 0 10px rgba(180, 200, 255, 0.06);
                }

                .work-text.is-locked .work-kicker {
                    color: rgba(210, 218, 235, 0.26) !important;
                    opacity: 0.55;
                    text-shadow: none;
                }

                /* Premium Liturgical Typography Layout */
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

                /* Cascading Text transitions with slower fade */
                .work-kicker,
                .work-title,
                .work-description {
                    opacity: 0;
                    transform: translateY(12px);
                    filter: blur(5px);
                }

                .journey-modal.is-open .work-kicker {
                    opacity: 1;
                    transform: translateY(0);
                    filter: blur(0);
                    transition:
                        opacity 0.85s ease 0.7s,
                        transform 0.85s ease 0.7s,
                        filter 0.85s ease 0.7s;
                }

                .journey-modal.is-open .work-title {
                    opacity: 1;
                    transform: translateY(0);
                    filter: blur(0);
                    transition:
                        opacity 0.95s ease 0.9s,
                        transform 0.95s ease 0.9s,
                        filter 0.95s ease 0.9s;
                }

                .journey-modal.is-open .work-description {
                    opacity: 1;
                    transform: translateY(0);
                    filter: blur(0);
                    transition:
                        opacity 1.1s ease 1.12s,
                        transform 1.1s ease 1.12s,
                        filter 1.1s ease 1.12s;
                }

                /* Paragraph cascading details */
                .work-description p {
                    opacity: 0;
                    transform: translateY(8px);
                    filter: blur(4px);
                    transition:
                        opacity 0.8s ease,
                        transform 0.8s ease,
                        filter 0.8s ease;
                }

                .journey-modal.is-open .work-description p {
                    opacity: 1;
                    transform: translateY(0);
                    filter: blur(0);
                }

                .journey-modal.is-open .work-description p:nth-child(1) {
                    transition: opacity 0.8s ease 1.15s, transform 0.8s ease 1.15s, filter 0.8s ease 1.15s;
                }

                .journey-modal.is-open .work-description p:nth-child(2) {
                    transition: opacity 0.8s ease 1.3s, transform 0.8s ease 1.3s, filter 0.8s ease 1.3s;
                }

                .journey-modal.is-open .work-description p:nth-child(3) {
                    transition: opacity 0.8s ease 1.45s, transform 0.8s ease 1.45s, filter 0.8s ease 1.45s;
                }

                /* Smooth static state (No hover or focus changes) */
                .work-description-wrapper {
                    position: relative;
                    opacity: 1;
                    filter: blur(0px);
                }

                .work-description {
                    transform: translateY(0);
                    opacity: 1;
                }

                /* Cormorant & EB Garamond Liturgical paragraph details */
                .work-description p {
                    font-family: "Cormorant Garamond", "EB Garamond", "Spectral", serif;
                    font-size: clamp(0.9rem, 0.82vw, 1rem);
                    line-height: 1.62;
                    letter-spacing: 0.01em;
                    font-weight: 300;
                    color: rgba(238, 240, 246, 0.85); /* Readability fixed */
                    margin: 0 0 0.82rem;
                    transition: color 0.55s ease;
                }

                .work-description p:last-child {
                    margin-bottom: 0;
                }

                /* Acessibilidade */
                @media (prefers-reduced-motion: reduce) {
                    .journey-modal,
                    .journey-modal *,
                    .journey-modal::before {
                        animation: none !important;
                        transition: none !important;
                        filter: none !important;
                        transform: none !important;
                    }
                }

                /* Removed hover/glow transition for accessibility and static readability */`}</style>
        </div>
    );
}

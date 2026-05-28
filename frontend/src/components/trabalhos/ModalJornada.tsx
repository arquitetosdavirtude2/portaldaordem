'use client';

import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';

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
    } catch (e) { /* ignore */ }
    return '';
};

export default function ModalJornada({ itens, tipo, onClose }: ModalJornadaProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const pathRefs = useRef<(SVGPathElement | null)[]>([]);
    const animRafRef = useRef<number | null>(null);
    const hasLaunchedAnim = useRef(false);

    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // Positions of star-nodes in content-relative coords
    const [nodePositions, setNodePositions] = useState<Array<{ x: number; y: number }>>([]);
    const [contentHeight, setContentHeight] = useState(0);

    // Animation state
    // phase: 'idle' | 'animating' | 'done'
    const [phase, setPhase] = useState<'idle' | 'animating' | 'done'>('idle');
    // Where the guiding star currently is (content-relative)
    const [guidingStarPos, setGuidingStarPos] = useState<{ x: number; y: number } | null>(null);
    // Which node index the star currently rests at (for pulsing)
    const [restingNodeIdx, setRestingNodeIdx] = useState<number | null>(null);
    // Which node indices are currently flashing supernova
    const [supernovaNodes, setSupernovaNodes] = useState<Set<number>>(new Set());
    // How much of the total path is revealed (0..1 for animating, or a fixed length for done)
    const [revealedLength, setRevealedLength] = useState(0);
    // Total path length
    const [totalPathLength, setTotalPathLength] = useState(0);

    // ---------- derived data ----------
    if (!itens) return null;

    const jornada = [...itens]
        .filter(i => i.tipo?.toLowerCase().includes(tipo?.toLowerCase().replace('s', '')))
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    const concluidos = jornada.filter(j => j.progresso?.status === 'concluido').length;
    const total = jornada.length;
    const progressoGlobal = total > 0 ? (concluidos / total) * 100 : 0;

    // Find the "final stop" for the animation:
    //   = the first work that is em_estudo or pendente (i.e. the current/next work)
    //   If all are concluido, stop at the last one.
    const findFinalStop = useCallback((): number => {
        for (let i = 0; i < jornada.length; i++) {
            const s = jornada[i].progresso?.status;
            if (s !== 'concluido') return i; // first non-completed
        }
        return jornada.length - 1; // all completed
    }, [jornada]);

    // Determine if we should play full cinematic or short version
    const shouldPlayCinematic = useCallback((): boolean => {
        const pessoaId = getPessoaIdFromLocalStorage();
        // Check if any completed work hasn't been "seen" yet
        for (const item of jornada) {
            if (item.progresso?.status === 'concluido') {
                const key = pessoaId
                    ? `jornada_reveal_visto_${pessoaId}_${item.id}`
                    : `jornada_reveal_visto_${item.id}`;
                try {
                    if (!localStorage.getItem(key)) return true;
                } catch { /* ignore */ }
            }
        }
        return false;
    }, [jornada]);

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

    // ---------- open/close ----------
    useEffect(() => {
        const t = setTimeout(() => setIsOpen(true), 50);
        return () => clearTimeout(t);
    }, []);

    const handleClose = () => {
        setIsClosing(true);
        if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
        setTimeout(onClose, 500);
    };

    // ---------- measurement ----------
    const measureNow = useCallback(() => {
        if (!containerRef.current || !contentRef.current) return;
        const container = containerRef.current;
        const content = contentRef.current;
        const contentRect = content.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        setContentHeight(content.scrollHeight);

        const rows = content.querySelectorAll('[data-jornada-row]');
        if (rows.length === 0) return;

        const positions: { x: number; y: number }[] = [];

        rows.forEach((row, idx) => {
            const img = row.querySelector('.work-image-container');
            if (!img) return;
            const imgRect = img.getBoundingClientRect();
            const isLeft = idx % 2 === 0;

            // Position star node OUTSIDE the image
            // Left image -> star goes to the right side, below center
            // Right image -> star goes to the left side, below center
            let nx: number;
            const gapX = 36;
            if (isLeft) {
                nx = (imgRect.right - contentRect.left) + gapX;
            } else {
                nx = (imgRect.left - contentRect.left) - gapX;
            }

            // Vertically: at ~70% of the image height (below center, near bottom)
            const imgCenterY = (imgRect.top + imgRect.bottom) / 2;
            const imgBottomThird = imgCenterY + (imgRect.height * 0.15);
            const ny = imgBottomThird - contentRect.top;

            positions.push({ x: nx, y: ny });
        });

        if (positions.length > 0) {
            setNodePositions(positions);
        }
    }, []);

    useLayoutEffect(() => {
        if (isOpen) {
            measureNow();
        }
    }, [isOpen, jornada.length, measureNow]);

    useEffect(() => {
        if (!isOpen) return;
        // Re-measure after fonts load
        if ('fonts' in document) {
            document.fonts.ready.then(measureNow);
        }
        // Re-measure on resize
        const container = containerRef.current;
        if (!container) return;

        const ro = new ResizeObserver(measureNow);
        ro.observe(container);
        const imgs = container.querySelectorAll('.work-image-container');
        imgs.forEach(img => ro.observe(img));

        // Extra safety measure for images loading
        const t1 = setTimeout(measureNow, 300);
        const t2 = setTimeout(measureNow, 800);

        return () => {
            ro.disconnect();
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [isOpen, measureNow]);

    // ---------- build the full SVG path "d" string ----------
    const buildFullPath = useCallback((): string => {
        if (nodePositions.length < 2) return '';
        let d = `M ${nodePositions[0].x} ${nodePositions[0].y}`;
        for (let i = 0; i < nodePositions.length - 1; i++) {
            const p0 = nodePositions[i];
            const p1 = nodePositions[i + 1];
            const dy = p1.y - p0.y;
            const offset = Math.abs(dy) * 0.4;
            // Control points go straight down/up from current node to keep curve in the "corridor"
            // between the image and text columns — this avoids crossing text
            d += ` C ${p0.x} ${p0.y + offset}, ${p1.x} ${p1.y - offset}, ${p1.x} ${p1.y}`;
        }
        return d;
    }, [nodePositions]);

    // ---------- calculate total path length once refs are set ----------
    useEffect(() => {
        if (nodePositions.length < 2) return;
        // We use a single combined path for the full constellation
        const mainPath = pathRefs.current[0];
        if (mainPath) {
            setTotalPathLength(mainPath.getTotalLength());
        }
    }, [nodePositions]);

    // ---------- compute the length along the path to reach node N ----------
    const getLengthToNode = useCallback((nodeIdx: number): number => {
        if (nodeIdx <= 0 || !pathRefs.current[0]) return 0;
        const fullPath = pathRefs.current[0];
        if (!fullPath) return 0;
        const totalLen = fullPath.getTotalLength();
        const target = nodePositions[nodeIdx];
        if (!target) return totalLen;

        // Binary search for the point on the path closest to the target node position
        let lo = 0;
        let hi = totalLen;
        for (let iter = 0; iter < 30; iter++) {
            const mid = (lo + hi) / 2;
            const pt = fullPath.getPointAtLength(mid);
            if (pt.y < target.y) {
                lo = mid;
            } else {
                hi = mid;
            }
        }
        return (lo + hi) / 2;
    }, [nodePositions]);

    // ---------- MAIN ANIMATION CHOREOGRAPHY ----------
    useEffect(() => {
        if (
            nodePositions.length === 0 ||
            !containerRef.current ||
            !pathRefs.current[0] ||
            totalPathLength === 0 ||
            hasLaunchedAnim.current
        ) return;

        hasLaunchedAnim.current = true;

        const container = containerRef.current;
        const fullPath = pathRefs.current[0]!;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const finalStopIdx = findFinalStop();
        const isCinematic = shouldPlayCinematic();
        const pessoaId = getPessoaIdFromLocalStorage();

        // Pre-calculate lengths to each node
        const nodeLengths: number[] = [];
        for (let i = 0; i < nodePositions.length; i++) {
            nodeLengths.push(getLengthToNode(i));
        }

        const lengthToFinalStop = nodeLengths[finalStopIdx] || totalPathLength;
        const isFinalConcluido = jornada[finalStopIdx]?.progresso?.status === 'concluido';

        // ---- Reduced motion or quick revisit: jump to final position ----
        if (prefersReducedMotion || !isCinematic) {
            setRevealedLength(lengthToFinalStop);
            setPhase('done');
            setRestingNodeIdx(finalStopIdx);
            // Scroll to final stop
            const tgtPos = nodePositions[finalStopIdx];
            if (tgtPos) {
                const scrollTo = Math.max(0, tgtPos.y - container.clientHeight / 2 + 50);
                container.scrollTop = scrollTo;
            }
            // Mark all completed as seen
            jornada.forEach(item => {
                if (item.progresso?.status === 'concluido') {
                    const key = pessoaId
                        ? `jornada_reveal_visto_${pessoaId}_${item.id}`
                        : `jornada_reveal_visto_${item.id}`;
                    try { localStorage.setItem(key, 'true'); } catch { /* ignore */ }
                }
            });
            return;
        }

        // ---- CINEMATIC ANIMATION ----
        setPhase('animating');

        // Build a sequence of "stops" — each node from 0 to finalStopIdx
        // At each revealed/concluido stop, we pause and fire supernova.
        // At the final stop (if not concluido), we just park the star pulsing.
        interface AnimStop {
            nodeIdx: number;
            pathLength: number; // length along path to this node
            isConcluido: boolean;
            pauseDuration: number; // ms to pause at this stop
        }

        const stops: AnimStop[] = [];
        for (let i = 0; i <= finalStopIdx; i++) {
            const isConcl = jornada[i]?.progresso?.status === 'concluido';
            stops.push({
                nodeIdx: i,
                pathLength: nodeLengths[i],
                isConcluido: isConcl,
                pauseDuration: isConcl ? 800 : 0, // pause 800ms at each revealed node for supernova
            });
        }

        // Total travel segments (between consecutive stops)
        const segments: Array<{
            fromLength: number;
            toLength: number;
            travelDuration: number;
            stopAfter: AnimStop;
        }> = [];

        for (let i = 0; i < stops.length; i++) {
            const fromLen = i === 0 ? 0 : stops[i - 1].pathLength;
            const toLen = stops[i].pathLength;
            const dist = toLen - fromLen;
            // Duration proportional to distance, between 600ms and 1800ms per segment
            const dur = Math.max(600, Math.min(1800, dist * 1.2));
            segments.push({
                fromLength: fromLen,
                toLength: toLen,
                travelDuration: dur,
                stopAfter: stops[i],
            });
        }

        // Execute the sequence
        let currentSegIdx = 0;
        let segStartTime: number | null = null;
        let pauseUntil: number | null = null;

        // Initial scroll position: top
        container.scrollTop = 0;

        const animate = (timestamp: number) => {
            if (currentSegIdx >= segments.length) {
                // All segments done — park at final stop
                setPhase('done');
                setGuidingStarPos(null);
                setRestingNodeIdx(finalStopIdx);
                setRevealedLength(lengthToFinalStop);
                return;
            }

            // Are we pausing at a stop?
            if (pauseUntil !== null) {
                if (timestamp < pauseUntil) {
                    animRafRef.current = requestAnimationFrame(animate);
                    return;
                }
                // Pause over — clear supernova, advance to next segment
                setSupernovaNodes(prev => {
                    const next = new Set(prev);
                    next.delete(segments[currentSegIdx - 1]?.stopAfter.nodeIdx ?? -1);
                    return next;
                });
                pauseUntil = null;
                segStartTime = null;
            }

            const seg = segments[currentSegIdx];

            if (segStartTime === null) segStartTime = timestamp;
            const elapsed = timestamp - segStartTime;
            const rawProgress = Math.min(elapsed / seg.travelDuration, 1);
            // Ease in-out cubic
            const progress = rawProgress < 0.5
                ? 4 * rawProgress * rawProgress * rawProgress
                : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;

            const currentLength = seg.fromLength + (seg.toLength - seg.fromLength) * progress;

            // Update path reveal
            setRevealedLength(currentLength);

            // Update star position
            const pt = fullPath.getPointAtLength(currentLength);
            setGuidingStarPos({ x: pt.x, y: pt.y });

            // Sync scroll — keep star vertically centered in container
            const scrollTarget = Math.max(0, pt.y - container.clientHeight / 2 + 50);
            container.scrollTop = scrollTarget;

            if (rawProgress >= 1) {
                // Arrived at this stop
                const stop = seg.stopAfter;

                if (stop.isConcluido && stop.pauseDuration > 0) {
                    // Fire supernova at this node
                    setSupernovaNodes(prev => new Set(prev).add(stop.nodeIdx));
                    // Mark as seen in localStorage
                    const item = jornada[stop.nodeIdx];
                    if (item) {
                        const key = pessoaId
                            ? `jornada_reveal_visto_${pessoaId}_${item.id}`
                            : `jornada_reveal_visto_${item.id}`;
                        try { localStorage.setItem(key, 'true'); } catch { /* ignore */ }
                    }
                    pauseUntil = timestamp + stop.pauseDuration;
                }

                currentSegIdx++;
                segStartTime = null;
            }

            animRafRef.current = requestAnimationFrame(animate);
        };

        // Small delay to let the modal open animation finish
        const startDelay = setTimeout(() => {
            animRafRef.current = requestAnimationFrame(animate);
        }, 1200);

        return () => {
            clearTimeout(startDelay);
            if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
        };
    }, [nodePositions, totalPathLength, jornada, findFinalStop, shouldPlayCinematic, getLengthToNode]);

    // ---------- rendering ----------
    const fullPathD = buildFullPath();

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

                {/* SCROLLABLE CONTENT */}
                <div
                    ref={containerRef}
                    className="flex-1 overflow-y-auto overflow-x-hidden p-12 md:p-24 relative z-10 scrollbar-hide"
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

                            {/* SVG CONSTELLATION OVERLAY */}
                            {fullPathD && contentHeight > 0 && (
                                <svg
                                    className="absolute top-0 left-0 w-full pointer-events-none overflow-visible"
                                    style={{ height: contentHeight }}
                                >
                                    <defs>
                                        <filter id="glow-path">
                                            <feGaussianBlur stdDeviation="3" result="blur" />
                                            <feMerge>
                                                <feMergeNode in="blur" />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                    </defs>

                                    {/* Full path — dim/future portion */}
                                    <path
                                        ref={el => { pathRefs.current[0] = el; }}
                                        d={fullPathD}
                                        fill="none"
                                        stroke="rgba(185,205,240,0.15)"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                    />

                                    {/* Revealed portion — bright golden */}
                                    {totalPathLength > 0 && (
                                        <path
                                            d={fullPathD}
                                            fill="none"
                                            stroke="rgba(255,235,180,0.85)"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeDasharray={totalPathLength}
                                            strokeDashoffset={totalPathLength - revealedLength}
                                            filter="url(#glow-path)"
                                            style={{ transition: phase === 'done' ? 'stroke-dashoffset 0.5s ease' : 'none' }}
                                        />
                                    )}
                                </svg>
                            )}

                            {/* GUIDING STAR (travels during animation) */}
                            {guidingStarPos && phase === 'animating' && (
                                <div
                                    className="guiding-star"
                                    style={{
                                        left: guidingStarPos.x,
                                        top: guidingStarPos.y,
                                    }}
                                />
                            )}

                            {/* STAR NODES at each work */}
                            {nodePositions.map((pos, idx) => {
                                const item = jornada[idx];
                                if (!item) return null;
                                const isConcluido = item.progresso?.status === 'concluido';
                                const isBloqueado = idx > 0 && jornada[idx - 1].progresso?.status !== 'concluido' && !isConcluido;
                                const isAtual = !isConcluido && !isBloqueado;
                                const isResting = restingNodeIdx === idx;

                                // During animation, only show nodes that the star has already passed
                                if (phase === 'animating') {
                                    const nodeLen = getLengthToNode(idx);
                                    if (revealedLength < nodeLen - 10) return null;
                                }

                                return (
                                    <div
                                        key={`star-node-${idx}`}
                                        className={`journey-node ${isConcluido ? 'is-completed' : ''} ${isAtual ? 'is-active' : ''} ${isBloqueado ? 'is-dormant' : ''} ${isResting ? 'is-resting' : ''}`}
                                        style={{ left: pos.x, top: pos.y }}
                                    >
                                        <div className="star-ray-h" />
                                        <div className="star-ray-v" />
                                        <div className="star-core" />
                                    </div>
                                );
                            })}

                            {/* WORK CARDS */}
                            <div className="flex flex-col gap-40 relative z-10">
                                {jornada.map((item, idx) => {
                                    const isConcluido = item.progresso?.status === 'concluido';
                                    const isBloqueado = idx > 0 && jornada[idx - 1].progresso?.status !== 'concluido' && !isConcluido;
                                    const isAtual = !isConcluido && !isBloqueado;
                                    const imgUrl = getSymbolImage(item, isConcluido);
                                    const isLeft = idx % 2 === 0;
                                    const isSupernova = supernovaNodes.has(idx);

                                    return (
                                        <div
                                            key={item.id}
                                            data-jornada-row
                                            data-idx={idx}
                                            className={`flex items-center w-full ${isLeft ? 'justify-start' : 'justify-end'} relative transition-all duration-1000 ${isSupernova ? 'z-50' : 'z-10'}`}
                                        >
                                            <div className={`flex items-center gap-12 max-w-4xl relative ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                                                {/* IMAGE */}
                                                <div className="relative">
                                                    {isConcluido && (
                                                        <div className="absolute -inset-12 rounded-full blur-[60px] bg-yellow-500/8 pointer-events-none" style={{ zIndex: -1 }} />
                                                    )}
                                                    <div className={`work-image-container relative z-10 w-72 h-72 md:w-80 md:h-80 transition-all duration-[1.5s] ease-out ${
                                                        isConcluido
                                                            ? 'drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]'
                                                            : isAtual
                                                                ? 'drop-shadow-[0_0_60px_rgba(100,120,180,0.25)]'
                                                                : 'drop-shadow-[0_0_40px_rgba(100,120,180,0.1)] opacity-80'
                                                    }`}>
                                                        <div className="w-full h-full relative" style={{
                                                            maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
                                                            WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                                                        }}>
                                                            <img
                                                                src={imgUrl}
                                                                alt={item.titulo}
                                                                width={320}
                                                                height={320}
                                                                className={`work-image w-full h-full object-contain transition-all duration-[2s] ease-out ${
                                                                    isConcluido
                                                                        ? `brightness-110 drop-shadow-[0_0_20px_rgba(255,220,150,0.2)] ${isSupernova ? 'supernova-flash' : 'saturate-100'}`
                                                                        : isAtual
                                                                            ? 'grayscale brightness-[0.7] opacity-60'
                                                                            : 'grayscale brightness-[0.4] opacity-30'
                                                                }`}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* TEXT */}
                                                <div className={`journey-work-text work-text w-80 md:w-[32.5rem] text-left relative -top-8 flex flex-col justify-center transition-opacity duration-1000 ${isBloqueado ? 'opacity-60 is-locked' : 'opacity-100 is-active'}`}>
                                                    <div className="space-y-1">
                                                        <span className={`work-kicker block transition-all duration-700 ${isConcluido ? '!text-yellow-500/80' : ''} pl-6`}>
                                                            {GRAU_LABELS[item.grau]} • Nível {idx + 1}
                                                        </span>
                                                        <h3 className={`work-title text-2xl md:text-3xl font-light uppercase tracking-tighter leading-tight transition-all duration-700 ${isBloqueado ? 'text-gray-800' : 'text-white'} pl-6`}>
                                                            {isBloqueado ? 'Oculto em Trevas' : item.titulo}
                                                        </h3>
                                                    </div>

                                                    {!isBloqueado && (
                                                        <div className="work-description-wrapper pl-6 animate-in fade-in duration-1000 mt-2">
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
                    <div className="h-40" />
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Libre+Baskerville:ital@0;1&family=Spectral:ital,wght@0,300;0,400;1,400&display=swap');

                /* ======= SUPERNOVA FLASH (image-only, no layout shift) ======= */
                .supernova-flash {
                    filter: brightness(2.5) saturate(1.8) drop-shadow(0 0 60px rgba(255,255,255,0.8)) !important;
                    transition: filter 0.8s cubic-bezier(0.16, 1, 0.3, 1) !important;
                }

                /* ======= GUIDING STAR (travels along path) ======= */
                .guiding-star {
                    position: absolute;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,240,200,0.9) 40%, transparent 70%);
                    box-shadow:
                        0 0 12px 4px rgba(255,255,255,0.9),
                        0 0 30px 10px rgba(255,215,0,0.5),
                        0 0 60px 20px rgba(255,215,0,0.2);
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                    z-index: 200;
                }

                /* ======= BACKGROUND ANIMATIONS ======= */
                @keyframes galaxy-expand {
                    0% { transform: scale(1); opacity: 0.4; }
                    50% { opacity: 0.6; }
                    100% { transform: scale(1.15); opacity: 0.4; }
                }
                .animate-galaxy-expand { animation: galaxy-expand 40s linear infinite; }

                .scrollbar-hide::-webkit-scrollbar { display: none; }

                @keyframes slow-glow {
                    0%, 100% { opacity: 0.3; transform: scale(1.02); }
                    50% { opacity: 0.5; transform: scale(1.05); }
                }
                .animate-slow-glow { animation: slow-glow 15s ease-in-out infinite; }

                .journey-header-logo { width: 28px; height: 28px; object-fit: contain; flex-shrink: 0; }
                .journey-work-text { position: relative; z-index: 4; }

                /* ======= MODAL OPEN / CLOSE ======= */
                .journey-modal {
                    opacity: 0;
                    transform: scale(0.965) translateY(18px);
                    filter: blur(10px);
                    transition: opacity 0.9s ease, transform 1s cubic-bezier(0.16, 1, 0.3, 1), filter 1s ease;
                    will-change: opacity, transform, filter;
                }
                .journey-modal.is-open {
                    opacity: 1; transform: scale(1) translateY(0); filter: blur(0);
                }
                .journey-modal.is-closing {
                    opacity: 0 !important; transform: scale(0.975) translateY(10px) !important; filter: blur(8px) !important;
                    transition: opacity 0.45s ease, transform 0.5s ease, filter 0.5s ease !important;
                }

                /* ======= VEIL DISSOLVE ======= */
                .journey-modal::before {
                    content: ""; position: absolute; inset: 0; z-index: 20; pointer-events: none;
                    background: radial-gradient(circle at 38% 42%, rgba(255,255,255,0.10), transparent 0%),
                                radial-gradient(circle at center, rgba(12,16,32,0.18), rgba(0,0,0,0.88) 72%);
                    opacity: 1; backdrop-filter: blur(8px);
                    transition: opacity 1.4s ease 0.25s, backdrop-filter 1.4s ease 0.25s;
                }
                .journey-modal.is-open::before { opacity: 0; backdrop-filter: blur(0); }

                /* ======= MASONIC SYMBOL BACKDROP ======= */
                .masonic-bg-symbol {
                    opacity: 0; filter: blur(4px) drop-shadow(0 0 0 rgba(255,220,160,0)); transform: scale(0.96);
                    transition: opacity 1.2s ease 0.35s, filter 1.4s ease 0.35s, transform 1.4s ease 0.35s;
                }
                .journey-modal.is-open .masonic-bg-symbol {
                    opacity: 0.20 !important;
                    filter: blur(0) drop-shadow(0 0 12px rgba(255,220,160,0.18)) !important;
                    transform: scale(1);
                }

                /* ======= HEADER APPEARANCE ======= */
                .journey-header {
                    opacity: 0; transform: translateY(-10px); filter: blur(4px);
                    transition: opacity 0.8s ease 0.25s, transform 0.8s ease 0.25s, filter 0.8s ease 0.25s;
                    will-change: opacity, transform, filter;
                }
                .journey-modal.is-open .journey-header {
                    opacity: 1; transform: translateY(0); filter: blur(0);
                }

                /* ======= STAR NODES ======= */
                .journey-node {
                    position: absolute; width: 32px; height: 32px;
                    transform: translate(-50%, -50%); pointer-events: none; z-index: 30;
                }
                .journey-node .star-core {
                    position: absolute; left: 50%; top: 50%; width: 4px; height: 4px;
                    transform: translate(-50%, -50%); border-radius: 50%;
                    background: rgba(245, 248, 255, 0.95);
                    box-shadow: 0 0 6px rgba(245,248,255,0.9), 0 0 16px rgba(200,220,255,0.45), 0 0 30px rgba(160,190,255,0.18);
                }
                .journey-node .star-ray-h {
                    position: absolute; left: 50%; top: 50%; width: 26px; height: 1px;
                    transform: translate(-50%, -50%);
                    background: linear-gradient(to right, transparent, rgba(245,248,255,0.9), transparent);
                }
                .journey-node .star-ray-v {
                    position: absolute; left: 50%; top: 50%; width: 1px; height: 26px;
                    transform: translate(-50%, -50%);
                    background: linear-gradient(to bottom, transparent, rgba(245,248,255,0.9), transparent);
                }

                /* Dormant */
                .journey-node.is-dormant { opacity: 0.5; }
                .journey-node.is-dormant .star-core {
                    background: rgba(220,230,245,0.5);
                    box-shadow: 0 0 6px rgba(220,230,245,0.3), 0 0 15px rgba(160,185,230,0.1);
                }
                .journey-node.is-dormant .star-ray-h { background: linear-gradient(to right, transparent, rgba(200,220,255,0.25), transparent); }
                .journey-node.is-dormant .star-ray-v { background: linear-gradient(to bottom, transparent, rgba(200,220,255,0.25), transparent); }

                /* Completed */
                .journey-node.is-completed { opacity: 1; }
                .journey-node.is-completed .star-core {
                    background: rgba(255,250,220,1) !important;
                    box-shadow: 0 0 10px rgba(255,245,210,1), 0 0 26px rgba(255,225,140,0.95), 0 0 55px rgba(255,180,70,0.45) !important;
                    width: 5px !important; height: 5px !important;
                }
                .journey-node.is-completed .star-ray-h {
                    background: linear-gradient(to right, transparent, rgba(255,245,210,1), transparent) !important;
                    width: 44px !important;
                }
                .journey-node.is-completed .star-ray-v {
                    background: linear-gradient(to bottom, transparent, rgba(255,245,210,1), transparent) !important;
                    height: 44px !important;
                }

                /* Active (current) */
                .journey-node.is-active { opacity: 1; }
                .journey-node.is-active .star-core {
                    background: rgba(255,246,220,1);
                    box-shadow: 0 0 8px rgba(255,246,220,0.95), 0 0 22px rgba(255,220,150,0.58), 0 0 44px rgba(255,190,90,0.28);
                }
                .journey-node.is-active .star-ray-h { background: linear-gradient(to right, transparent, rgba(255,240,210,0.95), transparent); }
                .journey-node.is-active .star-ray-v { background: linear-gradient(to bottom, transparent, rgba(255,240,210,0.95), transparent); }

                /* Resting = "you are here" pulsing star */
                .journey-node.is-resting {
                    animation: restingPulse 2.0s ease-in-out infinite;
                }
                .journey-node.is-resting .star-core {
                    width: 7px !important; height: 7px !important;
                    background: rgba(255,250,220,1) !important;
                    box-shadow: 0 0 12px rgba(255,250,220,1), 0 0 30px rgba(255,225,140,0.9), 0 0 60px rgba(255,180,70,0.5) !important;
                }
                .journey-node.is-resting .star-ray-h {
                    width: 52px !important;
                    background: linear-gradient(to right, transparent, rgba(255,245,210,1), transparent) !important;
                }
                .journey-node.is-resting .star-ray-v {
                    height: 52px !important;
                    background: linear-gradient(to bottom, transparent, rgba(255,245,210,1), transparent) !important;
                }

                @keyframes restingPulse {
                    0% { transform: translate(-50%, -50%) scale(0.92); filter: brightness(0.9); }
                    50% { transform: translate(-50%, -50%) scale(1.25); filter: brightness(1.5); }
                    100% { transform: translate(-50%, -50%) scale(0.92); filter: brightness(0.9); }
                }

                /* ======= TEXT TYPOGRAPHY ======= */
                .work-text { text-align: left; max-width: 520px; }
                .work-kicker, .work-title, .work-description, .work-description p {
                    margin-left: 0; margin-right: 0; text-align: left;
                }
                .work-kicker {
                    font-family: "Cinzel", serif; font-size: 0.68rem;
                    letter-spacing: 0.38em; text-transform: uppercase;
                    color: rgba(210,215,230,0.52);
                }
                .work-title {
                    font-family: "Cinzel", serif; margin-bottom: 1rem;
                    color: rgba(248,248,252,0.9);
                    text-shadow: 0 0 14px rgba(255,255,255,0.08);
                }
                .work-text.is-locked .work-title { color: rgba(215,222,240,0.28) !important; opacity: 0.62; }
                .work-text.is-locked .work-kicker { color: rgba(210,218,235,0.26) !important; opacity: 0.55; }

                /* Cascading text entrance */
                .work-kicker, .work-title, .work-description {
                    opacity: 0; transform: translateY(12px); filter: blur(5px);
                }
                .journey-modal.is-open .work-kicker {
                    opacity: 1; transform: translateY(0); filter: blur(0);
                    transition: opacity 0.85s ease 0.3s, transform 0.85s ease 0.3s, filter 0.85s ease 0.3s;
                }
                .journey-modal.is-open .work-title {
                    opacity: 1; transform: translateY(0); filter: blur(0);
                    transition: opacity 0.95s ease 0.4s, transform 0.95s ease 0.4s, filter 0.95s ease 0.4s;
                }
                .journey-modal.is-open .work-description {
                    opacity: 1; transform: translateY(0); filter: blur(0);
                    transition: opacity 1.1s ease 0.5s, transform 1.1s ease 0.5s, filter 1.1s ease 0.5s;
                }

                .work-description p {
                    font-family: "Cormorant Garamond", "EB Garamond", "Spectral", serif;
                    font-size: clamp(0.9rem, 0.82vw, 1rem); line-height: 1.62;
                    letter-spacing: 0.01em; font-weight: 300;
                    color: rgba(238,240,246,0.85); margin: 0 0 0.82rem;
                }
                .work-description p:last-child { margin-bottom: 0; }

                /* ======= ACCESSIBILITY ======= */
                @media (prefers-reduced-motion: reduce) {
                    .journey-modal, .journey-modal *, .journey-modal::before {
                        animation: none !important; transition: none !important;
                    }
                }
            `}</style>
        </div>
    );
}

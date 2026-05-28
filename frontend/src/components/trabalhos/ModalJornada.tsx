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

// A point on the constellation map
interface ConstellationNode {
    x: number;
    y: number;
    isWorkNode: boolean;   // true = corresponds to a work item
    workIdx: number;       // index in jornada[] (-1 for intermediate waypoints)
}

export default function ModalJornada({ itens, tipo, onClose }: ModalJornadaProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const mainPathRef = useRef<SVGPathElement | null>(null);
    const animRafRef = useRef<number | null>(null);
    const hasLaunchedAnim = useRef(false);

    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // All constellation nodes (work nodes + intermediate waypoints)
    const [constellationNodes, setConstellationNodes] = useState<ConstellationNode[]>([]);
    // The SVG path "d" string built from straight segments
    const [pathD, setPathD] = useState('');
    const [contentHeight, setContentHeight] = useState(0);

    // Animation state
    const [phase, setPhase] = useState<'idle' | 'animating' | 'done'>('idle');
    const [guidingStarPos, setGuidingStarPos] = useState<{ x: number; y: number } | null>(null);
    const [restingNodeIdx, setRestingNodeIdx] = useState<number | null>(null);
    const [supernovaWorkIndices, setSupernovaWorkIndices] = useState<Set<number>>(new Set());
    const [revealedLength, setRevealedLength] = useState(0);
    const [totalPathLength, setTotalPathLength] = useState(0);
    // Track which constellation nodes have been "reached" by the animation
    const [reachedConstellationIdx, setReachedConstellationIdx] = useState(-1);

    // ---------- derived data ----------
    if (!itens) return null;

    const jornada = [...itens]
        .filter(i => i.tipo?.toLowerCase().includes(tipo?.toLowerCase().replace('s', '')))
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    const concluidos = jornada.filter(j => j.progresso?.status === 'concluido').length;
    const total = jornada.length;
    const progressoGlobal = total > 0 ? (concluidos / total) * 100 : 0;

    // Find the "final stop" = first non-completed work, or last if all done
    const findFinalStop = useCallback((): number => {
        for (let i = 0; i < jornada.length; i++) {
            if (jornada[i].progresso?.status !== 'concluido') return i;
        }
        return jornada.length - 1;
    }, [jornada]);

    // Should we play the full cinematic?
    const shouldPlayCinematic = useCallback((): boolean => {
        const pessoaId = getPessoaIdFromLocalStorage();
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

    // ---------- measurement & constellation building ----------
    const measureAndBuildConstellation = useCallback(() => {
        if (!containerRef.current || !contentRef.current) return;
        const container = containerRef.current;
        const content = contentRef.current;
        const contentRect = content.getBoundingClientRect();

        setContentHeight(content.scrollHeight);

        const rows = content.querySelectorAll('[data-jornada-row]');
        if (rows.length === 0) return;

        // First, find the work-node positions (anchored to images)
        const workPositions: { x: number; y: number }[] = [];

        rows.forEach((row, idx) => {
            const img = row.querySelector('.work-image-container');
            if (!img) return;
            const imgRect = img.getBoundingClientRect();
            const isLeft = idx % 2 === 0;

            let nx: number;
            const gapX = 40;
            if (isLeft) {
                nx = (imgRect.right - contentRect.left) + gapX;
            } else {
                nx = (imgRect.left - contentRect.left) - gapX;
            }
            const ny = ((imgRect.top + imgRect.bottom) / 2) - contentRect.top + (imgRect.height * 0.18);
            workPositions.push({ x: nx, y: ny });
        });

        if (workPositions.length === 0) return;

        // Build constellation: work nodes + intermediate waypoints with angular segments
        const allNodes: ConstellationNode[] = [];
        let dStr = '';

        for (let i = 0; i < workPositions.length; i++) {
            const wp = workPositions[i];

            if (i === 0) {
                // First work node
                allNodes.push({ x: wp.x, y: wp.y, isWorkNode: true, workIdx: i });
                dStr = `M ${wp.x} ${wp.y}`;
            } else {
                const prev = workPositions[i - 1];
                const curr = wp;

                // Create an angular/geometric route between prev and curr
                // using 2-3 intermediate waypoints with straight lines
                const midY = (prev.y + curr.y) / 2;
                const centerX = (contentRect.width) / 2;

                // Different angular patterns depending on direction
                const goingRight = curr.x > prev.x;

                // Waypoint 1: go down from previous, angled toward center
                const wp1x = prev.x + (goingRight ? 60 : -60);
                const wp1y = prev.y + (midY - prev.y) * 0.35;

                // Waypoint 2: move toward center column
                const wp2x = centerX + (goingRight ? -30 : 30);
                const wp2y = midY;

                // Waypoint 3: angle toward the next work node
                const wp3x = curr.x + (goingRight ? -60 : 60);
                const wp3y = curr.y - (curr.y - midY) * 0.35;

                // Add intermediate nodes
                allNodes.push({ x: wp1x, y: wp1y, isWorkNode: false, workIdx: -1 });
                allNodes.push({ x: wp2x, y: wp2y, isWorkNode: false, workIdx: -1 });
                allNodes.push({ x: wp3x, y: wp3y, isWorkNode: false, workIdx: -1 });

                // Add the work node
                allNodes.push({ x: curr.x, y: curr.y, isWorkNode: true, workIdx: i });

                // Build the path with L (line-to) commands
                dStr += ` L ${wp1x} ${wp1y}`;
                dStr += ` L ${wp2x} ${wp2y}`;
                dStr += ` L ${wp3x} ${wp3y}`;
                dStr += ` L ${curr.x} ${curr.y}`;
            }
        }

        setConstellationNodes(allNodes);
        setPathD(dStr);
    }, []);

    useLayoutEffect(() => {
        if (isOpen) measureAndBuildConstellation();
    }, [isOpen, jornada.length, measureAndBuildConstellation]);

    useEffect(() => {
        if (!isOpen) return;
        if ('fonts' in document) {
            document.fonts.ready.then(measureAndBuildConstellation);
        }
        const container = containerRef.current;
        if (!container) return;

        const ro = new ResizeObserver(measureAndBuildConstellation);
        ro.observe(container);

        const t1 = setTimeout(measureAndBuildConstellation, 400);
        const t2 = setTimeout(measureAndBuildConstellation, 1000);

        return () => { ro.disconnect(); clearTimeout(t1); clearTimeout(t2); };
    }, [isOpen, measureAndBuildConstellation]);

    // ---------- compute total path length ----------
    useEffect(() => {
        if (!mainPathRef.current || !pathD) return;
        const len = mainPathRef.current.getTotalLength();
        setTotalPathLength(len);
    }, [pathD]);

    // ---------- find length along path to a specific constellation node ----------
    const getLengthToConstellationNode = useCallback((nodeIdx: number): number => {
        if (!mainPathRef.current || nodeIdx <= 0) return 0;
        const path = mainPathRef.current;
        const totalLen = path.getTotalLength();
        const target = constellationNodes[nodeIdx];
        if (!target) return totalLen;

        // Binary search for closest point on path
        let lo = 0, hi = totalLen;
        for (let iter = 0; iter < 40; iter++) {
            const mid = (lo + hi) / 2;
            const pt = path.getPointAtLength(mid);
            if (pt.y < target.y - 1) {
                lo = mid;
            } else if (pt.y > target.y + 1) {
                hi = mid;
            } else {
                // Close enough vertically, check x
                const dx = pt.x - target.x;
                if (Math.abs(dx) < 3) break;
                // Walk in the right direction
                if (mid < totalLen * 0.99) lo = mid;
                else break;
            }
        }
        return (lo + hi) / 2;
    }, [constellationNodes]);

    // ---------- MAIN ANIMATION CHOREOGRAPHY ----------
    useEffect(() => {
        if (
            constellationNodes.length === 0 ||
            !containerRef.current ||
            !mainPathRef.current ||
            totalPathLength === 0 ||
            hasLaunchedAnim.current
        ) return;

        hasLaunchedAnim.current = true;

        const container = containerRef.current;
        const path = mainPathRef.current;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const finalStopWorkIdx = findFinalStop();
        const isCinematic = shouldPlayCinematic();
        const pessoaId = getPessoaIdFromLocalStorage();

        // Find the constellation node index for each work
        const workConstellationIndices: number[] = [];
        constellationNodes.forEach((n, i) => {
            if (n.isWorkNode) workConstellationIndices[n.workIdx] = i;
        });

        // Find constellation index for the final stop
        const finalConstellationIdx = workConstellationIndices[finalStopWorkIdx] ?? constellationNodes.length - 1;

        // Pre-calculate path lengths to each constellation node
        const nodeLengths: number[] = constellationNodes.map((_, i) => getLengthToConstellationNode(i));
        const lengthToFinalStop = nodeLengths[finalConstellationIdx] || totalPathLength;

        // ---- Quick mode (reduced motion or revisit) ----
        if (prefersReducedMotion || !isCinematic) {
            setRevealedLength(lengthToFinalStop);
            setPhase('done');
            setRestingNodeIdx(finalConstellationIdx);
            setReachedConstellationIdx(finalConstellationIdx);
            const tgtNode = constellationNodes[finalConstellationIdx];
            if (tgtNode) {
                container.scrollTop = Math.max(0, tgtNode.y - container.clientHeight / 2 + 50);
            }
            jornada.forEach(item => {
                if (item.progresso?.status === 'concluido') {
                    const key = pessoaId ? `jornada_reveal_visto_${pessoaId}_${item.id}` : `jornada_reveal_visto_${item.id}`;
                    try { localStorage.setItem(key, 'true'); } catch { /* */ }
                }
            });
            return;
        }

        // ---- CINEMATIC ----
        setPhase('animating');
        container.scrollTop = 0;

        // Build animation stops from constellation nodes (only work nodes up to finalStop)
        interface AnimStop {
            constellationIdx: number;
            pathLength: number;
            workIdx: number;
            isConcluido: boolean;
            pauseDuration: number;
        }

        const stops: AnimStop[] = [];
        for (let wi = 0; wi <= finalStopWorkIdx; wi++) {
            const ci = workConstellationIndices[wi];
            if (ci === undefined) continue;
            const isConcl = jornada[wi]?.progresso?.status === 'concluido';
            stops.push({
                constellationIdx: ci,
                pathLength: nodeLengths[ci],
                workIdx: wi,
                isConcluido: isConcl,
                pauseDuration: isConcl ? 800 : 0,
            });
        }

        // Build travel segments
        const segments: Array<{
            fromLength: number;
            toLength: number;
            fromConstellationIdx: number;
            toConstellationIdx: number;
            travelDuration: number;
            stop: AnimStop;
        }> = [];

        for (let i = 0; i < stops.length; i++) {
            const fromLen = i === 0 ? 0 : stops[i - 1].pathLength;
            const fromCI = i === 0 ? 0 : stops[i - 1].constellationIdx;
            const toLen = stops[i].pathLength;
            const dist = toLen - fromLen;
            const dur = Math.max(800, Math.min(2000, dist * 1.5));
            segments.push({
                fromLength: fromLen,
                toLength: toLen,
                fromConstellationIdx: fromCI,
                toConstellationIdx: stops[i].constellationIdx,
                travelDuration: dur,
                stop: stops[i],
            });
        }

        let currentSegIdx = 0;
        let segStartTime: number | null = null;
        let pauseUntil: number | null = null;

        const animate = (timestamp: number) => {
            if (currentSegIdx >= segments.length) {
                setPhase('done');
                setGuidingStarPos(null);
                setRestingNodeIdx(finalConstellationIdx);
                setRevealedLength(lengthToFinalStop);
                setReachedConstellationIdx(finalConstellationIdx);
                return;
            }

            // Pausing at a stop
            if (pauseUntil !== null) {
                if (timestamp < pauseUntil) {
                    animRafRef.current = requestAnimationFrame(animate);
                    return;
                }
                // Pause over — clear supernova
                const prevStop = segments[currentSegIdx - 1]?.stop;
                if (prevStop) {
                    setSupernovaWorkIndices(prev => {
                        const next = new Set(prev);
                        next.delete(prevStop.workIdx);
                        return next;
                    });
                }
                pauseUntil = null;
                segStartTime = null;
            }

            const seg = segments[currentSegIdx];
            if (segStartTime === null) segStartTime = timestamp;
            const elapsed = timestamp - segStartTime;
            const rawProgress = Math.min(elapsed / seg.travelDuration, 1);
            // Ease in-out
            const progress = rawProgress < 0.5
                ? 4 * rawProgress * rawProgress * rawProgress
                : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;

            const currentLength = seg.fromLength + (seg.toLength - seg.fromLength) * progress;
            setRevealedLength(currentLength);

            // Update guiding star position
            const pt = path.getPointAtLength(currentLength);
            setGuidingStarPos({ x: pt.x, y: pt.y });

            // Update which constellation nodes have been reached
            for (let ci = 0; ci <= seg.toConstellationIdx; ci++) {
                if (nodeLengths[ci] <= currentLength + 5) {
                    setReachedConstellationIdx(prev => Math.max(prev, ci));
                }
            }

            // Sync scroll
            const scrollTarget = Math.max(0, pt.y - container.clientHeight / 2 + 50);
            container.scrollTop = scrollTarget;

            if (rawProgress >= 1) {
                const stop = seg.stop;
                if (stop.isConcluido && stop.pauseDuration > 0) {
                    setSupernovaWorkIndices(prev => new Set(prev).add(stop.workIdx));
                    const item = jornada[stop.workIdx];
                    if (item) {
                        const key = pessoaId ? `jornada_reveal_visto_${pessoaId}_${item.id}` : `jornada_reveal_visto_${item.id}`;
                        try { localStorage.setItem(key, 'true'); } catch { /* */ }
                    }
                    pauseUntil = timestamp + stop.pauseDuration;
                }
                currentSegIdx++;
                segStartTime = null;
            }

            animRafRef.current = requestAnimationFrame(animate);
        };

        const startDelay = setTimeout(() => {
            animRafRef.current = requestAnimationFrame(animate);
        }, 1400);

        return () => {
            clearTimeout(startDelay);
            if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
        };
    }, [constellationNodes, totalPathLength, jornada, findFinalStop, shouldPlayCinematic, getLengthToConstellationNode]);

    // ---------- rendering ----------
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-700">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={handleClose}></div>

            <div className={`journey-modal ${isOpen && !isClosing ? 'is-open' : ''} ${isClosing ? 'is-closing' : ''} bg-[#020205] border border-white/10 rounded-[2.5rem] w-full max-w-7xl h-full max-h-[92vh] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,0.9)] relative z-10 flex flex-col`}>

                {/* Nebula Background */}
                <div className="absolute inset-0 opacity-50 pointer-events-none overflow-hidden">
                    <img src="https://www.portaldaordem.com.br/nebula_bg.png" alt="" className="w-full h-full object-cover scale-110 animate-galaxy-expand brightness-[1.3] saturate-[1.3]" />
                    <div className="absolute inset-0 bg-[#030612]/50 pointer-events-none" />
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
                <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-12 md:p-24 relative z-10 scrollbar-hide">
                    {jornada.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                            <div className="w-32 h-32 rounded-full border border-yellow-500/10 flex items-center justify-center p-6 opacity-20 animate-slow-glow">
                                <img src="https://www.portaldaordem.com.br/logo-gomb.png" alt="" className="w-full h-full object-contain grayscale invert" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-light text-gray-400 uppercase tracking-widest">O Firmamento está Vazio</h3>
                                <p className="text-[10px] text-gray-600 uppercase tracking-widest">Aguarde a diretoria traçar o seu caminho nas estrelas.</p>
                            </div>
                        </div>
                    ) : (
                        <div ref={contentRef} className="relative min-h-[500px]">

                            {/* SVG CONSTELLATION OVERLAY */}
                            {pathD && contentHeight > 0 && (
                                <svg className="absolute top-0 left-0 w-full pointer-events-none overflow-visible" style={{ height: contentHeight, zIndex: 5 }}>
                                    <defs>
                                        <filter id="glow-line">
                                            <feGaussianBlur stdDeviation="4" result="blur" />
                                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                        </filter>
                                        <filter id="glow-star">
                                            <feGaussianBlur stdDeviation="6" result="blur" />
                                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                        </filter>
                                    </defs>

                                    {/* Full path — dim future portion */}
                                    <path
                                        ref={mainPathRef}
                                        d={pathD}
                                        fill="none"
                                        stroke="rgba(185,205,240,0.12)"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />

                                    {/* Revealed portion — bright golden */}
                                    {totalPathLength > 0 && (
                                        <path
                                            d={pathD}
                                            fill="none"
                                            stroke="rgba(255,230,160,0.9)"
                                            strokeWidth="2.2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeDasharray={totalPathLength}
                                            strokeDashoffset={totalPathLength - revealedLength}
                                            filter="url(#glow-line)"
                                            style={{ transition: phase === 'done' ? 'stroke-dashoffset 0.5s ease' : 'none' }}
                                        />
                                    )}
                                </svg>
                            )}

                            {/* CONSTELLATION STAR NODES — at every vertex */}
                            {constellationNodes.map((node, ci) => {
                                const isReached = ci <= reachedConstellationIdx || phase === 'done';
                                const isResting = restingNodeIdx === ci && phase === 'done';
                                const isWork = node.isWorkNode;

                                // During animation, don't show nodes not yet reached
                                if (phase === 'animating' && !isReached) return null;

                                // Determine status for work nodes
                                let workStatus = '';
                                if (isWork && node.workIdx >= 0) {
                                    const s = jornada[node.workIdx]?.progresso?.status;
                                    if (s === 'concluido') workStatus = 'completed';
                                    else if (node.workIdx > 0 && jornada[node.workIdx - 1]?.progresso?.status !== 'concluido') workStatus = 'locked';
                                    else workStatus = 'active';
                                }

                                return (
                                    <div
                                        key={`cn-${ci}`}
                                        className={`constellation-star ${isWork ? 'is-work' : 'is-waypoint'} ${isReached ? 'is-reached' : 'is-dim'} ${isResting ? 'is-resting' : ''} ${workStatus ? `work-${workStatus}` : ''}`}
                                        style={{ left: node.x, top: node.y }}
                                    >
                                        <div className="cs-ray-h" />
                                        <div className="cs-ray-v" />
                                        <div className="cs-core" />
                                    </div>
                                );
                            })}

                            {/* GUIDING STAR (travels during animation) */}
                            {guidingStarPos && phase === 'animating' && (
                                <div className="guiding-star" style={{ left: guidingStarPos.x, top: guidingStarPos.y }} />
                            )}

                            {/* WORK CARDS */}
                            <div className="flex flex-col gap-40 relative z-10">
                                {jornada.map((item, idx) => {
                                    const isConcluido = item.progresso?.status === 'concluido';
                                    const isBloqueado = idx > 0 && jornada[idx - 1].progresso?.status !== 'concluido' && !isConcluido;
                                    const isAtual = !isConcluido && !isBloqueado;
                                    const imgUrl = getSymbolImage(item, isConcluido);
                                    const isLeft = idx % 2 === 0;
                                    const isSupernova = supernovaWorkIndices.has(idx);

                                    return (
                                        <div key={item.id} data-jornada-row data-idx={idx}
                                            className={`flex items-center w-full ${isLeft ? 'justify-start' : 'justify-end'} relative transition-all duration-1000 ${isSupernova ? 'z-50' : 'z-10'}`}>
                                            <div className={`flex items-center gap-12 max-w-4xl relative ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                                                {/* IMAGE */}
                                                <div className="relative">
                                                    {isConcluido && <div className="absolute -inset-12 rounded-full blur-[60px] bg-yellow-500/8 pointer-events-none" style={{ zIndex: -1 }} />}
                                                    <div className={`work-image-container relative z-10 w-72 h-72 md:w-80 md:h-80 transition-all duration-[1.5s] ease-out ${
                                                        isConcluido ? 'drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]'
                                                            : isAtual ? 'drop-shadow-[0_0_60px_rgba(100,120,180,0.25)]'
                                                                : 'drop-shadow-[0_0_40px_rgba(100,120,180,0.1)] opacity-80'
                                                    }`}>
                                                        <div className="w-full h-full relative" style={{
                                                            maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
                                                            WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                                                        }}>
                                                            <img src={imgUrl} alt={item.titulo} width={320} height={320}
                                                                className={`work-image w-full h-full object-contain transition-all duration-[2s] ease-out ${
                                                                    isConcluido ? `brightness-110 drop-shadow-[0_0_20px_rgba(255,220,150,0.2)] ${isSupernova ? 'supernova-flash' : 'saturate-100'}`
                                                                        : isAtual ? 'grayscale brightness-[0.7] opacity-60'
                                                                            : 'grayscale brightness-[0.4] opacity-30'
                                                                }`} />
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
                                                                    .split(/\r?\n\s*\r?\n/).filter(Boolean)
                                                                    .map((para, pIdx) => <p key={pIdx}>{para}</p>)}
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

                /* ======= SUPERNOVA ======= */
                .supernova-flash {
                    filter: brightness(2.8) saturate(2) drop-shadow(0 0 70px rgba(255,255,255,0.9)) !important;
                    transition: filter 0.8s cubic-bezier(0.16, 1, 0.3, 1) !important;
                }

                /* ======= GUIDING STAR ======= */
                .guiding-star {
                    position: absolute;
                    width: 18px; height: 18px; border-radius: 50%;
                    background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,240,200,0.9) 40%, transparent 70%);
                    box-shadow: 0 0 16px 6px rgba(255,255,255,0.95), 0 0 40px 14px rgba(255,215,0,0.6), 0 0 80px 30px rgba(255,215,0,0.25);
                    transform: translate(-50%, -50%);
                    pointer-events: none; z-index: 200;
                    animation: guidingPulse 0.6s ease-in-out infinite alternate;
                }
                @keyframes guidingPulse {
                    0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.85; }
                    100% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
                }

                /* ======= CONSTELLATION STARS (all vertices) ======= */
                .constellation-star {
                    position: absolute;
                    transform: translate(-50%, -50%);
                    pointer-events: none; z-index: 35;
                }

                /* Waypoint stars (intermediate vertices) — smaller */
                .constellation-star.is-waypoint { width: 24px; height: 24px; }
                .constellation-star.is-waypoint .cs-core {
                    position: absolute; left: 50%; top: 50%;
                    width: 4px; height: 4px;
                    transform: translate(-50%, -50%); border-radius: 50%;
                    background: rgba(220,230,255,0.85);
                    box-shadow: 0 0 6px rgba(220,230,255,0.7), 0 0 14px rgba(180,200,255,0.3);
                }
                .constellation-star.is-waypoint .cs-ray-h {
                    position: absolute; left: 50%; top: 50%;
                    width: 18px; height: 1px; transform: translate(-50%, -50%);
                    background: linear-gradient(to right, transparent, rgba(220,230,255,0.7), transparent);
                }
                .constellation-star.is-waypoint .cs-ray-v {
                    position: absolute; left: 50%; top: 50%;
                    width: 1px; height: 18px; transform: translate(-50%, -50%);
                    background: linear-gradient(to bottom, transparent, rgba(220,230,255,0.7), transparent);
                }

                /* Work stars — bigger and brighter */
                .constellation-star.is-work { width: 48px; height: 48px; }
                .constellation-star.is-work .cs-core {
                    position: absolute; left: 50%; top: 50%;
                    width: 7px; height: 7px;
                    transform: translate(-50%, -50%); border-radius: 50%;
                    background: rgba(255,248,220,0.95);
                    box-shadow: 0 0 8px rgba(255,248,220,0.9), 0 0 20px rgba(255,220,140,0.6), 0 0 40px rgba(255,180,70,0.3);
                }
                .constellation-star.is-work .cs-ray-h {
                    position: absolute; left: 50%; top: 50%;
                    width: 40px; height: 1px; transform: translate(-50%, -50%);
                    background: linear-gradient(to right, transparent, rgba(255,245,210,0.9), transparent);
                }
                .constellation-star.is-work .cs-ray-v {
                    position: absolute; left: 50%; top: 50%;
                    width: 1px; height: 40px; transform: translate(-50%, -50%);
                    background: linear-gradient(to bottom, transparent, rgba(255,245,210,0.9), transparent);
                }

                /* Completed work star — golden glow */
                .constellation-star.work-completed .cs-core {
                    background: rgba(255,250,200,1) !important;
                    box-shadow: 0 0 12px rgba(255,245,200,1), 0 0 28px rgba(255,220,120,0.9), 0 0 55px rgba(255,170,50,0.4) !important;
                    width: 8px !important; height: 8px !important;
                }
                .constellation-star.work-completed .cs-ray-h {
                    width: 52px !important;
                    background: linear-gradient(to right, transparent, rgba(255,240,180,1), transparent) !important;
                }
                .constellation-star.work-completed .cs-ray-v {
                    height: 52px !important;
                    background: linear-gradient(to bottom, transparent, rgba(255,240,180,1), transparent) !important;
                }

                /* Dim (not yet reached) */
                .constellation-star.is-dim { opacity: 0.35; }
                .constellation-star.is-dim .cs-core {
                    background: rgba(180,200,230,0.4) !important;
                    box-shadow: 0 0 4px rgba(180,200,230,0.2) !important;
                }

                /* Reached stars pulse */
                .constellation-star.is-reached.is-work {
                    animation: workStarPulse 2.5s ease-in-out infinite;
                }
                .constellation-star.is-reached.is-waypoint {
                    animation: waypointPulse 3s ease-in-out infinite;
                }

                @keyframes workStarPulse {
                    0%, 100% { transform: translate(-50%, -50%) scale(0.95); filter: brightness(0.92); }
                    50% { transform: translate(-50%, -50%) scale(1.12); filter: brightness(1.3); }
                }
                @keyframes waypointPulse {
                    0%, 100% { transform: translate(-50%, -50%) scale(0.92); filter: brightness(0.85); }
                    50% { transform: translate(-50%, -50%) scale(1.08); filter: brightness(1.15); }
                }

                /* RESTING star — "you are here" — bigger, stronger pulse */
                .constellation-star.is-resting {
                    animation: restingPulse 1.8s ease-in-out infinite !important;
                }
                .constellation-star.is-resting .cs-core {
                    width: 10px !important; height: 10px !important;
                    background: rgba(255,250,210,1) !important;
                    box-shadow: 0 0 15px rgba(255,250,210,1), 0 0 35px rgba(255,225,120,0.95), 0 0 70px rgba(255,180,50,0.5) !important;
                }
                .constellation-star.is-resting .cs-ray-h {
                    width: 64px !important;
                    background: linear-gradient(to right, transparent, rgba(255,245,200,1), transparent) !important;
                }
                .constellation-star.is-resting .cs-ray-v {
                    height: 64px !important;
                    background: linear-gradient(to bottom, transparent, rgba(255,245,200,1), transparent) !important;
                }

                @keyframes restingPulse {
                    0% { transform: translate(-50%, -50%) scale(0.88); filter: brightness(0.85); }
                    50% { transform: translate(-50%, -50%) scale(1.3); filter: brightness(1.6); }
                    100% { transform: translate(-50%, -50%) scale(0.88); filter: brightness(0.85); }
                }

                /* ======= BACKGROUND ======= */
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

                /* ======= MODAL OPEN/CLOSE ======= */
                .journey-modal {
                    opacity: 0; transform: scale(0.965) translateY(18px); filter: blur(10px);
                    transition: opacity 0.9s ease, transform 1s cubic-bezier(0.16,1,0.3,1), filter 1s ease;
                    will-change: opacity, transform, filter;
                }
                .journey-modal.is-open { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
                .journey-modal.is-closing {
                    opacity: 0 !important; transform: scale(0.975) translateY(10px) !important; filter: blur(8px) !important;
                    transition: opacity 0.45s ease, transform 0.5s ease, filter 0.5s ease !important;
                }
                .journey-modal::before {
                    content: ""; position: absolute; inset: 0; z-index: 20; pointer-events: none;
                    background: radial-gradient(circle at 38% 42%, rgba(255,255,255,0.10), transparent 0%),
                                radial-gradient(circle at center, rgba(12,16,32,0.18), rgba(0,0,0,0.88) 72%);
                    opacity: 1; backdrop-filter: blur(8px);
                    transition: opacity 1.4s ease 0.25s, backdrop-filter 1.4s ease 0.25s;
                }
                .journey-modal.is-open::before { opacity: 0; backdrop-filter: blur(0); }
                .masonic-bg-symbol {
                    opacity: 0; filter: blur(4px); transform: scale(0.96);
                    transition: opacity 1.2s ease 0.35s, filter 1.4s ease 0.35s, transform 1.4s ease 0.35s;
                }
                .journey-modal.is-open .masonic-bg-symbol {
                    opacity: 0.20 !important; filter: blur(0) drop-shadow(0 0 12px rgba(255,220,160,0.18)) !important; transform: scale(1);
                }
                .journey-header {
                    opacity: 0; transform: translateY(-10px); filter: blur(4px);
                    transition: opacity 0.8s ease 0.25s, transform 0.8s ease 0.25s, filter 0.8s ease 0.25s;
                }
                .journey-modal.is-open .journey-header { opacity: 1; transform: translateY(0); filter: blur(0); }

                /* ======= TYPOGRAPHY ======= */
                .work-text { text-align: left; max-width: 520px; }
                .work-kicker, .work-title, .work-description, .work-description p { margin-left: 0; margin-right: 0; text-align: left; }
                .work-kicker { font-family: "Cinzel", serif; font-size: 0.68rem; letter-spacing: 0.38em; text-transform: uppercase; color: rgba(210,215,230,0.52); }
                .work-title { font-family: "Cinzel", serif; margin-bottom: 1rem; color: rgba(248,248,252,0.9); text-shadow: 0 0 14px rgba(255,255,255,0.08); }
                .work-text.is-locked .work-title { color: rgba(215,222,240,0.28) !important; opacity: 0.62; }
                .work-text.is-locked .work-kicker { color: rgba(210,218,235,0.26) !important; opacity: 0.55; }
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

                @media (prefers-reduced-motion: reduce) {
                    .journey-modal, .journey-modal *, .journey-modal::before {
                        animation: none !important; transition: none !important;
                    }
                }
            `}</style>
        </div>
    );
}

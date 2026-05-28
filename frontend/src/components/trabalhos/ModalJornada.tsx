'use client';

import { useEffect, useRef, useState, useCallback, useLayoutEffect, useMemo } from 'react';

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

interface ConstellationNode {
    x: number;
    y: number;
    isWorkNode: boolean;
    workIdx: number;
}

export default function ModalJornada({ itens, tipo, onClose }: ModalJornadaProps) {
    // ===== REFS =====
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const mainPathRef = useRef<SVGPathElement | null>(null);
    const revealedPathRef = useRef<SVGPathElement | null>(null);
    const guidingStarRef = useRef<HTMLDivElement | null>(null);
    const animRafRef = useRef<number>(0);
    const hasLaunchedAnim = useRef(false);
    const nodeLengthsRef = useRef<number[]>([]);

    // ===== STATE =====
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [constellationNodes, setConstellationNodes] = useState<ConstellationNode[]>([]);
    const [pathD, setPathD] = useState('');
    const [contentHeight, setContentHeight] = useState(0);
    const [totalPathLength, setTotalPathLength] = useState(0);
    // Final state (set only at animation END or for reduced-motion)
    const [phase, setPhase] = useState<'idle' | 'animating' | 'done'>('idle');
    const [restingNodeIdx, setRestingNodeIdx] = useState<number | null>(null);
    const [finalRevealedLen, setFinalRevealedLen] = useState(0);
    const [finalReachedCI, setFinalReachedCI] = useState(-1);

    // ===== MEMOIZED DATA (CRITICAL: prevents useEffect cleanup killing animation) =====
    const jornada = useMemo(() => {
        if (!itens || itens.length === 0) return [] as JornadaItem[];
        return [...itens]
            .filter(i => i.tipo?.toLowerCase().includes(tipo?.toLowerCase().replace('s', '')))
            .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    }, [itens, tipo]);

    const concluidos = useMemo(() => jornada.filter(j => j.progresso?.status === 'concluido').length, [jornada]);
    const total = jornada.length;
    const progressoGlobal = total > 0 ? (concluidos / total) * 100 : 0;

    const findFinalStop = useCallback((): number => {
        for (let i = 0; i < jornada.length; i++) {
            if (jornada[i].progresso?.status !== 'concluido') return i;
        }
        return Math.max(0, jornada.length - 1);
    }, [jornada]);

    const getSymbolImage = useCallback((item: JornadaItem, isConcluido?: boolean) => {
        const title = item.titulo.toLowerCase();
        if (title.includes('iniciação')) return isConcluido ? IMAGE_MAP['iniciação'] : 'https://www.portaldaordem.com.br/initiation_dark.png';
        if (title.includes('dualidade') || title.includes('mosaico') || title.includes('piso')) {
            return isConcluido ? 'https://www.portaldaordem.com.br/fellowcraft_light.png' : 'https://www.portaldaordem.com.br/fellowcraft_dark.png';
        }
        if (item.grau === 1) return IMAGE_MAP['aprendiz'];
        if (item.grau === 2) return IMAGE_MAP['companheiro'];
        return IMAGE_MAP['mestre'];
    }, []);

    // ===== OPEN / CLOSE =====
    useEffect(() => {
        const t = setTimeout(() => setIsOpen(true), 50);
        return () => clearTimeout(t);
    }, []);

    const handleClose = useCallback(() => {
        setIsClosing(true);
        if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
        setTimeout(onClose, 500);
    }, [onClose]);

    // ===== MEASUREMENT & CONSTELLATION BUILDING =====
    const measureAndBuild = useCallback(() => {
        if (!containerRef.current || !contentRef.current) return;
        const content = contentRef.current;
        const contentRect = content.getBoundingClientRect();
        setContentHeight(content.scrollHeight);

        const rows = content.querySelectorAll('[data-jornada-row]');
        if (rows.length === 0) return;

        const workPositions: { x: number; y: number }[] = [];
        rows.forEach((row, idx) => {
            const img = row.querySelector('.work-image-wrapper');
            if (!img) return;
            const imgRect = img.getBoundingClientRect();
            const isLeft = idx % 2 === 0;
            const gapX = 40;
            const nx = isLeft
                ? (imgRect.right - contentRect.left) + gapX
                : (imgRect.left - contentRect.left) - gapX;
            const ny = ((imgRect.top + imgRect.bottom) / 2) - contentRect.top + (imgRect.height * 0.18);
            workPositions.push({ x: nx, y: ny });
        });

        if (workPositions.length === 0) return;

        // Build constellation path with straight segments (M + L only)
        const allNodes: ConstellationNode[] = [];
        let dStr = '';

        for (let i = 0; i < workPositions.length; i++) {
            const wp = workPositions[i];
            if (i === 0) {
                allNodes.push({ x: wp.x, y: wp.y, isWorkNode: true, workIdx: i });
                dStr = `M ${wp.x} ${wp.y}`;
            } else {
                const prev = workPositions[i - 1];
                const curr = wp;
                const midY = (prev.y + curr.y) / 2;
                const centerX = contentRect.width / 2;
                const goingRight = curr.x > prev.x;

                // 3 intermediate waypoints forming angular constellation path
                const wp1x = prev.x + (goingRight ? 60 : -60);
                const wp1y = prev.y + (midY - prev.y) * 0.35;
                const wp2x = centerX + (goingRight ? -30 : 30);
                const wp2y = midY;
                const wp3x = curr.x + (goingRight ? -60 : 60);
                const wp3y = curr.y - (curr.y - midY) * 0.35;

                allNodes.push({ x: wp1x, y: wp1y, isWorkNode: false, workIdx: -1 });
                allNodes.push({ x: wp2x, y: wp2y, isWorkNode: false, workIdx: -1 });
                allNodes.push({ x: wp3x, y: wp3y, isWorkNode: false, workIdx: -1 });
                allNodes.push({ x: curr.x, y: curr.y, isWorkNode: true, workIdx: i });

                dStr += ` L ${wp1x} ${wp1y} L ${wp2x} ${wp2y} L ${wp3x} ${wp3y} L ${curr.x} ${curr.y}`;
            }
        }
        setConstellationNodes(allNodes);
        setPathD(dStr);
    }, []);

    useLayoutEffect(() => {
        if (isOpen) measureAndBuild();
    }, [isOpen, jornada.length, measureAndBuild]);

    useEffect(() => {
        if (!isOpen) return;
        if ('fonts' in document) document.fonts.ready.then(measureAndBuild);
        const container = containerRef.current;
        if (!container) return;
        const ro = new ResizeObserver(measureAndBuild);
        ro.observe(container);
        const t1 = setTimeout(measureAndBuild, 400);
        const t2 = setTimeout(measureAndBuild, 1000);
        return () => { ro.disconnect(); clearTimeout(t1); clearTimeout(t2); };
    }, [isOpen, measureAndBuild]);

    // ===== PATH LENGTH COMPUTATION =====
    useEffect(() => {
        if (!mainPathRef.current || !pathD || constellationNodes.length === 0) return;
        const len = mainPathRef.current.getTotalLength();
        setTotalPathLength(len);

        // Cumulative straight-line distances, scaled to match SVG path length
        const cumLens: number[] = [0];
        let cum = 0;
        for (let i = 1; i < constellationNodes.length; i++) {
            const p = constellationNodes[i - 1], c = constellationNodes[i];
            cum += Math.sqrt((c.x - p.x) ** 2 + (c.y - p.y) ** 2);
            cumLens.push(cum);
        }
        const rawTotal = cum || 1;
        for (let i = 0; i < cumLens.length; i++) cumLens[i] = (cumLens[i] / rawTotal) * len;
        nodeLengthsRef.current = cumLens;
    }, [pathD, constellationNodes]);

    // ===== ANIMATION (all DOM updates via refs — no setState in the rAF loop) =====
    useEffect(() => {
        if (
            constellationNodes.length === 0 ||
            !containerRef.current ||
            !mainPathRef.current ||
            totalPathLength === 0
        ) return;

        let isCancelled = false;

        const container = containerRef.current;
        const svgPath = mainPathRef.current;
        const revealedPath = revealedPathRef.current;
        const guidingStar = guidingStarRef.current;
        const content = contentRef.current;

        if (!revealedPath || !guidingStar || !content) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const finalStopWorkIdx = findFinalStop();
        const pessoaId = getPessoaIdFromLocalStorage();
        const nodeLens = nodeLengthsRef.current;

        // Map work index → constellation index
        const workCI: number[] = [];
        constellationNodes.forEach((n, i) => { if (n.isWorkNode) workCI[n.workIdx] = i; });
        const finalCI = workCI[finalStopWorkIdx] ?? constellationNodes.length - 1;
        const lenToFinal = nodeLens[finalCI] || totalPathLength;

        // --- DOM helpers (no React setState) ---
        let highestReached = -1;

        function revealStarsUpTo(ci: number) {
            for (let k = highestReached + 1; k <= ci; k++) {
                const el = content!.querySelector(`[data-star="${k}"]`);
                if (el) { el.classList.remove('is-dim'); el.classList.add('is-reached'); }
            }
            if (ci > highestReached) highestReached = ci;
        }

        function setResting(ci: number) {
            const el = content!.querySelector(`[data-star="${ci}"]`);
            if (el) el.classList.add('is-resting');
        }

        function triggerSupernova(ci: number) {
            const starEl = content!.querySelector(`[data-star="${ci}"]`);
            if (starEl) {
                starEl.classList.add('supernova-flash');
                setTimeout(() => starEl.classList.remove('supernova-flash'), 900);
            }
        }

        function revealWork(workIdx: number) {
            const el = content!.querySelector(`[data-work-idx="${workIdx}"]`);
            if (el) el.classList.add('is-revealed');
        }

        function markSeen(workIdx: number) {
            const item = jornada[workIdx];
            if (!item) return;
            const key = pessoaId
                ? `jornada_reveal_visto_${pessoaId}_${item.id}`
                : `jornada_reveal_visto_${item.id}`;
            try { localStorage.setItem(key, 'true'); } catch { /* */ }
        }

        function updatePath(len: number) {
            revealedPath!.setAttribute('stroke-dashoffset', String(totalPathLength - len));
        }

        function moveGuidingStar(len: number) {
            const pt = svgPath!.getPointAtLength(Math.min(len, totalPathLength));
            if (guidingStar) {
                guidingStar.style.left = pt.x + 'px';
                guidingStar.style.top = pt.y + 'px';
            }
        }

        function scrollTo(y: number) {
            container!.scrollTop = Math.max(0, y - container!.clientHeight / 2 + 50);
        }



        // === CINEMATIC ANIMATION ===
        setPhase('animating');
        updatePath(0); // start with nothing revealed
        moveGuidingStar(0);
        
        if (guidingStar) guidingStar.style.display = 'block';

        // 1. Instantly snap to top so the user always sees the journey from the beginning
        container.scrollTop = 0;

        // Build stops at work nodes
        interface Stop { ci: number; pathLen: number; workIdx: number; isConcl: boolean; pauseMs: number; }
        const stops: Stop[] = [];
        for (let wi = 0; wi <= finalStopWorkIdx; wi++) {
            const ci = workCI[wi];
            if (ci === undefined) continue;
            const isConcl = jornada[wi]?.progresso?.status === 'concluido';
            stops.push({ ci, pathLen: nodeLens[ci], workIdx: wi, isConcl, pauseMs: isConcl ? 700 : 0 });
        }

        // Build travel segments between consecutive stops
        interface Segment { fromLen: number; toLen: number; toCI: number; dur: number; stop: Stop; }
        const segs: Segment[] = [];
        for (let i = 0; i < stops.length; i++) {
            const fromLen = i === 0 ? 0 : stops[i - 1].pathLen;
            const toLen = stops[i].pathLen;
            const dist = toLen - fromLen;
            // Slower animation: at least 3s, up to 10s per segment
            const dur = dist < 1 ? 200 : Math.max(3000, Math.min(10000, dist * 5.0));
            segs.push({ fromLen, toLen, toCI: stops[i].ci, dur, stop: stops[i] });
        }

        let segIdx = 0;
        let segStart: number | null = null;
        let pauseEnd: number | null = null;
        
        const finalY = constellationNodes[finalCI].y;
        const targetScroll = Math.max(0, finalY - container.clientHeight / 2 + 50);

        function scrollToProportional(len: number) {
            if (lenToFinal <= 0) return;
            const progress = Math.min(1, len / lenToFinal);
            container!.scrollTop = progress * targetScroll;
        }

        function finishAnim() {
            if (guidingStar) guidingStar.style.display = 'none';
            updatePath(lenToFinal);
            revealStarsUpTo(finalCI);
            setResting(finalCI);
            if (constellationNodes[finalCI]) {
                container!.scrollTo({
                    top: targetScroll,
                    behavior: 'smooth'
                });
            }
            setPhase('done');
            setRestingNodeIdx(finalCI);
            setFinalRevealedLen(lenToFinal);
            setFinalReachedCI(finalCI);
        }

        function frame(ts: number) {
            if (isCancelled) return;
            if (segIdx >= segs.length) { finishAnim(); return; }

            // Pausing at a stop?
            if (pauseEnd !== null) {
                if (ts < pauseEnd) { animRafRef.current = requestAnimationFrame(frame); return; }
                pauseEnd = null;
                segStart = null;
                if (guidingStar) guidingStar.style.opacity = '1';
            }

            const seg = segs[segIdx];
            if (segStart === null) segStart = ts;

            const elapsed = ts - segStart;
            const rawP = Math.min(elapsed / seg.dur, 1);
            // Cubic ease-in-out
            const p = rawP < 0.5 ? 4 * rawP ** 3 : 1 - (-2 * rawP + 2) ** 3 / 2;

            const curLen = seg.fromLen + (seg.toLen - seg.fromLen) * p;

            // Update DOM directly (no setState)
            updatePath(curLen);
            moveGuidingStar(curLen);

            // Reveal stars as the line passes them
            for (let ci = 0; ci < constellationNodes.length; ci++) {
                if (nodeLens[ci] <= curLen + 5) revealStarsUpTo(ci);
            }

            // Sync scroll
            scrollToProportional(curLen);

            // Segment complete?
            if (rawP >= 1) {
                const stop = seg.stop;
                // Always reveal the work when reached
                revealWork(stop.workIdx);
                if (stop.isConcl && stop.pauseMs > 0) {
                    triggerSupernova(stop.ci);
                    markSeen(stop.workIdx);
                    pauseEnd = ts + stop.pauseMs;
                    if (guidingStar) guidingStar.style.opacity = '0';
                }
                segIdx++;
                segStart = null;
            }

            animRafRef.current = requestAnimationFrame(frame);
        }

        // Start after modal fade-in completes
        const startTimer = setTimeout(() => {
            // If the first stop is at position 0, handle the initial reveal immediately
            if (stops.length > 0 && stops[0].pathLen < 1) {
                revealStarsUpTo(stops[0].ci);
                moveGuidingStar(0);
                revealWork(stops[0].workIdx);
                if (stops[0].isConcl) {
                    triggerSupernova(stops[0].ci);
                    markSeen(stops[0].workIdx);
                }
                // Wait a beat for the first supernova, then animate the rest
                setTimeout(() => {
                    segIdx = 0; // Fix: DO NOT SKIP the first segment
                    segStart = null;
                    if (segIdx < segs.length) {
                        animRafRef.current = requestAnimationFrame(frame);
                    } else {
                        finishAnim();
                    }
                }, 800);
            } else {
                animRafRef.current = requestAnimationFrame(frame);
            }
        }, 1300);

        return () => {
            isCancelled = true;
            clearTimeout(startTimer);
            if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
        };
    }, [constellationNodes, totalPathLength, findFinalStop, jornada]);
    // ^ jornada is now memoized so this dep array is STABLE across renders

    // ===== RENDER =====

    // Work status helper
    const getWorkStatus = useCallback((idx: number): 'concluido' | 'bloqueado' | 'atual' => {
        const item = jornada[idx];
        if (item?.progresso?.status === 'concluido') return 'concluido';
        if (idx > 0 && jornada[idx - 1]?.progresso?.status !== 'concluido') return 'bloqueado';
        return 'atual';
    }, [jornada]);

    if (!itens || jornada.length === 0) {
        // Early return only AFTER all hooks have been called
        return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6">
                <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={onClose} />
                <div className="bg-[#020205] border border-white/10 rounded-[2.5rem] p-12 text-center z-10">
                    <h3 className="text-2xl font-light text-gray-400 uppercase tracking-widest">O Firmamento está Vazio</h3>
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-2">Aguarde a diretoria traçar o seu caminho nas estrelas.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-700">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={handleClose} />

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
                    <div ref={contentRef} className="relative min-h-[500px]">

                        {/* SVG CONSTELLATION OVERLAY */}
                        {pathD && contentHeight > 0 && (
                            <svg className="absolute top-0 left-0 w-full pointer-events-none overflow-visible" style={{ height: contentHeight, zIndex: 5 }}>
                                <defs>
                                    <filter id="glow-line-soft">
                                        <feGaussianBlur stdDeviation="8" result="blur" />
                                        <feComponentTransfer in="blur" result="glow">
                                            <feFuncA type="linear" slope="0.7"/>
                                        </feComponentTransfer>
                                        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
                                    </filter>
                                </defs>

                                {/* Full path — very subtle dim future line */}
                                <path
                                    ref={mainPathRef}
                                    d={pathD}
                                    fill="none"
                                    stroke="rgba(150,180,220,0.05)"
                                    strokeWidth="1"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />

                                {/* Revealed portion — golden ethereal glow */}
                                <path
                                    ref={revealedPathRef}
                                    d={pathD}
                                    fill="none"
                                    stroke="rgba(255,225,140,0.25)"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeDasharray={totalPathLength || 1}
                                    strokeDashoffset={totalPathLength || 1}
                                    filter="url(#glow-line-soft)"
                                />

                                {/* Done-state: show final revealed portion via React state */}
                                {phase === 'done' && finalRevealedLen > 0 && (
                                    <path
                                        d={pathD}
                                        fill="none"
                                        stroke="rgba(255,225,140,0.25)"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeDasharray={totalPathLength}
                                        strokeDashoffset={totalPathLength - finalRevealedLen}
                                        filter="url(#glow-line-soft)"
                                    />
                                )}
                            </svg>
                        )}

                        {/* GUIDING STAR — always in DOM, visibility controlled by animation */}
                        <div ref={guidingStarRef} className="guiding-star" style={{ display: 'none' }}>
                            <div className="cs-ray-h" />
                            <div className="cs-ray-v" />
                            <div className="cs-core" />
                        </div>

                        {/* CONSTELLATION STAR NODES — always rendered, toggled via classList */}
                        {constellationNodes.map((node, ci) => {
                            const isWork = node.isWorkNode;
                            let workStatus = '';
                            if (isWork && node.workIdx >= 0) {
                                const s = getWorkStatus(node.workIdx);
                                workStatus = s === 'concluido' ? 'work-completed' : s === 'bloqueado' ? 'work-locked' : 'work-active';
                            }
                            // In done state, use React state for final display
                            const isReachedFinal = phase === 'done' && ci <= finalReachedCI;
                            const isRestingFinal = phase === 'done' && restingNodeIdx === ci;

                            return (
                                <div
                                    key={`star-${ci}`}
                                    data-star={ci}
                                    className={`constellation-star ${isWork ? 'is-work' : 'is-waypoint'} ${isReachedFinal ? 'is-reached' : 'is-dim'} ${isRestingFinal ? 'is-resting' : ''} ${workStatus}`}
                                    style={{ left: node.x, top: node.y }}
                                >
                                    <div className="cs-ray-h" />
                                    <div className="cs-ray-v" />
                                    <div className="cs-core" />
                                </div>
                            );
                        })}

                        {/* WORK CARDS */}
                        <div className="flex flex-col gap-40 relative z-10">
                            {jornada.map((item, idx) => {
                                const status = getWorkStatus(idx);
                                const isConcluido = status === 'concluido';
                                const isBloqueado = status === 'bloqueado';
                                const isAtual = status === 'atual';
                                const imgUrl = getSymbolImage(item, isConcluido);
                                const isLeft = idx % 2 === 0;

                                return (
                                    <div key={item.id} data-jornada-row data-work-idx={idx}
                                        className={`flex items-center w-full ${isLeft ? 'justify-start' : 'justify-end'} relative z-10 ${phase === 'done' ? 'is-revealed' : ''} ${isAtual ? 'is-atual' : ''} ${isBloqueado ? 'is-bloqueado' : ''}`}>
                                        <div className={`flex items-center gap-12 max-w-4xl relative ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                                            {/* IMAGE */}
                                            <div className="relative">
                                                {isConcluido && <div className="absolute -inset-12 rounded-full blur-[60px] bg-yellow-500/8 pointer-events-none" style={{ zIndex: -1 }} />}
                                                <div className="work-image-wrapper relative z-10 w-72 h-72 md:w-80 md:h-80">
                                                    <div className="w-full h-full relative" style={{
                                                        maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
                                                        WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                                                    }}>
                                                        <img src={imgUrl} alt={item.titulo} width={320} height={320}
                                                            className="work-image w-full h-full object-contain" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* TEXT */}
                                            <div className="journey-work-text work-text w-80 md:w-[32.5rem] text-left relative -top-8 flex flex-col justify-center">
                                                <div className="space-y-1">
                                                    <span className={`work-kicker block transition-colors duration-700 ${isConcluido ? '!text-yellow-500/80' : ''} pl-6`}>
                                                        {GRAU_LABELS[item.grau]} • Nível {idx + 1}
                                                    </span>
                                                    <h3 className={`work-title text-2xl md:text-3xl font-light uppercase tracking-tighter leading-tight transition-colors duration-700 ${isBloqueado ? 'text-gray-800' : 'text-white'} pl-6`}>
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
                    <div className="h-40" />
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Libre+Baskerville:ital@0;1&family=Spectral:ital,wght@0,300;0,400;1,400&display=swap');

                /* ======= DYNAMIC ROW REVEAL CSS ======= */
                [data-jornada-row] .work-image-wrapper {
                    filter: grayscale(100%) brightness(0.2);
                    opacity: 0;
                    transition: filter 2.5s ease, opacity 2.5s ease, transform 2.5s ease;
                    transform: scale(0.95);
                }
                [data-jornada-row] .journey-work-text {
                    opacity: 0;
                    transform: translateY(20px);
                    transition: opacity 2s ease, transform 2s ease;
                }

                /* REVEALED + COMPLETED */
                [data-jornada-row].is-revealed:not(.is-atual):not(.is-bloqueado) .work-image-wrapper {
                    filter: grayscale(0%) brightness(1) drop-shadow(0 0 30px rgba(255,220,150,0.15));
                    opacity: 1;
                    transform: scale(1);
                }
                [data-jornada-row].is-revealed:not(.is-atual):not(.is-bloqueado) .journey-work-text {
                    opacity: 1;
                    transform: translateY(0);
                }

                /* REVEALED + ATUAL (Current Work) */
                [data-jornada-row].is-revealed.is-atual .work-image-wrapper {
                    filter: grayscale(100%) brightness(0.8) drop-shadow(0 0 40px rgba(100,120,180,0.25));
                    opacity: 0.7;
                    transform: scale(1);
                }
                [data-jornada-row].is-revealed.is-atual .journey-work-text {
                    opacity: 1;
                    transform: translateY(0);
                }

                /* REVEALED + BLOQUEADO (Future Works) */
                [data-jornada-row].is-revealed.is-bloqueado .work-image-wrapper {
                    filter: grayscale(100%) brightness(0.3);
                    opacity: 0.3;
                    transform: scale(0.98);
                }
                [data-jornada-row].is-revealed.is-bloqueado .journey-work-text {
                    opacity: 0.5;
                    transform: translateY(0);
                }

                /* ======= SUPERNOVA FLASH (ON THE STAR) ======= */
                .supernova-flash .cs-core {
                    transform: translate(-50%, -50%) scale(3) !important;
                    filter: brightness(2) drop-shadow(0 0 50px rgba(255,255,255,1)) !important;
                    transition: transform 0.2s ease-out, filter 0.2s ease-out !important;
                }
                .supernova-flash .cs-ray-h, .supernova-flash .cs-ray-v {
                    transform: translate(-50%, -50%) scale(1.5) !important;
                    opacity: 1 !important;
                    transition: transform 0.2s ease-out, opacity 0.2s ease-out !important;
                }

                /* ======= GUIDING STAR & WAYPOINTS ======= */
                .guiding-star, .constellation-star {
                    position: absolute;
                    width: 40px; height: 40px;
                    transform: translate(-50%, -50%);
                    pointer-events: none; z-index: 200;
                }
                .guiding-star {
                    animation: guidingBurn 4s ease-in-out infinite alternate;
                    transition: opacity 0.6s ease-out;
                }
                .cs-core {
                    position: absolute; left: 50%; top: 50%;
                    width: 4px; height: 4px;
                    transform: translate(-50%, -50%); border-radius: 50%;
                    background: rgba(255,255,255,0.5);
                    box-shadow: 0 0 10px 4px rgba(255,230,150,0.3);
                    transition: all 2s ease;
                }
                .cs-ray-h, .cs-ray-v {
                    position: absolute; left: 50%; top: 50%;
                    background: linear-gradient(to right, transparent, rgba(255,230,150,0.3), transparent);
                    transition: all 2s ease;
                }
                .cs-ray-h { width: 30px; height: 1px; transform: translate(-50%, -50%); }
                .cs-ray-v { width: 1px; height: 30px; transform: translate(-50%, -50%); }

                @keyframes guidingBurn {
                    0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.6; }
                    100% { transform: translate(-50%, -50%) scale(1.05); opacity: 0.9; }
                }

                /* ======= BACKGROUND ======= */
                @keyframes galaxy-expand {
                    0% { transform: scale(1); opacity: 0.4; }
                    50% { opacity: 0.6; }
                    100% { transform: scale(1.15); opacity: 0.4; }
                }
                .animate-galaxy-expand { animation: galaxy-expand 40s linear infinite; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .journey-header-logo { width: 28px; height: 28px; object-fit: contain; flex-shrink: 0; }
                .journey-work-text { position: relative; z-index: 4; }

                /* ======= MODAL OPEN / CLOSE ======= */
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

                /* ======= CONSTELLATION STARS ======= */
                .constellation-star {
                    position: absolute;
                    transform: translate(-50%, -50%);
                    pointer-events: none; z-index: 35;
                }
                .constellation-star.is-work { width: 44px; height: 44px; }
                
                .constellation-star.is-dim { opacity: 0.2; }
                .constellation-star.is-reached { opacity: 0.8; }
                
                .constellation-star.is-reached.is-work { animation: workStarPulse 5s ease-in-out infinite; }
                
                @keyframes workStarPulse {
                    0%, 100% { transform: translate(-50%, -50%) scale(0.9); filter: brightness(0.8); }
                    50% { transform: translate(-50%, -50%) scale(1.05); filter: brightness(1.1); }
                }

                .constellation-star.is-resting { animation: restingPulse 4s ease-in-out infinite !important; }
                .constellation-star.is-work.is-resting .cs-core {
                    background: rgba(255,255,255,0.9);
                    box-shadow: 0 0 12px 6px rgba(255,230,150,0.7), 0 0 35px 15px rgba(255,200,50,0.3);
                }
                .constellation-star.is-resting .cs-ray-h {
                    width: 50px; opacity: 1; background: linear-gradient(to right, transparent, rgba(255,230,150,0.6), transparent);
                }
                .constellation-star.is-work.is-resting .cs-ray-v {
                    height: 50px; opacity: 1; background: linear-gradient(to bottom, transparent, rgba(255,230,150,0.6), transparent);
                }
                @keyframes restingPulse {
                    0%, 100% { transform: translate(-50%, -50%) scale(0.85); filter: brightness(0.8); }
                    50% { transform: translate(-50%, -50%) scale(1.15); filter: brightness(1.4); }
                }

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

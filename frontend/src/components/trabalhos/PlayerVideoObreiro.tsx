'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Material {
    id: number;
    conteudo_id: number;
    tipo: string;
    nome_arquivo: string;
    url: string;
    titulo: string | null;
    descricao: string | null;
    ordem: number;
    duracao_segundos: number | null;
}

interface Progresso {
    material_id: number;
    tipo: string;
    max_segundos_assistidos: number;
    progresso_percentual: number;
    concluido: number;
}

interface PlayerVideoObreiroProps {
    videos: Material[];
    pessoaId: number;
    conteudoId: number;
    onComplete: () => void;
}

export default function PlayerVideoObreiro({ videos, pessoaId, conteudoId, onComplete }: PlayerVideoObreiroProps) {
    const [progressos, setProgressos] = useState<Record<number, Progresso>>({});
    const [videoAtualIdx, setVideoAtualIdx] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Refs para uso dentro do setInterval sem causar re-render loops
    const progressosRef = useRef<Record<number, Progresso>>({});
    const videoAtualIdxRef = useRef(0);
    const pessoaIdRef = useRef(pessoaId);
    const conteudoIdRef = useRef(conteudoId);

    const sortedVideos = [...videos].sort((a, b) => a.ordem - b.ordem);
    const videoAtual = sortedVideos[videoAtualIdx];

    // Manter refs atualizados
    useEffect(() => { progressosRef.current = progressos; }, [progressos]);
    useEffect(() => { videoAtualIdxRef.current = videoAtualIdx; }, [videoAtualIdx]);

    // Load progressos do backend
    useEffect(() => {
        const fetchProgresso = async () => {
            if (!conteudoId || !pessoaId || videos.length === 0) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const res = await fetch(`/api/trabalhos/progresso-material/${conteudoId}/${pessoaId}`);
                if (res.ok) {
                    const data: any[] = await res.json();
                    const progMap: Record<number, Progresso> = {};
                    data.forEach(p => {
                        if (p.tipo === 'video') {
                            progMap[p.material_id] = {
                                material_id: p.material_id,
                                tipo: p.tipo,
                                max_segundos_assistidos: p.max_segundos_assistidos || 0,
                                progresso_percentual: p.progresso_percentual || 0,
                                concluido: p.concluido || 0
                            };
                        }
                    });
                    setProgressos(progMap);
                    progressosRef.current = progMap;

                    // Encontrar o ultimo video nao concluido
                    let startIdx = 0;
                    const sorted = [...videos].sort((a, b) => a.ordem - b.ordem);
                    for (let i = 0; i < sorted.length; i++) {
                        const prog = progMap[sorted[i].id];
                        if (!prog || !prog.concluido) {
                            startIdx = i;
                            break;
                        }
                        if (i === sorted.length - 1 && prog.concluido) {
                            startIdx = i;
                        }
                    }
                    setVideoAtualIdx(startIdx);
                    videoAtualIdxRef.current = startIdx;
                }
            } catch (e) {
                console.error("Erro ao buscar progresso:", e);
            }
            setIsLoading(false);
        };
        fetchProgresso();
    }, [conteudoId, pessoaId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Quando muda o vídeo, posicionar no tempo correto
    useEffect(() => {
        if (!videoAtual || !videoRef.current) return;
        const prog = progressosRef.current[videoAtual.id];
        if (prog && prog.max_segundos_assistidos > 0 && !prog.concluido) {
            // Aguardar o video carregar para setar o currentTime
            const setTime = () => {
                if (videoRef.current) {
                    videoRef.current.currentTime = prog.max_segundos_assistidos;
                }
            };
            if (videoRef.current.readyState >= 2) {
                setTime();
            } else {
                videoRef.current.addEventListener('loadeddata', setTime, { once: true });
            }
        }
    }, [videoAtual?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Intervalo de salvamento — usa SOMENTE refs, nunca recria o intervalo
    useEffect(() => {
        const saveInterval = setInterval(async () => {
            const video = videoRef.current;
            if (!video || video.paused || video.ended) return;

            const sorted = [...videos].sort((a, b) => a.ordem - b.ordem);
            const idx = videoAtualIdxRef.current;
            const currentVideo = sorted[idx];
            if (!currentVideo) return;

            const current = video.currentTime;
            const duration = video.duration || 1;
            if (current <= 0) return;

            const prog = progressosRef.current[currentVideo.id];
            const jaConcluido = prog?.concluido === 1 || prog?.progresso_percentual >= 95;
            if (jaConcluido) return;

            const percent = Math.floor((current / duration) * 100);

            try {
                const resp = await fetch('/api/trabalhos/progresso-video', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        conteudo_id: conteudoIdRef.current,
                        pessoa_id: pessoaIdRef.current,
                        material_id: currentVideo.id,
                        percentual: percent,
                        segundos_assistidos: Math.floor(current),
                        duracao_segundos: Math.floor(duration)
                    })
                });

                if (resp.ok) {
                    // Atualizar ref e state
                    const novoProg: Progresso = {
                        ...(progressosRef.current[currentVideo.id] || { material_id: currentVideo.id, tipo: 'video', max_segundos_assistidos: 0, progresso_percentual: 0, concluido: 0 }),
                        max_segundos_assistidos: Math.max(progressosRef.current[currentVideo.id]?.max_segundos_assistidos || 0, Math.floor(current)),
                        progresso_percentual: percent
                    };
                    progressosRef.current = { ...progressosRef.current, [currentVideo.id]: novoProg };
                    setProgressos(prev => ({ ...prev, [currentVideo.id]: novoProg }));
                    console.log(`✅ Progresso salvo: ${Math.floor(current)}s (${percent}%)`);
                } else {
                    console.error(`❌ Erro ao salvar progresso: HTTP ${resp.status}`);
                }
            } catch (e) {
                console.error("❌ Erro de rede ao salvar progresso:", e);
            }
        }, 5000);

        return () => clearInterval(saveInterval);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps — NUNCA recriar o intervalo

    const handleTimeUpdate = () => {
        if (!videoRef.current || !videoAtual) return;

        const current = videoRef.current.currentTime;
        const prog = progressosRef.current[videoAtual.id];
        const videoJaConcluido = prog?.concluido === 1 || prog?.progresso_percentual >= 95;

        if (!videoJaConcluido) {
            const maxWatched = prog?.max_segundos_assistidos || 0;
            // Anti-skip: não deixar avançar mais de 2s além do máximo já assistido
            if (current > maxWatched + 2) {
                videoRef.current.currentTime = maxWatched;
            }
        }
    };

    const handleVideoEnded = async () => {
        if (!videoAtual) return;
        const duration = videoRef.current?.duration || 1;

        try {
            await fetch('/api/trabalhos/progresso-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conteudo_id: conteudoId,
                    pessoa_id: pessoaId,
                    material_id: videoAtual.id,
                    percentual: 100,
                    segundos_assistidos: Math.floor(duration),
                    duracao_segundos: Math.floor(duration)
                })
            });

            const novoProg: Progresso = {
                ...(progressosRef.current[videoAtual.id] || { material_id: videoAtual.id, tipo: 'video', max_segundos_assistidos: 0, progresso_percentual: 0, concluido: 0 }),
                max_segundos_assistidos: Math.floor(duration),
                progresso_percentual: 100,
                concluido: 1
            };
            progressosRef.current = { ...progressosRef.current, [videoAtual.id]: novoProg };
            setProgressos(prev => ({ ...prev, [videoAtual.id]: novoProg }));

            if (videoAtualIdx < sortedVideos.length - 1) {
                setVideoAtualIdx(videoAtualIdx + 1);
            } else {
                onComplete();
            }
        } catch (e) {
            console.error("Erro ao salvar conclusao do video:", e);
        }
    };

    if (isLoading) {
        return <div className="h-64 flex items-center justify-center text-gray-500 animate-pulse uppercase tracking-widest text-xs font-bold">Carregando Modulo...</div>;
    }

    if (sortedVideos.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-3xl opacity-30 mb-3">🎬</span>
                <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Nenhum video cadastrado</p>
            </div>
        );
    }

    const todosConcluidos = sortedVideos.every(v => progressosRef.current[v.id]?.concluido);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Player Principal */}
            <div className="lg:col-span-2 space-y-4">
                <div className="bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative group">
                    <video
                        ref={videoRef}
                        src={videoAtual?.id ? `/api/trabalhos/materiais/${videoAtual.id}/arquivo?download=false` : undefined}
                        controls
                        controlsList="nodownload"
                        className="w-full aspect-video bg-black"
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleVideoEnded}
                    />

                    {!progressos[videoAtual?.id]?.concluido && (
                        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-black/60 backdrop-blur-sm border border-yellow-500/20 px-3 py-1.5 rounded-lg">
                                <span className="text-yellow-500 text-[9px] font-bold uppercase tracking-widest">Estudo Protegido</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Titulo e status */}
                <div className="space-y-3">
                    <h3 className="text-white font-bold text-lg">{videoAtual?.titulo || videoAtual?.nome_arquivo}</h3>

                    {!progressos[videoAtual?.id]?.concluido && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                            <span className="text-yellow-500 text-sm flex-shrink-0">ℹ</span>
                            <p className="text-yellow-400/80 text-[11px] uppercase tracking-widest font-bold">
                                Assista ao vídeo completo para liberar a próxima etapa.
                            </p>
                        </div>
                    )}

                    {progressos[videoAtual?.id]?.concluido === 1 && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                            <span className="text-green-400 text-lg">✅</span>
                            <p className="text-green-400/80 text-[11px] uppercase tracking-widest font-bold">
                                Vídeo concluído.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Lista de Videos */}
            <div className="space-y-3">
                <h4 className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Sequência de Vídeos ({sortedVideos.length})</h4>
                <div className="space-y-2">
                    {sortedVideos.map((v, idx) => {
                        const prog = progressos[v.id];
                        const concluido = prog?.concluido === 1;
                        const isAtual = idx === videoAtualIdx;
                        const podeAcessar = idx === 0 || progressos[sortedVideos[idx - 1]?.id]?.concluido === 1;

                        return (
                            <button
                                key={v.id}
                                onClick={() => podeAcessar && setVideoAtualIdx(idx)}
                                disabled={!podeAcessar}
                                className={`w-full text-left p-3 rounded-xl border transition-all ${
                                    isAtual
                                        ? 'bg-yellow-500/15 border-yellow-500/40'
                                        : podeAcessar
                                            ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                                            : 'bg-white/[0.01] border-white/5 opacity-40 cursor-not-allowed'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                                        concluido ? 'bg-green-500/20 text-green-400' :
                                        isAtual ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-white/5 text-gray-500'
                                    }`}>
                                        {concluido ? '✓' : isAtual ? '▶' : '○'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-xs font-semibold truncate ${isAtual ? 'text-yellow-300' : 'text-gray-300'}`}>
                                            {v.titulo || v.nome_arquivo}
                                        </p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                                            Vídeo {idx + 1}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

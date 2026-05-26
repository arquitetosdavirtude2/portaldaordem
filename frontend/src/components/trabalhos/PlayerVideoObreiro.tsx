'use client';

import { useState, useRef, useEffect } from 'react';

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

    // Ref que rastreia o máximo assistido EM TEMPO REAL (independente do banco)
    // É o "teto" do anti-skip e é o que mandamos para o banco a cada 5s
    const maxWatchedRef = useRef(0);

    // Refs para o intervalo usar sem causar re-render
    const progressosRef = useRef<Record<number, Progresso>>({});
    const videoAtualIdxRef = useRef(0);
    const sortedVideosRef = useRef<Material[]>([]);

    const sortedVideos = [...videos].sort((a, b) => a.ordem - b.ordem);
    const videoAtual = sortedVideos[videoAtualIdx];

    // Manter refs sincronizados
    useEffect(() => {
        progressosRef.current = progressos;
    }, [progressos]);
    useEffect(() => {
        videoAtualIdxRef.current = videoAtualIdx;
    }, [videoAtualIdx]);
    useEffect(() => {
        sortedVideosRef.current = sortedVideos;
    }, [sortedVideos.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // Carregar progresso do banco ao montar
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

                    // Ir para o primeiro vídeo não concluído
                    const sorted = [...videos].sort((a, b) => a.ordem - b.ordem);
                    let startIdx = 0;
                    for (let i = 0; i < sorted.length; i++) {
                        const prog = progMap[sorted[i].id];
                        if (!prog || !prog.concluido) { startIdx = i; break; }
                        if (i === sorted.length - 1 && prog.concluido) startIdx = i;
                    }
                    setVideoAtualIdx(startIdx);
                    videoAtualIdxRef.current = startIdx;

                    // Inicializar maxWatchedRef e posicionar o vídeo com os dados REAIS do banco
                    const vidAtual = sorted[startIdx];
                    if (vidAtual) {
                        const progAtual = progMap[vidAtual.id];
                        const tempoSalvo = progAtual?.max_segundos_assistidos || 0;
                        maxWatchedRef.current = progAtual?.concluido ? 999999 : tempoSalvo;

                        // Setar o currentTime agora que temos os dados — com listener caso o vídeo não carregou ainda
                        if (tempoSalvo > 0 && !progAtual?.concluido) {
                            const applyTime = () => {
                                if (videoRef.current) {
                                    videoRef.current.currentTime = tempoSalvo;
                                    console.log(`▶️ Retomando vídeo em ${tempoSalvo}s`);
                                }
                            };
                            if (videoRef.current && videoRef.current.readyState >= 2) {
                                applyTime();
                            } else if (videoRef.current) {
                                videoRef.current.addEventListener('loadeddata', applyTime, { once: true });
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Erro ao buscar progresso:", e);
            }
            setIsLoading(false);
        };
        fetchProgresso();
    }, [conteudoId, pessoaId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Quando troca de vídeo, reposicionar e resetar maxWatched
    useEffect(() => {
        if (!videoAtual) return;
        const prog = progressosRef.current[videoAtual.id];

        if (prog?.concluido) {
            maxWatchedRef.current = 999999; // Liberado totalmente
        } else {
            maxWatchedRef.current = prog?.max_segundos_assistidos || 0;
        }

        const setTime = () => {
            if (!videoRef.current) return;
            if (prog && !prog.concluido && prog.max_segundos_assistidos > 0) {
                videoRef.current.currentTime = prog.max_segundos_assistidos;
            } else if (!prog || !prog.concluido) {
                videoRef.current.currentTime = 0;
            }
        };

        if (videoRef.current) {
            if (videoRef.current.readyState >= 2) {
                setTime();
            } else {
                videoRef.current.addEventListener('loadeddata', setTime, { once: true });
            }
        }
    }, [videoAtual?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // handleTimeUpdate: anti-skip baseado em maxWatchedRef (sem tocar no banco)
    const handleTimeUpdate = () => {
        if (!videoRef.current || !videoAtual) return;
        const current = videoRef.current.currentTime;
        const prog = progressosRef.current[videoAtual.id];
        const jaConcluido = prog?.concluido === 1;

        if (!jaConcluido) {
            const max = maxWatchedRef.current;
            if (current > max + 2) {
                // Tentativa de avançar além do que assistiu — voltar
                videoRef.current.currentTime = max;
                return;
            }
            // Atualizar o máximo em tempo real
            if (current > max) {
                maxWatchedRef.current = current;
            }
        }
    };

    // Intervalo de salvamento — criado UMA VEZ, usa refs, não bloqueia o vídeo
    useEffect(() => {
        const saveInterval = setInterval(() => {
            const video = videoRef.current;
            if (!video || video.paused || video.ended) return;

            const sorted = sortedVideosRef.current;
            const idx = videoAtualIdxRef.current;
            const currentVideo = sorted[idx];
            if (!currentVideo) return;

            const prog = progressosRef.current[currentVideo.id];
            if (prog?.concluido === 1) return;

            // Capturar os valores AGORA, antes do await
            const segundosSalvar = Math.floor(maxWatchedRef.current);
            const duracao = Math.floor(video.duration || 1);
            const percent = Math.floor((segundosSalvar / duracao) * 100);

            if (segundosSalvar <= 0) return;

            // Salvar sem await para não bloquear (fire-and-forget com callback)
            fetch('/api/trabalhos/progresso-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conteudo_id: conteudoId,
                    pessoa_id: pessoaId,
                    material_id: currentVideo.id,
                    percentual: percent,
                    segundos_assistidos: segundosSalvar,
                    duracao_segundos: duracao
                })
            }).then(resp => {
                if (resp.ok) {
                    // Atualizar apenas o estado React para UI (não afeta o anti-skip)
                    const novoProg: Progresso = {
                        ...(progressosRef.current[currentVideo.id] || {
                            material_id: currentVideo.id, tipo: 'video',
                            max_segundos_assistidos: 0, progresso_percentual: 0, concluido: 0
                        }),
                        max_segundos_assistidos: segundosSalvar,
                        progresso_percentual: percent
                    };
                    progressosRef.current = { ...progressosRef.current, [currentVideo.id]: novoProg };
                    setProgressos(prev => ({ ...prev, [currentVideo.id]: novoProg }));
                    console.log(`✅ Salvo no banco: ${segundosSalvar}s (${percent}%)`);
                } else {
                    console.error(`❌ Erro HTTP ${resp.status} ao salvar progresso`);
                }
            }).catch(e => console.error("❌ Erro de rede:", e));

        }, 5000);

        return () => clearInterval(saveInterval);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps — intervalo estável, nunca recriado

    const handleVideoEnded = async () => {
        if (!videoAtual) return;
        const duration = videoRef.current?.duration || 1;
        maxWatchedRef.current = 999999;

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
            console.error("Erro ao salvar conclusão:", e);
        }
    };

    if (isLoading) {
        return <div className="h-64 flex items-center justify-center text-gray-500 animate-pulse uppercase tracking-widest text-xs font-bold">Carregando Módulo...</div>;
    }

    if (sortedVideos.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-3xl opacity-30 mb-3">🎬</span>
                <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Nenhum vídeo cadastrado</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                        <div className="absolute top-4 left-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-black/60 backdrop-blur-sm border border-yellow-500/20 px-3 py-1.5 rounded-lg">
                                <span className="text-yellow-500 text-[9px] font-bold uppercase tracking-widest">Estudo Protegido</span>
                            </div>
                        </div>
                    )}
                </div>

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
                            <p className="text-green-400/80 text-[11px] uppercase tracking-widest font-bold">Vídeo concluído.</p>
                        </div>
                    )}
                </div>
            </div>

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
                                    isAtual ? 'bg-yellow-500/15 border-yellow-500/40' :
                                    podeAcessar ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]' :
                                    'bg-white/[0.01] border-white/5 opacity-40 cursor-not-allowed'
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
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Vídeo {idx + 1}</p>
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

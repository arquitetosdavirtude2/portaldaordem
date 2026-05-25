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
    onComplete: () => void; // Called when ALL videos are completed
}

export default function PlayerVideoObreiro({ videos, pessoaId, conteudoId, onComplete }: PlayerVideoObreiroProps) {
    const [progressos, setProgressos] = useState<Record<number, Progresso>>({});
    const [videoAtualIdx, setVideoAtualIdx] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [maxWatched, setMaxWatched] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const sortedVideos = [...videos].sort((a, b) => a.ordem - b.ordem);
    const videoAtual = sortedVideos[videoAtualIdx];

    // Load progressos do backend
    useEffect(() => {
        const fetchProgresso = async () => {
            if (!conteudoId || !pessoaId || videos.length === 0) {
                // Estado normal sem videos
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
                    
                    // Encontrar o ultimo video disponivel (nao concluido) que tem o anterior concluido
                    let startIdx = 0;
                    for (let i = 0; i < sortedVideos.length; i++) {
                        const prog = progMap[sortedVideos[i].id];
                        if (!prog || !prog.concluido) {
                            startIdx = i;
                            break;
                        }
                        if (i === sortedVideos.length - 1 && prog.concluido) {
                            startIdx = i; // Todos concluidos, mostra o ultimo
                        }
                    }
                    setVideoAtualIdx(startIdx);
                }
            } catch (e) {
                console.error("Erro ao buscar progresso:", e);
            }
            setIsLoading(false);
        };
        fetchProgresso();
    }, [conteudoId, pessoaId]);

    // Reset maxWatched when video changes
    useEffect(() => {
        if (videoAtual) {
            const prog = progressos[videoAtual.id];
            setMaxWatched(prog?.max_segundos_assistidos || 0);
            if (videoRef.current && prog?.max_segundos_assistidos) {
                // Ao carregar, se o video nao esta concluido, comeca do maximo assistido.
                // Se concluido, comeca do 0.
                videoRef.current.currentTime = prog.concluido ? 0 : prog.max_segundos_assistidos;
            }
        }
    }, [videoAtualIdx, progressos, videoAtual]);

    const handleTimeUpdate = () => {
        if (!videoRef.current || !videoAtual) return;
        
        const current = videoRef.current.currentTime;
        const duration = videoRef.current.duration || 1;
        const prog = progressos[videoAtual.id];
        const isConcluido = prog?.concluido === 1;

        if (!isConcluido) {
            // Anti-skip logic
            if (current > maxWatched + 2) {
                videoRef.current.currentTime = maxWatched;
                return;
            }

            if (current > maxWatched) {
                setMaxWatched(current);
            }
        }
    };

    // Save progress periodically (e.g., every 5 seconds)
    useEffect(() => {
        if (!videoAtual) return;
        
        const saveInterval = setInterval(async () => {
            if (!videoRef.current || videoRef.current.paused) return;
            
            const current = videoRef.current.currentTime;
            const duration = videoRef.current.duration || 1;
            const isConcluido = progressos[videoAtual.id]?.concluido === 1;
            
            if (!isConcluido && maxWatched > 0) {
                const percent = Math.floor((maxWatched / duration) * 100);
                
                try {
                    await fetch('/api/trabalhos/progresso-material', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            pessoa_id: pessoaId,
                            material_id: videoAtual.id,
                            max_segundos_assistidos: Math.floor(maxWatched),
                            progresso_percentual: percent,
                            concluido: 0
                        })
                    });
                    
                    // Update local state
                    setProgressos(prev => ({
                        ...prev,
                        [videoAtual.id]: {
                            ...prev[videoAtual.id],
                            max_segundos_assistidos: Math.floor(maxWatched),
                            progresso_percentual: percent
                        } as Progresso
                    }));
                } catch (e) {
                    console.error("Erro ao salvar progresso periodico:", e);
                }
            }
        }, 5000);

        return () => clearInterval(saveInterval);
    }, [videoAtual, maxWatched, pessoaId, progressos]);

    const handleVideoEnded = async () => {
        if (!videoAtual) return;
        const duration = videoRef.current?.duration || 1;

        try {
            await fetch('/api/trabalhos/progresso-material', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pessoa_id: pessoaId,
                    material_id: videoAtual.id,
                    max_segundos_assistidos: Math.floor(duration),
                    progresso_percentual: 100,
                    concluido: 1
                })
            });

            setProgressos(prev => ({
                ...prev,
                [videoAtual.id]: {
                    ...prev[videoAtual.id],
                    max_segundos_assistidos: Math.floor(duration),
                    progresso_percentual: 100,
                    concluido: 1
                } as Progresso
            }));

            // Check if there are more videos
            if (videoAtualIdx < sortedVideos.length - 1) {
                setVideoAtualIdx(videoAtualIdx + 1);
            } else {
                // All videos completed
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

    const todosConcluidos = sortedVideos.every(v => progressos[v.id]?.concluido);

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
                        autoPlay
                    />
                    
                    {!progressos[videoAtual?.id]?.concluido && (
                        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-black/60 backdrop-blur-sm border border-yellow-500/20 px-3 py-1.5 rounded-lg">
                                <span className="text-yellow-500 text-[9px] font-bold uppercase tracking-widest">Estudo Protegido</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
                    <h2 className="text-white font-bold text-lg mb-1">{videoAtual?.titulo || videoAtual?.nome_arquivo}</h2>
                    {videoAtual?.descricao && (
                        <p className="text-gray-400 text-xs">{videoAtual.descricao}</p>
                    )}
                    
                    {!progressos[videoAtual?.id]?.concluido && (
                        <div className="mt-4 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 rounded-lg">
                            <span className="text-yellow-500">ℹ️</span>
                            <span className="text-yellow-500/80 text-[10px] font-bold uppercase tracking-widest">
                                Assista ao video completo para liberar a proxima etapa.
                            </span>
                        </div>
                    )}
                    {progressos[videoAtual?.id]?.concluido === 1 && (
                        <div className="mt-4 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
                            <span className="text-emerald-500">✅</span>
                            <span className="text-emerald-500/80 text-[10px] font-bold uppercase tracking-widest">
                                Video assistido e concluido.
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Lista Lateral */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col h-full max-h-[600px]">
                <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                    Sequencia de Videos ({sortedVideos.length})
                </h3>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {sortedVideos.map((v, idx) => {
                        const prog = progressos[v.id];
                        const isConcluido = prog?.concluido === 1;
                        
                        // O video esta liberado se for o primeiro, se estiver concluido, ou se o anterior estiver concluido
                        const isLiberado = idx === 0 || isConcluido || progressos[sortedVideos[idx - 1]?.id]?.concluido === 1;
                        const isAtivo = idx === videoAtualIdx;

                        return (
                            <div 
                                key={v.id}
                                onClick={() => {
                                    if (isLiberado) setVideoAtualIdx(idx);
                                }}
                                className={`p-3 rounded-xl border transition-all ${
                                    isAtivo 
                                        ? 'bg-yellow-500/10 border-yellow-500/30 cursor-default' 
                                        : isLiberado 
                                            ? 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04] cursor-pointer' 
                                            : 'bg-black/20 border-transparent opacity-40 cursor-not-allowed'
                                }`}
                            >
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center shrink-0">
                                        {isConcluido ? (
                                            <span className="text-emerald-500 text-xs">✅</span>
                                        ) : isLiberado ? (
                                            <span className={isAtivo ? 'text-yellow-500 text-xs' : 'text-gray-400 text-xs'}>▶</span>
                                        ) : (
                                            <span className="text-gray-600 text-xs">🔒</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-bold truncate ${isAtivo ? 'text-yellow-500' : 'text-gray-300'}`}>
                                            {v.titulo || `Video ${idx + 1}`}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[8px] text-gray-500 uppercase tracking-widest">
                                                Video {idx + 1}
                                            </span>
                                            {v.duracao_segundos && (
                                                <>
                                                    <span className="text-gray-700">·</span>
                                                    <span className="text-[8px] text-gray-500">
                                                        {Math.floor(v.duracao_segundos / 60)}:{(v.duracao_segundos % 60).toString().padStart(2, '0')}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {isAtivo && !isConcluido && (
                                    <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-yellow-500 transition-all duration-300" 
                                            style={{ width: `${prog?.progresso_percentual || 0}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {todosConcluidos && (
                    <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                        <span className="block text-emerald-500 text-[10px] font-bold uppercase tracking-widest mb-1">Modulo Concluido</span>
                        <span className="block text-emerald-500/70 text-[9px]">Avance para a proxima etapa</span>
                        <button 
                            onClick={onComplete}
                            className="mt-3 w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all"
                        >
                            Avancar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

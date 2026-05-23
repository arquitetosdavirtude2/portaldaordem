'use client';

import { useState, useEffect } from 'react';

interface Material {
    id: number;
    conteudo_id: number;
    tipo: string;
    nome_arquivo: string;
    url: string;
    titulo: string | null;
    descricao: string | null;
    ordem: number;
}

interface Progresso {
    material_id: number;
    tipo: string;
    progresso_percentual: number;
    concluido: number;
}

interface LeitorMateriaisObreiroProps {
    materiais: Material[];
    pessoaId: number;
    conteudoId: number;
    onComplete: () => void;
}

export default function LeitorMateriaisObreiro({ materiais, pessoaId, conteudoId, onComplete }: LeitorMateriaisObreiroProps) {
    const [progressos, setProgressos] = useState<Record<number, Progresso>>({});
    const [materialAtualIdx, setMaterialAtualIdx] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const sortedMateriais = [...materiais].sort((a, b) => a.ordem - b.ordem);
    const materialAtual = sortedMateriais[materialAtualIdx];

    useEffect(() => {
        const fetchProgresso = async () => {
            if (!conteudoId || !pessoaId || materiais.length === 0) {
                // Estado normal sem materiais
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
                        if (p.tipo === 'pdf' || p.tipo === 'docx') {
                            progMap[p.material_id] = {
                                material_id: p.material_id,
                                tipo: p.tipo,
                                progresso_percentual: p.progresso_percentual || 0,
                                concluido: p.concluido || 0
                            };
                        }
                    });
                    setProgressos(progMap);
                    
                    // Encontrar o ultimo material disponivel
                    let startIdx = 0;
                    for (let i = 0; i < sortedMateriais.length; i++) {
                        const prog = progMap[sortedMateriais[i].id];
                        if (!prog || !prog.concluido) {
                            startIdx = i;
                            break;
                        }
                        if (i === sortedMateriais.length - 1 && prog.concluido) {
                            startIdx = i; 
                        }
                    }
                    setMaterialAtualIdx(startIdx);
                }
            } catch (e) {
                console.error("Erro ao buscar progresso:", e);
            }
            setIsLoading(false);
        };
        fetchProgresso();
    }, [conteudoId, pessoaId]);

    const handleMarcarLido = async () => {
        if (!materialAtual) return;

        try {
            await fetch('/api/trabalhos/progresso-material', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pessoa_id: pessoaId,
                    material_id: materialAtual.id,
                    max_segundos_assistidos: 0,
                    progresso_percentual: 100,
                    concluido: 1
                })
            });

            setProgressos(prev => ({
                ...prev,
                [materialAtual.id]: {
                    ...prev[materialAtual.id],
                    progresso_percentual: 100,
                    concluido: 1
                } as Progresso
            }));

            // Check if there are more
            if (materialAtualIdx < sortedMateriais.length - 1) {
                setMaterialAtualIdx(materialAtualIdx + 1);
            } else {
                onComplete();
            }
        } catch (e) {
            console.error("Erro ao marcar lido:", e);
        }
    };

    if (isLoading) {
        return <div className="h-64 flex items-center justify-center text-gray-500 animate-pulse uppercase tracking-widest text-xs font-bold">Carregando Materiais...</div>;
    }

    if (sortedMateriais.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-3xl opacity-30 mb-3">📄</span>
                <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Nenhum material de apoio cadastrado</p>
            </div>
        );
    }

    const todosConcluidos = sortedMateriais.every(m => progressos[m.id]?.concluido);
    const materialAtualConcluido = progressos[materialAtual?.id]?.concluido === 1;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[80vh]">
            {/* Leitor Principal */}
            <div className="lg:col-span-3 flex flex-col space-y-4 h-full">
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-white font-bold text-lg">{materialAtual?.titulo || materialAtual?.nome_arquivo}</h2>
                        {materialAtual?.descricao && <p className="text-gray-400 text-xs mt-1">{materialAtual.descricao}</p>}
                    </div>
                    <div>
                        {materialAtualConcluido ? (
                            <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-2">
                                <span>✅</span> Lido
                            </div>
                        ) : (
                            <button
                                onClick={handleMarcarLido}
                                className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                            >
                                Marcar Material como Lido
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative min-h-[400px]">
                    {materialAtual?.tipo === 'pdf' ? (
                        <iframe 
                            src={`${materialAtual.url}#toolbar=0`} 
                            className="w-full h-full border-none bg-white"
                            title={materialAtual.titulo || "PDF Viewer"}
                        />
                    ) : materialAtual?.tipo === 'docx' ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[#0a0a0a]">
                            <span className="text-5xl opacity-50 mb-4">📝</span>
                            <h3 className="text-lg font-bold text-gray-200 mb-2">{materialAtual.titulo || materialAtual.nome_arquivo}</h3>
                            <p className="text-sm text-gray-500 max-w-md">
                                A visualização direta de arquivos Word (DOCX) será implementada em uma etapa futura.
                            </p>
                            <p className="text-xs text-yellow-500/70 mt-4 px-4 py-2 border border-yellow-500/20 rounded-lg bg-yellow-500/5">
                                Você pode marcar este material como lido para prosseguir com o estudo.
                            </p>
                            <a 
                                href={materialAtual.url} 
                                download
                                target="_blank" 
                                rel="noreferrer"
                                className="mt-6 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-gray-300 transition-all border border-white/10"
                            >
                                Baixar Arquivo DOCX
                            </a>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-gray-500">Formato não suportado para visualização interna.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Lista Lateral */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col h-full overflow-hidden">
                <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-4 shrink-0">
                    Materiais de Apoio ({sortedMateriais.length})
                </h3>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {sortedMateriais.map((m, idx) => {
                        const prog = progressos[m.id];
                        const isConcluido = prog?.concluido === 1;
                        
                        const isLiberado = idx === 0 || isConcluido || progressos[sortedMateriais[idx - 1]?.id]?.concluido === 1;
                        const isAtivo = idx === materialAtualIdx;

                        return (
                            <div 
                                key={m.id}
                                onClick={() => {
                                    if (isLiberado) setMaterialAtualIdx(idx);
                                }}
                                className={`p-3 rounded-xl border transition-all ${
                                    isAtivo 
                                        ? 'bg-cyan-500/10 border-cyan-500/30 cursor-default' 
                                        : isLiberado 
                                            ? 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04] cursor-pointer' 
                                            : 'bg-black/20 border-transparent opacity-40 cursor-not-allowed'
                                }`}
                            >
                                <div className="flex gap-3 items-center">
                                    <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center shrink-0">
                                        {isConcluido ? (
                                            <span className="text-emerald-500 text-xs">✅</span>
                                        ) : isLiberado ? (
                                            <span className={isAtivo ? 'text-cyan-500 text-xs' : 'text-gray-400 text-xs'}>📖</span>
                                        ) : (
                                            <span className="text-gray-600 text-xs">🔒</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-bold truncate ${isAtivo ? 'text-cyan-500' : 'text-gray-300'}`}>
                                            {m.titulo || `Material ${idx + 1}`}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[8px] text-gray-500 uppercase tracking-widest">
                                                {m.tipo}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {todosConcluidos && (
                    <div className="mt-4 shrink-0 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                        <span className="block text-emerald-500 text-[10px] font-bold uppercase tracking-widest mb-1">Materiais Lidos</span>
                        <span className="block text-emerald-500/70 text-[9px]">Você concluiu esta etapa</span>
                        <button 
                            onClick={onComplete}
                            className="mt-3 w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all"
                        >
                            Ir para o Quiz
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

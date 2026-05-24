'use client';

import { useState, useEffect } from 'react';

interface Pergunta {
    id: number;
    tipo: 'livre' | 'lacunas' | 'multipla_escolha';
    pergunta: string;
    texto: string;
    lacunas: number[];
    alternativas: string[];
}

interface QuizObreiroProps {
    quizzes: any[];
    pessoaId: number;
    conteudoId: number;
    onComplete: (status: string) => void;
}

export default function QuizObreiro({ quizzes, pessoaId, conteudoId, onComplete }: QuizObreiroProps) {
    const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
    const [respostasLivre, setRespostasLivre] = useState<Record<number, string>>({});
    const [respostasLacunas, setRespostasLacunas] = useState<Record<number, Record<number, string>>>({});
    const [respostasMultipla, setRespostasMultipla] = useState<Record<number, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [hasResponded, setHasResponded] = useState(false);
    const [statusQuiz, setStatusQuiz] = useState<string>('');

    useEffect(() => {
        if (quizzes && quizzes.length > 0) {
            const parsed = quizzes.map(q => {
                let pData: any = {};
                try { pData = JSON.parse(q.opcoes_json || '{}'); } catch {}

                return {
                    id: q.id,
                    tipo: pData.tipo || q.tipo || 'livre',
                    pergunta: q.pergunta || '',
                    texto: pData.texto || '',
                    lacunas: pData.lacunas || [],
                    alternativas: pData.alternativas || ['', '', '', '', '']
                } as Pergunta;
            });
            setPerguntas(parsed);
            
            // Buscar se já tem resposta para este conteudo e pessoa
            fetch(`/api/trabalhos/respostas/${conteudoId}/${pessoaId}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data) && data.length > 0) {
                        setHasResponded(true);
                        setStatusQuiz(data[0].status);
                        
                        // Preencher respostas
                        const rLivre: any = {};
                        const rMultipla: any = {};
                        const rLacunas: any = {};
                        
                        data.forEach(r => {
                            if (r.tipo === 'livre' || r.resposta_texto) rLivre[r.quiz_id] = r.resposta_texto;
                            if (r.opcao_selecionada !== null) rMultipla[r.quiz_id] = r.opcao_selecionada;
                            if (r.lacunas_json) {
                                try { rLacunas[r.quiz_id] = JSON.parse(r.lacunas_json); } catch {}
                            }
                        });
                        
                        setRespostasLivre(rLivre);
                        setRespostasMultipla(rMultipla);
                        setRespostasLacunas(rLacunas);
                    }
                })
                .catch(err => console.error(err));
        }
    }, [quizzes, conteudoId, pessoaId, onComplete]);

    const handleRespostaLivre = (quizId: number, texto: string) => {
        if (hasResponded) return;
        setRespostasLivre(prev => ({ ...prev, [quizId]: texto }));
    };

    const handleRespostaLacuna = (quizId: number, indexLacuna: number, texto: string) => {
        if (hasResponded) return;
        setRespostasLacunas(prev => ({
            ...prev,
            [quizId]: {
                ...(prev[quizId] || {}),
                [indexLacuna]: texto
            }
        }));
    };

    const handleRespostaMultipla = (quizId: number, indexOpcao: number) => {
        if (hasResponded) return;
        setRespostasMultipla(prev => ({ ...prev, [quizId]: indexOpcao }));
    };

    const handleSubmit = async () => {
        // Validate
        for (const p of perguntas) {
            if (p.tipo === 'livre') {
                if (!respostasLivre[p.id]?.trim()) {
                    alert('Por favor, responda todas as perguntas dissertativas.');
                    return;
                }
            } else if (p.tipo === 'multipla_escolha') {
                if (respostasMultipla[p.id] === undefined) {
                    alert('Por favor, selecione uma alternativa para as perguntas de multipla escolha.');
                    return;
                }
            } else if (p.tipo === 'lacunas') {
                const resps = respostasLacunas[p.id] || {};
                const respondidas = Object.values(resps).filter(v => v.trim()).length;
                if (respondidas < p.lacunas.length) {
                    alert('Por favor, preencha todas as lacunas.');
                    return;
                }
            }
        }

        setIsSubmitting(true);
        try {
            const payload = perguntas.map(p => {
                const item: any = { quiz_id: p.id };
                if (p.tipo === 'livre') {
                    item.resposta_texto = respostasLivre[p.id];
                } else if (p.tipo === 'multipla_escolha') {
                    item.opcao_selecionada = respostasMultipla[p.id];
                } else if (p.tipo === 'lacunas') {
                    item.lacunas_json = JSON.stringify(respostasLacunas[p.id] || {});
                }
                return item;
            });

            const res = await fetch('/api/trabalhos/resposta-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pessoa_id: pessoaId,
                    conteudo_id: conteudoId,
                    respostas: payload
                })
            });

            if (res.ok) {
                const data = await res.json();
                // Check if any was 'livre'
                const hasLivre = perguntas.some(p => p.tipo === 'livre');
                onComplete(hasLivre ? 'aguardando_correcao' : 'concluido');
            } else {
                alert('Erro ao enviar quiz.');
            }
        } catch (e) {
            console.error('Erro ao submeter quiz:', e);
            alert('Erro de conexao.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderLacunas = (p: Pergunta) => {
        const words = p.texto.split(' ');
        return (
            <div className="flex flex-wrap items-center gap-y-2 mt-4 text-sm leading-8 text-gray-300">
                {words.map((word, wIdx) => {
                    const isLacuna = p.lacunas.includes(wIdx);
                    if (isLacuna) {
                        return (
                            <input
                                key={wIdx}
                                type="text"
                                className="w-24 bg-black/50 border-b-2 border-yellow-500/50 focus:border-yellow-500 outline-none text-center text-yellow-500 font-bold px-1 py-0.5 mx-1 transition-colors"
                                value={respostasLacunas[p.id]?.[wIdx] || ''}
                                onChange={e => handleRespostaLacuna(p.id, wIdx, e.target.value)}
                            />
                        );
                    }
                    return <span key={wIdx} className="mx-1">{word}</span>;
                })}
            </div>
        );
    };

    if (perguntas.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-3xl opacity-30 mb-3">🧩</span>
                <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Nenhum quiz para este trabalho</p>
                <button 
                    onClick={() => onComplete('concluido')}
                    className="mt-6 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all"
                >
                    Concluir Etapa
                </button>
            </div>
        );
    }

    const LETRAS = ['A', 'B', 'C', 'D', 'E'];

    return (
        <div className="max-w-4xl mx-auto pb-10 font-sans">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 lg:p-10 space-y-8">
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-medium text-white/90 mb-2 font-serif tracking-wide">Quiz de Compreensão</h2>
                    <p className="text-xs text-gray-500 uppercase tracking-widest">
                        Responda as {perguntas.length} perguntas abaixo para concluir o estudo.
                    </p>
                </div>

                {perguntas.map((p, idx) => (
                    <div key={p.id} className="bg-black/20 border border-white/10 rounded-xl p-6">
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                                <span className="text-yellow-500 text-sm font-bold">{idx + 1}</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[15px] font-normal text-gray-200 mb-2 font-sans normal-case tracking-normal leading-relaxed">{p.pergunta}</h3>
                                
                                {p.tipo === 'livre' && (
                                    <textarea
                                        className={`w-full mt-4 bg-black/40 border rounded-xl p-4 text-sm text-white focus:outline-none transition-colors min-h-[120px] ${hasResponded ? 'border-white/5 opacity-80 cursor-not-allowed' : 'border-white/10 focus:border-yellow-500/50'}`}
                                        placeholder="Digite sua resposta aqui..."
                                        value={respostasLivre[p.id] || ''}
                                        onChange={e => handleRespostaLivre(p.id, e.target.value)}
                                        readOnly={hasResponded}
                                    />
                                )}

                                {p.tipo === 'lacunas' && renderLacunas(p)}

                                {p.tipo === 'multipla_escolha' && (
                                    <div className="mt-4 space-y-2">
                                        {p.alternativas.map((alt, altIdx) => {
                                            if (!alt.trim()) return null;
                                            const isSelected = respostasMultipla[p.id] === altIdx;
                                            return (
                                                <div 
                                                    key={altIdx}
                                                    onClick={() => handleRespostaMultipla(p.id, altIdx)}
                                                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                                                        isSelected 
                                                            ? 'bg-yellow-500/10 border-yellow-500/50' 
                                                            : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                                                    }`}
                                                >
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                                        isSelected ? 'border-yellow-500 bg-yellow-500' : 'border-gray-500'
                                                    }`}>
                                                        {isSelected && <div className="w-2 h-2 bg-black rounded-full" />}
                                                    </div>
                                                    <span className="text-xs text-gray-300">
                                                        <strong className={`mr-2 ${isSelected ? 'text-yellow-500' : 'text-gray-500'}`}>{LETRAS[altIdx]}.</strong>
                                                        {alt}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                <div className="pt-6 border-t border-white/5 flex justify-end items-center gap-4">
                    {hasResponded && (
                        <>
                            <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mr-auto">
                                {statusQuiz === 'aprovado' || statusQuiz === 'concluido' ? '✅ Aprovado' : 
                                 statusQuiz === 'pendente' ? '⏳ Aguardando Correção' : 
                                 statusQuiz === 'reprovado' || statusQuiz === 'revisar' ? '❌ Ajustes Solicitados' : 'Respondido'}
                            </span>
                            <button
                                onClick={() => onComplete('concluido')}
                                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                            >
                                Próxima Etapa
                            </button>
                        </>
                    )}
                    
                    {!hasResponded && (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(234,179,8,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Enviando Respostas...' : 'Enviar respostas do quiz'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

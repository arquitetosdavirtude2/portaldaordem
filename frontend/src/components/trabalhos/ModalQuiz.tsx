import { useState, useEffect } from 'react';

interface Pergunta {
    tipo: 'livre' | 'lacunas' | 'multipla_escolha';
    pergunta: string;
    texto: string;
    lacunas: number[];
    alternativas: string[];
    resposta_correta: number;
}

interface ModalQuizProps {
    conteudoId: number;
    quizzesIniciais: any[];
    onClose: () => void;
    onSuccess: () => void;
}

const EMPTY_PERGUNTA: Pergunta = { tipo: 'livre', pergunta: '', texto: '', lacunas: [], alternativas: ['', '', '', '', ''], resposta_correta: -1 };

export default function ModalQuiz({ conteudoId, quizzesIniciais, onClose, onSuccess }: ModalQuizProps) {
    const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (quizzesIniciais && quizzesIniciais.length > 0) {
            const parsed = quizzesIniciais.map(q => {
                let pData: any = {};
                try { pData = JSON.parse(q.opcoes_json || '{}'); } catch {}

                const tipo = pData.tipo || q.tipo || 'livre';
                return {
                    tipo,
                    pergunta: q.pergunta || '',
                    texto: pData.texto || '',
                    lacunas: pData.lacunas || [],
                    alternativas: pData.alternativas || ['', '', '', '', ''],
                    resposta_correta: pData.resposta_correta ?? q.resposta_correta ?? -1
                } as Pergunta;
            });
            setPerguntas(parsed);
        } else {
            setPerguntas([{ ...EMPTY_PERGUNTA }]);
        }
    }, [quizzesIniciais]);

    const updatePergunta = (index: number, campo: keyof Pergunta, valor: any) => {
        const novas = [...perguntas];
        novas[index] = { ...novas[index], [campo]: valor };
        if (campo === 'texto' && novas[index].tipo === 'lacunas') {
            novas[index].lacunas = [];
        }
        setPerguntas(novas);
    };

    const updateAlternativa = (pIndex: number, altIndex: number, valor: string) => {
        const novas = [...perguntas];
        const alts = [...novas[pIndex].alternativas];
        alts[altIndex] = valor;
        novas[pIndex] = { ...novas[pIndex], alternativas: alts };
        setPerguntas(novas);
    };

    const toggleLacuna = (pIndex: number, wordIndex: number) => {
        const novas = [...perguntas];
        const p = novas[pIndex];
        if (p.lacunas.includes(wordIndex)) {
            p.lacunas = p.lacunas.filter(i => i !== wordIndex);
        } else {
            p.lacunas = [...p.lacunas, wordIndex];
        }
        setPerguntas(novas);
    };

    const handleSubmit = async () => {
        // Validate
        for (let i = 0; i < perguntas.length; i++) {
            const p = perguntas[i];
            if (!p.pergunta.trim()) {
                alert(`Pergunta ${i + 1}: o enunciado esta vazio.`);
                return;
            }
            if (p.tipo === 'multipla_escolha') {
                const vazias = p.alternativas.filter(a => !a.trim());
                if (vazias.length > 0) {
                    alert(`Pergunta ${i + 1}: todas as 5 alternativas devem estar preenchidas.`);
                    return;
                }
                if (p.resposta_correta < 0 || p.resposta_correta > 4) {
                    alert(`Pergunta ${i + 1}: selecione a alternativa correta.`);
                    return;
                }
            }
        }

        setLoading(true);
        try {
            const payload = perguntas.map(p => {
                if (p.tipo === 'multipla_escolha') {
                    return {
                        pergunta: p.pergunta,
                        opcoes: { tipo: 'multipla_escolha', alternativas: p.alternativas, resposta_correta: p.resposta_correta },
                        resposta_correta: p.resposta_correta
                    };
                } else if (p.tipo === 'lacunas') {
                    return {
                        pergunta: p.pergunta,
                        opcoes: { tipo: 'lacunas', texto: p.texto, lacunas: p.lacunas },
                        resposta_correta: 0
                    };
                } else {
                    return {
                        pergunta: p.pergunta,
                        opcoes: { tipo: 'livre' },
                        resposta_correta: 0
                    };
                }
            });

            const formData = new FormData();
            formData.append('conteudo_id', conteudoId.toString());
            formData.append('perguntas_json', JSON.stringify(payload));

            const res = await fetch('/api/trabalhos/quiz', { method: 'POST', body: formData });
            if (res.ok) { onSuccess(); onClose(); }
            else alert('Erro ao salvar quiz');
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar quiz');
        } finally { setLoading(false); }
    };

    const LETRAS = ['A', 'B', 'C', 'D', 'E'];

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col relative z-10">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <h3 className="text-xl font-bold text-white uppercase tracking-widest font-sans tracking-normal">
                        Configuracao de Quiz
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer">✕</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {perguntas.map((p, pIndex) => (
                        <div key={pIndex} className="bg-white/5 border border-white/10 rounded-xl p-6 relative group">
                            <div className="flex justify-between items-center mb-6">
                                <label className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">
                                    Pergunta {pIndex + 1}
                                </label>
                                {perguntas.length > 1 && (
                                    <button 
                                        onClick={() => setPerguntas(perguntas.filter((_, i) => i !== pIndex))}
                                        className="text-[9px] text-red-500 uppercase font-bold opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                                    >Remover</button>
                                )}
                            </div>

                            {/* Type selector - now with 3 options */}
                            <div className="flex gap-2 mb-4">
                                {(['livre', 'lacunas', 'multipla_escolha'] as const).map(tipo => (
                                    <button
                                        key={tipo}
                                        onClick={() => updatePergunta(pIndex, 'tipo', tipo)}
                                        className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all cursor-pointer ${
                                            p.tipo === tipo
                                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500'
                                                : 'bg-transparent border-white/10 text-gray-500 hover:text-white'
                                        }`}
                                    >
                                        {tipo === 'livre' ? '✏ Livre' : tipo === 'lacunas' ? '▢ Lacunas' : '◉ Multipla'}
                                    </button>
                                ))}
                            </div>
                            
                            <textarea 
                                placeholder={
                                    p.tipo === 'livre' ? "Digite a pergunta para o irmao responder livremente..."
                                    : p.tipo === 'lacunas' ? "Descreva a instrucao. Ex: 'Preencha as palavras ocultas:'"
                                    : "Digite a pergunta de multipla escolha..."
                                }
                                value={p.pergunta}
                                onChange={e => updatePergunta(pIndex, 'pergunta', e.target.value)}
                                rows={2}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors resize-none mb-4"
                            />

                            {/* Lacunas fields */}
                            {p.tipo === 'lacunas' && (
                                <div className="space-y-4 border-t border-white/5 pt-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Texto Base</label>
                                        <textarea 
                                            placeholder="Cole aqui o texto completo. Em seguida, clique nas palavras abaixo para criar as lacunas."
                                            value={p.texto}
                                            onChange={e => updatePergunta(pIndex, 'texto', e.target.value)}
                                            rows={4}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                                        />
                                    </div>

                                    {p.texto.trim() && (
                                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
                                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-3">Selecione as palavras a ocultar:</p>
                                            <div className="leading-loose">
                                                {p.texto.split(' ').map((word, wordIndex) => {
                                                    if (!word.trim()) return <span key={wordIndex}> </span>;
                                                    const isSelected = p.lacunas.includes(wordIndex);
                                                    return (
                                                        <span 
                                                            key={wordIndex}
                                                            onClick={() => toggleLacuna(pIndex, wordIndex)}
                                                            className={`cursor-pointer inline-block mx-0.5 px-1 rounded transition-colors ${
                                                                isSelected 
                                                                ? 'bg-emerald-500 text-black font-bold' 
                                                                : 'hover:bg-white/10 text-gray-300'
                                                            }`}
                                                        >
                                                            {word}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Multiple choice fields */}
                            {p.tipo === 'multipla_escolha' && (
                                <div className="space-y-3 border-t border-white/5 pt-4">
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Alternativas (clique no circulo para marcar a correta)</p>
                                    {LETRAS.map((letra, altIdx) => (
                                        <div key={altIdx} className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => updatePergunta(pIndex, 'resposta_correta', altIdx)}
                                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                                                    p.resposta_correta === altIdx
                                                        ? 'bg-emerald-500 border-emerald-500 text-black'
                                                        : 'border-white/20 text-gray-500 hover:border-emerald-500/50'
                                                }`}
                                            >
                                                {letra}
                                            </button>
                                            <input
                                                placeholder={`Alternativa ${letra}...`}
                                                value={p.alternativas[altIdx] || ''}
                                                onChange={e => updateAlternativa(pIndex, altIdx, e.target.value)}
                                                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors"
                                            />
                                        </div>
                                    ))}
                                    {p.resposta_correta >= 0 && (
                                        <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest mt-2">
                                            Resposta correta: {LETRAS[p.resposta_correta]}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    
                    <button 
                        onClick={() => setPerguntas([...perguntas, { ...EMPTY_PERGUNTA }])}
                        className="w-full py-4 border border-dashed border-white/20 rounded-xl text-gray-400 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 hover:text-white hover:border-white/40 transition-all cursor-pointer"
                    >
                        + Adicionar Nova Pergunta
                    </button>
                </div>

                <div className="p-6 border-t border-white/5 flex gap-4 bg-white/[0.02]">
                    <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all text-gray-300 cursor-pointer">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer">
                        {loading ? 'Salvando...' : 'Salvar Perguntas'}
                    </button>
                </div>
            </div>
        </div>
    );
}

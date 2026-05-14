import { useState } from 'react';

interface Pergunta {
    pergunta: string;
    opcoes: string[];
    resposta_correta: number;
}

interface ModalQuizProps {
    conteudoId: number;
    quizzesIniciais: any[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function ModalQuiz({ conteudoId, quizzesIniciais, onClose, onSuccess }: ModalQuizProps) {
    const [perguntas, setPerguntas] = useState<Pergunta[]>(
        quizzesIniciais && quizzesIniciais.length > 0 
        ? quizzesIniciais.map(q => ({
            pergunta: q.pergunta,
            opcoes: q.opcoes || ["", "", "", ""], // Mocked if not loaded perfectly
            resposta_correta: q.resposta_correta || 0
        }))
        : [{ pergunta: "", opcoes: ["", "", "", ""], resposta_correta: 0 }]
    );
    const [loading, setLoading] = useState(false);

    const updatePergunta = (index: number, campo: string, valor: any) => {
        const novas = [...perguntas];
        novas[index] = { ...novas[index], [campo]: valor };
        setPerguntas(novas);
    };

    const updateOpcao = (pIndex: number, oIndex: number, valor: string) => {
        const novas = [...perguntas];
        novas[pIndex].opcoes[oIndex] = valor;
        setPerguntas(novas);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('conteudo_id', conteudoId.toString());
            formData.append('perguntas_json', JSON.stringify(perguntas));

            const res = await fetch('/api/trabalhos/quiz', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                alert('Erro ao salvar quiz');
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar quiz');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative z-10">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white uppercase tracking-widest">
                        Configurar Quiz
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {perguntas.map((p, pIndex) => (
                        <div key={pIndex} className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">Pergunta {pIndex + 1}</label>
                                {perguntas.length > 1 && (
                                    <button 
                                        onClick={() => setPerguntas(perguntas.filter((_, i) => i !== pIndex))}
                                        className="text-[9px] text-red-500 uppercase font-bold"
                                    >Remover</button>
                                )}
                            </div>
                            
                            <input 
                                type="text"
                                placeholder="Digite a pergunta..."
                                value={p.pergunta}
                                onChange={e => updatePergunta(pIndex, 'pergunta', e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white mb-4 focus:border-yellow-500"
                            />

                            <div className="space-y-2 pl-4 border-l-2 border-white/10">
                                {p.opcoes.map((opcao, oIndex) => (
                                    <div key={oIndex} className="flex items-center gap-3">
                                        <input 
                                            type="radio" 
                                            name={`correta-${pIndex}`} 
                                            checked={p.resposta_correta === oIndex}
                                            onChange={() => updatePergunta(pIndex, 'resposta_correta', oIndex)}
                                            className="accent-yellow-500"
                                        />
                                        <input 
                                            type="text"
                                            placeholder={`Opção ${oIndex + 1}`}
                                            value={opcao}
                                            onChange={e => updateOpcao(pIndex, oIndex, e.target.value)}
                                            className="flex-1 bg-black/50 border border-white/5 rounded px-3 py-1 text-xs text-white focus:border-yellow-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    <button 
                        onClick={() => setPerguntas([...perguntas, { pergunta: "", opcoes: ["", "", "", ""], resposta_correta: 0 }])}
                        className="w-full py-3 border border-dashed border-white/20 rounded-xl text-gray-400 text-xs font-bold uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all"
                    >
                        + Adicionar Pergunta
                    </button>
                </div>

                <div className="p-6 border-t border-white/5 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
                        {loading ? 'Salvando...' : 'Salvar Quiz'}
                    </button>
                </div>
            </div>
        </div>
    );
}

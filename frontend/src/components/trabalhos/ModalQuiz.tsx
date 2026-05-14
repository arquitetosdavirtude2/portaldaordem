import { useState } from 'react';

interface Pergunta {
    pergunta: string;
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
            pergunta: q.pergunta
        }))
        : [{ pergunta: "" }]
    );
    const [loading, setLoading] = useState(false);

    const updatePergunta = (index: number, valor: string) => {
        const novas = [...perguntas];
        novas[index] = { pergunta: valor };
        setPerguntas(novas);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Adaptando o payload para o formato aceito pelo backend, enviando opções vazias
            const payload = perguntas.map(p => ({
                pergunta: p.pergunta,
                opcoes: [],
                resposta_correta: 0
            }));

            const formData = new FormData();
            formData.append('conteudo_id', conteudoId.toString());
            formData.append('perguntas_json', JSON.stringify(payload));

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
                        Configurar Perguntas (Resposta Livre)
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {perguntas.map((p, pIndex) => (
                        <div key={pIndex} className="bg-white/5 border border-white/10 rounded-xl p-4 relative group">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">Pergunta {pIndex + 1}</label>
                                {perguntas.length > 1 && (
                                    <button 
                                        onClick={() => setPerguntas(perguntas.filter((_, i) => i !== pIndex))}
                                        className="text-[9px] text-red-500 uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                    >Remover</button>
                                )}
                            </div>
                            
                            <textarea 
                                placeholder="Digite a pergunta para o irmão responder livremente..."
                                value={p.pergunta}
                                onChange={e => updatePergunta(pIndex, e.target.value)}
                                rows={3}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors resize-none"
                            />
                        </div>
                    ))}
                    
                    <button 
                        onClick={() => setPerguntas([...perguntas, { pergunta: "" }])}
                        className="w-full py-4 mt-4 border border-dashed border-white/20 rounded-xl text-gray-400 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 hover:text-white hover:border-white/40 transition-all"
                    >
                        + Adicionar Nova Pergunta
                    </button>
                </div>

                <div className="p-6 border-t border-white/5 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all text-gray-300">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50">
                        {loading ? 'Salvando...' : 'Salvar Perguntas'}
                    </button>
                </div>
            </div>
        </div>
    );
}

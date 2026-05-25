import { useState } from 'react';

interface ModalNovoConteudoProps {
    lojaId: number;
    tabAtiva: 'trabalhos' | 'prelecoes';
    onClose: () => void;
    onSuccess: () => void;
}

export default function ModalNovoConteudo({ lojaId, tabAtiva, onClose, onSuccess }: ModalNovoConteudoProps) {
    const [titulo, setTitulo] = useState('');
    const [grau, setGrau] = useState(1);
    const [descricaoJornada, setDescricaoJornada] = useState('');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<{msg: string, type: 'error'|'success'} | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);
        try {
            const formData = new FormData();
            formData.append('loja_id', lojaId.toString());
            formData.append('titulo', titulo);
            formData.append('tipo', tabAtiva === 'trabalhos' ? 'trabalho' : 'prelecao');
            formData.append('grau', grau.toString());
            formData.append('descricao_jornada', descricaoJornada);

            const res = await fetch('/api/trabalhos/conteudo', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                setFeedback({msg: 'Erro ao criar conteúdo', type: 'error'});
            }
        } catch (error) {
            console.error(error);
            setFeedback({msg: 'Erro ao criar conteúdo', type: 'error'});
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0f1219] border border-white/10 rounded-2xl w-[calc(100vw-24px)] sm:w-[calc(100vw-64px)] max-w-[1180px] max-h-[calc(100vh-24px)] sm:max-h-[calc(100vh-64px)] p-6 relative z-10 shadow-2xl overflow-y-auto custom-scrollbar">
                <h3 className="text-xl font-bold text-yellow-500 uppercase tracking-widest mb-6">
                    Adicionar {tabAtiva === 'trabalhos' ? 'Trabalho' : 'Preleção'}
                </h3>
                
                {feedback && (
                    <div className={`mb-4 p-3 rounded-lg text-xs font-bold uppercase ${feedback.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                        {feedback.msg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-2">Título do Conteúdo</label>
                        <input 
                            type="text" 
                            required
                            value={titulo}
                            onChange={e => setTitulo(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50 transition-colors text-sm"
                            placeholder="Ex: Instrução de Aprendiz"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-2">Grau</label>
                        <select 
                            value={grau}
                            onChange={e => setGrau(Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50 transition-colors text-sm appearance-none"
                        >
                            <option value={1} className="bg-[#0f1219]">1 - Aprendiz</option>
                            <option value={2} className="bg-[#0f1219]">2 - Companheiro</option>
                            <option value={3} className="bg-[#0f1219]">3 - Mestre</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-2">Descrição do Trabalho</label>
                        <textarea 
                            value={descricaoJornada}
                            onChange={e => setDescricaoJornada(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50 transition-colors text-sm resize-none h-28"
                            placeholder="Descreva o conteúdo do trabalho ou preleção que será exibido na jornada celestial do irmão..."
                        />
                    </div>

                    <div className="flex gap-4 mt-8">
                        <button type="button" onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50">
                            {loading ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

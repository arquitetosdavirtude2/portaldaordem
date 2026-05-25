import { useState, useEffect } from 'react';

interface ModalEditarConteudoProps {
    isOpen: boolean;
    onClose: () => void;
    conteudo: any;
    onSuccess: () => void;
}

export default function ModalEditarConteudo({ isOpen, onClose, conteudo, onSuccess }: ModalEditarConteudoProps) {
    const [titulo, setTitulo] = useState('');
    const [tipo, setTipo] = useState('trabalho');
    const [grau, setGrau] = useState(1);
    const [descricaoJornada, setDescricaoJornada] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{msg: string, type: 'error'|'success'} | null>(null);

    useEffect(() => {
        if (conteudo) {
            setTitulo(conteudo.titulo || '');
            setTipo(conteudo.tipo || 'trabalho');
            setGrau(conteudo.grau || 1);
            setDescricaoJornada(conteudo.descricao_jornada || '');
        }
    }, [conteudo]);

    if (!isOpen || !conteudo) return null;

    const handleSalvar = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFeedback(null);
        try {
            const formData = new FormData();
            formData.append('titulo', titulo);
            formData.append('grau', grau.toString());
            formData.append('descricao_jornada', descricaoJornada);

            const res = await fetch(`/api/trabalhos/conteudo/${conteudo.id}`, {
                method: 'PUT',
                body: formData
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                setFeedback({msg: 'Erro ao atualizar o conteúdo.', type: 'error'});
            }
        } catch (e) {
            console.error(e);
            setFeedback({msg: 'Erro de conexão.', type: 'error'});
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0f1219] w-[calc(100vw-24px)] sm:w-[calc(100vw-64px)] max-w-[1180px] max-h-[calc(100vh-24px)] sm:max-h-[calc(100vh-64px)] rounded-2xl border border-white/10 shadow-2xl overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">⚙️</span>
                        <h2 className="text-lg font-bold text-gray-200 uppercase tracking-widest">
                            DADOS GERAIS - {tipo === 'trabalho' ? 'TRABALHO' : 'PRELEÇÃO'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full cursor-pointer transition-all">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {feedback && (
                    <div className={`mx-6 mt-4 p-3 rounded-lg text-xs font-bold uppercase ${feedback.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                        {feedback.msg}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSalvar} className="p-6 space-y-5">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">
                            Título do Conteúdo
                        </label>
                        <input
                            type="text"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-yellow-500/50 transition-colors"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">
                                Tipo
                            </label>
                            <input
                                type="text"
                                value={tipo === 'trabalho' ? 'Trabalho' : 'Preleção'}
                                disabled
                                className="w-full bg-black/30 border border-white/5 rounded-lg px-4 py-3 text-sm text-gray-500 cursor-not-allowed uppercase tracking-widest font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">
                                Grau
                            </label>
                            <select
                                value={grau}
                                onChange={(e) => setGrau(Number(e.target.value))}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-yellow-500/50 transition-colors appearance-none"
                            >
                                <option value={1} className="bg-[#0f1219]">Aprendiz</option>
                                <option value={2} className="bg-[#0f1219]">Companheiro</option>
                                <option value={3} className="bg-[#0f1219]">Mestre</option>
                            </select>
                        </div>
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

                    <div className="pt-4 flex justify-end items-center">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-yellow-500 text-black px-6 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full"
                        >
                            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

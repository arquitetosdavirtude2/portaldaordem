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
        try {
            const formData = new FormData();
            formData.append('titulo', titulo);
            formData.append('grau', grau.toString());
            formData.append('descricao_jornada', descricaoJornada);
            // O tipo não é mais enviado para edição para evitar bagunça

            const res = await fetch(`/api/trabalhos/conteudo/${conteudo.id}`, {
                method: 'PUT',
                body: formData
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                alert('Erro ao atualizar o conteúdo.');
            }
        } catch (e) {
            console.error(e);
            alert('Erro de conexão.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0f1219] w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">⚙️</span>
                        <h2 className="text-lg font-bold text-gray-200 uppercase tracking-widest">
                            DADOS GERAIS - {tipo === 'trabalho' ? 'TRABALHO' : 'PRELEÇÃO'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 transition-colors">
                        ✕
                    </button>
                </div>

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

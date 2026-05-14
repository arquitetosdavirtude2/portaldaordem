import { useState } from 'react';

interface ModalEditarConteudoProps {
    isOpen: boolean;
    onClose: () => void;
    conteudo: any;
    onSuccess: () => void;
}

export default function ModalEditarConteudo({ isOpen, onClose, conteudo, onSuccess }: ModalEditarConteudoProps) {
    const [titulo, setTitulo] = useState(conteudo?.titulo || '');
    const [tipo, setTipo] = useState(conteudo?.tipo || 'trabalho');
    const [grau, setGrau] = useState(conteudo?.grau || 1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    if (!isOpen || !conteudo) return null;

    const handleSalvar = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('titulo', titulo);
            formData.append('tipo', tipo);
            formData.append('grau', grau.toString());

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

    const handleExcluir = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/trabalhos/conteudo/${conteudo.id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                alert('Erro ao excluir o conteúdo.');
            }
        } catch (e) {
            console.error(e);
            alert('Erro de conexão.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0f1219] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">⚙️</span>
                        <h2 className="text-lg font-bold text-gray-200 uppercase tracking-widest">
                            Dados Gerais
                        </h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 transition-colors">
                        ✕
                    </button>
                </div>

                {/* Form */}
                {!showDeleteConfirm ? (
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
                                <select
                                    value={tipo}
                                    onChange={(e) => setTipo(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-yellow-500/50 transition-colors appearance-none"
                                >
                                    <option value="trabalho" className="bg-[#0f1219]">Trabalho</option>
                                    <option value="prelecao" className="bg-[#0f1219]">Preleção</option>
                                </select>
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

                        <div className="pt-4 flex justify-between items-center">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="text-[10px] uppercase tracking-widest font-bold text-red-500 hover:text-red-400 px-4 py-3 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-2"
                            >
                                🗑️ Excluir
                            </button>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-yellow-500 text-black px-6 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-200 mb-2">Excluir Conteúdo?</h3>
                        <p className="text-sm text-gray-400 mb-8">
                            Tem certeza que deseja excluir "{conteudo.titulo}"? Esta ação não pode ser desfeita e apagará todos os vídeos, PDFs e perguntas associadas.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:bg-white/10 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleExcluir}
                                disabled={isDeleting}
                                className="px-6 py-3 bg-red-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

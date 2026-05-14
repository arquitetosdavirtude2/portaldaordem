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
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('loja_id', lojaId.toString());
            formData.append('titulo', titulo);
            formData.append('tipo', tabAtiva === 'trabalhos' ? 'trabalho' : 'prelecao');
            formData.append('grau', grau.toString());

            const res = await fetch('/api/trabalhos/conteudo', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                alert('Erro ao criar conteúdo');
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao criar conteúdo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md p-6 relative z-10">
                <h3 className="text-xl font-bold text-yellow-500 uppercase tracking-widest mb-6">
                    Adicionar {tabAtiva === 'trabalhos' ? 'Trabalho' : 'Preleção'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-2">Título do Conteúdo</label>
                        <input 
                            type="text" 
                            required
                            value={titulo}
                            onChange={e => setTitulo(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50"
                            placeholder="Ex: Instrução de Aprendiz"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-2">Grau</label>
                        <select 
                            value={grau}
                            onChange={e => setGrau(Number(e.target.value))}
                            className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50"
                        >
                            <option value={1}>1 - Aprendiz</option>
                            <option value={2}>2 - Companheiro</option>
                            <option value={3}>3 - Mestre</option>
                        </select>
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

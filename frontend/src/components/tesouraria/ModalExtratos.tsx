'use client';

import { useState, useEffect } from 'react';

interface Extrato {
    id: number;
    ano: number;
    mes: number;
    arquivo_url: string;
    nome_arquivo: string;
    criado_em: string;
}

const MESES_EXTENSO = [
    '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function ModalExtratos({
    isOpen,
    onClose,
    lojaId,
    caixaId,
    caixaNome,
    mes,
    ano
}: {
    isOpen: boolean;
    onClose: () => void;
    lojaId: number;
    caixaId: number;
    caixaNome: string;
    mes: number;
    ano: number;
}) {
    const [extratos, setExtratos] = useState<Extrato[]>([]);
    const [enviando, setEnviando] = useState(false);
    const [carregando, setCarregando] = useState(false);

    const carregarExtratos = async () => {
        if (!caixaId || !mes || !ano) return;
        setCarregando(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            const res = await fetch(`${apiUrl}/api/tesouraria/extratos/${caixaId}/${ano}/${mes}`);
            if (res.ok) {
                const data = await res.json();
                setExtratos(data);
            }
        } catch (error) {
            console.error('Erro ao carregar extratos:', error);
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        if (isOpen) carregarExtratos();
    }, [isOpen, caixaId, mes, ano]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setEnviando(true);
        const formData = new FormData();
        formData.append('arquivo', file);
        formData.append('loja_id', lojaId.toString());
        formData.append('caixa_id', caixaId.toString());
        formData.append('ano', ano.toString());
        formData.append('mes', mes.toString());

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            const res = await fetch(`${apiUrl}/api/tesouraria/extratos`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                carregarExtratos();
            }
        } catch (error) {
            console.error('Erro ao subir extrato:', error);
        } finally {
            setEnviando(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir este extrato?')) return;
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            const res = await fetch(`${apiUrl}/api/tesouraria/extratos/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                carregarExtratos();
            }
        } catch (error) {
            console.error('Erro ao excluir extrato:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0f1115] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                        <h3 className="text-lg font-bold text-gray-100">Anexos de Extratos</h3>
                        <p className="text-[10px] text-yellow-500 uppercase tracking-widest font-bold">
                            {caixaNome} • {MESES_EXTENSO[mes]} / {ano}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6">
                        <label className="block w-full cursor-pointer">
                            <div className={`border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:bg-white/5 transition-all group ${enviando ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleUpload}
                                    disabled={enviando}
                                />
                                <svg className="w-10 h-10 text-gray-500 group-hover:text-yellow-500 mx-auto mb-3 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-sm text-gray-400 font-serif italic">
                                    {enviando ? 'Enviando arquivo...' : 'Clique para subir extrato bancário (PDF/Imagem)'}
                                </p>
                            </div>
                        </label>
                    </div>

                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Arquivos Enviados</h4>
                        {carregando ? (
                            <p className="text-center py-4 text-xs text-gray-500 italic">Carregando listagem...</p>
                        ) : extratos.length === 0 ? (
                            <p className="text-center py-4 text-xs text-gray-600 italic">Nenhum extrato anexado para este mês.</p>
                        ) : (
                            extratos.map(ex => (
                                <div key={ex.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-red-500/10 flex items-center justify-center text-red-500">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-300 truncate max-w-[250px]">{ex.nome_arquivo}</p>
                                            <p className="text-[9px] text-gray-500 uppercase">{new Date(ex.criado_em).toLocaleDateString('pt-BR')} às {new Date(ex.criado_em).toLocaleTimeString('pt-BR')}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <a 
                                            href={`${process.env.NEXT_PUBLIC_API_URL || ""}${ex.arquivo_url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 hover:bg-white/10 rounded text-blue-400"
                                            title="Download / Ver"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </a>
                                        <button 
                                            onClick={() => handleDelete(ex.id)}
                                            className="p-1.5 hover:bg-white/10 rounded text-gray-500 hover:text-red-500"
                                            title="Excluir"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-white/5 border-t border-white/5 text-right text-[10px] text-gray-500 italic">
                    Utilize este espaço para arquivar os extratos de conferência mensal.
                </div>
            </div>
        </div>
    );
}

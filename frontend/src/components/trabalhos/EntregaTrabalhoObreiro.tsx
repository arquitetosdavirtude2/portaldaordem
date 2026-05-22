'use client';

import { useState } from 'react';

interface EntregaTrabalhoObreiroProps {
    pessoaId: number;
    conteudoId: number;
    onComplete: (status: string) => void;
}

export default function EntregaTrabalhoObreiro({ pessoaId, conteudoId, onComplete }: EntregaTrabalhoObreiroProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleSubmit = async () => {
        if (!file) {
            alert('Por favor, selecione um arquivo para enviar.');
            return;
        }

        const confirmacao = window.confirm('Tem certeza de que deseja enviar este trabalho para correcao?');
        if (!confirmacao) return;

        setIsSubmitting(true);
        try {
            // 1. Upload do arquivo
            const formData = new FormData();
            formData.append('pessoa_id', pessoaId.toString());
            formData.append('conteudo_id', conteudoId.toString());
            formData.append('file', file);

            const resEntrega = await fetch('/api/trabalhos/entrega', {
                method: 'POST',
                body: formData
            });

            if (!resEntrega.ok) {
                alert('Erro ao fazer o upload do arquivo.');
                setIsSubmitting(false);
                return;
            }

            // 2. Atualizar status de progresso para aguardando_correcao
            await fetch('/api/trabalhos/progresso/json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pessoa_id: pessoaId,
                    conteudo_id: conteudoId,
                    status: 'aguardando_correcao'
                })
            });

            onComplete('aguardando_correcao');
        } catch (e) {
            console.error('Erro ao enviar trabalho:', e);
            alert('Erro de conexao ao enviar trabalho.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto pb-10">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 lg:p-10 space-y-8">
                <div className="text-center mb-8">
                    <span className="text-5xl opacity-80 mb-4 block">📜</span>
                    <h2 className="text-2xl font-bold text-white mb-2">Entrega da Prancha</h2>
                    <p className="text-sm text-gray-400 max-w-lg mx-auto leading-relaxed">
                        Envie sua prancha ou trabalho escrito para a apreciacao das Luzes da Loja.
                        Certifique-se de que o documento esta completo antes do envio.
                    </p>
                </div>

                <div 
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-white/10 hover:border-yellow-500/50 rounded-2xl p-10 text-center transition-all bg-black/40 group relative"
                >
                    <input 
                        type="file" 
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                    
                    {!file ? (
                        <>
                            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-yellow-500/10 group-hover:border-yellow-500/30 transition-all">
                                <span className="text-2xl opacity-60 group-hover:opacity-100">📤</span>
                            </div>
                            <p className="text-sm font-bold text-gray-300">
                                Arraste o arquivo aqui ou <span className="text-yellow-500">clique para selecionar</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-2">Formatos aceitos: PDF, DOCX (Max: 10MB)</p>
                        </>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">📄</span>
                            </div>
                            <p className="text-sm font-bold text-white truncate max-w-xs">{file.name}</p>
                            <p className="text-xs text-yellow-500/80 mt-2">Clique ou arraste para trocar o arquivo</p>
                        </div>
                    )}
                </div>

                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5 flex gap-4 items-start">
                    <span className="text-yellow-500 mt-0.5">ℹ️</span>
                    <p className="text-xs text-yellow-500/80 leading-relaxed">
                        Apos o envio, seu trabalho entrara no status <strong>Aguardando Correcao</strong> e voce nao podera altera-lo, 
                        a menos que as Luzes solicitem ajustes.
                    </p>
                </div>

                <div className="pt-6 border-t border-white/5 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={!file || isSubmitting}
                        className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Enviando Prancha...' : 'Enviar para Correcao'}
                    </button>
                </div>
            </div>
        </div>
    );
}

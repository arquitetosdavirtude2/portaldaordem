'use client';

import { useState } from 'react';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface EntregaTrabalhoObreiroProps {
    pessoaId: number;
    conteudoId: number;
    onComplete: (status: string) => void;
}

export default function EntregaTrabalhoObreiro({ pessoaId, conteudoId, onComplete }: EntregaTrabalhoObreiroProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, title: string, message: string, variant: 'warning' | 'danger'} | null>(null);

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

    const handleSubmitClick = () => {
        if (!file) {
            setAlertConfig({
                isOpen: true,
                title: 'Atenção',
                message: 'Por favor, selecione um arquivo para enviar.',
                variant: 'warning'
            });
            return;
        }
        setShowConfirm(true);
    };

    const executeSubmit = async () => {
        if (!file) return;
        
        setShowConfirm(false);
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
                setAlertConfig({
                    isOpen: true,
                    title: 'Erro no Upload',
                    message: 'Erro ao fazer o upload do arquivo.',
                    variant: 'danger'
                });
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
            setAlertConfig({
                isOpen: true,
                title: 'Erro de Conexão',
                message: 'Ocorreu um erro de conexao ao enviar seu trabalho. Verifique a internet e tente novamente.',
                variant: 'danger'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto pb-10">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-3xl p-8 lg:p-12 space-y-10 shadow-2xl relative overflow-hidden">
                {/* Efeito de luz de fundo */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-32 bg-yellow-500/5 blur-[80px] pointer-events-none"></div>

                <div className="text-center mb-10 relative z-10">
                    <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.05)]">
                        <span className="text-3xl opacity-80 drop-shadow-sm">📜</span>
                    </div>
                    <h2 className="font-serif text-[clamp(1.8rem,2.4vw,2.6rem)] font-normal text-[rgba(245,245,250,0.88)] leading-[1.12] tracking-[0.015em] mb-4" style={{ textShadow: '0 0 16px rgba(255,255,255,0.06)' }}>
                        Entrega do Trabalho
                    </h2>
                    <p className="font-serif text-[clamp(0.95rem,1vw,1.05rem)] text-[rgba(220,225,235,0.66)] max-w-xl mx-auto leading-[1.65] font-normal tracking-[0.01em]">
                        Envie seu trabalho em arquivo PDF ou DOCX para apreciacao das Luzes da Loja.
                        Certifique-se de que o documento esta completo antes do envio.
                    </p>
                </div>

                <div 
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-white/15 hover:border-yellow-500/40 rounded-2xl p-12 text-center transition-all bg-white/[0.01] hover:bg-yellow-500/[0.02] group relative z-10"
                >
                    <input 
                        type="file" 
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                    />
                    
                    {!file ? (
                        <>
                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-yellow-500/10 group-hover:border-yellow-500/20 transition-all duration-300 shadow-lg">
                                <span className="text-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-300">📤</span>
                            </div>
                            <p className="font-normal text-[rgba(235,238,245,0.82)] mb-2">
                                Arraste o arquivo aqui ou <span className="text-yellow-500 font-medium group-hover:underline cursor-pointer">clique para selecionar</span>
                            </p>
                            <p className="text-[0.82rem] tracking-[0.12em] uppercase text-[rgba(160,170,190,0.72)] font-normal">Formatos aceitos: PDF, DOCX (Max: 10MB)</p>
                        </>
                    ) : (
                        <div className="flex flex-col items-center animate-fade-in">
                            <div className="w-20 h-20 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(234,179,8,0.15)] relative">
                                <span className="text-3xl">📄</span>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center backdrop-blur-md">
                                    <span className="text-emerald-400 text-xs">✓</span>
                                </div>
                            </div>
                            <p className="text-base font-bold text-white truncate max-w-[250px]">{file.name}</p>
                            <p className="text-xs text-yellow-500/70 mt-3 font-medium uppercase tracking-wider hover:text-yellow-400 transition-colors">Clique ou arraste para trocar o arquivo</p>
                        </div>
                    )}
                </div>

                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5 flex gap-4 items-start relative z-10 backdrop-blur-sm">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0 border border-yellow-500/20">
                        <span className="text-yellow-500 text-sm">ℹ️</span>
                    </div>
                    <p className="text-sm text-yellow-500/80 leading-relaxed pt-1 font-medium">
                        Apos o envio, seu trabalho ficara com status <strong className="text-yellow-400">Aguardando Correcao</strong> e voce nao podera altera-lo, 
                        salvo se as Luzes solicitarem ajustes.
                    </p>
                </div>

                <div className="pt-8 border-t border-white/10 flex justify-end relative z-10">
                    <button
                        onClick={handleSubmitClick}
                        disabled={!file || isSubmitting}
                        className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold uppercase tracking-[0.2em] rounded-xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                    >
                        {isSubmitting ? 'Enviando Trabalho...' : 'Enviar para Correcao'}
                    </button>
                </div>
            </div>

            {/* Modais de Confirmação e Alerta */}
            <ConfirmDialog 
                isOpen={showConfirm}
                title="Confirmar envio do trabalho"
                message={
                    <>
                        Após o envio, seu trabalho ficará com status <strong className="text-yellow-400">Aguardando Correção</strong> e não poderá ser alterado, salvo se as Luzes solicitarem ajustes.
                    </>
                }
                confirmLabel="Enviar para Correção"
                cancelLabel="Cancelar"
                onConfirm={executeSubmit}
                onCancel={() => setShowConfirm(false)}
                variant="warning"
                loading={isSubmitting}
            />

            <ConfirmDialog 
                isOpen={!!alertConfig?.isOpen}
                title={alertConfig?.title || ''}
                message={alertConfig?.message || ''}
                confirmLabel="OK"
                onConfirm={() => setAlertConfig(null)}
                variant={alertConfig?.variant || 'warning'}
                isAlertOnly={true}
            />
        </div>
    );
}

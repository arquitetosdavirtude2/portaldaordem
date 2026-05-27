'use client';

import { useState, useEffect } from 'react';
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
    const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, title: string, message: string, variant: 'warning' | 'danger' | 'success' | 'info'} | null>(null);
    const [entregaAtual, setEntregaAtual] = useState<any>(null);
    const [carregandoEntrega, setCarregandoEntrega] = useState(true);

    useEffect(() => {
        if (!conteudoId || !pessoaId) {
            setCarregandoEntrega(false);
            return;
        }

        const fetchEntrega = async () => {
            try {
                const res = await fetch(`/api/trabalhos/minha-entrega/${conteudoId}/${pessoaId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.existe) {
                        setEntregaAtual(data);
                    }
                }
            } catch (error) {
                console.error("Erro ao buscar entrega", error);
            } finally {
                setCarregandoEntrega(false);
            }
        };
        fetchEntrega();
    }, [conteudoId, pessoaId]);

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
                title: 'Arquivo ausente',
                message: 'Selecione um arquivo PDF ou DOCX antes de enviar.',
                variant: 'warning'
            });
            return;
        }

        const allowedTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ];
        
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
            setAlertConfig({
                isOpen: true,
                title: 'Formato inválido',
                message: 'O arquivo selecionado não é válido. Apenas PDF e DOCX são aceitos.',
                variant: 'danger'
            });
            return;
        }

        const cId = conteudoId;
        const pId = pessoaId;

        if (!cId) {
            setAlertConfig({
                isOpen: true,
                title: 'Trabalho sem ID',
                message: 'Não foi possível identificar o trabalho. Recarregue a página e tente novamente.',
                variant: 'danger'
            });
            return;
        }

        if (!pId) {
            setAlertConfig({
                isOpen: true,
                title: 'Usuário sem ID',
                message: 'Não foi possível identificar o seu usuário. Faça login novamente ou verifique a conexão.',
                variant: 'danger'
            });
            return;
        }

        setShowConfirm(true);
    };

    const executeSubmit = async () => {
        if (!file) return;

        const cId = conteudoId;
        const pId = pessoaId;

        if (!cId) {
            setAlertConfig({
                isOpen: true,
                title: 'Trabalho sem ID',
                message: 'Não foi possível identificar o trabalho. Recarregue a página e tente novamente.',
                variant: 'danger'
            });
            return;
        }

        if (!pId) {
            setAlertConfig({
                isOpen: true,
                title: 'Usuário sem ID',
                message: 'Não foi possível identificar o seu usuário. Faça login novamente ou verifique a conexão.',
                variant: 'danger'
            });
            return;
        }
        
        setShowConfirm(false);
        setIsSubmitting(true);
        try {
            console.log("Enviando trabalho", {
                conteudoId: cId,
                pessoaId: pId,
                hasFile: !!file,
                fileName: file.name,
                fileType: file.type,
            });

            // 1. Upload do arquivo para a rota correta de entrega
            const formData = new FormData();
            formData.append('pessoa_id', String(pId));
            formData.append('conteudo_id', String(cId));
            formData.append('file', file);

            const resEntrega = await fetch('/api/trabalhos/entrega', {
                method: 'POST',
                body: formData
            });

            if (!resEntrega.ok) {
                let errorMessage = 'O servidor encontrou um erro ao processar o envio.';
                if (resEntrega.status === 422) {
                    errorMessage = 'Os dados enviados estão incompletos ou inválidos. Verifique o arquivo e tente novamente.';
                }
                
                setAlertConfig({
                    isOpen: true,
                    title: 'Erro ao enviar trabalho',
                    message: errorMessage,
                    variant: 'danger'
                });
                setIsSubmitting(false);
                return;
            }

            // 2. Atualizar status de progresso para aguardando_correcao
            const resProgresso = await fetch('/api/trabalhos/progresso/json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pessoa_id: pId,
                    conteudo_id: cId,
                    status: 'aguardando_correcao'
                })
            });

            if (!resProgresso.ok) {
                console.warn("Falha ao registrar progresso de aguardando_correcao, mas o arquivo foi salvo.");
            }

            // Atualizar o estado local imediatamente e avisar o pai silenciosamente
            setEntregaAtual({
                existe: true,
                status: 'aguardando_correcao',
                data_upload: new Date().toISOString()
            });
            onComplete('aguardando_correcao');

        } catch (e) {
            console.error("Erro na execucao do envio:", e);
            setAlertConfig({
                isOpen: true,
                title: 'Erro ao enviar trabalho',
                message: 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.',
                variant: 'danger'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto pb-10 flex flex-col items-center">
            
            <style>{`
                .study-dropzone {
                    transition: border-color 0.35s ease, background 0.35s ease, box-shadow 0.35s ease, transform 0.35s ease;
                }
                .study-dropzone:hover {
                    transform: translateY(-2px);
                    border-color: rgba(212, 175, 55, 0.55);
                    box-shadow: 0 0 28px rgba(212, 175, 55, 0.08);
                }
            `}</style>

            {/* Efeito luminoso de fundo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/5 blur-[120px] pointer-events-none rounded-full"></div>

            {carregandoEntrega ? (
                <div className="w-full py-16 flex flex-col items-center justify-center relative z-10">
                    <div className="w-10 h-10 border-t-2 border-r-2 border-yellow-500 rounded-full animate-spin mb-4"></div>
                    <p className="font-serif text-[1rem] text-[rgba(235,238,245,0.7)] font-light">Verificando status do trabalho...</p>
                </div>
            ) : (entregaAtual?.status === 'aguardando_correcao' || entregaAtual?.status === 'pendente') ? (
                <div className="w-full border border-yellow-500/20 bg-yellow-500/5 rounded-3xl p-10 text-center relative z-10 flex flex-col items-center shadow-lg">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-6 border border-yellow-500/30">
                        <svg className="w-7 h-7 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h4 className="font-serif text-2xl text-[rgba(248,248,252,0.9)] mb-2 uppercase tracking-wide">Trabalho enviado às Luzes</h4>
                    <p className="text-[0.95rem] text-[rgba(235,238,245,0.7)] font-light max-w-md mx-auto mb-6">
                        Seu trabalho foi recebido e está aguardando correção. Assim que as Luzes finalizarem a apreciação, o resultado aparecerá aqui.
                    </p>
                    <div className="inline-flex flex-col items-center gap-1 text-[0.8rem] text-white/50 tracking-widest uppercase">
                        <span>Status: <strong className="text-yellow-500/90 font-medium">Aguardando Correção</strong></span>
                        {entregaAtual.arquivo_nome && <span>Arquivo enviado: {entregaAtual.arquivo_nome}</span>}
                    </div>
                </div>
            ) : (entregaAtual?.status === 'aprovado' || entregaAtual?.status === 'concluido') ? (
                <div className="w-full border border-emerald-500/20 bg-emerald-500/5 rounded-3xl p-10 text-center relative z-10 flex flex-col items-center shadow-lg">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                        <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h4 className="font-serif text-2xl text-emerald-400 mb-2 uppercase tracking-wide">Trabalho Aprovado</h4>
                    <p className="text-[0.95rem] text-[rgba(235,238,245,0.7)] font-light max-w-md mx-auto mb-6">
                        Parabéns! Seu trabalho foi apreciado e aprovado pelas Luzes da Loja.
                    </p>
                </div>
            ) : (
                <>
                    {/* Caso tenha tido recusa/revisão solicitada */}
                    {(entregaAtual?.status === 'refazer' || entregaAtual?.status === 'revisar' || entregaAtual?.status === 'reprovado') && (
                        <div className="w-full mb-8 border border-red-500/20 bg-red-500/5 rounded-2xl p-6 relative z-10 flex gap-4 text-left shadow-lg">
                            <div className="mt-1 flex-shrink-0">
                                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-bold text-red-400 text-sm uppercase tracking-widest mb-2">Ajustes Solicitados</h4>
                                <p className="text-[0.9rem] text-white/80 leading-relaxed mb-4">
                                    As Luzes solicitaram ajustes neste trabalho. Revise as observações e envie uma nova versão.
                                </p>
                                {entregaAtual.feedback && (
                                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-white/70 text-[0.85rem] font-serif italic">
                                        "{entregaAtual.feedback}"
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div 
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="study-dropzone w-full border border-dashed border-white/10 hover:border-yellow-500/30 rounded-3xl p-12 lg:p-16 text-center transition-all duration-500 bg-white/[0.01] hover:bg-yellow-500/[0.02] group relative z-10 flex flex-col items-center justify-center cursor-pointer shadow-lg"
                    >
                        <input 
                            type="file" 
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                        />
                        
                        {!file ? (
                            <>
                                <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-yellow-500/10 transition-all duration-500 border border-white/5 group-hover:border-yellow-500/20">
                                    <svg className="w-6 h-6 text-white/40 group-hover:text-yellow-500/80 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                </div>
                                <p className="font-serif text-[1.1rem] text-[rgba(235,238,245,0.8)] font-light mb-2">
                                    Arraste seu documento ou <span className="text-yellow-500/90 font-medium border-b border-yellow-500/30 group-hover:border-yellow-500 transition-colors">clique para procurar</span>
                                </p>
                                <p className="text-[0.7rem] tracking-[0.15em] uppercase text-white/30 font-normal mt-4">
                                    Apenas PDF ou DOCX (Max: 10MB)
                                </p>
                            </>
                        ) : (
                            <div className="flex flex-col items-center animate-fade-in">
                                <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(234,179,8,0.15)] relative border border-yellow-500/20">
                                    <svg className="w-7 h-7 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#050505] rounded-full flex items-center justify-center">
                                        <div className="w-5 h-5 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center">
                                            <span className="text-emerald-400 text-[10px] font-bold">✓</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm font-medium text-white/90 truncate max-w-[280px] mb-2">{file.name}</p>
                                <p className="text-[0.65rem] text-yellow-500/60 uppercase tracking-widest hover:text-yellow-400 transition-colors">
                                    Clique ou arraste para substituir
                        </p>
                    </div>
                )}
            </div>

                <div className="w-full mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10 px-2">
                    <div className="flex items-start gap-3 opacity-60 max-w-sm">
                        <svg className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-[0.75rem] text-white leading-relaxed text-left">
                            Após envio, não será possível alterar o arquivo salvo se as Luzes solicitarem ajustes.
                        </p>
                    </div>

                    <button
                        onClick={handleSubmitClick}
                        disabled={!file || isSubmitting}
                        className="px-8 py-3.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 hover:border-yellow-500/40 text-[0.75rem] font-bold uppercase tracking-[0.2em] rounded-full transition-all shadow-[0_0_20px_rgba(234,179,8,0.1)] hover:shadow-[0_0_30px_rgba(234,179,8,0.2)] disabled:opacity-30 disabled:cursor-not-allowed transform hover:-translate-y-0.5 shrink-0"
                    >
                        {isSubmitting ? 'Enviando...' : 'Enviar Trabalho'}
                    </button>
                </div>
                </>
            )}

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

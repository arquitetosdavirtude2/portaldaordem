'use client';

import { useState, useRef, useEffect } from 'react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { renderAsync } from 'docx-preview';

interface ModalCorrecaoEntregaProps {
    entrega: any;
    acessoId: number; // ID da Luz logada
    onClose: () => void;
    onSuccess: () => void;
}

export default function ModalCorrecaoEntrega({ entrega, acessoId, onClose, onSuccess }: ModalCorrecaoEntregaProps) {
    const [feedback, setFeedback] = useState(entrega.feedback || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, title: string, message: string, variant: 'warning' | 'danger' | 'success'} | null>(null);
    const docxContainerRef = useRef<HTMLDivElement>(null);
    const [docxError, setDocxError] = useState(false);

    // Identificar tipo de arquivo
    const isDocx = entrega.arquivo_nome?.toLowerCase().endsWith('.docx') || entrega.arquivo_nome?.toLowerCase().endsWith('.doc');
    const isPdf = entrega.arquivo_nome?.toLowerCase().endsWith('.pdf');

    // URLs usando o novo endpoint (com pessoa_id injetado)
    const urlVisualizar = entrega.arquivo_url ? `${entrega.arquivo_url}&pessoa_id=${acessoId}` : null;
    const urlBaixar = entrega.arquivo_download_url ? `${entrega.arquivo_download_url}&pessoa_id=${acessoId}` : null;

    useEffect(() => {
        if (showPreview && isDocx && urlVisualizar) {
            setDocxError(false);
            fetch(urlVisualizar)
                .then(async res => {
                    if (!res.ok) throw new Error("Falha ao carregar DOCX");
                    const blob = await res.blob();
                    if (docxContainerRef.current) {
                        await renderAsync(blob, docxContainerRef.current);
                    }
                })
                .catch(err => {
                    console.error("Erro ao renderizar DOCX:", err);
                    setDocxError(true);
                });
        }
    }, [showPreview, isDocx, urlVisualizar]);

    const handleCorrecao = async (status: string) => {
        if (!feedback.trim() && status === 'refazer') {
            setAlertConfig({
                isOpen: true,
                title: 'Feedback Necessário',
                message: 'Para solicitar ajustes, é obrigatório preencher as observações com o que precisa ser corrigido.',
                variant: 'warning'
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new URLSearchParams();
            formData.append('entrega_id', String(entrega.id || entrega.entrega_id)); // Dependendo de onde veio
            formData.append('status', status);
            formData.append('corrigido_por', String(acessoId));
            formData.append('feedback', feedback);

            const res = await fetch('/api/trabalhos/entregas/admin/correcao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });

            if (!res.ok) {
                setAlertConfig({
                    isOpen: true,
                    title: 'Erro ao Corrigir',
                    message: 'Ocorreu um erro ao enviar a correção. Tente novamente.',
                    variant: 'danger'
                });
                return;
            }

            setAlertConfig({
                isOpen: true,
                title: 'Sucesso',
                message: `Trabalho ${status === 'aprovado' ? 'aprovado' : 'retornado para ajustes'} com sucesso!`,
                variant: 'success'
            });

            setTimeout(() => {
                onSuccess();
            }, 2000);

        } catch (e) {
            console.error(e);
            setAlertConfig({
                isOpen: true,
                title: 'Erro',
                message: 'Não foi possível conectar ao servidor.',
                variant: 'danger'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose}></div>
            
            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative z-10 flex flex-col custom-scrollbar">
                
                {/* Header Elegante */}
                <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5 p-6 flex justify-between items-center">
                    <div>
                        <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest block mb-1">Correção de Trabalho</span>
                        <h3 className="text-xl font-serif text-white uppercase">{entrega.conteudo_titulo || entrega.titulo_trabalho}</h3>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors">
                        ✕
                    </button>
                </div>

                <div className="p-6 md:p-8 space-y-8">
                    
                    {/* Informações Iniciais */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="col-span-2">
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Irmão</label>
                            <p className="text-lg font-medium text-white/90">{entrega.pessoa_nome || entrega.nome_irmao || 'Nome não fornecido'}</p>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Status atual</label>
                            <p className="text-sm font-medium text-yellow-500 uppercase tracking-widest">Aguardando Correção</p>
                        </div>
                    </div>

                    {/* Área do Arquivo */}
                    <div className="border border-white/10 bg-white/[0.02] rounded-2xl p-6">
                        <h4 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-4">Arquivo Enviado</h4>
                        
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-white font-medium">{entrega.arquivo_nome || 'trabalho_enviado.pdf'}</p>
                                    <p className="text-xs text-gray-500">
                                        Enviado em: {entrega.data_upload ? new Date(entrega.data_upload).toLocaleString('pt-BR') : 'Data não registrada'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                {urlBaixar && (
                                    <button 
                                        onClick={async () => {
                                            try {
                                                const res = await fetch(urlBaixar);
                                                if (!res.ok) {
                                                    const contentType = res.headers.get("content-type") || "";
                                                    if (contentType.includes("application/json")) {
                                                        const err = await res.json();
                                                        setAlertConfig({isOpen: true, title: 'Erro', message: err.detail || 'Arquivo indisponível.', variant: 'danger'});
                                                        return;
                                                    }
                                                    setAlertConfig({isOpen: true, title: 'Erro', message: 'Arquivo não encontrado no servidor.', variant: 'danger'});
                                                    return;
                                                }
                                                const blob = await res.blob();
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                const cd = res.headers.get('content-disposition');
                                                let fileName = entrega.arquivo_nome || 'download';
                                                if (cd && cd.includes('filename="')) {
                                                    fileName = cd.split('filename="')[1].split('"')[0];
                                                }
                                                a.download = fileName;
                                                document.body.appendChild(a);
                                                a.click();
                                                a.remove();
                                                window.URL.revokeObjectURL(url);
                                            } catch (e) {
                                                setAlertConfig({isOpen: true, title: 'Erro', message: 'Falha de comunicação ao tentar baixar o arquivo.', variant: 'danger'});
                                            }
                                        }}
                                        className="px-5 py-2.5 bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-white/10 transition-colors inline-flex items-center gap-2 cursor-pointer"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        Baixar
                                    </button>
                                )}
                                {urlVisualizar && (
                                    <button 
                                        onClick={() => setShowPreview(!showPreview)}
                                        className="px-5 py-2.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-blue-500/20 transition-colors inline-flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        Visualizar
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Área de Visualização Embutida */}
                        {showPreview && urlVisualizar && (
                            <div className="mt-6 border-t border-white/10 pt-6 animate-fade-in">
                                {isDocx ? (
                                    <div className="w-full bg-white rounded-xl overflow-hidden shadow-inner flex flex-col items-center justify-center p-4 min-h-[400px]">
                                        <div ref={docxContainerRef} className="docx-preview-area w-full max-w-full overflow-x-auto text-black" />
                                        {docxError && (
                                            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6 text-center mt-4 w-full">
                                                <p className="text-orange-600 font-medium mb-4">
                                                    Não foi possível visualizar este DOCX no navegador. Baixe o arquivo para realizar a correção.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : isPdf ? (
                                    <div className="w-full h-[600px] bg-white rounded-xl overflow-hidden shadow-inner">
                                        <iframe 
                                            src={urlVisualizar} 
                                            className="w-full h-full border-0"
                                            title="Visualizador de PDF"
                                        />
                                    </div>
                                ) : (
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                                        <p className="text-white/60">Formato de arquivo não suportado para visualização direta.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Respostas de Quiz (se houver, deixado fixo e discreto) */}
                    <div className="pt-4">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-2">Respostas de Quiz (se houver)</label>
                        <p className="text-[13px] text-white/40 italic">Este trabalho não possui respostas de quiz registradas no momento.</p>
                    </div>

                    {/* Decisão / Feedback */}
                    <div className="border-t border-white/10 pt-8 mt-4">
                        <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Decisão da Luz</h4>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-2">Observações / Feedback ao Irmão</label>
                                <textarea
                                    value={feedback}
                                    onChange={e => setFeedback(e.target.value)}
                                    placeholder="Digite suas observações..."
                                    className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-yellow-500/50 resize-none font-serif"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
                                <button
                                    onClick={() => handleCorrecao('refazer')}
                                    disabled={isSubmitting}
                                    className="px-6 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[11px] font-bold uppercase tracking-[0.15em] rounded-xl transition-all disabled:opacity-50"
                                >
                                    Solicitar Ajustes
                                </button>
                                <button
                                    onClick={() => handleCorrecao('aprovado')}
                                    disabled={isSubmitting}
                                    className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold uppercase tracking-[0.15em] rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50"
                                >
                                    Aprovar Trabalho
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmDialog 
                isOpen={!!alertConfig?.isOpen}
                title={alertConfig?.title || ''}
                message={alertConfig?.message || ''}
                confirmLabel="OK"
                onConfirm={() => {
                    setAlertConfig(null);
                    if (alertConfig?.variant === 'success') {
                        onSuccess();
                    }
                }}
                variant={alertConfig?.variant || 'info'}
                isAlertOnly={true}
            />
        </div>
    );
}

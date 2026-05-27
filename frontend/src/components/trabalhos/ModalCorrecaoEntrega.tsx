'use client';

import { useState, useRef, useEffect } from 'react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import DocxViewer from './DocxViewer';

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
    const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, title: string, message: string, variant: 'warning' | 'danger' | 'success', closeOnSuccess?: boolean} | null>(null);
    const docxContainerRef = useRef<HTMLDivElement>(null);
    const [docxError, setDocxError] = useState(false);

    // Identificar tipo de arquivo
    const isDocx = entrega.arquivo_nome?.toLowerCase().endsWith('.docx') || entrega.arquivo_nome?.toLowerCase().endsWith('.doc');
    const isPdf = entrega.arquivo_nome?.toLowerCase().endsWith('.pdf');

    // Quiz estado
    const [respostasQuiz, setRespostasQuiz] = useState<any[]>([]);
    const [loadingQuiz, setLoadingQuiz] = useState(false);
    
    // Estados de correção individual de quiz
    const [quizFeedback, setQuizFeedback] = useState<Record<number, string>>({});
    const [quizNota, setQuizNota] = useState<Record<number, string>>({});
    const [quizSubmitting, setQuizSubmitting] = useState<Record<number, boolean>>({});

    const handleCorrigirRespostaQuiz = async (respostaId: number, status: 'aprovado' | 'reprovado') => {
        setQuizSubmitting(prev => ({ ...prev, [respostaId]: true }));
        try {
            const res = await fetch('/api/trabalhos/corrigir-resposta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resposta_id: respostaId,
                    status: status,
                    feedback: quizFeedback[respostaId] || '',
                    nota: parseFloat(quizNota[respostaId] || '0') || 0,
                    corrigido_por: acessoId
                })
            });
            if (res.ok) {
                // Atualizar lista localmente
                setRespostasQuiz(prev => prev.map(r => 
                    r.id === respostaId ? { ...r, is_correto: status === 'aprovado', status, nota: parseFloat(quizNota[respostaId] || '0') || 0, feedback: quizFeedback[respostaId] || '' } : r
                ));
                setAlertConfig({isOpen: true, title: 'Sucesso', message: 'Resposta corrigida com sucesso!', variant: 'success'});
            } else {
                setAlertConfig({isOpen: true, title: 'Erro', message: 'Falha ao corrigir resposta.', variant: 'danger'});
            }
        } catch (e) {
            console.error(e);
            setAlertConfig({isOpen: true, title: 'Erro', message: 'Erro de comunicação com servidor.', variant: 'danger'});
        } finally {
            setQuizSubmitting(prev => ({ ...prev, [respostaId]: false }));
        }
    };

    useEffect(() => {
        if (!entrega?.conteudo_id || !entrega?.pessoa_id) return;
        setLoadingQuiz(true);
        fetch(`/api/trabalhos/respostas/${entrega.conteudo_id}/${entrega.pessoa_id}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setRespostasQuiz(data);
            })
            .catch(err => console.error("Erro ao buscar respostas do quiz:", err))
            .finally(() => setLoadingQuiz(false));
    }, [entrega?.conteudo_id, entrega?.pessoa_id]);

    // URLs usando apenas o id da entrega (sem pessoa_id=0)
    const idDaEntrega = entrega.id || entrega.entrega_id;
    const urlVisualizar = idDaEntrega ? `/api/trabalhos/entregas/${idDaEntrega}/arquivo?download=false` : null;
    const urlBaixar = idDaEntrega ? `/api/trabalhos/entregas/${idDaEntrega}/arquivo?download=true` : null;

    useEffect(() => {
        if (showPreview && isDocx) {
            // Apenas exibe o aviso que precisa baixar, sem tentar renderizar
            setDocxError(true);
        }
    }, [showPreview, isDocx]);

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
                variant: 'success',
                closeOnSuccess: true
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
            
            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-[calc(100vw-24px)] sm:w-[calc(100vw-64px)] max-w-[1180px] max-h-[calc(100vh-24px)] sm:max-h-[calc(100vh-64px)] overflow-y-auto shadow-2xl relative z-10 flex flex-col custom-scrollbar">
                
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
                                                    const text = await res.text();
                                                    console.error("Erro ao baixar arquivo:", res.status, text);
                                                    setAlertConfig({isOpen: true, title: 'Erro', message: 'Não foi possível baixar o arquivo. Verifique se ele existe no servidor.', variant: 'danger'});
                                                    return;
                                                }

                                                const contentType = res.headers.get("content-type") || "";
                                                if (contentType.includes("application/json")) {
                                                    const error = await res.json();
                                                    setAlertConfig({isOpen: true, title: 'Erro', message: error.detail || 'Erro ao baixar arquivo.', variant: 'danger'});
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
                                                console.error(e);
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
                                    <DocxViewer url={urlVisualizar} />
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

                    {/* Respostas de Quiz */}
                    <div className="pt-4 border-t border-white/5">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-4">Respostas do Quiz</label>
                        
                        {loadingQuiz ? (
                            <p className="text-[13px] text-white/40 italic">Carregando respostas...</p>
                        ) : respostasQuiz.length > 0 ? (
                            <div className="space-y-6">
                                {respostasQuiz.map((resposta, index) => (
                                    <div key={resposta.id || index} className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
                                        
                                        {/* HEADER DA PERGUNTA */}
                                        <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-4">
                                            <p className="text-[11px] text-yellow-500 font-bold uppercase tracking-widest">Pergunta {index + 1}</p>
                                            <span className="text-[10px] text-gray-400 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-md font-bold">
                                                TIPO: {resposta.tipo === 'livre' ? 'LIVRE' : resposta.tipo === 'multipla_escolha' ? 'MÚLTIPLA ESCOLHA' : 'LACUNAS'}
                                            </span>
                                        </div>
                                        
                                        {/* PERGUNTA E TEXTO BASE */}
                                        <div className="mb-6">
                                            <p className="text-sm text-gray-200 mb-2 font-serif">{resposta.pergunta}</p>
                                            
                                            {resposta.tipo === 'lacunas' && resposta.texto_base && (
                                                <div className="mt-3 p-4 bg-white/[0.02] border border-white/5 rounded-lg">
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Texto Base:</p>
                                                    <p className="text-sm text-white/80 leading-relaxed">
                                                        {resposta.texto_base.split(' ').map((word: string, i: number) => {
                                                            const isOculta = resposta.palavras_ocultas?.includes(i);
                                                            return isOculta ? (
                                                                <span key={i} className="inline-block mx-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded font-mono text-xs">
                                                                    [lacuna]
                                                                </span>
                                                            ) : (
                                                                <span key={i}> {word} </span>
                                                            );
                                                        })}
                                                    </p>
                                                </div>
                                            )}

                                            {resposta.tipo === 'multipla_escolha' && resposta.alternativas && (
                                                <div className="mt-3 space-y-2">
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Alternativas:</p>
                                                    {resposta.alternativas.map((alt: string, i: number) => {
                                                        const isSelected = resposta.resposta_irmao?.includes(`${['A', 'B', 'C', 'D', 'E'][i]}.`);
                                                        const isCorrect = resposta.resposta_correta?.includes(`${['A', 'B', 'C', 'D', 'E'][i]}.`);
                                                        
                                                        return (
                                                            <div key={i} className={`flex items-center p-2 rounded-lg border ${isSelected && isCorrect ? 'bg-emerald-500/10 border-emerald-500/30' : isSelected && !isCorrect ? 'bg-red-500/10 border-red-500/30' : isCorrect && !isSelected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.02] border-white/5'}`}>
                                                                <span className={`font-bold mr-3 ${isSelected && isCorrect ? 'text-emerald-500' : isSelected && !isCorrect ? 'text-red-500' : isCorrect && !isSelected ? 'text-emerald-500' : 'text-gray-400'}`}>{['A', 'B', 'C', 'D', 'E'][i]}.</span> 
                                                                <p className={`text-xs ${isSelected && isCorrect ? 'text-emerald-500' : isSelected && !isCorrect ? 'text-red-400' : isCorrect && !isSelected ? 'text-emerald-500' : 'text-white/70'}`}>{alt}</p>
                                                                {isSelected && <span className={`ml-auto text-[9px] uppercase tracking-wider font-bold ${isCorrect ? 'text-emerald-500' : 'text-red-500'}`}>(Resp. do Irmão)</span>}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* COMPARAÇÃO DE RESPOSTAS */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            
                                            {/* RESPOSTA DO IRMÃO */}
                                            <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Resposta do Irmão</p>
                                                
                                                {resposta.resposta_irmao ? (
                                                    resposta.tipo === 'lacunas' && Array.isArray(resposta.resposta_irmao) ? (
                                                        <ul className="list-decimal list-inside text-sm text-white/90 space-y-1">
                                                            {resposta.resposta_irmao.map((palavra: string, i: number) => (
                                                                <li key={i}>{palavra}</li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-sm text-white/90 whitespace-pre-wrap">{resposta.resposta_irmao}</p>
                                                    )
                                                ) : (
                                                    <p className="text-sm text-gray-500 italic">Nenhuma resposta registrada para esta pergunta.</p>
                                                )}
                                            </div>

                                            {/* RESPOSTA CORRETA (APENAS LACUNAS E MÚLTIPLA) */}
                                            {resposta.tipo !== 'livre' && (
                                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
                                                    <p className="text-[10px] text-emerald-500/70 uppercase tracking-widest mb-3 font-bold">Resposta Correta</p>
                                                    
                                                    {resposta.tipo === 'lacunas' && Array.isArray(resposta.resposta_correta) ? (
                                                        <ul className="list-decimal list-inside text-sm text-emerald-400 space-y-1">
                                                            {resposta.resposta_correta.map((palavra: string, i: number) => (
                                                                <li key={i}>{palavra}</li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-sm text-emerald-400 whitespace-pre-wrap">{resposta.resposta_correta || 'Não definida'}</p>
                                                    )}
                                                </div>
                                            )}
                                            
                                        </div>
                                        
                                        {/* RESULTADO AUTOMÁTICO */}
                                        {resposta.tipo !== 'livre' && (
                                            <div className="mb-6 flex items-center gap-3">
                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest">Resultado Automático:</span>
                                                {resposta.is_correto ? (
                                                    <span className="text-[11px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded font-bold uppercase tracking-widest">✅ Correto</span>
                                                ) : (
                                                    <span className="text-[11px] bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded font-bold uppercase tracking-widest">❌ Errado</span>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* CORREÇÃO DA LUZ */}
                                        <div className="border-t border-white/5 pt-5">
                                            <p className="text-[11px] text-yellow-500 font-bold uppercase tracking-widest mb-4">Sua Correção (Luz)</p>
                                            
                                            <div className="flex flex-col md:flex-row gap-4 mb-5">
                                                <div className="w-full md:w-32 shrink-0">
                                                    <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-2">Nota</label>
                                                    <input 
                                                        type="number" 
                                                        step="0.5"
                                                        min="0"
                                                        max="10"
                                                        value={quizNota[resposta.id] ?? resposta.nota ?? ''}
                                                        onChange={e => setQuizNota(prev => ({ ...prev, [resposta.id]: e.target.value }))}
                                                        className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
                                                        placeholder="0.0"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-2">Feedback Específico</label>
                                                    <input 
                                                        type="text" 
                                                        value={quizFeedback[resposta.id] ?? resposta.feedback ?? ''}
                                                        onChange={e => setQuizFeedback(prev => ({ ...prev, [resposta.id]: e.target.value }))}
                                                        className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
                                                        placeholder="Opcional. Ex: Faltou citar o autor X."
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={() => handleCorrigirRespostaQuiz(resposta.id, 'aprovado')}
                                                    disabled={quizSubmitting[resposta.id] || !resposta.resposta_irmao}
                                                    className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all border ${resposta.status === 'aprovado' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:text-emerald-500'} disabled:opacity-50`}
                                                >
                                                    {quizSubmitting[resposta.id] ? 'Salvando...' : 'Aprovar / Certo'}
                                                </button>
                                                <button 
                                                    onClick={() => handleCorrigirRespostaQuiz(resposta.id, 'reprovado')}
                                                    disabled={quizSubmitting[resposta.id] || !resposta.resposta_irmao}
                                                    className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all border ${resposta.status === 'reprovado' ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-500'} disabled:opacity-50`}
                                                >
                                                    {quizSubmitting[resposta.id] ? 'Salvando...' : 'Reprovar / Errado'}
                                                </button>
                                            </div>
                                        </div>

                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[13px] text-white/40 italic bg-white/5 p-6 rounded-xl text-center border border-white/10">Este trabalho não possui respostas de quiz registradas no momento.</p>
                        )}
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
                    if (alertConfig?.closeOnSuccess) {
                        onSuccess();
                    }
                }}
                variant={alertConfig?.variant || 'info'}
                isAlertOnly={true}
            />
        </div>
    );
}

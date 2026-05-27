'use client';

import { useState, useEffect } from 'react';
import PlayerVideoObreiro from './PlayerVideoObreiro';
import LeitorMateriaisObreiro from './LeitorMateriaisObreiro';
import QuizObreiro from './QuizObreiro';
import EntregaTrabalhoObreiro from './EntregaTrabalhoObreiro';

interface ModalEstudoObreiroProps {
    conteudo: any;
    pessoaId: number;
    onClose: () => void;
    onSuccess: () => void;
}

type StepType = 'videos' | 'materiais' | 'perguntas' | 'entrega' | 'resultado';

export default function ModalEstudoObreiro({ conteudo, pessoaId, onClose, onSuccess }: ModalEstudoObreiroProps) {
    const [activeStep, setActiveStep] = useState<StepType>('videos');
    const [loading, setLoading] = useState(true);
    const [progresso, setProgresso] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    // Animações
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => {
            setIsVisible(true);
        });
        carregarProgresso();
    }, []);

    const carregarProgresso = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/trabalhos/progresso-conteudo/${conteudo.id}?pessoa_id=${pessoaId}`);
            if (!res.ok) throw new Error('Erro ao carregar progresso');
            const data = await res.json();
            setProgresso(data);
            setActiveStep(data.etapa_atual as StepType);
        } catch (err) {
            console.error(err);
            setErrorMsg('Erro ao carregar dados de estudo. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 450);
    };

    const handleTabClick = (step: StepType) => {
        if (!progresso) return;
        const abas = progresso.abas;
        if (abas[step] && abas[step].liberada) {
            setActiveStep(step);
        }
    };

    const handleStepComplete = () => {
        // Recarrega do banco para obter o progresso e desbloqueios atualizados
        carregarProgresso();
    };

    const renderTabs = () => {
        if (!progresso) return null;
        const abas = progresso.abas;
        
        const tabsConfig = [
            { id: 'videos', label: 'Vídeos', icon: '🎬', show: progresso.videos.total > 0 },
            { id: 'materiais', label: 'Materiais', icon: '📄', show: progresso.materiais.total > 0 },
            { id: 'perguntas', label: 'Perguntas', icon: '🧩', show: progresso.quiz.existe },
            { id: 'entrega', label: 'Entrega', icon: '📤', show: progresso.entrega.existe },
            { id: 'resultado', label: 'Resultado', icon: '✅', show: progresso.entrega.existe || progresso.quiz.existe }
        ];

        return (
            <div className="flex flex-wrap gap-2 mb-8 justify-center border-b border-white/10 pb-4">
                {tabsConfig.filter(t => t.show).map(tab => {
                    const isLiberada = abas[tab.id]?.liberada;
                    const isConcluida = abas[tab.id]?.concluida;
                    const isActive = activeStep === tab.id;
                    
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id as StepType)}
                            disabled={!isLiberada}
                            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
                                isActive 
                                    ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]' 
                                    : isLiberada 
                                        ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white cursor-pointer' 
                                        : 'bg-transparent text-gray-600 cursor-not-allowed border border-white/5'
                            }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                            {isConcluida && <span className="ml-1 text-green-500">✓</span>}
                            {!isLiberada && <span className="ml-1 text-gray-600 opacity-50">🔒</span>}
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderConclusion = () => {
        if (!progresso) return null;
        const statusFinal = progresso.entrega.status;
        
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-white/5 rounded-2xl">
                <span className="text-6xl mb-6">
                    {statusFinal === 'aguardando_correcao' ? '⏳' : statusFinal === 'aprovado' ? '🏆' : statusFinal === 'reprovado' ? '❌' : '✅'}
                </span>
                <h2 className="text-2xl font-bold text-white mb-3">
                    {statusFinal === 'aguardando_correcao' 
                        ? 'Estudo Enviado para Correção' 
                        : statusFinal === 'aprovado'
                        ? 'Estudo Concluído com Sucesso'
                        : statusFinal === 'reprovado'
                        ? 'Estudo Reprovado'
                        : 'Estudo Finalizado'}
                </h2>
                <p className="text-gray-400 text-center max-w-md text-sm leading-relaxed mb-8">
                    {statusFinal === 'aguardando_correcao'
                        ? 'Seu trabalho foi enviado às Luzes para apreciação. Aguarde a correção e o retorno para prosseguir na jornada.'
                        : statusFinal === 'aprovado'
                        ? 'Você concluiu todas as etapas deste trabalho. O conhecimento foi assimilado e registrado em sua jornada maçônica.'
                        : statusFinal === 'reprovado'
                        ? 'Infelizmente o trabalho não atingiu os critérios necessários. Fale com as Luzes.'
                        : 'Obrigado por concluir as etapas.'}
                </p>
                {progresso.entrega.feedback && (
                    <div className="w-full max-w-lg mb-8 p-6 bg-white/5 border border-white/10 rounded-xl">
                        <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-widest mb-3">Feedback das Luzes</h3>
                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {progresso.entrega.feedback}
                        </p>
                    </div>
                )}
                <button 
                    onClick={() => { onSuccess(); handleClose(); }}
                    className="px-8 py-3 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 hover:border-yellow-500/40 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(234,179,8,0.1)] hover:shadow-[0_0_30px_rgba(234,179,8,0.2)]"
                >
                    Voltar ao Painel
                </button>
            </div>
        );
    };

    return (
        <div className={`fixed inset-0 z-[300] flex items-center justify-center p-4 lg:p-8 study-modal-overlay ${isVisible && !isClosing ? 'is-open' : ''} ${isClosing ? 'is-closing' : ''}`}>
            
            <style>{`
                .study-modal-overlay {
                    opacity: 0;
                    backdrop-filter: blur(0px);
                    background: rgba(0, 0, 0, 0);
                    transition: opacity 0.45s ease, backdrop-filter 0.55s ease, background 0.55s ease;
                }
                .study-modal-overlay.is-open {
                    opacity: 1;
                    backdrop-filter: blur(8px);
                    background: rgba(0, 0, 0, 0.72);
                }
                .study-modal-panel {
                    opacity: 0;
                    transform: translateY(22px) scale(0.965);
                    filter: blur(8px);
                    transition: opacity 0.65s ease, transform 0.75s cubic-bezier(0.16, 1, 0.3, 1), filter 0.75s ease;
                }
                .study-modal-overlay.is-open .study-modal-panel {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                    filter: blur(0);
                }
                .study-modal-overlay.is-closing {
                    opacity: 0 !important;
                    backdrop-filter: blur(0px) !important;
                    background: rgba(0, 0, 0, 0) !important;
                }
                .study-modal-overlay.is-closing .study-modal-panel {
                    opacity: 0 !important;
                    transform: translateY(10px) scale(0.975) !important;
                    filter: blur(6px) !important;
                }
                .study-modal-panel [data-animate="fade-up"] {
                    opacity: 0;
                    transform: translateY(12px);
                    filter: blur(4px);
                }
                .study-modal-overlay.is-open .study-modal-panel [data-animate="fade-up"] {
                    opacity: 1;
                    transform: translateY(0);
                    filter: blur(0);
                    transition: opacity 0.65s ease, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), filter 0.7s ease;
                }
                .study-modal-overlay.is-open [data-delay="1"] { transition-delay: 0.12s; }
                .study-modal-overlay.is-open [data-delay="2"] { transition-delay: 0.22s; }
                .study-modal-overlay.is-open [data-delay="3"] { transition-delay: 0.32s; }
                .study-modal-overlay.is-open [data-delay="4"] { transition-delay: 0.42s; }
                
                @media (prefers-reduced-motion: reduce) {
                    .study-modal-overlay, .study-modal-panel, .study-modal-panel *, .study-dropzone {
                        animation: none !important;
                        transition: none !important;
                        transform: none !important;
                        filter: none !important;
                    }
                }
            `}</style>

            <div className="absolute inset-0 transition-opacity" onClick={handleClose}></div>
            
            <div className="study-modal-panel w-full max-w-4xl lg:max-h-[90vh] flex flex-col relative z-10 overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] rounded-2xl bg-[#050505] border border-white/5">
                
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-40 bg-yellow-500/5 blur-[100px] pointer-events-none"></div>

                <button 
                    onClick={handleClose} 
                    className="absolute top-4 right-4 lg:top-6 lg:right-6 w-10 h-10 rounded-full bg-white/5 backdrop-blur-md hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer z-[60] border border-white/10 hover:border-white/20"
                    title="Fechar"
                >
                    ✕
                </button>

                <div className="flex-1 overflow-y-auto p-6 lg:p-12 relative hidden-scrollbar flex flex-col">
                    
                    <div className="flex flex-col items-center text-center mb-8 relative z-20 shrink-0">
                        <span className="text-[9px] uppercase tracking-[0.25em] text-yellow-500/70 font-bold mb-4" data-animate="fade-up" data-delay="1">
                            Grau {conteudo.grau} • {conteudo.tipo}
                            {progresso && progresso.modo === 'revisao' && ' • MODO REVISÃO'}
                        </span>
                        
                        <h1 className="font-serif text-[clamp(1.8rem,2.5vw,2.5rem)] text-[rgba(248,248,252,0.9)] font-light leading-[1.1] tracking-[0.01em] mb-4" data-animate="fade-up" data-delay="2">
                            {conteudo.titulo}
                        </h1>

                        {conteudo.descricao_jornada && (
                            <div className="space-y-4 text-[clamp(0.95rem,1vw,1.05rem)] text-white/50 leading-relaxed font-serif font-normal tracking-[0.01em] max-w-2xl mx-auto" data-animate="fade-up" data-delay="3">
                                {conteudo.descricao_jornada
                                    .split(/\n\s*\n|\n/)
                                    .map((p: string) => p.trim())
                                    .filter(Boolean)
                                    .map((paragrafo: string, index: number) => (
                                        <p key={index}>{paragrafo}</p>
                                    ))}
                            </div>
                        )}
                    </div>

                    <div className="relative z-20 flex-1 flex flex-col" data-animate="fade-up" data-delay="4">
                        {loading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : errorMsg ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-xl text-center">
                                    {errorMsg}
                                </div>
                            </div>
                        ) : (
                            <>
                                {renderTabs()}

                                <div className="flex-1 flex flex-col">
                                    <div className={`mt-2 transition-all duration-500 delay-200 ${activeStep === 'videos' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
                                        {activeStep === 'videos' && (
                                            <PlayerVideoObreiro
                                                conteudoId={conteudo.id}
                                                pessoaId={pessoaId}
                                                videos={progresso.videos.items}
                                                onComplete={handleStepComplete}
                                            />
                                        )}
                                    </div>
                    
                                    <div className={`mt-2 transition-all duration-500 delay-200 ${activeStep === 'materiais' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
                                        {activeStep === 'materiais' && (
                                            <LeitorMateriaisObreiro
                                                conteudoId={conteudo.id}
                                                pessoaId={pessoaId}
                                                materiais={progresso.materiais.items}
                                                onComplete={handleStepComplete}
                                            />
                                        )}
                                    </div>

                                    <div className={`mt-2 transition-all duration-500 delay-200 ${activeStep === 'perguntas' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
                                        {activeStep === 'perguntas' && (
                                            <QuizObreiro 
                                                quizzes={conteudo.quizzes || []} 
                                                pessoaId={pessoaId} 
                                                conteudoId={conteudo.id} 
                                                onComplete={handleStepComplete}
                                            />
                                        )}
                                    </div>

                                    <div className={`mt-2 transition-all duration-500 delay-200 ${activeStep === 'entrega' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
                                        {activeStep === 'entrega' && (
                                            <div className="flex-1">
                                                <EntregaTrabalhoObreiro 
                                                    pessoaId={pessoaId} 
                                                    conteudoId={conteudo.id} 
                                                    onComplete={handleStepComplete}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {activeStep === 'resultado' && (
                                        <div className="animate-fade-in flex-1">
                                            {renderConclusion()}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

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

type StepType = 'videos' | 'materiais' | 'quiz' | 'entrega' | 'conclusao';

export default function ModalEstudoObreiro({ conteudo, pessoaId, onClose, onSuccess }: ModalEstudoObreiroProps) {
    const [activeStep, setActiveStep] = useState<StepType>('videos');
    const [availableSteps, setAvailableSteps] = useState<StepType[]>([]);
    const [completedSteps, setCompletedSteps] = useState<Record<StepType, boolean>>({
        videos: false, materiais: false, quiz: false, entrega: false, conclusao: false
    });
    const [statusFinal, setStatusFinal] = useState<string>('concluido');
    
    // Animações
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => {
            setIsVisible(true);
        });
    }, []);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 450);
    };

    const videos = conteudo.materiais?.filter((m: any) => m.tipo === 'video') || [];
    const documentos = conteudo.materiais?.filter((m: any) => m.tipo === 'pdf' || m.tipo === 'docx') || [];
    const quizzes = conteudo.quizzes || [];

    useEffect(() => {
        // Determine which steps are applicable for this work
        const steps: StepType[] = [];
        if (videos.length > 0) steps.push('videos');
        if (documentos.length > 0) steps.push('materiais');
        if (quizzes.length > 0) steps.push('quiz');
        
        // Se for um trabalho formal (prancha), a etapa de entrega e obrigatoria e nunca auto-conclui
        if (conteudo.tipo === 'trabalho') {
            steps.push('entrega');
        }
        
        steps.push('conclusao'); // Sempre tem uma etapa final de feedback

        setAvailableSteps(steps);

        // Pre-check completion based on progress (could be fetched, but we'll start at the first uncompleted step)
        // For simplicity in this demo, we start at the first step and let the components check if they are already completed.
        // Actually, we can fetch overall progress or just let the user navigate. 
        setActiveStep(steps[0]);
    }, [conteudo]);

    const handleStepComplete = (step: StepType, nextStatus?: string) => {
        setCompletedSteps(prev => ({ ...prev, [step]: true }));
        
        if (nextStatus) {
            setStatusFinal(nextStatus);
        }

        const currentIndex = availableSteps.indexOf(step);
        if (currentIndex >= 0 && currentIndex < availableSteps.length - 1) {
            setActiveStep(availableSteps[currentIndex + 1]);
        }
    };

    const getStepLabel = (step: StepType) => {
        switch (step) {
            case 'videos': return 'Videos';
            case 'materiais': return 'Materiais de Apoio';
            case 'quiz': return 'Quiz';
            case 'entrega': return 'Entrega';
            case 'conclusao': return 'Conclusao';
            default: return '';
        }
    };

    const getStepIcon = (step: StepType) => {
        switch (step) {
            case 'videos': return '🎬';
            case 'materiais': return '📄';
            case 'quiz': return '🧩';
            case 'entrega': return '📤';
            case 'conclusao': return '✅';
            default: return '';
        }
    };

    // Calculate progress percentage
    const currentStepIndex = availableSteps.indexOf(activeStep);
    const progressPercent = availableSteps.length > 1 
        ? Math.round((currentStepIndex / (availableSteps.length - 1)) * 100) 
        : 100;

    const renderConclusion = () => {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-white/5 rounded-2xl">
                <span className="text-6xl mb-6">
                    {statusFinal === 'aguardando_correcao' ? '⏳' : '🏆'}
                </span>
                <h2 className="text-2xl font-bold text-white mb-3">
                    {statusFinal === 'aguardando_correcao' 
                        ? 'Estudo Enviado para Correcao' 
                        : 'Estudo Concluido com Sucesso'}
                </h2>
                <p className="text-gray-400 text-center max-w-md text-sm leading-relaxed mb-8">
                    {statusFinal === 'aguardando_correcao'
                        ? 'Seu trabalho foi enviado as Luzes para apreciacao. Aguarde a correcao e o retorno para prosseguir na jornada.'
                        : 'Voce concluiu todas as etapas deste trabalho. O conhecimento foi assimilado e registrado em sua jornada maconica.'}
                </p>
                <button
                    onClick={() => { onSuccess(); handleClose(); }}
                    className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(234,179,8,0.2)]"
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
                
                {/* Efeitos luminosos suaves no fundo do card */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-40 bg-yellow-500/5 blur-[100px] pointer-events-none"></div>

                {/* Botão Fechar Global */}
                <button 
                    onClick={handleClose} 
                    className="absolute top-4 right-4 lg:top-6 lg:right-6 w-10 h-10 rounded-full bg-white/5 backdrop-blur-md hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer z-[60] border border-white/10 hover:border-white/20"
                    title="Fechar"
                >
                    ✕
                </button>

                {/* Área Principal */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-12 relative hidden-scrollbar flex flex-col">
                    
                    {/* Header Contextual (Substitui o painel lateral) */}
                    <div className="flex flex-col items-center text-center mb-10 mt-4 relative z-20 shrink-0">
                        <span className="text-[9px] uppercase tracking-[0.25em] text-yellow-500/70 font-bold mb-4" data-animate="fade-up" data-delay="1">
                            Grau {conteudo.grau} • {conteudo.tipo}
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

                    {/* Area Dinamica (Videos, Materiais, Quiz, Entrega, Conclusão) */}
                    <div className="relative z-20 flex-1 flex flex-col" data-animate="fade-up" data-delay="4">
                        {activeStep === 'videos' && (
                            <PlayerVideoObreiro 
                                videos={videos} 
                                pessoaId={pessoaId} 
                                conteudoId={conteudo.id} 
                                onComplete={() => handleStepComplete('videos')}
                            />
                        )}

                        {activeStep === 'materiais' && (
                            <LeitorMateriaisObreiro 
                                materiais={documentos} 
                                pessoaId={pessoaId} 
                                conteudoId={conteudo.id} 
                                onComplete={() => handleStepComplete('materiais')}
                            />
                        )}

                        {activeStep === 'quiz' && (
                            <QuizObreiro 
                                quizzes={quizzes} 
                                pessoaId={pessoaId} 
                                conteudoId={conteudo.id} 
                                onComplete={(status) => handleStepComplete('quiz', status)}
                            />
                        )}

                        {activeStep === 'entrega' && (
                            <div className="animate-fade-in flex-1">
                                <EntregaTrabalhoObreiro 
                                    pessoaId={pessoaId} 
                                    conteudoId={conteudo.id} 
                                    onComplete={(status) => handleStepComplete('entrega', status)}
                                />
                            </div>
                        )}

                        {activeStep === 'conclusao' && (
                            <div className="animate-fade-in flex-1">
                                {renderConclusion()}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

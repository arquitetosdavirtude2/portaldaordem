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
                    onClick={() => { onSuccess(); onClose(); }}
                    className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(234,179,8,0.2)]"
                >
                    Voltar ao Painel
                </button>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 lg:p-8">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose}></div>
            
            <div className="bg-[#050505] lg:border border-white/10 lg:rounded-3xl w-full h-full max-w-7xl lg:max-h-[90vh] flex flex-col lg:flex-row relative z-10 overflow-hidden shadow-2xl">
                
                {/* Painel Esquerdo (Info) */}
                <div className="lg:w-[320px] xl:w-[380px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col relative bg-gradient-to-br from-[#0f0f0f] to-black z-20 overflow-y-auto hidden-scrollbar p-6 lg:p-10">
                    {/* Efeitos decorativos solenes */}
                    <div className="absolute top-0 left-0 w-full h-64 bg-yellow-500/5 blur-[100px] pointer-events-none"></div>
                    <div className="absolute bottom-0 right-0 w-full h-64 bg-blue-500/5 blur-[100px] pointer-events-none"></div>

                    <div className="relative z-10 flex-1 flex flex-col">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[9px] font-bold uppercase tracking-[0.2em] rounded-md shadow-[0_0_10px_rgba(234,179,8,0.1)]">
                                Grau {conteudo.grau}
                            </span>
                            <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-bold">
                                {conteudo.tipo}
                            </span>
                        </div>
                        
                        <h1 className="font-serif text-[clamp(1.9rem,2.4vw,2.8rem)] text-[rgba(248,248,252,0.9)] font-medium leading-[1.08] tracking-[0.01em] mb-4 drop-shadow-sm">
                            {conteudo.titulo}
                        </h1>
                        
                        {conteudo.descricao_jornada && (
                            <p className="font-serif text-[clamp(0.95rem,1vw,1.08rem)] text-[rgba(220,225,235,0.68)] leading-[1.65] font-normal tracking-[0.01em]">
                                {conteudo.descricao_jornada}
                            </p>
                        )}
                        
                        <div className="mt-auto pt-10 hidden lg:block">
                            <div className="w-16 h-px bg-gradient-to-r from-yellow-500/50 to-transparent mb-4"></div>
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Escola do Saber Macom</p>
                        </div>
                    </div>
                </div>

                {/* Botão Fechar Global */}
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 lg:top-6 lg:right-6 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer z-[60] border border-white/10 hover:border-white/20 shadow-lg"
                    title="Fechar"
                >
                    ✕
                </button>

                {/* Área Direita (Trilha e Conteúdo) */}
                <div className="flex-1 flex flex-col relative h-full overflow-hidden bg-black/20">
                    
                    {/* Mini Indicador de Etapa (Substitui a barra gigante) */}
                    <div className="px-6 lg:px-12 pt-6 lg:pt-8 shrink-0 flex flex-wrap items-center gap-2 relative z-30 opacity-80">
                        {availableSteps.map((step, idx) => {
                            const isActive = activeStep === step;
                            const isCompleted = completedSteps[step] || availableSteps.indexOf(activeStep) > idx;
                            return (
                                <div key={step} className="flex items-center gap-2">
                                    <span className={`text-[10px] uppercase tracking-[0.18em] transition-colors duration-300 ${isActive ? 'text-yellow-500 font-bold' : isCompleted ? 'text-gray-400 font-medium' : 'text-gray-600 font-medium'}`}>
                                        {getStepLabel(step)}
                                    </span>
                                    {idx < availableSteps.length - 1 && (
                                        <span className="text-gray-700/50 text-[10px] font-bold">→</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Área Principal de Rolagem */}
                    <div className="flex-1 overflow-y-auto p-6 lg:p-12 relative hidden-scrollbar">
                        {/* Textura sutil no fundo */}
                        <div className="absolute inset-0 opacity-[0.015] bg-[url('/img/masonic_pattern.png')] bg-repeat pointer-events-none"></div>

                        <div className="relative z-10 min-h-full max-w-4xl mx-auto flex flex-col pt-4 lg:pt-8 pb-16">
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
                                <div className="animate-fade-in-up">
                                    <EntregaTrabalhoObreiro 
                                        pessoaId={pessoaId} 
                                        conteudoId={conteudo.id} 
                                        onComplete={(status) => handleStepComplete('entrega', status)}
                                    />
                                </div>
                            )}

                            {activeStep === 'conclusao' && (
                                <div className="animate-fade-in-up">
                                    {renderConclusion()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

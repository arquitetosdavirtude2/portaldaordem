'use client';

import { useState, useEffect } from 'react';
import PlayerVideoObreiro from './PlayerVideoObreiro';
import LeitorMateriaisObreiro from './LeitorMateriaisObreiro';
import QuizObreiro from './QuizObreiro';

interface ModalEstudoObreiroProps {
    conteudo: any;
    pessoaId: number;
    onClose: () => void;
    onSuccess: () => void;
}

type StepType = 'videos' | 'materiais' | 'quiz' | 'conclusao';

export default function ModalEstudoObreiro({ conteudo, pessoaId, onClose, onSuccess }: ModalEstudoObreiroProps) {
    const [activeStep, setActiveStep] = useState<StepType>('videos');
    const [availableSteps, setAvailableSteps] = useState<StepType[]>([]);
    const [completedSteps, setCompletedSteps] = useState<Record<StepType, boolean>>({
        videos: false, materiais: false, quiz: false, conclusao: false
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
        steps.push('conclusao'); // Always have a conclusion step

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
            case 'conclusao': return 'Conclusao';
            default: return '';
        }
    };

    const getStepIcon = (step: StepType) => {
        switch (step) {
            case 'videos': return '🎬';
            case 'materiais': return '📄';
            case 'quiz': return '🧩';
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
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 lg:p-8">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose}></div>
            
            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col relative z-10 overflow-hidden shadow-2xl">
                {/* Header Premium */}
                <div className="p-6 lg:p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-black via-yellow-500/5 to-black shrink-0 relative overflow-hidden">
                    {/* Decorative lights */}
                    <div className="absolute top-0 left-1/4 w-64 h-64 bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="absolute top-0 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[8px] font-bold uppercase tracking-widest rounded-md">
                                Grau {conteudo.grau}
                            </span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                                {conteudo.tipo}
                            </span>
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">{conteudo.titulo}</h1>
                        {conteudo.descricao_jornada && (
                            <p className="text-sm text-gray-400 mt-2 max-w-2xl">{conteudo.descricao_jornada}</p>
                        )}
                    </div>

                    <button 
                        onClick={onClose} 
                        className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer relative z-10 border border-white/10"
                    >
                        ✕
                    </button>
                </div>

                {/* Progress Bar & Steps */}
                <div className="px-6 lg:px-8 py-4 bg-black/50 border-b border-white/5 shrink-0 flex items-center justify-center">
                    <div className="w-full max-w-4xl relative">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -translate-y-1/2 z-0"></div>
                        <div 
                            className="absolute top-1/2 left-0 h-0.5 bg-yellow-500 -translate-y-1/2 z-0 transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        ></div>

                        <div className="flex justify-between relative z-10">
                            {availableSteps.map((step, idx) => {
                                const isCompleted = completedSteps[step] || availableSteps.indexOf(activeStep) > idx;
                                const isActive = activeStep === step;
                                
                                return (
                                    <div key={step} className="flex flex-col items-center gap-2">
                                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                                            isActive 
                                                ? 'bg-yellow-500 border-yellow-500 text-black scale-110 shadow-[0_0_15px_rgba(234,179,8,0.4)]' 
                                                : isCompleted
                                                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500'
                                                    : 'bg-black border-white/10 text-gray-600'
                                        }`}>
                                            <span className={isActive ? 'opacity-100' : 'opacity-80'}>{getStepIcon(step)}</span>
                                        </div>
                                        <span className={`text-[9px] font-bold uppercase tracking-widest ${
                                            isActive ? 'text-yellow-500' : isCompleted ? 'text-gray-400' : 'text-gray-600'
                                        }`}>
                                            {getStepLabel(step)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-8 relative">
                    {/* Decorative watermark or subtle bg if needed */}
                    <div className="absolute inset-0 opacity-[0.02] bg-[url('/img/masonic_pattern.png')] bg-repeat pointer-events-none"></div>

                    <div className="relative z-10 h-full">
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

                        {activeStep === 'conclusao' && renderConclusion()}
                    </div>
                </div>
            </div>
        </div>
    );
}

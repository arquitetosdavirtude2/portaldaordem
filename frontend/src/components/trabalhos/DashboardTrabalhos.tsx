'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ModalNovoConteudo from './ModalNovoConteudo';
import ModalUploadMaterial from './ModalUploadMaterial';
import ModalQuiz from './ModalQuiz';
import ModalEditarConteudo from './ModalEditarConteudo';

interface DashboardTrabalhosProps {
    acesso: any;
    isDiretoria?: boolean;
}

export default function DashboardTrabalhos({ acesso, isDiretoria }: DashboardTrabalhosProps) {
    const [grauAtivo, setGrauAtivo] = useState<number>(1); // 1=Aprendiz, 2=Companheiro, 3=Mestre
    const [tabAtiva, setTabAtivo] = useState<'trabalhos' | 'prelecoes'>('trabalhos');
    const [itemEmEstudo, setItemEmEstudo] = useState<any>(null);
    const [videoConcluido, setVideoConcluido] = useState(false);
    const [quizAtivo, setQuizAtivo] = useState(false);
    const [quizConcluido, setQuizConcluido] = useState(false);
    const [respostasQuiz, setRespostasQuiz] = useState<string[]>([]);
    const [uploadTrabalhoModal, setUploadTrabalhoModal] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const lastTimeRef = useRef(0);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [conteudos, setConteudos] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [novoConteudoModal, setNovoConteudoModal] = useState(false);
    const [conteudoEditando, setConteudoEditando] = useState<any>(null);
    const [uploadMaterialModal, setUploadMaterialModal] = useState<{ativo: boolean, tipo: 'video'|'pdf'}>({ativo: false, tipo: 'video'});
    const [quizModalAtivo, setQuizModalAtivo] = useState(false);

    const carregarConteudos = async () => {
        setIsLoading(true);
        try {
            const pId = acesso.id || acesso.pessoa_id;
            const url = `/api/trabalhos/?loja_id=${acesso.loja_id}${pId ? `&pessoa_id=${pId}` : ''}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setConteudos(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (acesso && isMounted) {
            carregarConteudos();
        }
    }, [acesso, isMounted]);

    const itensFiltrados = conteudos.filter(item => item.grau === grauAtivo && item.tipo === (tabAtiva === 'trabalhos' ? 'trabalho' : 'prelecao'));

    const progressWorks = conteudos.filter(t => t.grau === grauAtivo && t.tipo === 'trabalho' && t.progresso?.status === 'concluido').length;
    const totalWorks = conteudos.filter(t => t.grau === grauAtivo && t.tipo === 'trabalho').length;
    
    // Video Progress Logic
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            if (video.currentTime > lastTimeRef.current + 2) {
                video.currentTime = lastTimeRef.current;
            } else {
                lastTimeRef.current = video.currentTime;
            }
        };

        const handleEnded = () => {
            setVideoConcluido(true);
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('ended', handleEnded);
        
        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('ended', handleEnded);
        };
    }, [itemEmEstudo]);

    const userGrau = 1; // Temporário, viria do acesso.status
    const canSeeDegree = (id: number) => isDiretoria || id <= userGrau;

    return (
        <>
        <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Degree Navigation (Somente Diretoria) */}
            {isDiretoria && (
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                    <div className="flex gap-4">
                        {[
                            { id: 1, label: 'Aprendiz' },
                            { id: 2, label: 'Companheiro' },
                            { id: 3, label: 'Mestre' }
                        ].map(g => (
                            <button
                                key={g.id}
                                onClick={() => setGrauAtivo(g.id)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all border ${
                                    grauAtivo === g.id 
                                    ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' 
                                    : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setNovoConteudoModal(true)} className="px-5 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-yellow-500/20 transition-all">
                        + Adicionar {tabAtiva === 'trabalhos' ? 'Trabalho' : 'Preleção'}
                    </button>
                </div>
            )}

            {/* Sub-Tabs (Works / Prelections) */}
            <div className="flex border-b border-white/5 bg-black/10 -mx-6 md:-mx-8 mb-6">
                <button
                    onClick={() => setTabAtivo('trabalhos')}
                    className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 ${
                        tabAtiva === 'trabalhos' 
                        ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5' 
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                >
                    📜 Trabalhos
                </button>
                <button
                    onClick={() => setTabAtivo('prelecoes')}
                    className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 ${
                        tabAtiva === 'prelecoes' 
                        ? 'border-blue-500 text-blue-500 bg-blue-500/5' 
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                >
                    📖 Preleções
                </button>
            </div>

            {/* Beautiful Dashboard Cards for Brothers */}
            {!isDiretoria && grauAtivo === userGrau && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {tabAtiva === 'trabalhos' ? (
                        <>
                            {/* Progress Card */}
                            <div className="bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 p-5 rounded-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-20 text-4xl group-hover:scale-110 transition-transform">🏆</div>
                                <span className="text-[9px] uppercase font-bold text-yellow-500 tracking-widest block mb-2">Seu Progresso</span>
                                <div className="flex items-baseline gap-2 mb-3">
                                    <span className="text-3xl font-serif text-white">{progressWorks}</span>
                                    <span className="text-sm text-gray-400">/ {totalWorks || 4}</span>
                                </div>
                                <div className="h-1.5 bg-black/50 rounded-full overflow-hidden w-full">
                                    <div className="h-full bg-yellow-500 rounded-full transition-all duration-1000 relative" style={{ width: `${(totalWorks || 4) > 0 ? (progressWorks/(totalWorks || 4))*100 : 0}%` }}>
                                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Pending Works Card */}
                            <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 p-5 rounded-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-20 text-4xl group-hover:scale-110 transition-transform">📚</div>
                                <span className="text-[9px] uppercase font-bold text-blue-400 tracking-widest block mb-2">A Fazer</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-serif text-white">{(totalWorks || 4) - progressWorks}</span>
                                    <span className="text-sm text-gray-400">pendentes</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-3">Continue seus estudos.</p>
                            </div>
                            
                            {/* Average Score Card */}
                            <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 p-5 rounded-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-20 text-4xl group-hover:scale-110 transition-transform">🎯</div>
                                <span className="text-[9px] uppercase font-bold text-purple-400 tracking-widest block mb-2">Aproveitamento</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-serif text-white">9.5</span>
                                    <span className="text-sm text-gray-400">/ 10</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-3">Média de notas nos Quizzes.</p>
                            </div>
                            
                            {/* Last Activity Card */}
                            <div className="bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/20 p-5 rounded-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-20 text-4xl group-hover:scale-110 transition-transform">⏱️</div>
                                <span className="text-[9px] uppercase font-bold text-rose-400 tracking-widest block mb-2">Última Atividade</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-serif text-white">Hoje</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-3">Sua consistência está ótima.</p>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Prelections Card */}
                            <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 p-5 rounded-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-20 text-4xl group-hover:scale-110 transition-transform">📖</div>
                                <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-widest block mb-2">Preleções</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-serif text-white">{conteudos.filter(t => t.grau === grauAtivo && t.tipo === 'prelecao').length || 4}</span>
                                    <span className="text-sm text-gray-400">disponíveis</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-3">Sessões de instrução da loja.</p>
                            </div>
                            
                            {/* Hours Watched */}
                            <div className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 p-5 rounded-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-20 text-4xl group-hover:scale-110 transition-transform">⌛</div>
                                <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-widest block mb-2">Tempo de Estudo</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-serif text-white">12</span>
                                    <span className="text-sm text-gray-400">horas</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-3">Total de vídeos assistidos.</p>
                            </div>
                            
                            {/* Presence */}
                            <div className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 p-5 rounded-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-20 text-4xl group-hover:scale-110 transition-transform">🏛️</div>
                                <span className="text-[9px] uppercase font-bold text-orange-400 tracking-widest block mb-2">Presença</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-serif text-white">100%</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-3">Presença em instruções.</p>
                            </div>
                            
                            {/* Next Session */}
                            <div className="bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20 p-5 rounded-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-20 text-4xl group-hover:scale-110 transition-transform">📅</div>
                                <span className="text-[9px] uppercase font-bold text-cyan-400 tracking-widest block mb-2">Próxima Sessão</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-serif text-white">Breve</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-3">Aguarde convite da Oratória.</p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* List Section */}
            <div className="grid grid-cols-1 gap-2">
                {itensFiltrados.map((item) => (
                    <div 
                        key={item.id}
                        onClick={() => {
                            setItemEmEstudo(item);
                            if (!isDiretoria) {
                                setVideoConcluido(false);
                                setQuizAtivo(false);
                                setQuizConcluido(false);
                                setRespostasQuiz([]);
                                lastTimeRef.current = 0;
                            }
                        }}
                        className="group flex items-center justify-between p-4 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-lg transition-all cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`text-xl ${tabAtiva === 'trabalhos' ? 'text-yellow-500/40' : 'text-blue-500/40'}`}>
                                {tabAtiva === 'trabalhos' ? '📜' : '📖'}
                            </div>
                            <div>
                                <h4 className="text-[14px] font-medium text-gray-200 group-hover:text-yellow-500/80 transition-colors tracking-tight">
                                    {item.titulo}
                                </h4>
                                <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold mt-0.5">
                                    {grauAtivo === 1 ? 'Aprendiz' : grauAtivo === 2 ? 'Companheiro' : 'Mestre'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-[8px] text-gray-600 uppercase tracking-[0.2em] font-bold opacity-50">Status</span>
                                <span className="text-[9px] text-red-500/50 font-bold uppercase tracking-tight">Pendente</span>
                            </div>
                            <div 
                                onClick={(e) => {
                                    if (isDiretoria) {
                                        e.stopPropagation();
                                        setConteudoEditando(item);
                                    }
                                }}
                                className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-yellow-500/20 flex items-center justify-center transition-all"
                            >
                                <span className="text-[10px] opacity-50 group-hover:opacity-100 group-hover:text-yellow-500">
                                    {isDiretoria ? '⚙️' : '▶️'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {itensFiltrados.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                        <span className="text-4xl mb-4 opacity-20">🚧</span>
                        <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Nenhum conteúdo cadastrado para este grau</p>
                    </div>
                )}
            </div>
        </div>

            {isMounted && createPortal(
                <>
            {/* Study Modal Overlay (Brother View) */}
            {itemEmEstudo && !isDiretoria && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setItemEmEstudo(null)}></div>
                    
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl relative z-10 flex flex-col">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div>
                                <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest block mb-1">Modo de Estudo • {itemEmEstudo.titulo}</span>
                                <h3 className="text-lg font-medium text-white uppercase tracking-tight">Vídeo Aula & Conteúdo</h3>
                            </div>
                            <button 
                                onClick={() => setItemEmEstudo(null)}
                                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-all"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Video Section */}
                            <div className="aspect-video bg-black rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative group">
                                <video 
                                    ref={videoRef}
                                    className="w-full h-full"
                                    controls
                                    controlsList="nodownload nofullscreen"
                                    src="/sample-video.mp4" // Placeholder
                                >
                                    Seu navegador não suporta vídeos.
                                </video>
                                {!videoConcluido && (
                                    <div className="absolute top-4 right-4 px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full backdrop-blur-md">
                                        <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-widest">Estudo em progresso - Não pule o vídeo</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Documentação de Apoio</h4>
                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between hover:bg-white/[0.05] transition-all cursor-pointer group">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">📄</span>
                                            <span className="text-[11px] font-medium text-gray-300 group-hover:text-white transition-colors">Resumo_Sessao.pdf</span>
                                        </div>
                                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Abrir</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Verificação de Conhecimento</h4>
                                    
                                    {!quizAtivo && !quizConcluido && (
                                        <div className={`p-6 rounded-2xl border transition-all ${
                                            videoConcluido 
                                            ? 'bg-emerald-500/5 border-emerald-500/20' 
                                            : 'bg-white/[0.01] border-white/5 opacity-50 grayscale'
                                        }`}>
                                            <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                                                {videoConcluido 
                                                    ? 'Parabéns por completar o estudo! Responda ao quiz abaixo para liberar a conclusão.'
                                                    : 'Assista o vídeo até o final para liberar o questionário de verificação.'}
                                            </p>
                                            <button 
                                                disabled={!videoConcluido}
                                                onClick={() => setQuizAtivo(true)}
                                                className="w-full py-3 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-20 disabled:grayscale-0"
                                            >
                                                Iniciar Quiz
                                            </button>
                                        </div>
                                    )}

                                    {quizAtivo && !quizConcluido && (
                                        <div className="p-6 rounded-2xl border bg-emerald-500/5 border-emerald-500/20 space-y-6">
                                            {(itemEmEstudo?.quizzes || []).map((perg: any, i: number) => (
                                                <div key={perg.id || i} className="space-y-3">
                                                    <p className="text-[11px] font-medium text-white">{i+1}. {perg.pergunta}</p>
                                                    <div className="space-y-2">
                                                        <textarea 
                                                            value={respostasQuiz[i] || ''}
                                                            onChange={(e) => {
                                                                const newResp = [...respostasQuiz];
                                                                newResp[i] = e.target.value;
                                                                setRespostasQuiz(newResp);
                                                            }}
                                                            placeholder="Digite sua resposta aqui..."
                                                            rows={3}
                                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => {
                                                    const quizzesLength = (itemEmEstudo?.quizzes || []).length;
                                                    if (quizzesLength > 0 && respostasQuiz.filter(r => r && r.trim() !== '').length === quizzesLength) {
                                                        // O envio real das respostas aconteceria aqui
                                                        setQuizConcluido(true);
                                                        setQuizAtivo(false);
                                                    } else {
                                                        alert("Por favor, responda todas as perguntas antes de finalizar.");
                                                    }
                                                }}
                                                className="w-full py-3 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-emerald-400 transition-all mt-4"
                                            >
                                                Finalizar Quiz
                                            </button>
                                        </div>
                                    )}

                                    {quizConcluido && (
                                        <div className="p-6 rounded-2xl border bg-emerald-500/10 border-emerald-500/30 flex flex-col items-center justify-center text-center space-y-4">
                                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl mb-2">
                                                ✅
                                            </div>
                                            <div>
                                                <h5 className="text-[12px] font-bold text-emerald-400 uppercase tracking-widest">Aprovado no Quiz!</h5>
                                                <p className="text-[10px] text-gray-400 mt-1">Você concluiu a etapa de estudo com sucesso.</p>
                                            </div>
                                            
                                            {itemEmEstudo.tipo === 'trabalho' ? (
                                                <button 
                                                    onClick={() => setUploadTrabalhoModal(true)}
                                                    className="w-full py-3 bg-yellow-500 text-black text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-yellow-400 transition-all mt-2"
                                                >
                                                    Fazer Upload do Trabalho
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => {
                                                        alert("Preleção marcada como concluída!");
                                                        setItemEmEstudo(null);
                                                    }}
                                                    className="w-full py-3 bg-blue-500 text-black text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-blue-400 transition-all mt-2"
                                                >
                                                    Concluir Preleção
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Management Modal (Officer View) */}
            {itemEmEstudo && isDiretoria && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setItemEmEstudo(null)}></div>
                    
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl relative z-10 flex flex-col">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-xl">⚙️</div>
                                <div>
                                    <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest block mb-1">Painel do Instrutor</span>
                                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">{itemEmEstudo.titulo}</h3>
                                </div>
                            </div>
                            <button 
                                onClick={() => setItemEmEstudo(null)}
                                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-all"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Stats Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Inscritos', val: '42', color: 'text-gray-400' },
                                    { label: 'Concluídos', val: '12', color: 'text-emerald-400' },
                                    { label: 'Pendentes', val: '30', color: 'text-yellow-500' },
                                    { label: 'Média Quiz', val: '8.5', color: 'text-blue-400' }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                                        <span className="text-[8px] uppercase font-bold text-gray-600 tracking-widest block mb-1">{stat.label}</span>
                                        <span className={`text-2xl font-serif ${stat.color}`}>{stat.val}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left: Content Management */}
                                <div className="lg:col-span-1 space-y-6">
                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-l-2 border-yellow-500 pl-3">Configurações</h4>
                                    
                                    <div className="space-y-3">
                                        <button onClick={() => setUploadMaterialModal({ativo: true, tipo: 'video'})} className="w-full p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-3 hover:bg-white/[0.05] transition-all">
                                            <span className="text-lg">🎥</span>
                                            <div className="text-left">
                                                <p className="text-[10px] font-bold text-white uppercase">Trocar Vídeo</p>
                                                <p className="text-[8px] text-gray-500">MP4, WebM (Max 500MB)</p>
                                            </div>
                                        </button>
                                        <button onClick={() => setUploadMaterialModal({ativo: true, tipo: 'pdf'})} className="w-full p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-3 hover:bg-white/[0.05] transition-all">
                                            <span className="text-lg">📄</span>
                                            <div className="text-left">
                                                <p className="text-[10px] font-bold text-white uppercase">Material de Apoio</p>
                                                <p className="text-[8px] text-gray-500">PDF, DOCX (Max 10MB)</p>
                                            </div>
                                        </button>
                                        <button onClick={() => setQuizModalAtivo(true)} className="w-full p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-3 hover:bg-white/[0.05] transition-all">
                                            <span className="text-lg">❓</span>
                                            <div className="text-left">
                                                <p className="text-[10px] font-bold text-white uppercase">Configurar Quiz</p>
                                                <p className="text-[8px] text-gray-500">Definir perguntas e respostas</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Right: Member Progress List */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="flex justify-between items-center border-l-2 border-blue-500 pl-3">
                                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Acompanhamento de Membros</h4>
                                        <button className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-[8px] uppercase tracking-widest text-gray-300 transition-all">
                                            📅 Agendar Apresentação
                                        </button>
                                    </div>
                                    
                                    <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/[0.02] text-[8px] uppercase font-bold text-gray-500 tracking-[0.2em]">
                                                <tr>
                                                    <th className="px-6 py-4">Irmão</th>
                                                    <th className="px-6 py-4">Status</th>
                                                    <th className="px-6 py-4">Nota</th>
                                                    <th className="px-6 py-4">Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {[
                                                    { nome: 'Michel Rezende', status: 'Concluído', nota: '10', color: 'text-emerald-400' },
                                                    { nome: 'Fulano de Tal', status: 'Em Estudo', nota: '-', color: 'text-yellow-500' },
                                                    { nome: 'Ciclano Maçom', status: 'Pendente', nota: '-', color: 'text-gray-600' }
                                                ].map((mbr, i) => (
                                                    <tr key={i} className="hover:bg-white/[0.01] transition-all">
                                                        <td className="px-6 py-4 text-[11px] font-medium text-gray-300">{mbr.nome}</td>
                                                        <td className={`px-6 py-4 text-[9px] font-bold uppercase tracking-tight ${mbr.color}`}>{mbr.status}</td>
                                                        <td className="px-6 py-4 text-[11px] font-serif text-blue-400">{mbr.nota}</td>
                                                        <td className="px-6 py-4">
                                                            <button className="text-[8px] font-bold uppercase text-gray-500 hover:text-white transition-colors">Detalhes</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal Upload de Trabalho */}
            {uploadTrabalhoModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setUploadTrabalhoModal(false)}></div>
                    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-md relative z-10 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[14px] font-bold text-white uppercase tracking-wider">Upload de Arquivo</h3>
                            <button onClick={() => setUploadTrabalhoModal(false)} className="text-gray-500 hover:text-white">✕</button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Selecione o Arquivo</label>
                                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-white/[0.02] hover:border-yellow-500/50 transition-all cursor-pointer">
                                    <span className="text-3xl mb-2 text-yellow-500/50">📄</span>
                                    <p className="text-[11px] text-gray-400">Clique ou arraste seu PDF/DOCX aqui</p>
                                    <p className="text-[9px] text-gray-600 mt-1">Tamanho máximo: 10MB</p>
                                </div>
                            </div>
                            
                            <button className="w-full py-3 bg-yellow-500 text-black text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-yellow-400 transition-all">
                                Enviar Trabalho
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {novoConteudoModal && (
                <ModalNovoConteudo 
                    lojaId={acesso.loja_id} 
                    tabAtiva={tabAtiva} 
                    onClose={() => setNovoConteudoModal(false)} 
                    onSuccess={carregarConteudos} 
                />
            )}
            
            {uploadMaterialModal.ativo && itemEmEstudo && (
                <ModalUploadMaterial 
                    conteudoId={itemEmEstudo.id} 
                    tipo={uploadMaterialModal.tipo} 
                    onClose={() => setUploadMaterialModal({ativo: false, tipo: 'video'})} 
                    onSuccess={carregarConteudos} 
                />
            )}

            {quizModalAtivo && itemEmEstudo && (
                <ModalQuiz 
                    conteudoId={itemEmEstudo.id} 
                    quizzesIniciais={itemEmEstudo.quizzes || []} 
                    onClose={() => setQuizModalAtivo(false)} 
                    onSuccess={carregarConteudos} 
                />
            )}
            
            <ModalEditarConteudo 
                isOpen={!!conteudoEditando} 
                onClose={() => setConteudoEditando(null)} 
                conteudo={conteudoEditando} 
                onSuccess={() => {
                    carregarConteudos();
                    setConteudoEditando(null);
                }} 
            />
            </>,
            document.body
        )}
        </>
    );
}

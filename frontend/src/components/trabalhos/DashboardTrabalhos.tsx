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
    const [grauAtivo, setGrauAtivo] = useState<number>(1); 
    const [tabAtiva, setTabAtivo] = useState<'trabalhos' | 'prelecoes'>('trabalhos');
    const [itemEmEstudo, setItemEmEstudo] = useState<any>(null);
    const [videoConcluido, setVideoConcluido] = useState(false);
    const [quizAtivo, setQuizAtivo] = useState(false);
    const [quizConcluido, setQuizConcluido] = useState(false);
    const [respostasQuiz, setRespostasQuiz] = useState<string[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [conteudos, setConteudos] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [novoConteudoModal, setNovoConteudoModal] = useState(false);
    const [conteudoEditando, setConteudoEditando] = useState<any>(null);
    const [conteudoExcluir, setConteudoExcluir] = useState<any>(null);
    const [uploadMaterialModal, setUploadMaterialModal] = useState<{ativo: boolean, tipo: 'video'|'pdf'}>({ativo: false, tipo: 'video'});
    const [quizModalAtivo, setQuizModalAtivo] = useState(false);
    const [previewModals, setPreviewModals] = useState<{video: boolean, pdf: boolean, url: string}>({video: false, pdf: false, url: ''});

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

    const handleExcluir = async (conteudoId: number) => {
        try {
            const res = await fetch(`/api/trabalhos/conteudo/${conteudoId}`, { method: 'DELETE' });
            if (res.ok) {
                setConteudoExcluir(null);
                carregarConteudos();
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (acesso && isMounted) {
            carregarConteudos();
        }
    }, [acesso, isMounted]);

    const getGrauFromStatus = (status: string) => {
        const s = status?.toLowerCase() || '';
        if (s.includes('mestre')) return 3;
        if (s.includes('companheiro')) return 2;
        return 1;
    };

    const userGrau = acesso.grau || getGrauFromStatus(acesso.status || '');
    const isLuz = isDiretoria || userGrau === 3;

    useEffect(() => {
        if (!isDiretoria) {
            setGrauAtivo(userGrau);
        }
    }, [userGrau, isDiretoria]);

    const itensFiltrados = conteudos.filter(item => 
        (grauAtivo === 0 || item.grau === grauAtivo) && 
        item.tipo === (tabAtiva === 'trabalhos' ? 'trabalho' : 'prelecao')
    );

    const progressWorks = conteudos.filter(t => t.tipo === 'trabalho' && t.grau === userGrau && t.progresso?.status === 'concluido').length;
    const totalWorks = conteudos.filter(t => t.tipo === 'trabalho' && t.grau === userGrau).length;

    const handleFinalizarEstudo = async () => {
        if (!itemEmEstudo || !acesso.id) return;
        try {
            const res = await fetch('/api/trabalhos/progresso', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pessoa_id: acesso.id || acesso.pessoa_id,
                    conteudo_id: itemEmEstudo.id,
                    status: 'concluido',
                    quiz_score: 10
                })
            });
            if (res.ok) {
                carregarConteudos();
                setItemEmEstudo(null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Simple Header */}
            <div className="mb-6">
                <h2 className="text-xl font-light text-white uppercase tracking-tight mb-1">
                    {isDiretoria ? 'Gestão de Trabalhos' : 'Minha Jornada'}
                </h2>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">
                    {acesso.nome} {!isLuz && `• GRAU DE ${acesso.status?.toUpperCase()}`} • {acesso.loja_nome || 'Arquitetos da Virtude'}
                </p>
            </div>

            {isDiretoria && (
                <div className="flex justify-between items-center mb-6">
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                        {[0, 1, 2, 3].map((g) => (
                            <button
                                key={g}
                                onClick={() => setGrauAtivo(g)}
                                className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                                    grauAtivo === g ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:text-white'
                                }`}
                            >
                                {g === 0 ? 'Todos' : g === 1 ? 'Aprendiz' : g === 2 ? 'Companheiro' : 'Mestre'}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => setNovoConteudoModal(true)} 
                        className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-yellow-500/20 transition-all cursor-pointer"
                    >
                        + Novo {tabAtiva === 'trabalhos' ? 'Trabalho' : 'Preleção'}
                    </button>
                </div>
            )}

            <div className="flex border-b border-white/5 bg-black/10 -mx-8 mb-8">
                <button
                    onClick={() => setTabAtivo('trabalhos')}
                    className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 cursor-pointer ${
                        tabAtiva === 'trabalhos' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                >
                    📜 Trabalhos
                </button>
                <button
                    onClick={() => setTabAtivo('prelecoes')}
                    className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 cursor-pointer ${
                        tabAtiva === 'prelecoes' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                >
                    📖 Preleções
                </button>
            </div>

            {/* Compact Dashboard Cards */}
            {!isDiretoria && grauAtivo === userGrau && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {/* Progress Card */}
                    <div className="bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 p-4 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-20 text-2xl">🏆</div>
                        <span className="text-[8px] uppercase font-bold text-yellow-500 tracking-widest block mb-2">Seu Progresso</span>
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-xl font-bold text-white">{progressWorks}</span>
                            <span className="text-xs text-gray-400">/ {totalWorks || 0}</span>
                        </div>
                        <div className="h-1 bg-black/50 rounded-full overflow-hidden w-full">
                            <div className="h-full bg-yellow-500 rounded-full transition-all duration-1000" style={{ width: `${(totalWorks || 0) > 0 ? (progressWorks/(totalWorks || 0))*100 : 0}%` }} />
                        </div>
                    </div>

                    {/* Pending Card */}
                    <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 p-4 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-20 text-2xl">📚</div>
                        <span className="text-[8px] uppercase font-bold text-blue-400 tracking-widest block mb-2">A Fazer</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-bold text-white">{(totalWorks || 0) - progressWorks}</span>
                            <span className="text-xs text-gray-400">pendentes</span>
                        </div>
                    </div>
                    
                    {/* Performance Card */}
                    <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 p-4 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-20 text-2xl">🎯</div>
                        <span className="text-[8px] uppercase font-bold text-purple-400 tracking-widest block mb-2">Aproveitamento</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-bold text-white">9.5</span>
                            <span className="text-xs text-gray-400">/ 10</span>
                        </div>
                    </div>
                    
                    {/* Next Delivery Card */}
                    <div className="bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/20 p-4 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-20 text-2xl">⏱️</div>
                        <span className="text-[8px] uppercase font-bold text-rose-400 tracking-widest block mb-2">Próxima Entrega</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-bold text-white">Hoje</span>
                        </div>
                    </div>
                </div>
            )}

            {/* List Table - REVERTED TO SMOOTH STYLE */}
            <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden mb-12">
                <table className="w-full text-left">
                    <thead className="bg-white/[0.02] text-[8px] uppercase font-bold text-gray-500 border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4">Título</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {itensFiltrados.length === 0 ? (
                            <tr><td colSpan={2} className="px-6 py-12 text-center text-gray-600 text-[10px] uppercase font-bold tracking-widest">Nenhum item encontrado.</td></tr>
                        ) : (
                            itensFiltrados.sort((a,b) => a.ordem - b.ordem).map((item) => {
                                const isConcluido = item.progresso?.status === 'concluido';
                                return (
                                    <tr key={item.id} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-6 py-4 text-[11px] font-bold text-gray-200 uppercase">
                                            {item.titulo} {isConcluido && <span className="text-emerald-500 ml-2">✅</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {isDiretoria ? (
                                                <>
                                                    <button onClick={() => { setItemEmEstudo(item); setUploadMaterialModal({ativo: true, tipo: 'video'}); }} className="p-2 bg-white/5 rounded-lg cursor-pointer">📽️</button>
                                                    <button onClick={() => { setItemEmEstudo(item); setUploadMaterialModal({ativo: true, tipo: 'pdf'}); }} className="p-2 bg-white/5 rounded-lg cursor-pointer">📄</button>
                                                    <button onClick={() => { setItemEmEstudo(item); setQuizModalAtivo(true); }} className="p-2 bg-white/5 rounded-lg cursor-pointer">🧩</button>
                                                    <button onClick={() => setConteudoEditando(item)} className="px-3 py-1.5 bg-white/5 rounded-lg text-[8px] font-bold uppercase text-gray-400 cursor-pointer">Editar</button>
                                                    <button onClick={() => setConteudoExcluir(item)} className="px-3 py-1.5 bg-red-500/10 rounded-lg text-[8px] font-bold uppercase text-red-500 cursor-pointer">Excluir</button>
                                                </>
                                            ) : (
                                                <button onClick={() => setItemEmEstudo(item)} className="px-3 py-1.5 bg-yellow-500 text-black text-[8px] font-bold uppercase tracking-widest rounded-lg cursor-pointer">Estudar</button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            {isMounted && createPortal(
                <>
                    {itemEmEstudo && !isDiretoria && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setItemEmEstudo(null)}></div>
                            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl relative z-10 flex flex-col">
                                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                    <div>
                                        <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest block mb-1">Modo de Estudo • {itemEmEstudo.titulo}</span>
                                        <h3 className="text-lg font-serif text-white uppercase">{itemEmEstudo.titulo}</h3>
                                    </div>
                                    <button onClick={() => setItemEmEstudo(null)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 cursor-pointer">✕</button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-12">
                                    <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 relative">
                                        {itemEmEstudo.materiais?.find((m: any) => m.tipo === 'video') ? (
                                            <video ref={videoRef} src={itemEmEstudo.materiais.find((m: any) => m.tipo === 'video').url} className="w-full h-full" controls onEnded={() => setVideoConcluido(true)} />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                                                <p className="text-[10px] uppercase font-bold tracking-widest">Vídeo indisponível</p>
                                                <button onClick={() => setVideoConcluido(true)} className="mt-4 text-yellow-500 underline text-[9px] cursor-pointer">Pular para materiais</button>
                                            </div>
                                        )}
                                    </div>
                                    {(videoConcluido || itemEmEstudo.progresso?.status === 'concluido') && (
                                        <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-700">
                                            <div className="h-px bg-white/5" />
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Material Digital de Apoio</h4>
                                                {itemEmEstudo.materiais?.find((m: any) => m.tipo === 'pdf') ? (
                                                    <div className="flex items-center justify-between p-6 bg-white/[0.03] border border-white/10 rounded-2xl">
                                                        <p className="text-sm font-medium text-white">{itemEmEstudo.materiais.find((m: any) => m.tipo === 'pdf').nome}</p>
                                                        <button onClick={() => setPreviewModals({video: false, pdf: true, url: itemEmEstudo.materiais.find((m: any) => m.tipo === 'pdf').url})} className="px-6 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold uppercase rounded-lg cursor-pointer">Visualizar</button>
                                                    </div>
                                                ) : <p className="text-[10px] text-gray-700 uppercase font-bold tracking-widest">Nenhum documento.</p>}
                                            </div>
                                            {!itemEmEstudo.progresso?.status && (
                                                <div className="flex flex-col items-center gap-6 pb-10">
                                                    {!quizAtivo ? (
                                                        <button onClick={() => setQuizAtivo(true)} className="px-10 py-4 bg-yellow-500 text-black text-[10px] font-bold uppercase tracking-[0.2em] rounded-full hover:bg-yellow-400 transition-all cursor-pointer">Responder Quiz</button>
                                                    ) : (
                                                        <div className="w-full space-y-8">
                                                            {itemEmEstudo.quizzes?.map((q: any, idx: number) => (
                                                                <div key={q.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-8">
                                                                    <p className="text-lg font-serif text-white mb-6 leading-relaxed text-center italic">"{q.pergunta}"</p>
                                                                    <textarea className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:border-yellow-500/30 transition-all min-h-[120px]" placeholder="Sua resposta..." onChange={(e) => { const novas = [...respostasQuiz]; novas[idx] = e.target.value; setRespostasQuiz(novas); }} />
                                                                </div>
                                                            ))}
                                                            <button onClick={handleFinalizarEstudo} className="w-full py-4 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-emerald-400 transition-all cursor-pointer">Concluir Estudo</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {previewModals.pdf && (
                        <div className="fixed inset-0 z-[250] flex items-center justify-center p-8 bg-black/95 backdrop-blur-md">
                            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden w-full h-full flex flex-col relative">
                                <div className="p-4 flex justify-between items-center bg-white/[0.03] border-b border-white/5">
                                    <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-2">Leitor de Documentos</h4>
                                    <button onClick={() => setPreviewModals({...previewModals, pdf: false})} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer">✕</button>
                                </div>
                                <iframe src={previewModals.url} className="flex-1 w-full border-none" />
                            </div>
                        </div>
                    )}

                    <ModalEditarConteudo isOpen={!!conteudoEditando} onClose={() => setConteudoEditando(null)} conteudo={conteudoEditando} onSuccess={() => { carregarConteudos(); setConteudoEditando(null); }} />
                    {novoConteudoModal && <ModalNovoConteudo lojaId={acesso.loja_id} tabAtiva={tabAtiva} onClose={() => setNovoConteudoModal(false)} onSuccess={carregarConteudos} />}
                    {uploadMaterialModal.ativo && itemEmEstudo && <ModalUploadMaterial conteudoId={itemEmEstudo.id} tipo={uploadMaterialModal.tipo} onClose={() => setUploadMaterialModal({ativo: false, tipo: 'video'})} onSuccess={carregarConteudos} />}
                    {quizModalAtivo && itemEmEstudo && <ModalQuiz conteudoId={itemEmEstudo.id} quizzesIniciais={itemEmEstudo.quizzes || []} onClose={() => setQuizModalAtivo(false)} onSuccess={carregarConteudos} />}
                </>,
                document.body
            )}
        </div>
    );
}

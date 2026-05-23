'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ModalNovoConteudo from './ModalNovoConteudo';
import ModalMateriaisTrabalho from './ModalMateriaisTrabalho';
import ModalEstudoObreiro from './ModalEstudoObreiro';
import ModalQuiz from './ModalQuiz';
import ModalEditarConteudo from './ModalEditarConteudo';
import ModalJornada from './ModalJornada';
import ModalCorrecaoTrabalho from './ModalCorrecaoTrabalho';

interface DashboardTrabalhosProps {
    acesso: any;
    isDiretoria?: boolean;
}

export function normalizeTipo(tipo: string = "") {
    return tipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function getPessoaId(usuarioAtual: any): number | null {
    if (!usuarioAtual) return null;
    const rawId = usuarioAtual.pessoa_id ?? usuarioAtual.pessoaId ?? usuarioAtual.pessoa?.id ?? usuarioAtual.membro?.id ?? usuarioAtual.irmao?.id ?? usuarioAtual.id;
    const parsed = Number(rawId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getConteudoId(item: any): number | null {
    if (!item) return null;
    const rawId = item.id ?? item.conteudo_id ?? item.conteudoId ?? item.trabalho_id ?? item.trabalhoId;
    const parsed = Number(rawId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default function DashboardTrabalhos({ acesso, isDiretoria }: DashboardTrabalhosProps) {
    const [grauAtivo, setGrauAtivo] = useState<number>(1); 
    const [tabAtiva, setTabAtivo] = useState<'trabalhos' | 'prelecoes' | 'correcoes'>('trabalhos');
    const [itemEmEstudo, setItemEmEstudo] = useState<any>(null);
    const [videoConcluido, setVideoConcluido] = useState(false);
    const [quizAtivo, setQuizAtivo] = useState(false);
    const [quizConcluido, setQuizConcluido] = useState(false);
    const [respostasQuiz, setRespostasQuiz] = useState<string[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [jornadaModal, setJornadaModal] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Student upload states
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Admin correction states
    const [adminDeliveries, setAdminDeliveries] = useState<any[]>([]);
    const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
    const [evaluatingDelivery, setEvaluatingDelivery] = useState<any | null>(null);
    const [adminFeedback, setAdminFeedback] = useState('');
    const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [conteudos, setConteudos] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [novoConteudoModal, setNovoConteudoModal] = useState(false);
    const [conteudoEditando, setConteudoEditando] = useState<any>(null);
    const [conteudoExcluir, setConteudoExcluir] = useState<any>(null);
    const [materiaisModal, setMateriaisModal] = useState<{ativo: boolean, tipo: 'video'|'pdf'}>({ativo: false, tipo: 'video'});
    const [materiaisItem, setMateriaisItem] = useState<any>(null);
    const [quizModalAtivo, setQuizModalAtivo] = useState(false);
    const [previewModals, setPreviewModals] = useState<{video: boolean, pdf: boolean, url: string}>({video: false, pdf: false, url: ''});
    const [correcaoTrabalho, setCorrecaoTrabalho] = useState<any>(null);
    const [estudoObreiroConteudo, setEstudoObreiroConteudo] = useState<any>(null);

    const carregarEntregasAdmin = async () => {
        setIsLoadingAdmin(true);
        try {
            const lid = acesso.loja_id || acesso.id_loja;
            if (lid) {
                const res = await fetch(`/api/trabalhos/entregas/admin?loja_id=${lid}`);
                if (res.ok) {
                    const data = await res.json();
                    setAdminDeliveries(data);
                }
            }
        } catch (e) {
            console.error("Erro ao carregar entregas admin:", e);
        } finally {
            setIsLoadingAdmin(false);
        }
    };

    useEffect(() => {
        if (tabAtiva === 'correcoes' && acesso) {
            carregarEntregasAdmin();
        }
    }, [tabAtiva, acesso]);

    const handleEnviarTrabalho = async () => {
        if (!fileToUpload || !itemEmEstudo || !acesso.id) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('pessoa_id', String(acesso.id || acesso.pessoa_id));
            formData.append('conteudo_id', String(itemEmEstudo.id));
            formData.append('file', fileToUpload);

            const res = await fetch('/api/trabalhos/entrega', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                setFileToUpload(null);
                await carregarConteudos();
                setItemEmEstudo(null);
                alert('Prancha de trabalho enviada com sucesso para correção!');
            } else {
                alert('Falha ao enviar a prancha do trabalho.');
            }
        } catch (e) {
            console.error(e);
            alert('Erro de conexão ao enviar o trabalho.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleEnviarCorrecao = async (status: 'aprovado' | 'revisar') => {
        if (!evaluatingDelivery) return;
        setIsSubmittingCorrection(true);
        try {
            const formData = new FormData();
            formData.append('pessoa_id', String(evaluatingDelivery.pessoa_id));
            formData.append('conteudo_id', String(evaluatingDelivery.conteudo_id));
            formData.append('status', status);
            formData.append('feedback', adminFeedback);

            const res = await fetch('/api/trabalhos/corrigir', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                setEvaluatingDelivery(null);
                setAdminFeedback('');
                await carregarEntregasAdmin();
                await carregarConteudos();
                alert(status === 'aprovado' ? 'Trabalho aprovado com sucesso!' : 'Solicitação de revisão enviada com sucesso!');
            } else {
                alert('Falha ao enviar correção.');
            }
        } catch (e) {
            console.error(e);
            alert('Erro de conexão ao enviar correção.');
        } finally {
            setIsSubmittingCorrection(false);
        }
    };

    const carregarConteudos = async () => {
        setIsLoading(true);
        try {
            const pId = getPessoaId(acesso);
            const lid = acesso.loja_id || acesso.id_loja;
            
            let url = `/api/trabalhos/?`;
            if (lid) url += `loja_id=${lid}`;
            if (pId) url += `&pessoa_id=${pId}`;
            
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setConteudos(data);
            }
        } catch (e) {
            console.error("Erro ao carregar conteúdos:", e);
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
            setGrauAtivo(userGrau || 1);
        }
    }, [userGrau, isDiretoria]);

    const itensFiltrados = conteudos.filter(item => {
        const matchesGrau = grauAtivo === 0 || item.grau === grauAtivo;
        
        const normTipo = normalizeTipo(item.tipo);
        let matchesTipo = false;
        if (tabAtiva === 'trabalhos' && normTipo === 'trabalho') matchesTipo = true;
        if (tabAtiva === 'prelecoes' && normTipo === 'prelecao') matchesTipo = true;
        if (tabAtiva === 'correcoes') matchesTipo = true;
        
        return matchesGrau && matchesTipo;
    });

    const progressWorks = conteudos.filter(t => t.tipo === 'trabalho' && t.grau === userGrau && t.progresso?.status === 'concluido').length;
    const totalWorks = conteudos.filter(t => t.tipo === 'trabalho' && t.grau === userGrau).length;

    const handleFinalizarEstudo = async () => {
        if (!itemEmEstudo || !acesso.id) return;
        try {
            const res = await fetch('/api/trabalhos/progresso/json', {
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
                {isDiretoria && (
                    <button
                        onClick={() => setTabAtivo('correcoes')}
                        className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 cursor-pointer ${
                            tabAtiva === 'correcoes' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        📋 Pendencias
                    </button>
                )}
            </div>

            {/* Compact Dashboard Cards */}
            {!isDiretoria && grauAtivo === userGrau && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {/* Progress Card */}
                    <div onClick={() => setJornadaModal(true)} className="bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 p-4 rounded-xl relative overflow-hidden group cursor-pointer hover:bg-yellow-500/5 transition-all">
                        <div className="absolute top-0 right-0 p-3 opacity-20 text-2xl group-hover:scale-110 transition-transform">🏆</div>
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

            {tabAtiva === 'correcoes' ? (
                <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden mb-12">
                    <table className="w-full text-left">
                        <thead className="bg-white/[0.02] text-[8px] uppercase font-bold text-gray-500 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4">Membro</th>
                                <th className="px-6 py-4">Trabalho</th>
                                <th className="px-6 py-4">Data Envio</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-[11px]">
                            {isLoadingAdmin ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                                        Carregando entregas...
                                    </td>
                                </tr>
                            ) : adminDeliveries.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-600 text-[10px] uppercase font-bold tracking-widest">
                                        Nenhuma entrega de trabalho encontrada.
                                    </td>
                                </tr>
                            ) : (
                                adminDeliveries.map((ent) => (
                                    <tr key={ent.id} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-6 py-4 font-bold text-gray-200 uppercase">
                                            {ent.pessoa_nome}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-400 uppercase">
                                            {ent.conteudo_titulo}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {ent.data_upload ? new Date(ent.data_upload).toLocaleString() : '---'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {ent.status === 'pendente' && (
                                                <span className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[9px] font-bold uppercase rounded-md">
                                                    ⏳ Pendente
                                                </span>
                                            )}
                                            {ent.status === 'aprovado' && (
                                                <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[9px] font-bold uppercase rounded-md">
                                                    ✅ Aprovado
                                                </span>
                                            )}
                                            {ent.status === 'revisar' && (
                                                <span className="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 text-[9px] font-bold uppercase rounded-md">
                                                    ⚠️ Revisar
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {ent.arquivo_url && (
                                                <button
                                                    onClick={() => setPreviewModals({video: false, pdf: true, url: ent.arquivo_url})}
                                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-bold uppercase text-gray-400 cursor-pointer transition-all"
                                                >
                                                    📄 Ver Arquivo
                                                </button>
                                            )}
                                            <button
                                                onClick={() => { setEvaluatingDelivery(ent); setAdminFeedback(ent.feedback || ''); }}
                                                className="px-3 py-1.5 bg-emerald-500 text-black rounded-lg text-[8px] font-bold uppercase tracking-widest cursor-pointer transition-all hover:bg-emerald-400"
                                            >
                                                🎯 Corrigir
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Premium Card-Row Listing */
                <div className="space-y-3 mb-12">
                    {itensFiltrados.length === 0 ? (
                        <div className="py-16 text-center text-gray-600 text-[10px] uppercase font-bold tracking-widest bg-black/20 border border-white/5 rounded-2xl">Nenhum item encontrado.</div>
                    ) : (
                        itensFiltrados.sort((a,b) => a.ordem - b.ordem).map((item, idx) => {
                            const isConcluido = item.progresso?.status === 'concluido';
                            const ct = item.contagens || { videos: 0, documentos: 0, quizzes: 0, pendencias: 0 };
                            return (
                                <div key={item.id} className="bg-black/20 hover:bg-black/30 border border-white/5 hover:border-yellow-500/10 rounded-xl transition-all duration-300 group">
                                    <div className="px-5 py-4 flex items-start gap-4">
                                        {/* Order number */}
                                        <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0 mt-0.5">
                                            {String(idx + 1).padStart(2, '0')}
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-[11px] font-bold text-gray-200 uppercase truncate">{item.titulo}</h4>
                                                {isConcluido && <span className="text-emerald-500 text-xs">✓</span>}
                                            </div>
                                            <div className="flex items-center gap-1 flex-wrap">
                                                <span className="text-[8px] text-gray-600 uppercase">
                                                    {item.grau === 1 ? 'Aprendiz' : item.grau === 2 ? 'Companheiro' : 'Mestre'}
                                                </span>
                                                <span className="text-gray-700">·</span>
                                                <span className="text-[8px] text-gray-600 uppercase">{item.tipo}</span>
                                                {isDiretoria && (
                                                    <>
                                                        <span className="text-gray-700 ml-2">|</span>
                                                        <span className="text-[8px] text-blue-400/60 ml-1">{ct.videos} vid</span>
                                                        <span className="text-gray-700">·</span>
                                                        <span className="text-[8px] text-cyan-400/60">{ct.documentos} doc</span>
                                                        <span className="text-gray-700">·</span>
                                                        <span className="text-[8px] text-purple-400/60">{ct.quizzes} quiz</span>
                                                        {ct.pendencias > 0 && (
                                                            <>
                                                                <span className="text-gray-700">·</span>
                                                                <span className="px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[7px] font-bold uppercase rounded">{ct.pendencias} pend.</span>
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {/* Actions */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {isDiretoria ? (
                                                <>
                                                    <button onClick={() => { setMateriaisItem(item); setMateriaisModal({ativo: true, tipo: 'video'}); }} className="p-2 bg-white/[0.03] hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 rounded-lg cursor-pointer transition-all group/btn" title="Gerenciar videos">
                                                        <span className="text-sm opacity-60 group-hover/btn:opacity-100 transition-opacity">🎬</span>
                                                    </button>
                                                    <button onClick={() => { setMateriaisItem(item); setMateriaisModal({ativo: true, tipo: 'pdf'}); }} className="p-2 bg-white/[0.03] hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 rounded-lg cursor-pointer transition-all group/btn" title="Gerenciar materiais de apoio">
                                                        <span className="text-sm opacity-60 group-hover/btn:opacity-100 transition-opacity">📄</span>
                                                    </button>
                                                    <button onClick={() => { setItemEmEstudo(item); setQuizModalAtivo(true); }} className="p-2 bg-white/[0.03] hover:bg-purple-500/10 border border-transparent hover:border-purple-500/20 rounded-lg cursor-pointer transition-all group/btn" title="Configurar quiz">
                                                        <span className="text-sm opacity-60 group-hover/btn:opacity-100 transition-opacity">🧩</span>
                                                    </button>
                                                    <button onClick={() => setCorrecaoTrabalho(item)} className="p-2 bg-white/[0.03] hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 rounded-lg cursor-pointer transition-all group/btn" title="Correcoes do trabalho">
                                                        <span className="text-sm opacity-60 group-hover/btn:opacity-100 transition-opacity">📋</span>
                                                    </button>
                                                    <div className="w-px h-6 bg-white/5 mx-1"></div>
                                                    <button onClick={() => setConteudoEditando(item)} className="px-2.5 py-1.5 bg-white/[0.03] hover:bg-white/[0.06] rounded-lg text-[8px] font-bold uppercase text-gray-500 hover:text-gray-300 cursor-pointer transition-all" title="Editar trabalho">Editar</button>
                                                    <button onClick={() => setConteudoExcluir(item)} className="px-2.5 py-1.5 bg-red-500/5 hover:bg-red-500/10 rounded-lg text-[8px] font-bold uppercase text-red-500/60 hover:text-red-400 cursor-pointer transition-all" title="Excluir trabalho">Excluir</button>
                                                </>
                                            ) : (
                                                <button 
                                                    onClick={() => {
                                                        const cid = getConteudoId(item);
                                                        if (!cid) {
                                                            alert("Trabalho sem ID: Não foi possível identificar este conteúdo.");
                                                            return;
                                                        }
                                                        setEstudoObreiroConteudo({ ...item, id: cid, conteudo_id: cid });
                                                    }}
                                                    className={`px-4 py-2 border text-[9px] font-bold uppercase tracking-widest rounded-lg cursor-pointer transition-all ${
                                                        (item.progresso?.status === 'aguardando_correcao') 
                                                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-500 hover:bg-blue-500/20' 
                                                            : (item.progresso?.status === 'revisar' || item.entrega?.status === 'revisar')
                                                                ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
                                                                : (item.progresso?.status === 'concluido' || item.progresso?.status === 'aprovado' || item.entrega?.status === 'aprovado')
                                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
                                                                    : (item.progresso?.status === 'em_andamento')
                                                                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/20'
                                                                        : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/20'
                                                    }`}
                                                >
                                                    {(item.progresso?.status === 'aguardando_correcao') 
                                                        ? 'Aguardando' 
                                                        : (item.progresso?.status === 'revisar' || item.entrega?.status === 'revisar')
                                                            ? 'Refazer'
                                                            : (item.progresso?.status === 'concluido' || item.progresso?.status === 'aprovado' || item.entrega?.status === 'aprovado')
                                                                ? 'Rever'
                                                                : (item.progresso?.status === 'em_andamento')
                                                                    ? 'Continuar'
                                                                    : 'Estudar'
                                                    }
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Modals */}
            {isMounted && createPortal(
                <>
                    {jornadaModal && (
                        <ModalJornada 
                            itens={conteudos} 
                            tipo={tabAtiva === 'trabalhos' ? 'trabalho' : 'prelecao'} 
                            onClose={() => setJornadaModal(false)} 
                            onIniciarEstudo={(item) => {
                                setJornadaModal(false);
                                setItemEmEstudo(item);
                                setVideoConcluido(false);
                                setQuizAtivo(false);
                            }}
                        />
                    )}
                    
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
                                    {(videoConcluido || itemEmEstudo.progresso?.status === 'concluido' || itemEmEstudo.entrega) && (
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

                                            {/* Submissão da Prancha (Apenas para Trabalhos) */}
                                            {itemEmEstudo.tipo === 'trabalho' && (
                                                <div className="space-y-6 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Entrega da Prancha de Trabalho</h4>
                                                    
                                                    {itemEmEstudo.entrega ? (
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs text-gray-400 uppercase tracking-wider text-[10px]">Status da Avaliação:</span>
                                                                {itemEmEstudo.entrega.status === 'pendente' && (
                                                                    <span className="px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[9px] font-bold uppercase rounded-lg">
                                                                        ⏳ Enviado - Aguardando Luzes
                                                                    </span>
                                                                )}
                                                                {itemEmEstudo.entrega.status === 'aprovado' && (
                                                                    <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[9px] font-bold uppercase rounded-lg">
                                                                        ✅ Aprovado pela Loja
                                                                    </span>
                                                                )}
                                                                {itemEmEstudo.entrega.status === 'revisar' && (
                                                                    <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/30 text-red-400 text-[9px] font-bold uppercase rounded-lg">
                                                                        ⚠️ Revisão Solicitada
                                                                    </span>
                                                                )}
                                                            </div>
                                                            
                                                            {itemEmEstudo.entrega.feedback && (
                                                                <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                                                                    <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest block mb-1">Feedback do Corretor</span>
                                                                    <p className="text-xs text-gray-300 italic">"{itemEmEstudo.entrega.feedback}"</p>
                                                                </div>
                                                            )}

                                                            {itemEmEstudo.entrega.status === 'revisar' && (
                                                                <div className="pt-4 border-t border-white/5 space-y-4">
                                                                    <p className="text-xs text-gray-400">Por favor, faça os ajustes solicitados e reenvie a nova prancha abaixo:</p>
                                                                    <div className="flex flex-col gap-4">
                                                                        <input
                                                                            type="file"
                                                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                                            onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                                                                            className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[9px] file:font-bold file:file:uppercase file:bg-white/5 file:text-gray-300 hover:file:bg-white/10 cursor-pointer"
                                                                        />
                                                                        {fileToUpload && (
                                                                            <button
                                                                                disabled={isUploading}
                                                                                onClick={handleEnviarTrabalho}
                                                                                className="px-6 py-2.5 bg-yellow-500 text-black text-[9px] font-bold uppercase tracking-widest rounded-lg cursor-pointer hover:bg-yellow-400 transition-all w-fit"
                                                                            >
                                                                                {isUploading ? 'Reenviando...' : 'Reenviar Prancha Corrigida'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            <p className="text-xs text-gray-400">Escreva sua prancha de estudos e submeta o arquivo digital abaixo para que as Luzes possam avaliar e aprovar a conclusão deste nível da constelação.</p>
                                                            <div className="flex flex-col gap-4">
                                                                <input
                                                                    type="file"
                                                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                                    onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                                                                    className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-white/5 file:text-gray-300 hover:file:bg-white/10 cursor-pointer"
                                                                />
                                                                {fileToUpload && (
                                                                    <button
                                                                        disabled={isUploading}
                                                                        onClick={handleEnviarTrabalho}
                                                                        className="px-6 py-2.5 bg-yellow-500 text-black text-[9px] font-bold uppercase tracking-widest rounded-lg cursor-pointer hover:bg-yellow-400 transition-all w-fit"
                                                                    >
                                                                        {isUploading ? 'Enviando...' : 'Enviar Prancha de Trabalho'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {!itemEmEstudo.progresso?.status && itemEmEstudo.tipo !== 'trabalho' && (
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

                    {evaluatingDelivery && (
                        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8">
                            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setEvaluatingDelivery(null)}></div>
                            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col">
                                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                    <div>
                                        <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest block mb-1">Avaliação de Trabalho</span>
                                        <h3 className="text-lg font-serif text-white uppercase">Corrigir Prancha de {evaluatingDelivery.pessoa_nome}</h3>
                                    </div>
                                    <button onClick={() => setEvaluatingDelivery(null)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 cursor-pointer">✕</button>
                                </div>
                                <div className="p-6 md:p-8 space-y-6">
                                    <div>
                                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Trabalho/Tema</label>
                                        <p className="text-sm font-medium text-white uppercase">{evaluatingDelivery.conteudo_titulo}</p>
                                    </div>
                                    
                                    {evaluatingDelivery.arquivo_url && (
                                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
                                            <span className="text-xs text-gray-400">Arquivo enviado: prancha_trabalho.pdf</span>
                                            <button
                                                onClick={() => setPreviewModals({video: false, pdf: true, url: evaluatingDelivery.arquivo_url})}
                                                className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[9px] font-bold uppercase rounded-lg hover:bg-blue-500/20 transition-all cursor-pointer"
                                            >
                                                📄 Visualizar Prancha
                                            </button>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Feedback / Observações</label>
                                        <textarea
                                            value={adminFeedback}
                                            onChange={(e) => setAdminFeedback(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-yellow-500/30 transition-all min-h-[120px]"
                                            placeholder="Digite suas observações, correções ou orientações para o irmão..."
                                        />
                                    </div>

                                    <div className="flex gap-4 pt-4 border-t border-white/5">
                                        <button
                                            disabled={isSubmittingCorrection}
                                            onClick={() => handleEnviarCorrecao('revisar')}
                                            className="flex-1 py-3 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-red-500/20 transition-all cursor-pointer"
                                        >
                                            ⚠️ Solicitar Revisão
                                        </button>
                                        <button
                                            disabled={isSubmittingCorrection}
                                            onClick={() => handleEnviarCorrecao('aprovado')}
                                            className="flex-1 py-3 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all cursor-pointer"
                                        >
                                            {isSubmittingCorrection ? 'Enviando...' : '✅ Aprovar Trabalho'}
                                        </button>
                                    </div>
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
                    {novoConteudoModal && <ModalNovoConteudo lojaId={acesso.loja_id} tabAtiva={tabAtiva === 'correcoes' ? 'trabalhos' : tabAtiva} onClose={() => setNovoConteudoModal(false)} onSuccess={carregarConteudos} />}
                    {materiaisModal.ativo && materiaisItem && <ModalMateriaisTrabalho conteudo={materiaisItem} tipoMaterial={materiaisModal.tipo} onClose={() => { setMateriaisModal({ativo: false, tipo: 'video'}); setMateriaisItem(null); }} onSuccess={carregarConteudos} />}
                    {quizModalAtivo && itemEmEstudo && <ModalQuiz conteudoId={itemEmEstudo.id} quizzesIniciais={itemEmEstudo.quizzes || []} onClose={() => setQuizModalAtivo(false)} onSuccess={carregarConteudos} />}
                    {correcaoTrabalho && <ModalCorrecaoTrabalho conteudo={correcaoTrabalho} lojaId={acesso.loja_id || acesso.id_loja} acesso={acesso} onClose={() => setCorrecaoTrabalho(null)} onSuccess={carregarConteudos} />}
                    {estudoObreiroConteudo && <ModalEstudoObreiro conteudo={estudoObreiroConteudo} pessoaId={getPessoaId(acesso) || 0} onClose={() => setEstudoObreiroConteudo(null)} onSuccess={carregarConteudos} />}
                </>,
                document.body
            )}
        </div>
    );
}

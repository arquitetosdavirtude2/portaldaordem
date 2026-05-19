'use client';
import { useState, useEffect } from 'react';

interface ModalCorrecaoTrabalhoProps {
    conteudo: any;
    lojaId: number;
    acesso: any;
    onClose: () => void;
    onSuccess: () => void;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
    const cfg: Record<string, { bg: string; border: string; text: string; label: string; icon: string }> = {
        pendente:              { bg: 'bg-gray-500/10',    border: 'border-gray-500/30',    text: 'text-gray-400',    label: 'Nao Iniciado', icon: '○' },
        em_estudo:             { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400',    label: 'Em Estudo',    icon: '◐' },
        aguardando_correcao:   { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  text: 'text-yellow-500',  label: 'Aguardando',   icon: '⏳' },
        aprovado:              { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-500', label: 'Aprovado',     icon: '✓' },
        concluido:             { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-500', label: 'Concluido',    icon: '✓' },
        reprovado:             { bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-400',     label: 'Reprovado',    icon: '✗' },
        refazer:               { bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  text: 'text-orange-400',  label: 'Refazer',      icon: '↻' },
    };
    const c = cfg[status] || cfg.pendente;
    return (
        <span className={`px-2 py-0.5 ${c.bg} border ${c.border} ${c.text} text-[8px] font-bold uppercase rounded-md inline-flex items-center gap-1`}>
            <span>{c.icon}</span> {c.label}
        </span>
    );
}

// Detail correction view for a single student
function DetalheCorrecao({ conteudo, pessoaId, pessoaNome, onBack, acesso, onSuccess }: {
    conteudo: any; pessoaId: number; pessoaNome: string; onBack: () => void; acesso: any; onSuccess: () => void;
}) {
    const [respostas, setRespostas] = useState<any[]>([]);
    const [materiais, setMateriais] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedbacks, setFeedbacks] = useState<Record<number, string>>({});
    const [notas, setNotas] = useState<Record<number, string>>({});
    const [saving, setSaving] = useState<Record<number, boolean>>({});
    const [feedbackFinal, setFeedbackFinal] = useState('');
    const [notaFinal, setNotaFinal] = useState('');
    const [savingFinal, setSavingFinal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [resRes, matRes] = await Promise.all([
                fetch(`/api/trabalhos/respostas/${conteudo.id}/${pessoaId}`),
                fetch(`/api/trabalhos/progresso-material/${conteudo.id}/${pessoaId}`)
            ]);
            if (resRes.ok) setRespostas(await resRes.json());
            if (matRes.ok) setMateriais(await matRes.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const corrigirResposta = async (respostaId: number, status: string) => {
        setSaving(p => ({ ...p, [respostaId]: true }));
        try {
            const res = await fetch('/api/trabalhos/corrigir-resposta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resposta_id: respostaId,
                    status,
                    feedback: feedbacks[respostaId] || null,
                    nota: notas[respostaId] ? parseFloat(notas[respostaId]) : null,
                    corrigido_por: acesso.id || acesso.pessoa_id
                })
            });
            if (res.ok) await loadData();
        } catch (e) { console.error(e); }
        setSaving(p => ({ ...p, [respostaId]: false }));
    };

    const decisaoFinal = async (status: string) => {
        setSavingFinal(true);
        try {
            const formData = new FormData();
            formData.append('pessoa_id', String(pessoaId));
            formData.append('conteudo_id', String(conteudo.id));
            formData.append('status', status);
            formData.append('feedback', feedbackFinal);
            formData.append('corrigido_por', String(acesso.id || acesso.pessoa_id));
            if (notaFinal) formData.append('nota', notaFinal);

            const res = await fetch('/api/trabalhos/corrigir', { method: 'POST', body: formData });
            if (res.ok) {
                onSuccess();
                onBack();
            }
        } catch (e) { console.error(e); }
        setSavingFinal(false);
    };

    if (loading) return <div className="py-20 text-center text-gray-500 text-[10px] uppercase tracking-widest animate-pulse">Carregando dados do irmao...</div>;

    // Find quiz info from conteudo
    const quizMap: Record<number, any> = {};
    (conteudo.quizzes || []).forEach((q: any) => { quizMap[q.id] = q; });

    return (
        <div className="space-y-6">
            {/* Header with back button */}
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold uppercase text-gray-400 transition-all cursor-pointer">
                    ← Voltar
                </button>
                <div>
                    <h4 className="text-sm font-bold text-white uppercase">{pessoaNome}</h4>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest">{conteudo.titulo}</p>
                </div>
            </div>

            {/* Materials Progress */}
            {materiais.length > 0 && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-3">
                    <h5 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3">Progresso dos Materiais</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {materiais.map((m: any) => (
                            <div key={m.material_id} className="flex items-center justify-between px-3 py-2 bg-black/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">{m.tipo === 'video' ? '🎬' : '📄'}</span>
                                    <span className="text-[10px] text-gray-300 truncate max-w-[180px]">{m.titulo}</span>
                                </div>
                                {m.concluido ? (
                                    <span className="text-[8px] font-bold text-emerald-500 uppercase">Concluido</span>
                                ) : (
                                    <span className="text-[8px] font-bold text-gray-600 uppercase">Pendente</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quiz Answers */}
            {respostas.length > 0 && (
                <div className="space-y-4">
                    <h5 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Respostas do Quiz ({respostas.length})</h5>
                    {respostas.map((r: any) => {
                        const quiz = quizMap[r.quiz_id];
                        const tipoQ = r.tipo || quiz?.tipo || 'livre';
                        let opcoesData: any = {};
                        try { opcoesData = JSON.parse(quiz?.opcoes_json || '{}'); } catch {}

                        return (
                            <div key={r.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest mb-1">
                                            {tipoQ === 'livre' ? 'Resposta Livre' : tipoQ === 'lacunas' ? 'Completar Lacunas' : 'Multipla Escolha'}
                                        </p>
                                        <p className="text-sm text-white italic">"{quiz?.pergunta || '---'}"</p>
                                    </div>
                                    <StatusBadge status={r.status} />
                                </div>

                                {/* Student answer */}
                                <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-1">Resposta do Irmao</p>
                                    {tipoQ === 'livre' && (
                                        <p className="text-xs text-gray-300 whitespace-pre-wrap">{r.resposta_texto || '(sem resposta)'}</p>
                                    )}
                                    {tipoQ === 'multipla_escolha' && (
                                        <div className="space-y-1">
                                            {(() => {
                                                const opts = opcoesData.alternativas || [];
                                                return opts.map((alt: string, i: number) => (
                                                    <div key={i} className={`text-xs px-2 py-1 rounded ${
                                                        i === r.opcao_selecionada
                                                            ? i === quiz?.resposta_correta
                                                                ? 'bg-emerald-500/10 text-emerald-400 font-bold'
                                                                : 'bg-red-500/10 text-red-400 font-bold'
                                                            : i === quiz?.resposta_correta
                                                                ? 'bg-emerald-500/5 text-emerald-500/50'
                                                                : 'text-gray-500'
                                                    }`}>
                                                        {String.fromCharCode(65 + i)}) {alt}
                                                        {i === r.opcao_selecionada && ' ← marcou'}
                                                        {i === quiz?.resposta_correta && ' ← correta'}
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    )}
                                    {tipoQ === 'lacunas' && (
                                        <p className="text-xs text-gray-300">{r.lacunas_json || '(sem resposta)'}</p>
                                    )}
                                </div>

                                {/* Auto-correction result */}
                                {r.is_correto !== null && r.is_correto !== undefined && tipoQ !== 'livre' && (
                                    <div className={`text-[9px] font-bold uppercase ${r.is_correto ? 'text-emerald-500' : 'text-red-400'}`}>
                                        Resultado automatico: {r.is_correto ? 'Correto' : 'Incorreto'} {r.nota !== null && `(Nota: ${r.nota})`}
                                    </div>
                                )}

                                {/* Correction area for livre questions */}
                                {tipoQ === 'livre' && r.status === 'pendente' && (
                                    <div className="border-t border-white/5 pt-4 space-y-3">
                                        <div className="flex gap-3">
                                            <input
                                                type="number" min="0" max="10" step="0.5"
                                                placeholder="Nota (0-10)"
                                                value={notas[r.id] || ''}
                                                onChange={e => setNotas(p => ({ ...p, [r.id]: e.target.value }))}
                                                className="w-24 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
                                            />
                                            <input
                                                placeholder="Feedback..."
                                                value={feedbacks[r.id] || ''}
                                                onChange={e => setFeedbacks(p => ({ ...p, [r.id]: e.target.value }))}
                                                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                disabled={saving[r.id]}
                                                onClick={() => corrigirResposta(r.id, 'aprovado')}
                                                className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[8px] font-bold uppercase rounded-lg hover:bg-emerald-500/20 transition-all cursor-pointer"
                                            >Aprovar</button>
                                            <button
                                                disabled={saving[r.id]}
                                                onClick={() => corrigirResposta(r.id, 'refazer')}
                                                className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[8px] font-bold uppercase rounded-lg hover:bg-orange-500/20 transition-all cursor-pointer"
                                            >Refazer</button>
                                            <button
                                                disabled={saving[r.id]}
                                                onClick={() => corrigirResposta(r.id, 'reprovado')}
                                                className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[8px] font-bold uppercase rounded-lg hover:bg-red-500/20 transition-all cursor-pointer"
                                            >Reprovar</button>
                                        </div>
                                    </div>
                                )}

                                {/* Already corrected feedback */}
                                {r.feedback && r.status !== 'pendente' && (
                                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                                        <p className="text-[8px] font-bold text-yellow-500 uppercase mb-1">Feedback</p>
                                        <p className="text-xs text-gray-300 italic">"{r.feedback}"</p>
                                        {r.nota !== null && <p className="text-[9px] text-yellow-500 mt-1">Nota: {r.nota}/10</p>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {respostas.length === 0 && (
                <div className="py-8 text-center text-gray-600 text-[10px] uppercase tracking-widest">
                    Nenhuma resposta de quiz registrada para este irmao.
                </div>
            )}

            {/* Final Decision */}
            <div className="border-t border-white/5 pt-6 space-y-4">
                <h5 className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest">Decisao Final do Trabalho</h5>
                <textarea
                    value={feedbackFinal}
                    onChange={e => setFeedbackFinal(e.target.value)}
                    placeholder="Feedback final para o irmao (opcional)..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-yellow-500/30 transition-all min-h-[80px] resize-none"
                />
                <div className="flex gap-3">
                    <input
                        type="number" min="0" max="10" step="0.5"
                        placeholder="Nota final"
                        value={notaFinal}
                        onChange={e => setNotaFinal(e.target.value)}
                        className="w-28 bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-500"
                    />
                    <button
                        disabled={savingFinal}
                        onClick={() => decisaoFinal('revisar')}
                        className="flex-1 py-2.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[9px] font-bold uppercase tracking-wider rounded-xl hover:bg-orange-500/20 transition-all cursor-pointer"
                    >↻ Solicitar Refazer</button>
                    <button
                        disabled={savingFinal}
                        onClick={() => decisaoFinal('reprovado')}
                        className="flex-1 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[9px] font-bold uppercase tracking-wider rounded-xl hover:bg-red-500/20 transition-all cursor-pointer"
                    >✗ Reprovar</button>
                    <button
                        disabled={savingFinal}
                        onClick={() => decisaoFinal('aprovado')}
                        className="flex-1 py-2.5 bg-emerald-500 text-black text-[9px] font-bold uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all cursor-pointer"
                    >{savingFinal ? 'Salvando...' : '✓ Aprovar Trabalho'}</button>
                </div>
            </div>
        </div>
    );
}


export default function ModalCorrecaoTrabalho({ conteudo, lojaId, acesso, onClose, onSuccess }: ModalCorrecaoTrabalhoProps) {
    const [irmaos, setIrmaos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPessoa, setSelectedPessoa] = useState<{ id: number; nome: string } | null>(null);

    useEffect(() => {
        loadIrmaos();
    }, []);

    const loadIrmaos = async () => {
        setLoading(true);
        try {
            // Load all responses grouped by person for this content
            const res = await fetch(`/api/trabalhos/respostas/${conteudo.id}`);
            let respostasAgrupadas: any[] = [];
            if (res.ok) respostasAgrupadas = await res.json();

            // Also load entregas for this content
            const entRes = await fetch(`/api/trabalhos/entregas/admin?loja_id=${lojaId}`);
            let entregas: any[] = [];
            if (entRes.ok) entregas = await entRes.json();

            // Merge: create a map of pessoa_id -> info
            const pessoaMap: Record<number, any> = {};

            // From quiz responses
            respostasAgrupadas.forEach((g: any) => {
                pessoaMap[g.pessoa_id] = {
                    pessoa_id: g.pessoa_id,
                    pessoa_nome: g.pessoa_nome,
                    quiz_total: g.respostas?.length || 0,
                    quiz_pendentes: g.respostas?.filter((r: any) => r.status === 'pendente').length || 0,
                    quiz_aprovados: g.respostas?.filter((r: any) => r.status === 'aprovado').length || 0,
                    entrega_status: null,
                    data_resposta: g.respostas?.[0]?.data_resposta || null,
                };
            });

            // From entregas
            entregas.filter(e => e.conteudo_id === conteudo.id).forEach(e => {
                if (!pessoaMap[e.pessoa_id]) {
                    pessoaMap[e.pessoa_id] = {
                        pessoa_id: e.pessoa_id,
                        pessoa_nome: e.pessoa_nome,
                        quiz_total: 0, quiz_pendentes: 0, quiz_aprovados: 0,
                        entrega_status: e.status,
                        data_resposta: e.data_upload,
                    };
                } else {
                    pessoaMap[e.pessoa_id].entrega_status = e.status;
                    if (!pessoaMap[e.pessoa_id].data_resposta) pessoaMap[e.pessoa_id].data_resposta = e.data_upload;
                }
            });

            setIrmaos(Object.values(pessoaMap));
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative z-10">
                {/* Header */}
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02] shrink-0">
                    <div>
                        <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest block mb-1">Correcoes</span>
                        <h3 className="text-base font-bold text-white uppercase tracking-wider">{conteudo.titulo}</h3>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 cursor-pointer transition-all">✕</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {selectedPessoa ? (
                        <DetalheCorrecao
                            conteudo={conteudo}
                            pessoaId={selectedPessoa.id}
                            pessoaNome={selectedPessoa.nome}
                            onBack={() => { setSelectedPessoa(null); loadIrmaos(); }}
                            acesso={acesso}
                            onSuccess={onSuccess}
                        />
                    ) : loading ? (
                        <div className="py-20 text-center text-gray-500 text-[10px] uppercase tracking-widest animate-pulse">
                            Carregando irmaos...
                        </div>
                    ) : irmaos.length === 0 ? (
                        <div className="py-20 text-center space-y-3">
                            <p className="text-2xl">📭</p>
                            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                                Nenhum irmao iniciou ou enviou este trabalho ainda.
                            </p>
                            <p className="text-gray-600 text-[10px]">
                                Quando um irmao enviar respostas ou trabalhos, eles aparecerao aqui.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {irmaos.map(ir => (
                                <div
                                    key={ir.pessoa_id}
                                    className="flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl transition-all group cursor-pointer"
                                    onClick={() => setSelectedPessoa({ id: ir.pessoa_id, nome: ir.pessoa_nome })}
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 text-[10px] font-bold uppercase shrink-0">
                                            {ir.pessoa_nome?.charAt(0) || '?'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold text-gray-200 uppercase truncate">{ir.pessoa_nome}</p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                {ir.quiz_total > 0 && (
                                                    <span className="text-[8px] text-gray-500 uppercase">
                                                        Quiz: {ir.quiz_aprovados}/{ir.quiz_total}
                                                    </span>
                                                )}
                                                {ir.quiz_pendentes > 0 && (
                                                    <span className="text-[8px] text-yellow-500 font-bold uppercase">
                                                        {ir.quiz_pendentes} pendente{ir.quiz_pendentes > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                                {ir.entrega_status && (
                                                    <span className="text-[8px] text-gray-500 uppercase">
                                                        Prancha: {ir.entrega_status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        {ir.data_resposta && (
                                            <span className="text-[8px] text-gray-600">{new Date(ir.data_resposta).toLocaleDateString()}</span>
                                        )}
                                        <span className="text-[9px] text-gray-500 group-hover:text-yellow-500 transition-colors font-bold uppercase">
                                            Corrigir →
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

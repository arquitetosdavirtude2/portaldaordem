'use client';

import { useEffect, useState } from 'react';

interface MesAtraso {
    mes_ref: string;
    label: string;
    ignorado: boolean;
    excecao_id: number | null;
    justificativa: string | null;
}

interface IrmaoFinanceiro {
    id: number;
    nome: string;
    cargo: string;
    data_admissao: string | null;
    data_adormecimento: string | null;
    ativo: number;
    meses_devidos: number;
    meses_pagos: number;
    joia_paga: number;
    joia_pendente: number;
    mensalidade_paga: number;
    mensalidade_pendente: number;
    saude_financeira: string;
    meses_atraso: MesAtraso[];
}

export default function GestaoIrmaosFinanceiro({ acesso }: { acesso: any }) {
    const [irmaos, setIrmaos] = useState<IrmaoFinanceiro[]>([]);
    const [mesAtivo, setMesAtivo] = useState<number>(new Date().getMonth() + 1);
    const [anoAtivo, setAnoAtivo] = useState<number>(new Date().getFullYear());
    const [carregando, setCarregando] = useState(true);
    const [irmaoSelecionado, setIrmaoSelecionado] = useState<IrmaoFinanceiro | null>(null);
    const [mostrarAdormecidos, setMostrarAdormecidos] = useState(false);
    const [mesesModal, setMesesModal] = useState<MesAtraso[]>([]);
    const [justificativaTemp, setJustificativaTemp] = useState<{[key: string]: string}>({});
    const [salvando, setSalvando] = useState<string | null>(null);
    const [baixandoRelatorio, setBaixandoRelatorio] = useState(false);
    const [visaoAtiva, setVisaoAtiva] = useState<'ativos' | 'inadimplentes' | 'adormecidos'>('ativos');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

    const carregarFinanceiroIrmaos = async () => {
        setCarregando(true);
        try {
            const url = `${apiUrl}/api/tesouraria/irmaos/${acesso.loja_id}?ano=${anoAtivo}&mes=${mesAtivo}&incluir_adormecidos=${mostrarAdormecidos}`;
            const res = await fetch(url);
            if (res.ok) {
                setIrmaos(await res.json());
            }
        } catch (error) {
            console.error('Erro ao carregar financeiro dos irmãos:', error);
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        carregarFinanceiroIrmaos();
    }, [acesso.loja_id, mesAtivo, anoAtivo, visaoAtiva]);

    useEffect(() => {
        if (irmaoSelecionado) {
            setMesesModal([...irmaoSelecionado.meses_atraso]);
        }
    }, [irmaoSelecionado]);

    const formatarData = (dataStr: string | null) => {
        if (!dataStr) return '—';
        const partes = dataStr.split('-');
        if (partes.length !== 3) return '—';
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };

    const handleIgnorarMes = async (mes: MesAtraso) => {
        if (mes.excecao_id) {
            setSalvando(mes.mes_ref);
            try {
                const res = await fetch(`${apiUrl}/api/tesouraria/excecoes/${mes.excecao_id}`, { method: 'DELETE' });
                if (res.ok) {
                    setMesesModal(prev => prev.map(m =>
                        m.mes_ref === mes.mes_ref
                            ? { ...m, ignorado: false, excecao_id: null, justificativa: null }
                            : m
                    ));
                }
            } finally {
                setSalvando(null);
            }
        } else {
            setJustificativaTemp(prev => ({
                ...prev,
                [mes.mes_ref]: prev[mes.mes_ref] === undefined ? '' : prev[mes.mes_ref]
            }));
        }
    };

    const handleSalvarExcecao = async (mes: MesAtraso) => {
        if (!irmaoSelecionado) return;
        setSalvando(mes.mes_ref);
        try {
            const res = await fetch(`${apiUrl}/api/tesouraria/excecoes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pessoa_id: irmaoSelecionado.id,
                    mes_ref: mes.mes_ref,
                    justificativa: justificativaTemp[mes.mes_ref] || '',
                    usuario_id: acesso.usuario_id || null
                })
            });
            if (res.ok) {
                const data = await res.json();
                setMesesModal(prev => prev.map(m =>
                    m.mes_ref === mes.mes_ref
                        ? { ...m, ignorado: true, excecao_id: data.id, justificativa: justificativaTemp[mes.mes_ref] || '' }
                        : m
                ));
                setJustificativaTemp(prev => {
                    const copy = { ...prev };
                    delete copy[mes.mes_ref];
                    return copy;
                });
                carregarFinanceiroIrmaos();
            }
        } finally {
            setSalvando(null);
        }
    };

    const handleDownloadRelatorio = async () => {
        setBaixandoRelatorio(true);
        try {
            const url = `${apiUrl}/api/tesouraria/relatorio/inadimplentes/${acesso.loja_id}`;
            const res = await fetch(url);
            if (res.ok) {
                const blob = await res.blob();
                const urlObj = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = urlObj;
                a.download = `relatorio_inadimplentes_${acesso.loja_id}_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(urlObj);
            }
        } catch (error) {
            console.error('Erro ao baixar relatório:', error);
        } finally {
            setBaixandoRelatorio(false);
        }
    };

    const irmaosFiltrados = irmaos.filter(i => {
        // Regra: VM e Vigilantes não pagam mensalidade, portanto nem devem aparecer na lista
        const cargo = (i.cargo || '').toLowerCase();
        if (cargo.includes('venerável') || cargo.includes('vigilante')) return false;

        const isAtivo = (!i.data_adormecimento || i.data_adormecimento.trim() === '') && i.ativo !== 0;
        if (visaoAtiva === 'inadimplentes') return i.saude_financeira !== 'REGULAR' && isAtivo;
        if (visaoAtiva === 'adormecidos') return !isAtivo;
        return isAtivo;
    });

    if (carregando) {
        return (
            <div className="text-center py-20 text-yellow-500/50 flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
                <span className="text-[10px] uppercase font-bold tracking-[0.3em]">Cruzando dados dos irmãos...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* ── Linha do cabeçalho: Título + Controles ── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

                {/* Título */}
                <h1 className="text-2xl font-bold text-yellow-500 uppercase tracking-tighter shrink-0">
                    Joias & Mensalidades
                </h1>

                {/* Controles: filtros + relatório + mês/ano */}
                <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap justify-end w-full">

                    {/* Segmented control de visão */}
                    <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/10 shadow-inner">
                        <button
                            onClick={() => setVisaoAtiva('ativos')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${visaoAtiva === 'ativos' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${visaoAtiva === 'ativos' ? 'bg-blue-400 animate-pulse' : 'bg-gray-600'}`}></span>
                            Ativos
                        </button>
                        <button
                            onClick={() => setVisaoAtiva('inadimplentes')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${visaoAtiva === 'inadimplentes' ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${visaoAtiva === 'inadimplentes' ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`}></span>
                            Inadimplentes
                        </button>
                        <button
                            onClick={() => setVisaoAtiva('adormecidos')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${visaoAtiva === 'adormecidos' ? 'bg-gray-500/20 text-gray-300 border border-gray-400/30' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${visaoAtiva === 'adormecidos' ? 'bg-gray-300 animate-pulse' : 'bg-gray-600'}`}></span>
                            Adormecidos
                        </button>
                    </div>

                    <div className="h-8 w-px bg-white/10 mx-1 hidden lg:block"></div>

                    {/* Botão Relatório CSV */}
                    <button
                        onClick={handleDownloadRelatorio}
                        disabled={baixandoRelatorio}
                        className="h-10 px-4 bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 text-yellow-500 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
                    >
                        {baixandoRelatorio ? (
                            <div className="w-3 h-3 border border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
                        ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        )}
                        {baixandoRelatorio ? '...' : 'Relatório'}
                    </button>

                    {/* Seletor de Mês */}
                    <select
                        value={mesAtivo}
                        onChange={(e) => setMesAtivo(Number(e.target.value))}
                        className="h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-[11px] font-bold text-gray-300 focus:outline-none focus:border-yellow-500/50 transition-colors uppercase cursor-pointer"
                    >
                        {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                            <option key={m} value={i + 1}>{m}</option>
                        ))}
                    </select>

                    {/* Seletor de Ano */}
                    <select
                        value={anoAtivo}
                        onChange={(e) => setAnoAtivo(Number(e.target.value))}
                        className="h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-[11px] font-bold text-gray-300 focus:outline-none focus:border-yellow-500/50 transition-colors cursor-pointer"
                    >
                        {[2024, 2025, 2026].map(val => (
                            <option key={val} value={val}>{val}</option>
                        ))}
                    </select>

                </div>
            </div>
            {/* ── FIM do cabeçalho ── */}

            {/* ── Tabela ── (irmã do cabeçalho, dentro de space-y-6) */}
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 backdrop-blur-md">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5 uppercase tracking-widest text-gray-400 font-sans font-bold text-[9px]">
                            <th className="px-5 py-4">Obreiro</th>
                            <th className="px-5 py-4">Cargo</th>
                            <th className="px-5 py-4 text-center">Iniciação</th>
                            <th className="px-5 py-4 text-center">Joia (Paga / Pend)</th>
                            <th className="px-5 py-4 text-center">Mensal. (Paga / Pend)</th>
                            <th className="px-5 py-4 text-center">Ações</th>
                            <th className="px-5 py-4 text-right">Saúde Financeira</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {irmaosFiltrados.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-5 py-10 text-center text-gray-500 text-[11px]">
                                    Nenhum registro encontrado para os filtros selecionados.
                                </td>
                            </tr>
                        )}
                        {irmaosFiltrados.map(irmao => {
                            const isAdormecido = irmao.ativo === 0;
                            return (
                                <tr key={irmao.id} className={`hover:bg-white/[0.02] transition-colors group ${isAdormecido ? 'opacity-50' : ''}`}>
                                    <td className="px-5 py-4">
                                        <div className="text-[12px] font-bold text-gray-100 group-hover:text-yellow-500 transition-colors">
                                            {irmao.nome}
                                        </div>
                                        {isAdormecido && (
                                            <div className="text-[9px] text-gray-500 uppercase tracking-tighter mt-0.5">
                                                Adormecido desde {formatarData(irmao.data_adormecimento)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        {isAdormecido ? (
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-gray-400/10 border border-gray-400/20 px-2 py-0.5 rounded-full">ADORMECIDO</span>
                                        ) : irmao.cargo ? (
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-300 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full">{irmao.cargo}</span>
                                        ) : (
                                            <span className="text-[9px] text-gray-600 italic">—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <span className="text-[11px] text-gray-300 font-mono">{formatarData(irmao.data_admissao)}</span>
                                    </td>
                                    <td className="px-5 py-4 text-center font-sans text-[11px]">
                                        <span className="text-green-400 font-bold">R$ {irmao.joia_paga.toFixed(0)}</span>
                                        <span className="mx-1 text-gray-600">/</span>
                                        <span className={irmao.joia_pendente > 0 ? 'text-yellow-500 font-bold' : 'text-gray-500 italic'}>
                                            R$ {irmao.joia_pendente.toFixed(0)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-center font-sans text-[11px]">
                                        <span className="text-green-400 font-bold">R$ {irmao.mensalidade_paga.toFixed(0)}</span>
                                        <span className="mx-1 text-gray-600">/</span>
                                        <span className={
                                            irmao.saude_financeira === 'ATRASADO' ? 'text-red-400 font-bold' :
                                            irmao.saude_financeira === 'PENDENTE' ? 'text-yellow-500 font-bold' :
                                            'text-gray-500 italic'
                                        }>
                                            R$ {irmao.mensalidade_pendente.toFixed(0)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <button
                                            onClick={() => setIrmaoSelecionado(irmao)}
                                            className="px-4 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded text-[10px] font-black uppercase tracking-widest hover:bg-blue-600/30 transition-all shadow-sm"
                                        >
                                            DETALHES
                                        </button>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        {isAdormecido ? (
                                            <div className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded-full border border-gray-500/20">Adormecido</div>
                                        ) : irmao.saude_financeira === 'REGULAR' ? (
                                            <div className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">Regular</div>
                                        ) : irmao.saude_financeira === 'ATRASADO' ? (
                                            <div className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20">Atrasado</div>
                                        ) : (
                                            <div className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">Pendente</div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {/* ── FIM da Tabela ── */}

            {/* ── Modal Detalhes Meses ── */}
            {irmaoSelecionado && (
                <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200">
                    <div className="bg-[#0f1d45] border border-white/20 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <div>
                                <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Meses em Aberto</h3>
                                <p className="text-[9px] text-gray-500 mt-0.5 uppercase">Clique em um mês vermelho para justificar e ignorar</p>
                            </div>
                            <button onClick={() => { setIrmaoSelecionado(null); setJustificativaTemp({}); }} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                            <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-4">
                                Obreiro: <span className="text-white">{irmaoSelecionado.nome}</span>
                                <span className="ml-3 text-gray-600">·</span>
                                <span className="ml-3 text-gray-400">Iniciado: {formatarData(irmaoSelecionado.data_admissao)}</span>
                                <span className="ml-3 text-gray-600">·</span>
                                <span className="ml-3 text-gray-400">{irmaoSelecionado.meses_devidos} meses devidos</span>
                            </div>

                            {mesesModal.map((mes) => {
                                const isPendingInput = justificativaTemp[mes.mes_ref] !== undefined;
                                return (
                                    <div key={mes.mes_ref} className="space-y-2">
                                        <button
                                            onClick={() => handleIgnorarMes(mes)}
                                            disabled={salvando === mes.mes_ref}
                                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border font-bold text-[11px] uppercase tracking-wider transition-all ${
                                                mes.excecao_id
                                                    ? 'bg-green-400/10 border-green-400/30 text-green-400 hover:bg-green-400/20'
                                                    : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                                            }`}
                                        >
                                            <span>{mes.label}</span>
                                            <span className="text-[9px] normal-case font-normal">
                                                {salvando === mes.mes_ref ? 'Salvando...' :
                                                    mes.excecao_id
                                                        ? `✓ Ignorado — ${mes.justificativa || 'sem justificativa'} (clique para remover)`
                                                        : '✗ Não pago — clique para justificar e ignorar'
                                                }
                                            </span>
                                        </button>

                                        {isPendingInput && !mes.excecao_id && (
                                            <div className="flex gap-2 pl-2">
                                                <input
                                                    type="text"
                                                    placeholder="Justificativa (ex: desconto de empréstimo)"
                                                    value={justificativaTemp[mes.mes_ref]}
                                                    onChange={(e) => setJustificativaTemp(prev => ({ ...prev, [mes.mes_ref]: e.target.value }))}
                                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-gray-200 focus:outline-none focus:border-yellow-500/50"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => handleSalvarExcecao(mes)}
                                                    disabled={salvando === mes.mes_ref}
                                                    className="px-3 py-2 bg-yellow-500/20 border border-yellow-500/30 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                                                >
                                                    Salvar
                                                </button>
                                                <button
                                                    onClick={() => setJustificativaTemp(prev => {
                                                        const copy = { ...prev };
                                                        delete copy[mes.mes_ref];
                                                        return copy;
                                                    })}
                                                    className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {mesesModal.length === 0 && (
                                <p className="text-center text-gray-500 text-[11px] italic py-4">Nenhum mês em aberto.</p>
                            )}
                        </div>
                        <div className="p-4 bg-black/20 border-t border-white/5">
                            <button
                                onClick={() => { setIrmaoSelecionado(null); setJustificativaTemp({}); }}
                                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                            >
                                Fechar Detalhes
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

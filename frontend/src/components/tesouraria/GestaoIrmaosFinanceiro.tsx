'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface MesAtraso {
    mes_ref: string;
    label: string;
    ignorado: boolean;
    excecao_id: number | null;
    justificativa: string | null;
    status?: 'pago' | 'justificado' | 'isento' | 'pendente';
}

interface IrmaoFinanceiro {
    id: number;
    nome: string;
    cargo: string;
    data_admissao: string | null;
    data_adormecimento: string | null;
    ativo: number;
    tipo_ingresso: string;
    meses_cobrados: number;
    meses_devidos: number;
    meses_pagos: number;
    joia_paga: number;
    joia_real: number;
    joia_justificada: number;
    joia_pendente: number;
    mensalidade_paga: number;
    mensalidade_real: number;
    mensalidade_justificada: number;
    mensalidade_pendente: number;
    saude_financeira: string;
    meses_atraso: MesAtraso[];
    joia_quitada_externa: boolean;
    isencao_inicio: boolean;
    tipo_pessoa?: string;
}

export default function GestaoIrmaosFinanceiro({ acesso }: { acesso: any }) {
    const [isMounted, setIsMounted] = useState(false);
    const [irmaos, setIrmaos] = useState<IrmaoFinanceiro[]>([]);
    const [mesAtivo, setMesAtivo] = useState<number>(new Date().getMonth() + 1);
    const [anoAtivo, setAnoAtivo] = useState<number>(new Date().getFullYear());
    const [carregando, setCarregando] = useState(true);
    const [irmaoSelecionado, setIrmaoSelecionado] = useState<IrmaoFinanceiro | null>(null);
    const [mostrarAdormecidos, setMostrarAdormecidos] = useState(false);
    const [mesesModal, setMesesModal] = useState<MesAtraso[]>([]);
    const [justificativaTemp, setJustificativaTemp] = useState<{ [key: string]: string }>({});
    const [salvando, setSalvando] = useState<string | null>(null);
    const [baixandoRelatorio, setBaixandoRelatorio] = useState(false);
    const [visaoAtiva, setVisaoAtiva] = useState<'ativos' | 'inadimplentes'>('ativos');

    const [categoriaFiltro, setCategoriaFiltro] = useState<'todas' | 'joia' | 'mensalidade'>('todas');
    const [busca, setBusca] = useState('');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const formatarMoeda = (valor: number) => {
        return new Intl.NumberFormat('pt-BR').format(Math.round(valor));
    };

    const carregarFinanceiroIrmaos = async () => {

        setCarregando(true);
        try {
            const url = `${apiUrl}/api/tesouraria/irmaos/${acesso.loja_id}?ano=${anoAtivo}&mes=${mesAtivo}&incluir_adormecidos=${mostrarAdormecidos}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setIrmaos(data);
                // Atualiza o irmão selecionado se o modal estiver aberto
                setIrmaoSelecionado(prev => {
                    if (!prev) return null;
                    return data.find((i: any) => i.id === prev.id) || prev;
                });
            }
        } catch (error) {
            console.error('Erro ao carregar financeiro dos irmãos:', error);
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        carregarFinanceiroIrmaos();
    }, [acesso.loja_id, mesAtivo, anoAtivo, visaoAtiva, mostrarAdormecidos]);


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
                    carregarFinanceiroIrmaos();
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

    const handleToggleFlag = async (flag: 'joia_quitada_externa' | 'isencao_inicio', value: boolean) => {
        if (!irmaoSelecionado) return;
        try {
            const res = await fetch(`${apiUrl}/api/tesouraria/irmaos/${irmaoSelecionado.id}/flags`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [flag]: value })
            });
            if (res.ok) {
                setIrmaoSelecionado(prev => prev ? { ...prev, [flag]: value } : null);
                carregarFinanceiroIrmaos();
            }
        } catch (error) {
            console.error('Erro ao atualizar flag:', error);
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
        // Busca por nome
        if (busca && !i.nome.toLowerCase().includes(busca.toLowerCase())) return false;

        // Filtro de Adormecidos (Toggle)
        if (!mostrarAdormecidos && i.ativo === 0) return false;

        if (visaoAtiva === 'inadimplentes') {
            const pendenteJoia = Math.round(i.joia_pendente);
            const pendenteMensalidade = Math.round(i.mensalidade_pendente);

            if (categoriaFiltro === 'joia') return pendenteJoia > 0;
            if (categoriaFiltro === 'mensalidade') return pendenteMensalidade > 0;
            return pendenteJoia > 0 || pendenteMensalidade > 0;
        }


        return true;
    });



    const totais = irmaosFiltrados.reduce((acc, i) => ({
        joia_paga: acc.joia_paga + i.joia_paga,
        joia_pendente: acc.joia_pendente + i.joia_pendente,
        mensalidade_paga: acc.mensalidade_paga + i.mensalidade_paga,
        mensalidade_pendente: acc.mensalidade_pendente + i.mensalidade_pendente
    }), { joia_paga: 0, joia_pendente: 0, mensalidade_paga: 0, mensalidade_pendente: 0 });

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
            <div className="flex flex-wrap items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/5">
                {/* Busca */}
                <div className="relative flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Buscar obreiro..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full h-9 bg-black/40 border border-white/10 text-gray-300 text-[10px] rounded-lg pl-8 pr-4 py-1 focus:outline-none focus:border-yellow-500 transition-all uppercase tracking-widest"
                    />
                    <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>

                <div className="h-6 w-px bg-white/10 mx-1 hidden lg:block"></div>

                {/* Filtro de Visão (Ativos/Inadimplentes) */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 shadow-inner">
                    <button
                        type="button"
                        onClick={() => setVisaoAtiva('ativos')}
                        className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${visaoAtiva === 'ativos' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Ativos
                    </button>
                    <button
                        type="button"
                        onClick={() => setVisaoAtiva('inadimplentes')}
                        className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${visaoAtiva === 'inadimplentes' ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Inadimplentes
                    </button>
                </div>

                {/* Filtro de Categoria */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 shadow-inner">
                    <span className="text-[8px] font-bold text-gray-500 uppercase px-1.5">Exibir:</span>
                    <select
                        value={categoriaFiltro}
                        onChange={(e) => setCategoriaFiltro(e.target.value as any)}
                        className="h-7 bg-[#0a0a0a] border border-white/10 rounded-md px-2 text-[9px] font-bold text-yellow-500 focus:outline-none transition-colors uppercase cursor-pointer"
                    >
                        <option value="todas" className="bg-[#0a0a0a]">Todas</option>
                        <option value="joia" className="bg-[#0a0a0a]">Joia</option>
                        <option value="mensalidade" className="bg-[#0a0a0a]">Mensalidade</option>
                    </select>
                </div>

                <button
                    type="button"
                    onClick={() => setMostrarAdormecidos(!mostrarAdormecidos)}
                    className={`h-9 px-3 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${mostrarAdormecidos ? 'bg-gray-500/20 text-gray-200 border-gray-400/50 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'bg-black/20 text-gray-600 border-white/5 hover:border-white/10'}`}
                >
                    <div className={`w-1.5 h-1.5 rounded-full ${mostrarAdormecidos ? 'bg-gray-300' : 'bg-gray-800'}`}></div>
                    Adormecidos
                </button>

                <div className="h-6 w-px bg-white/10 mx-1 hidden lg:block"></div>

                {/* Seletor de Mês/Ano */}
                <div className="flex items-center gap-1">
                    <select
                        value={mesAtivo}
                        onChange={(e) => setMesAtivo(Number(e.target.value))}
                        className="h-9 bg-[#0a0a0a] border border-white/10 rounded-lg px-2 text-[10px] font-bold text-gray-300 focus:outline-none focus:border-yellow-500/50 transition-colors uppercase cursor-pointer"
                    >
                        {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                            <option key={m} value={i + 1} className="bg-[#0a0a0a]">{m}</option>
                        ))}
                    </select>
                    <select
                        value={anoAtivo}
                        onChange={(e) => setAnoAtivo(Number(e.target.value))}
                        className="h-9 bg-[#0a0a0a] border border-white/10 rounded-lg px-2 text-[10px] font-bold text-gray-300 focus:outline-none focus:border-yellow-500/50 transition-colors cursor-pointer"
                    >
                        {[2024, 2025, 2026].map(val => (
                            <option key={val} value={val} className="bg-[#0a0a0a]">{val}</option>
                        ))}
                    </select>
                </div>

                <button
                    type="button"
                    onClick={handleDownloadRelatorio}
                    disabled={baixandoRelatorio}
                    className="h-9 px-3 bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 text-yellow-500 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                    {baixandoRelatorio ? '...' : 'CSV'}
                </button>
            </div>

            {/* ── Tabela ── (irmã do cabeçalho, dentro de space-y-6) */}
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 backdrop-blur-md">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5 uppercase tracking-widest text-gray-400 font-sans font-bold text-[9px]">
                            <th className="px-5 py-4 whitespace-nowrap">Obreiro</th>
                            <th className="px-5 py-4 whitespace-nowrap">Cargo</th>
                            <th className="px-5 py-4 text-center whitespace-nowrap">Iniciação / Transf.</th>
                            {(categoriaFiltro === 'todas' || categoriaFiltro === 'joia') && (
                                <th className="px-5 py-4 text-center whitespace-nowrap">Joia</th>
                            )}
                            {(categoriaFiltro === 'todas' || categoriaFiltro === 'mensalidade') && (
                                <th className="px-5 py-4 text-center whitespace-nowrap">Mensalidade</th>
                            )}

                            <th className="px-5 py-4 text-center whitespace-nowrap">Ações</th>
                            <th className="px-5 py-4 text-right whitespace-nowrap">Saúde Financeira</th>
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
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[11px] font-bold group-hover:text-yellow-500 transition-colors ${isAdormecido ? 'text-red-500/60' : 'text-gray-100'}`}>
                                                {irmao.nome}
                                            </span>
                                        </div>
                                        {isAdormecido && (
                                            <div className="text-[8px] text-red-500/60 font-bold uppercase tracking-tighter mt-0.5">
                                                Adormecido desde {formatarData(irmao.data_adormecimento)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        {(irmao.cargo && irmao.cargo !== 'ADORMECIDO') ? (
                                            <span className="text-[8px] font-bold uppercase tracking-wider text-blue-300 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full">{irmao.cargo}</span>
                                        ) : (
                                            <span className="text-[8px] text-gray-600 italic">—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-center whitespace-nowrap">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <span className="text-[10px] text-gray-300 font-sans">{formatarData(irmao.data_admissao)}</span>
                                                <div className="flex items-center gap-1">
                                                    {irmao.meses_cobrados > 0 && (
                                                        <span className="text-[9px] text-gray-500 font-sans">
                                                            ({irmao.meses_cobrados} {irmao.meses_cobrados === 1 ? 'mês' : 'meses'})
                                                        </span>
                                                    )}
                                                    {irmao.tipo_pessoa === 'candidato' && (
                                                        <span className="text-[7px] text-orange-400 font-bold uppercase tracking-tighter">
                                                            Candidato
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    {(categoriaFiltro === 'todas' || categoriaFiltro === 'joia') && (
                                        <td className="px-5 py-4 text-center font-sans text-[10px] whitespace-nowrap min-w-[140px]">
                                            {irmao.tipo_ingresso === 'transferencia' ? (
                                                <div className="flex flex-col items-center">
                                                    <span className="text-gray-500 italic">—</span>
                                                    <span className="text-[7px] text-blue-500/50 uppercase font-black tracking-tighter mt-0.5">Transferido</span>
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1">
                                                    <span className="text-green-400 font-bold">R$ {formatarMoeda(irmao.joia_paga)}</span>
                                                    <span className="text-gray-600">/</span>
                                                    <span className={irmao.joia_pendente > 0 ? 'text-yellow-500 font-bold' : 'text-gray-500 italic'}>
                                                        R$ {formatarMoeda(irmao.joia_pendente)}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                    )}
                                    {(categoriaFiltro === 'todas' || categoriaFiltro === 'mensalidade') && (
                                        <td className="px-5 py-4 text-center font-sans text-[10px] whitespace-nowrap min-w-[140px]">
                                            <div className="inline-flex items-center gap-1">
                                                <span className="text-green-400 font-bold">R$ {formatarMoeda(irmao.mensalidade_paga)}</span>
                                                <span className="text-gray-600">/</span>
                                                <span className={
                                                    irmao.saude_financeira === 'ATRASADO' ? 'text-red-400 font-bold' :
                                                        irmao.saude_financeira === 'PENDENTE' ? 'text-yellow-500 font-bold' :
                                                            'text-gray-500 italic'
                                                }>
                                                    R$ {formatarMoeda(irmao.mensalidade_pendente)}
                                                </span>
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-5 py-4 text-center whitespace-nowrap">
                                        <button
                                            onClick={() => setIrmaoSelecionado(irmao)}
                                            className="px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded text-[9px] font-black uppercase tracking-widest hover:bg-blue-600/30 transition-all shadow-sm"
                                        >
                                            DETALHES
                                        </button>
                                    </td>
                                    <td className="px-5 py-4 text-right whitespace-nowrap">
                                        {isAdormecido ? (
                                            <div className="inline-flex items-center gap-1 text-[8px] font-bold uppercase text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded-full border border-gray-500/20">Adormecido</div>
                                        ) : irmao.saude_financeira === 'REGULAR' ? (
                                            <div className="inline-flex items-center gap-1 text-[8px] font-bold uppercase text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">Regular</div>
                                        ) : irmao.saude_financeira === 'ATRASADO' ? (
                                            <div className="inline-flex items-center gap-1 text-[8px] font-bold uppercase text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-500/20">Atrasado</div>
                                        ) : (
                                            <div className="inline-flex items-center gap-1 text-[8px] font-bold uppercase text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">Pendente</div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="border-t border-white/10 bg-white/5 font-sans font-black text-[10px] uppercase tracking-widest">
                        <tr>
                            <td colSpan={3} className="px-5 py-4 text-right text-gray-500">Totais:</td>
                            {(categoriaFiltro === 'todas' || categoriaFiltro === 'joia') && (
                                <td className="px-5 py-4 text-center whitespace-nowrap">
                                    <span className="text-green-400 font-bold">R$ {formatarMoeda(totais.joia_paga)}</span>
                                    <span className="mx-1 text-gray-600">/</span>
                                    <span className="text-yellow-500 font-bold">R$ {formatarMoeda(totais.joia_pendente)}</span>
                                </td>
                            )}
                            {(categoriaFiltro === 'todas' || categoriaFiltro === 'mensalidade') && (
                                <td className="px-5 py-4 text-center whitespace-nowrap">
                                    <span className="text-green-400 font-bold">R$ {formatarMoeda(totais.mensalidade_paga)}</span>
                                    <span className="mx-1 text-gray-600">/</span>
                                    <span className="text-red-400 font-bold">R$ {formatarMoeda(totais.mensalidade_pendente)}</span>
                                </td>
                            )}
                            <td colSpan={2}></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            {/* ── FIM da Tabela ── */}

            {/* ── Modal Detalhes Meses ── */}
            {isMounted && irmaoSelecionado && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all animate-in fade-in duration-300">
                    <div className="relative bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col m-4 animate-in zoom-in duration-300">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <div>
                                <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Detalhamento Financeiro</h3>
                                <p className="text-[9px] text-gray-500 mt-0.5 uppercase">Clique em um mês vermelho para justificar e ignorar</p>
                            </div>
                            <button onClick={() => { setIrmaoSelecionado(null); setJustificativaTemp({}); }} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                            <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-4">
                                Obreiro: <span className="text-white">{irmaoSelecionado.nome}</span>
                                <span className="ml-3 text-gray-600">·</span>
                                <span className="ml-3 text-gray-400">Iniciado: {formatarData(irmaoSelecionado.data_admissao)}</span>
                                {irmaoSelecionado.meses_devidos > 0 && (
                                    <>
                                        <span className="ml-3 text-gray-600">·</span>
                                        <span className="ml-3 text-red-400 font-black font-sans">{irmaoSelecionado.meses_devidos} meses devidos</span>
                                    </>
                                )}
                            </div>

                            {/* ── Novas Flags de Isenção (Solicitado via Áudio) ── */}
                            <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white/5 rounded-2xl border border-white/5">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            checked={irmaoSelecionado.joia_quitada_externa} 
                                            onChange={(e) => handleToggleFlag('joia_quitada_externa', e.target.checked)}
                                            className="w-4 h-4 rounded border-white/20 bg-black/40 text-yellow-500 focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer"
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest group-hover:text-white transition-colors">Joia Paga Externamente (<span className="font-sans">Forçar R$ 2.000</span>)</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group border-l border-white/10 pl-4">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            checked={irmaoSelecionado.isencao_inicio} 
                                            onChange={(e) => handleToggleFlag('isencao_inicio', e.target.checked)}
                                            className="w-4 h-4 rounded border-white/20 bg-black/40 text-blue-500 focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer"
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest group-hover:text-white transition-colors">Isentar Mês de Iniciação (Sem dívida)</span>
                                </label>
                            </div>

                            {mesesModal.map((mes) => {
                                const isPendingInput = justificativaTemp[mes.mes_ref] !== undefined;
                                return (
                                    <div key={mes.mes_ref} className="space-y-2">
                                        <button
                                            onClick={() => { 
                                                if (mes.mes_ref === 'JOIA') return; // Bloqueia clique na Joia
                                                if (mes.status === 'pendente' || mes.status === 'justificado') handleIgnorarMes(mes); 
                                            }}
                                            disabled={salvando === mes.mes_ref || (mes.status === 'pago' && mes.mes_ref !== 'JOIA') || mes.status === 'isento' || mes.mes_ref === 'JOIA'}
                                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border font-bold text-[11px] uppercase tracking-wider transition-all ${
                                                mes.status === 'pago' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 cursor-default' :
                                                mes.status === 'isento' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 cursor-default' :
                                                mes.status === 'justificado' ? 'bg-green-400/10 border-green-400/30 text-green-400' :
                                                'bg-red-500/10 border-red-500/30 text-red-400'
                                            } ${mes.mes_ref === 'JOIA' ? 'cursor-default' : 'hover:opacity-80'}`}
                                        >
                                            <span className="font-sans">{mes.label}</span>
                                            <span className="text-[9px] normal-case font-normal">
                                                {salvando === mes.mes_ref ? 'Salvando...' :
                                                    mes.status === 'pago' ? '✓ Pago (Lançamento)' :
                                                    mes.status === 'justificado' ? (mes.mes_ref === 'JOIA' ? '✓ Pago Externamente (via Checkbox)' : `✓ Justificado — ${mes.justificativa || ''} (clique para remover)`) :
                                                    mes.status === 'isento' ? `✓ ${mes.justificativa || 'Isento'}` :
                                                    (mes.mes_ref === 'JOIA' ? '✗ Pendente (Sem pagamento ou check)' : '✗ Pendente — clique para justificar')
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
                </div>,
                document.body
            )}

        </div>
    );
}

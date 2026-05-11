'use client';

import { useEffect, useState } from 'react';
import ModalNovaTransacao from './ModalTransacao';
import ListaTransacoes from './ListaTransacoes';
import ModalExtratos from './ModalExtratos';

interface Caixa {
    id: number;
    nome: string;
    finalidade: string;
    saldo_atual: number;
}

interface Resumo {
    caixas: Caixa[];
    total_entrada_pendente: number;
    total_saida_pendente: number;
    detalhamento_pendente?: {
        mensalidade_mes: number;
        mensalidade_atrasada: number;
        contas_receber: number;
    };
    saldo_geral: number;
    saldo_benevolencia: number;
    saldo_joias_mensalidade: number;
}

export default function DashboardFinanceiro({ 
    acesso, 
    onNovoLancamento, 
    onEdit,
    chaveAtualizacao 
}: { 
    acesso: any, 
    onNovoLancamento: () => void, 
    onEdit: (t: any) => void,
    chaveAtualizacao?: any 
}) {
    const [resumo, setResumo] = useState<Resumo | null>(null);
    const [caixaAtivo, setCaixaAtivo] = useState<number>(0); // 0 = Consolidated
    const [mesAtivo, setMesAtivo] = useState<number>(new Date().getMonth() + 1);
    const [anoAtivo, setAnoAtivo] = useState<number>(new Date().getFullYear());
    const [busca, setBusca] = useState<string>('');
    const [saldoPeriodo, setSaldoPeriodo] = useState<number>(0);
    const [carregando, setCarregando] = useState(true);
    const [isModalExtratosOpen, setIsModalExtratosOpen] = useState(false);

    const [buscaLocal, setBuscaLocal] = useState<string>('');

    const carregarResumo = async () => {
        setCarregando(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            const res = await fetch(`${apiUrl}/api/tesouraria/resumo/${acesso.loja_id}`);
            if (res.ok) {
                setResumo(await res.json());
            }

            // Also fetch filtered period data for summary
            let url = `${apiUrl}/api/tesouraria/transacoes/${caixaAtivo}?loja_id=${acesso.loja_id}&`;
            if (mesAtivo !== 0) url += `mes=${mesAtivo}&ano=${anoAtivo}&`;
            if (busca) url += `busca=${busca}&`;

            const resTrans = await fetch(url);
            if (resTrans.ok) {
                const trans: any[] = await resTrans.json();
                const total = trans.reduce((acc, t) => {
                    return acc + (t.tipo === 'entrada' ? t.valor : -t.valor);
                }, 0);
                setSaldoPeriodo(total);
            }
        } catch (error) {
            console.error('Erro ao carregar resumo financeiro:', error);
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        carregarResumo();
    }, [acesso.loja_id, caixaAtivo, mesAtivo, anoAtivo, busca, chaveAtualizacao]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setBusca(buscaLocal);
        }, 500);
        return () => clearTimeout(timer);
    }, [buscaLocal]);
    
    if (carregando) {
        return <div className="text-center py-20 text-yellow-500/50 flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
            <span className="text-[10px] uppercase font-medium tracking-[0.3em]">Atualizando Cofres...</span>
        </div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Action Bar - Highly Visible */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-yellow-500/5 p-4 rounded-xl border border-yellow-500/20 shadow-inner">
                <div className="flex flex-col">
                    <h2 className="text-xl font-medium text-yellow-500 uppercase tracking-wider font-sans">
                        Fluxo de Caixa
                    </h2>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-sans font-medium">Controle e Lançamentos Financeiros</p>
                </div>
                <div className="flex w-full md:w-auto gap-2">
                    <button
                        onClick={() => {
                            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
                            const url = `${apiUrl}/api/tesouraria/relatorio/financeiro?loja_id=${acesso.loja_id}&status=pago&mes=${mesAtivo}&ano=${anoAtivo}&caixa_id=${caixaAtivo}`;
                            window.open(url, '_blank');
                        }}
                        className="flex-1 md:flex-none px-6 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-xs font-medium uppercase tracking-widest transition-all"
                    >
                        📄 Relatório
                    </button>
                    <button
                        onClick={onNovoLancamento}
                        className="flex-1 md:flex-none px-8 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-xs font-medium uppercase tracking-widest transition-all shadow-[0_4px_15px_rgba(234,179,8,0.3)] hover:shadow-[0_6px_20px_rgba(234,179,8,0.4)] active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span className="text-lg leading-none">+</span>
                        LANÇAR NOVO
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Saldo Total */}
                <div 
                    onClick={() => setCaixaAtivo(0)}
                    className={`p-5 rounded-2xl bg-gradient-to-br from-yellow-500/15 via-yellow-500/5 to-transparent relative overflow-hidden group cursor-pointer transition-all duration-500 border border-yellow-500/10 ${caixaAtivo === 0 ? 'ring-2 ring-yellow-500/50 bg-yellow-500/20 scale-[1.02]' : 'hover:bg-yellow-500/10 hover:border-yellow-500/30'}`}
                >
                    <div className="absolute -top-2 -right-2 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 rotate-12">
                        <span className="text-6xl text-yellow-500">🏦</span>
                    </div>
                    <div className="relative z-10">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400 mb-2">Saldo Consolidado</div>
                        <div className="text-2xl font-medium text-white tracking-tight font-sans">
                            <span className="text-sm font-normal text-gray-400 mr-1.5">R$</span>
                            {resumo?.saldo_geral?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                        </div>
                    </div>
                </div>

                {/* Benevolência */}
                <div 
                    onClick={() => {
                        const ben = resumo?.caixas.find(c => c.finalidade === 'benevolencia');
                        if (ben) setCaixaAtivo(ben.id);
                    }}
                    className={`p-5 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent relative overflow-hidden group cursor-pointer transition-all duration-500 border border-emerald-500/10 ${resumo?.caixas.find(c => c.id === caixaAtivo)?.finalidade === 'benevolencia' ? 'ring-2 ring-emerald-500/50 bg-emerald-500/20 scale-[1.02]' : 'hover:bg-emerald-500/10 hover:border-emerald-500/30'}`}
                >
                    <div className="absolute -top-2 -right-2 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 rotate-12">
                        <span className="text-6xl text-emerald-500">🕊️</span>
                    </div>
                    <div className="relative z-10">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400 mb-2">Benevolência</div>
                        <div className="text-2xl font-medium text-emerald-400 tracking-tight font-sans">
                            <span className="text-sm font-normal opacity-50 mr-1.5">R$</span>
                            {resumo?.saldo_benevolencia?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                        </div>
                        <div className="text-[9px] text-gray-500 uppercase tracking-widest mt-1.5 font-medium truncate opacity-70 group-hover:opacity-100 transition-opacity">
                            {resumo?.caixas.find(c => c.finalidade === 'benevolencia')?.nome || 'Geral'}
                        </div>
                    </div>
                </div>

                {/* Joias e Mensalidades */}
                <div 
                    onClick={() => {
                        const jm = resumo?.caixas.find(c => c.finalidade === 'mensalidade');
                        if (jm) setCaixaAtivo(jm.id);
                    }}
                    className={`p-5 rounded-2xl bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent relative overflow-hidden group cursor-pointer transition-all duration-500 border border-blue-500/10 ${resumo?.caixas.find(c => c.id === caixaAtivo)?.finalidade === 'mensalidade' ? 'ring-2 ring-blue-500/50 bg-blue-500/20 scale-[1.02]' : 'hover:bg-blue-500/10 hover:border-blue-500/30'}`}
                >
                    <div className="absolute -top-2 -right-2 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 rotate-12">
                        <span className="text-6xl text-blue-500">💎</span>
                    </div>
                    <div className="relative z-10">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400 mb-2">Joias e Mensalidades</div>
                        <div className="text-2xl font-medium text-blue-400 tracking-tight font-sans">
                            <span className="text-sm font-normal opacity-50 mr-1.5">R$</span>
                            {resumo?.saldo_joias_mensalidade?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                        </div>
                        <div className="text-[9px] text-gray-500 uppercase tracking-widest mt-1.5 font-medium truncate opacity-70 group-hover:opacity-100 transition-opacity">
                            {resumo?.caixas.find(c => c.finalidade === 'mensalidade')?.nome || 'Geral'}
                        </div>
                    </div>
                </div>

                {/* Pendências */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-transparent relative overflow-hidden group border border-orange-500/10 shadow-2xl">
                    <div className="relative z-10">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400 mb-1">Recebimentos Pendentes</div>
                        <div className="text-xl font-medium text-orange-500 tracking-tight font-sans">
                            <span className="text-sm font-normal opacity-50 mr-1.5">R$</span>
                            {resumo?.total_entrada_pendente?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                        </div>
                        
                        {resumo?.detalhamento_pendente && (
                            <div className="mt-1.5 pt-1.5 border-t border-white/5 flex flex-col gap-0.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] uppercase tracking-[0.05em] text-gray-500 font-medium">Mensalidades Mês Atual</span>
                                    <span className="text-[9px] font-semibold text-gray-400 font-sans tracking-tight">R$ {resumo.detalhamento_pendente.mensalidade_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] uppercase tracking-[0.05em] text-red-500/50 font-medium">Mensalidades Atrasadas</span>
                                    <span className="text-[9px] font-semibold text-red-400/80 font-sans tracking-tight">R$ {resumo.detalhamento_pendente.mensalidade_atrasada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] uppercase tracking-[0.05em] text-blue-500/60 font-medium">Contas a Receber</span>
                                    <span className="text-[9px] font-semibold text-blue-400/90 font-sans tracking-tight">R$ {resumo.detalhamento_pendente.contas_receber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                <div className="md:col-span-3 flex flex-col gap-2">
                    <label className="text-[10px] uppercase font-semibold text-gray-500 tracking-[0.2em] ml-1">Período</label>
                    <div className="flex gap-2">
                        <select 
                            value={mesAtivo}
                            onChange={(e) => setMesAtivo(Number(e.target.value))}
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-[11px] font-medium text-gray-200 focus:outline-none focus:border-yellow-500/50 transition-all uppercase tracking-wider cursor-pointer hover:bg-black/60"
                        >
                            {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                                <option key={m} value={i + 1} className="bg-[#0a0a0a]">{m}</option>
                            ))}
                        </select>
                        <select 
                            value={anoAtivo}
                            onChange={(e) => setAnoAtivo(Number(e.target.value))}
                            className="w-24 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-[11px] font-medium text-gray-200 focus:outline-none focus:border-yellow-500/50 transition-all cursor-pointer hover:bg-black/60"
                        >
                            {[2024, 2025, 2026].map(ano => (
                                <option key={ano} value={ano} className="bg-[#0a0a0a]">{ano}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="md:col-span-5 flex flex-col gap-2">
                    <label className="text-[10px] uppercase font-semibold text-gray-500 tracking-[0.2em] ml-1">Pesquisar</label>
                    <div className="relative group">
                        <input 
                            type="text"
                            value={buscaLocal}
                            onChange={(e) => setBuscaLocal(e.target.value)}
                            placeholder="Nome, descrição ou categoria..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-[11px] font-medium text-gray-200 focus:outline-none focus:border-yellow-500/50 transition-all placeholder:text-gray-600 hover:bg-black/60 tracking-wide"
                        />
                        <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-yellow-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                </div>

                <div className="md:col-span-2 flex flex-col gap-2">
                    <label className="text-[10px] uppercase font-semibold text-gray-500 tracking-[0.2em] ml-1">Anexos</label>
                    <button 
                        onClick={() => setIsModalExtratosOpen(true)}
                        disabled={caixaAtivo === 0 || mesAtivo === 0}
                        className="w-full bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 text-blue-400 rounded-xl px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed group/btn"
                        title={caixaAtivo === 0 ? "Selecione um caixa específico para ver os anexos" : "Ver extratos bancários do mês"}
                    >
                        <svg className="w-4 h-4 group-hover/btn:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.414a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        Extratos
                    </button>
                </div>

                <div className="md:col-span-2 flex flex-col items-end justify-end pb-0.5">
                    <div className="text-right">
                        <div className="text-[9px] uppercase font-bold text-gray-500 tracking-[0.25em] mb-1.5 opacity-60">Saldo Período</div>
                        <div className={`text-2xl font-medium tracking-tight font-sans ${saldoPeriodo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            <span className="text-xs font-normal opacity-50 mr-1">R$</span>
                            {saldoPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>


            {/* List Section */}
            <div className="bg-black/20 rounded-2xl border border-white/5 p-1 min-h-[400px]">
                <ListaTransacoes 
                    acesso={acesso}
                    caixaId={caixaAtivo} 
                    mes={mesAtivo}
                    ano={anoAtivo}
                    statusFiltro="pago"
                    busca={busca}
                    onStatusChanged={carregarResumo}
                    onEdit={onEdit}
                />
            </div>

            <ModalExtratos 
                isOpen={isModalExtratosOpen}
                onClose={() => setIsModalExtratosOpen(false)}
                lojaId={acesso.loja_id}
                caixaId={caixaAtivo}
                caixaNome={resumo?.caixas.find(c => c.id === caixaAtivo)?.nome || "Consolidado"}
                mes={mesAtivo}
                ano={anoAtivo}
            />
        </div>
    );
}

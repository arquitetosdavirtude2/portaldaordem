'use client';

import { useEffect, useState } from 'react';
import ModalNovaTransacao from './ModalNovaTransacao';
import ListaTransacoes from './ListaTransacoes';

interface Caixa {
    id: number;
    nome: string;
    saldo_atual: number;
}

interface Resumo {
    caixas: Caixa[];
    total_entrada_pendente: number;
    total_saida_pendente: number;
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
    const [statusFiltro, setStatusFiltro] = useState<string>('todos');
    const [saldoPeriodo, setSaldoPeriodo] = useState<number>(0);
    const [carregando, setCarregando] = useState(true);

    const carregarResumo = async () => {
        setCarregando(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            const res = await fetch(`${apiUrl}/api/tesouraria/resumo/${acesso.loja_id}`);
            if (res.ok) {
                setResumo(await res.json());
            }

            // Also fetch filtered period data for summary
            let url = `${apiUrl}/api/tesouraria/transacoes/${caixaAtivo}?mes=${mesAtivo}&ano=${anoAtivo}&status=${statusFiltro}`;
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
    }, [acesso.loja_id, caixaAtivo, mesAtivo, anoAtivo, statusFiltro, chaveAtualizacao]);
    
    // Remove the default selection logic since we default to 0 (consolidated)

    if (carregando) {
        return <div className="text-center py-20 text-yellow-500/50 flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
            <span className="text-[10px] uppercase font-bold tracking-[0.3em]">Atualizando Cofres...</span>
        </div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Action Bar - Highly Visible */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-yellow-500/5 p-4 rounded-xl border border-yellow-500/20 shadow-inner">
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-yellow-500 uppercase tracking-tight font-serif italic">
                        Fluxo de Caixa
                    </h2>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-sans font-medium">Controle e Lançamentos Financeiros</p>
                </div>
                <button
                    onClick={onNovoLancamento}
                    className="w-full md:w-auto px-8 py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-[0_4px_15px_rgba(234,179,8,0.3)] hover:shadow-[0_6px_20px_rgba(234,179,8,0.4)] active:scale-95 flex items-center justify-center gap-2"
                >
                    <span className="text-lg leading-none">+</span>
                    ADICIONAR NOVO LANÇAMENTO
                </button>
            </div>

            {/* Summary Cards - The "4 Cards" ONLY */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Saldo Total */}
                <div 
                    onClick={() => setCaixaAtivo(0)}
                    className={`p-6 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 relative overflow-hidden group cursor-pointer transition-all border-2 ${caixaAtivo === 0 ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)] scale-[1.02]' : 'border-yellow-500/30 hover:border-yellow-500/50'}`}
                >
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                        <span className="text-4xl text-yellow-500">🏦</span>
                    </div>
                    <div className="relative z-10">
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Saldo Consolidado</div>
                        <div className="text-2xl font-black text-white tracking-tight">
                            R$ {(resumo as any)?.saldo_geral?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                        </div>
                    </div>
                </div>

                {/* Benevolência */}
                <div 
                    onClick={() => {
                        const c = resumo?.caixas.find(x => (x as any).tipo === 'benevolencia');
                        if (c) setCaixaAtivo(c.id);
                    }}
                    className={`p-6 rounded-2xl border-2 relative overflow-hidden group cursor-pointer transition-all ${caixaAtivo === resumo?.caixas.find(x => (x as any).tipo === 'benevolencia')?.id ? 'bg-green-500/10 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] scale-[1.02]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                >
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <span className="text-4xl text-green-500">🕊️</span>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Benevolência</div>
                    <div className="text-2xl font-black text-green-400 tracking-tight">
                        R$ {(resumo as any)?.saldo_benevolencia?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </div>
                    {/* Display Bank Name inside the card */}
                    <div className="mt-2 text-[9px] text-gray-500 uppercase font-bold tracking-widest">
                        {resumo?.caixas.find(c => (c as any).tipo === 'benevolencia')?.nome || 'Recarga Pay'}
                    </div>
                </div>

                {/* Joias e Mensalidades */}
                <div 
                    onClick={() => {
                        const c = resumo?.caixas.find(x => (x as any).tipo === 'joias_mensalidade');
                        if (c) setCaixaAtivo(c.id);
                    }}
                    className={`p-6 rounded-2xl border-2 relative overflow-hidden group cursor-pointer transition-all ${caixaAtivo === resumo?.caixas.find(x => (x as any).tipo === 'joias_mensalidade')?.id ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-[1.02]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                >
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <span className="text-4xl text-blue-500">💎</span>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Joias e Mensalidades</div>
                    <div className="text-2xl font-black text-blue-400 tracking-tight">
                        R$ {(resumo as any)?.saldo_joias_mensalidade?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </div>
                    {/* Display Bank Name inside the card */}
                    <div className="mt-2 text-[9px] text-gray-500 uppercase font-bold tracking-widest">
                        {resumo?.caixas.find(c => (c as any).tipo === 'joias_mensalidade')?.nome || 'Banco Pan'}
                    </div>
                </div>

                {/* Pendências Totais (Entradas) */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <span className="text-4xl text-orange-500">⏳</span>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Recebimentos Pendentes</div>
                    <div className="text-2xl font-black text-orange-400 tracking-tight">
                        R$ {resumo?.total_entrada_pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase font-bold text-gray-500 tracking-widest ml-1">Período</label>
                    <div className="flex items-center gap-2">
                        <select 
                            value={mesAtivo}
                            onChange={(e) => setMesAtivo(Number(e.target.value))}
                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-bold text-gray-300 focus:outline-none focus:border-yellow-500/50 transition-colors uppercase"
                        >
                            {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                                <option key={m} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <select 
                            value={anoAtivo}
                            onChange={(e) => setAnoAtivo(Number(e.target.value))}
                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-bold text-gray-300 focus:outline-none focus:border-yellow-500/50 transition-colors"
                        >
                            {[2024, 2025, 2026].map(val => (
                                <option key={val} value={val}>{val}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase font-bold text-gray-500 tracking-widest ml-1">Status</label>
                    <select 
                        value={statusFiltro}
                        onChange={(e) => setStatusFiltro(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-bold text-gray-300 focus:outline-none focus:border-yellow-500/50 transition-colors uppercase"
                    >
                        <option value="todos">Todos</option>
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                    </select>
                </div>

                <div className="ml-auto flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-[9px] uppercase font-bold text-gray-500 tracking-widest">Saldo do Período</div>
                        <div className={`text-sm font-black ${saldoPeriodo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            R$ {saldoPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                    statusFiltro={statusFiltro}
                    onStatusChanged={carregarResumo}
                    onEdit={onEdit}
                />
            </div>

        </div>
    );
}

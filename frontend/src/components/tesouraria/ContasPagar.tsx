'use client';

import { useEffect, useState } from 'react';
import ModalConfirmacao from './ModalConfirmacao';

interface Transacao {
    id: number;
    caixa_id: number;
    tipo: string;
    categoria: string;
    valor: number;
    data_vencimento: string;
    descricao: string;
    status: string;
}

export default function ContasPagar({ acesso, onNovoLancamento, onEdit, chaveAtualizacao }: { acesso: any, onNovoLancamento: () => void, onEdit: (t: any) => void, chaveAtualizacao: number }) {
    const [statusAtivo, setStatusAtivo] = useState<'pendente' | 'pago'>('pendente');
    const [mesAtivo, setMesAtivo] = useState<number>(new Date().getMonth() + 1);
    const [anoAtivo, setAnoAtivo] = useState<number>(new Date().getFullYear());
    const [pendentes, setPendentes] = useState<Transacao[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [isModalConfirmacaoAberto, setIsModalConfirmacaoAberto] = useState(false);
    const [transacaoParaPagar, setTransacaoParaPagar] = useState<Transacao | null>(null);
    const [baixandoRelatorio, setBaixandoRelatorio] = useState(false);

    const carregarContasPagar = async () => {
        setCarregando(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            // Consolidated view (caixa 0) + status filter + period
            let url = `${apiUrl}/api/tesouraria/transacoes/0?loja_id=${acesso.loja_id}&status=${statusAtivo}&mes=${mesAtivo}&ano=${anoAtivo}`;
            const res = await fetch(url);
            if (res.ok) {
                const data: Transacao[] = await res.json();
                setPendentes(data.filter(t => t.tipo === 'saida'));
            }
        } catch (error) {
            console.error('Erro ao carregar contas a pagar:', error);
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        carregarContasPagar();
    }, [acesso.loja_id, chaveAtualizacao, statusAtivo, mesAtivo, anoAtivo]);

    const handleDownloadRelatorio = async () => {
        setBaixandoRelatorio(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            const res = await fetch(`${apiUrl}/api/tesouraria/relatorio/contas-pagar/${acesso.loja_id}`);
            if (res.ok) {
                const blob = await res.blob();
                const urlObj = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = urlObj;
                a.download = `contas_a_pagar_${new Date().toISOString().split('T')[0]}.csv`;
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

    const handlePagar = async (t: Transacao) => {
        setTransacaoParaPagar(t);
        setIsModalConfirmacaoAberto(true);
    };

    const confirmarPagamento = async () => {
        if (!transacaoParaPagar) return;
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            const res = await fetch(`${apiUrl}/api/tesouraria/transacoes/${transacaoParaPagar.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] })
            });
            if (res.ok) {
                carregarContasPagar();
            }
        } catch (error) {
            console.error('Erro ao confirmar pagamento:', error);
        } finally {
            setIsModalConfirmacaoAberto(false);
        }
    };

    if (carregando) {
        return <div className="text-center py-10 text-gray-500 uppercase text-[10px] tracking-widest font-medium animate-pulse">Consultando obrigações...</div>;
    }

    const totalPendente = pendentes.reduce((acc, t) => acc + t.valor, 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <h2 className={`text-lg font-medium uppercase tracking-widest font-sans ${statusAtivo === 'pendente' ? 'text-red-400' : 'text-green-400'}`}>
                            {statusAtivo === 'pendente' ? 'Compromissos Pendentes' : 'Histórico de Pagamentos'}
                        </h2>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-relaxed">
                            {statusAtivo === 'pendente' ? 'Despesas lançadas mas ainda não debitadas do caixa.' : 'Registros de despesas já liquidadas.'}
                        </p>
                    </div>

                    {/* Toggle Status & Month Filter */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-9 bg-white/5 p-1 rounded-lg border border-white/10 w-fit">
                            <button 
                                onClick={() => setStatusAtivo('pendente')}
                                className={`px-4 h-full rounded-md text-[9px] font-medium uppercase tracking-widest font-sans transition-all ${statusAtivo === 'pendente' ? 'bg-red-500/20 text-red-400 shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Pendentes
                            </button>
                            <button 
                                onClick={() => setStatusAtivo('pago')}
                                className={`px-4 h-full rounded-md text-[9px] font-medium uppercase tracking-widest font-sans transition-all ${statusAtivo === 'pago' ? 'bg-green-500/20 text-green-400 shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Pagos (Histórico)
                            </button>
                        </div>

                        <div className="flex items-center h-9 gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
                            <select 
                                value={mesAtivo}
                                onChange={(e) => setMesAtivo(Number(e.target.value))}
                                className="bg-transparent h-full text-[10px] font-medium uppercase text-gray-300 outline-none px-2 cursor-pointer"
                            >
                                {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                                    <option key={m} value={i + 1} className="bg-[#0a1536]">{m}</option>
                                ))}
                            </select>
                            <select 
                                value={anoAtivo}
                                onChange={(e) => setAnoAtivo(Number(e.target.value))}
                                className="bg-transparent h-full text-[10px] font-medium uppercase text-gray-300 outline-none px-2 cursor-pointer border-l border-white/10"
                            >
                                {[2024, 2025, 2026].map(a => (
                                    <option key={a} value={a} className="bg-[#0a1536]">{a}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className="text-[9px] font-medium text-gray-500 uppercase tracking-widest mb-1">
                            {statusAtivo === 'pendente' ? 'Total a Regularizar' : 'Total Pago no Período'}
                        </div>
                        <div className={`text-xl font-medium tracking-wider font-sans tabular-nums ${statusAtivo === 'pendente' ? 'text-red-500' : 'text-green-500'}`}>
                            R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={handleDownloadRelatorio}
                            disabled={baixandoRelatorio}
                            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all"
                        >
                            {baixandoRelatorio ? '...' : '📄 Relatório'}
                        </button>
                        <button 
                            onClick={onNovoLancamento}
                            className="px-6 py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/30 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(239,68,68,0.05)]"
                        >
                            + Lançar Compromisso
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/5 uppercase tracking-widest text-gray-500 font-sans font-medium text-[9px]">
                            <th className="px-5 py-3 w-[110px]">Vencimento</th>
                            <th className="px-5 py-3">Descrição</th>
                            <th className="px-5 py-3 text-right w-[130px]">Valor</th>
                            <th className="px-5 py-3 text-right pr-8 w-[160px]">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {pendentes.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-5 py-20 text-center text-gray-600 text-[11px] italic uppercase tracking-widest">
                                    Sem compromissos pendentes.
                                </td>
                            </tr>
                        ) : (
                            pendentes.map(t => (
                                <tr key={t.id} className="hover:bg-red-500/[0.02] transition-colors group">
                                    <td className="px-5 py-3 w-[110px]">
                                        <div className="text-[10px] font-medium font-sans tabular-nums tracking-widest text-gray-400">
                                            {t.data_vencimento.split('-').reverse().join('/')}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex flex-wrap items-center gap-2 max-w-xl">
                                            <div className="text-[11px] font-medium font-sans tracking-widest text-gray-300 group-hover:text-red-400/80 transition-colors uppercase leading-relaxed">
                                                {t.descricao}
                                            </div>
                                            {statusAtivo === 'pendente' && (
                                                (() => {
                                                    const v = t.data_vencimento.split('-');
                                                    const vAno = parseInt(v[0]);
                                                    const vMes = parseInt(v[1]);
                                                    if (vAno < anoAtivo || (vAno === anoAtivo && vMes < mesAtivo)) {
                                                        return (
                                                            <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400/80 text-[7px] font-medium rounded border border-orange-500/20 uppercase tracking-widerer">
                                                                Atrasado
                                                            </span>
                                                        );
                                                    }
                                                    return null;
                                                })()
                                            )}
                                        </div>
                                        <div className="text-[8px] text-gray-600 font-medium uppercase tracking-widest mt-0.5">
                                            {t.categoria.replace('_', ' ')}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-right font-sans tabular-nums tracking-widest w-[130px]">
                                        <div className={`text-[12px] font-medium font-sans tabular-nums tracking-widest ${statusAtivo === 'pendente' ? 'text-red-400/80' : 'text-green-400/80'}`}>
                                            R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-right pr-5 w-[160px]">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {statusAtivo === 'pendente' ? (
                                                <>
                                                    <button 
                                                        onClick={() => onEdit(t)}
                                                        className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-500 border border-white/5 rounded transition-all"
                                                        title="Editar"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => handlePagar(t)}
                                                        className="px-3 py-1.5 bg-red-900/10 hover:bg-red-900/20 text-red-500/80 border border-red-500/10 rounded text-[8px] font-medium uppercase tracking-widest transition-all"
                                                    >
                                                        PAGAR
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="px-2 py-0.5 bg-green-500/5 text-green-500/60 text-[7px] font-medium border border-green-500/10 rounded uppercase tracking-widest">
                                                    Liquidado
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalConfirmacaoAberto && (
                <ModalConfirmacao 
                    isOpen={isModalConfirmacaoAberto}
                    titulo="Confirmar Pagamento"
                    mensagem={`Deseja confirmar a baixa do pagamento de "${transacaoParaPagar?.descricao}" no valor de R$ ${transacaoParaPagar?.valor.toLocaleString('pt-BR')}?`}
                    onConfirm={confirmarPagamento}
                    onClose={() => setIsModalConfirmacaoAberto(false)}
                    confirmText="Dar Baixa"
                    corBotao="red"
                />
            )}
        </div>
    );
}

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
    const [pendentes, setPendentes] = useState<Transacao[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [isModalConfirmacaoAberto, setIsModalConfirmacaoAberto] = useState(false);
    const [transacaoParaPagar, setTransacaoParaPagar] = useState<Transacao | null>(null);

    const carregarContasPagar = async () => {
        setCarregando(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            // Consolidated view (caixa 0) + status=pendente
            const res = await fetch(`${apiUrl}/api/tesouraria/transacoes/0?status=pendente`);
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
    }, [acesso.loja_id, chaveAtualizacao]);

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
        return <div className="text-center py-10 text-gray-500 uppercase text-[10px] tracking-widest font-bold animate-pulse">Consultando obrigações...</div>;
    }

    const totalPendente = pendentes.reduce((acc, t) => acc + t.valor, 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-bold text-red-400 uppercase tracking-tight">Compromissos Pendentes</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-relaxed">
                        Despesas lançadas mas ainda não debitadas do caixa.
                    </p>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Total a Regularizar</div>
                        <div className="text-2xl font-black text-red-500 tracking-tighter">
                            R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    
                    <button 
                        onClick={onNovoLancamento}
                        className="px-6 py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(239,68,68,0.05)]"
                    >
                        + Lançar Compromisso
                    </button>
                </div>
            </div>

            <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5 uppercase tracking-widest text-gray-400 font-sans font-bold text-[9px]">
                            <th className="px-5 py-4">Vencimento</th>
                            <th className="px-5 py-4">Descrição</th>
                            <th className="px-5 py-4 text-center">Valor</th>
                            <th className="px-5 py-4 text-right pr-8">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {pendentes.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-5 py-20 text-center text-gray-600 text-[11px] italic uppercase tracking-wider">
                                    Sem compromissos pendentes.
                                </td>
                            </tr>
                        ) : (
                            pendentes.map(t => (
                                <tr key={t.id} className="hover:bg-red-500/5 transition-colors group">
                                    <td className="px-5 py-4">
                                        <div className="text-[12px] font-bold text-gray-300">
                                            {t.data_vencimento.split('-').reverse().join('/')}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="text-[12px] font-bold text-gray-100 group-hover:text-red-400 transition-colors uppercase">
                                            {t.descricao}
                                        </div>
                                        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                                            {t.categoria}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-center font-sans tracking-tight">
                                        <div className="text-[14px] font-black text-red-400">
                                            R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-right pr-5">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => onEdit(t)}
                                                className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 rounded-lg text-[10px] transition-all"
                                                title="Editar conta (útil para valores variáveis)"
                                            >
                                                ✏️
                                            </button>
                                            <button 
                                                onClick={() => handlePagar(t)}
                                                className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                            >
                                                EFETUAR PAGAMENTO
                                            </button>
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
                    tipo="danger"
                    confirmText="Dar Baixa"
                />
            )}
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import ModalConfirmacao from './ModalConfirmacao';

interface Transacao {
    id: number;
    caixa_id: number;
    pessoa_nome?: string;
    tipo: 'entrada' | 'saida';
    categoria: string;
    valor: number;
    data_vencimento: string;
    data_pagamento?: string;
    descricao: string;
    notas?: string;
    anexo_url?: string;
    status: 'pago' | 'pendente' | 'atrasado';
}

export default function ListaTransacoes({ 
    acesso,
    caixaId, 
    mes, 
    ano, 
    statusFiltro, 
    onStatusChanged,
    onEdit
}: { 
    acesso: any,
    caixaId: number, 
    mes?: number, 
    ano?: number, 
    statusFiltro?: string, 
    onStatusChanged: () => void,
    onEdit: (t: Transacao) => void
}) {
    const [transacoes, setTransacoes] = useState<Transacao[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [itemParaExcluir, setItemParaExcluir] = useState<number | null>(null);

    const carregarTransacoes = async () => {
        setCarregando(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            let url = `${apiUrl}/api/tesouraria/transacoes/${caixaId}?`;
            if (mes) url += `mes=${mes}&`;
            if (ano) url += `ano=${ano}&`;
            if (statusFiltro) url += `status=${statusFiltro}&`;

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setTransacoes(data);
            }
        } catch (error) {
            console.error('Erro ao carregar transações:', error);
        } finally {
            setCarregando(false);
        }
    };

    const handleMarcarComoPago = async (id: number) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            const res = await fetch(`${apiUrl}/api/tesouraria/transacoes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'pago' })
            });
            if (res.ok) {
                carregarTransacoes();
                onStatusChanged();
            }
        } catch (error) {
            console.error('Erro ao atualizar transação:', error);
        }
    };

    const handleDelete = (id: number) => {
        setItemParaExcluir(id);
    };

    const confirmDelete = async () => {
        if (!itemParaExcluir) return;
        
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            const res = await fetch(`${apiUrl}/api/tesouraria/transacoes/${itemParaExcluir}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                carregarTransacoes();
                onStatusChanged();
            }
        } catch (error) {
            console.error('Erro ao excluir transação:', error);
        } finally {
            setItemParaExcluir(null);
        }
    };

    useEffect(() => {
        carregarTransacoes();
    }, [caixaId, mes, ano, statusFiltro]);

    if (carregando) {
        return <div className="text-center py-10 text-gray-400 text-[10px] uppercase tracking-widest font-bold font-sans">Atualizando histórico...</div>;
    }

    if (transacoes.length === 0) {
        return (
            <div className="text-center py-20 bg-white/5 rounded-xl border border-dashed border-white/10">
                <p className="text-gray-500 font-serif italic text-sm">Nenhum lançamento encontrado para este caixa.</p>
            </div>
        );
    }

    const podeEditar = acesso.role === 'admin' || acesso.role === 'loja' || acesso.role === 'tesoureiro';

    return (
        <>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm">
            <table className="w-full text-left border-collapse font-sans">
                <thead>
                    <tr className="border-b border-white/10 bg-white/5 uppercase tracking-widest text-gray-400 font-bold">
                        <th className="px-5 py-4 text-[9px]">Data</th>
                        <th className="px-5 py-4 text-[9px]">Descrição</th>
                        <th className="px-5 py-4 text-[9px]">Categoria</th>
                        <th className="px-5 py-4 text-[9px]">Valor</th>
                        <th className="px-5 py-4 text-[9px]">Status</th>
                        {podeEditar && <th className="px-5 py-4 text-[9px] text-right">Ações</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {transacoes.map(t => (
                        <tr key={t.id} className="hover:bg-white/[0.03] transition-colors group">
                            <td className="px-5 py-4 text-[11px] text-gray-300">
                                {t.data_vencimento.split('-').reverse().join('/')}
                            </td>
                            <td className="px-5 py-4">
                                <div className="text-[11px] font-bold text-gray-200">{t.descricao}</div>
                                {t.pessoa_nome && (
                                    <div className="text-[9px] text-yellow-500 uppercase tracking-tighter mt-0.5">Irmão: {t.pessoa_nome}</div>
                                )}
                            </td>
                            <td className="px-5 py-4 text-[10px] uppercase tracking-wider text-gray-500 font-bold italic">
                                {t.categoria}
                            </td>
                            <td className={`px-5 py-4 text-xs font-bold ${t.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
                                {t.tipo === 'entrada' ? '+' : '-'} R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-5 py-4">
                                <div className={`flex flex-col gap-1 ${
                                    t.status === 'pago' ? 'text-green-400' : 
                                    t.status === 'pendente' ? 'text-yellow-500' : 'text-red-400'
                                }`}>
                                    <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/5 w-fit">
                                        {t.status}
                                    </span>
                                    {t.anexo_url && (
                                        <a 
                                            href={`${process.env.NEXT_PUBLIC_API_URL || ""}${t.anexo_url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[9px] text-blue-400 hover:text-blue-300 underline underline-offset-2 font-bold uppercase tracking-tighter w-fit"
                                        >
                                            Ver Recibo
                                        </a>
                                    )}
                                </div>
                            </td>
                            {podeEditar && (
                                <td className="px-5 py-4 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                        {t.status === 'pendente' && (
                                            <button 
                                                onClick={() => handleMarcarComoPago(t.id)}
                                                className="text-[9px] font-bold uppercase tracking-widest text-yellow-500 hover:text-yellow-400"
                                            >
                                                Pagar
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => onEdit(t)}
                                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-blue-400 transition-colors"
                                            title="Editar"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(t.id)}
                                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                            title="Excluir"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Modal de Confirmação de Exclusão Premium - Agora fora do container de overflow */}
        <ModalConfirmacao 
            isOpen={itemParaExcluir !== null}
            onClose={() => setItemParaExcluir(null)}
            onConfirm={confirmDelete}
            titulo="Excluir Lançamento"
            mensagem="Tem certeza que deseja excluir este lançamento? Esta operação é irreversível e o saldo bancário do caixa será ajustado automaticamente."
            confirmText="Sim, Excluir Agora"
            cancelText="Manter Lançamento"
        />
    </>
);
}

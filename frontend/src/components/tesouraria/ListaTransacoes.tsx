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
    mes_referencia?: string;
    descricao: string;
    notas?: string;
    anexo_url?: string;
    status: 'pago' | 'pendente' | 'atrasado';
    recorrencia?: string;
    grupo_recorrencia?: string;
}

type SortKey = 'mes_referencia' | 'data_vencimento' | 'data_pagamento' | 'descricao' | 'categoria' | 'valor' | 'status';
type SortDir = 'asc' | 'desc';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
    if (!active) return <span className="ml-1 opacity-30">↕</span>;
    return <span className="ml-1 text-yellow-400">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function ListaTransacoes({ 
    acesso,
    caixaId, 
    mes, 
    ano, 
    statusFiltro, 
    busca = '',
    onStatusChanged,
    onEdit
}: { 
    acesso: any,
    caixaId: number, 
    mes?: number, 
    ano?: number, 
    statusFiltro?: string, 
    busca?: string,
    onStatusChanged: () => void,
    onEdit: (t: Transacao) => void
}) {
    const [transacoes, setTransacoes] = useState<Transacao[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [itemParaExcluir, setItemParaExcluir] = useState<number | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('data_vencimento');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const carregarTransacoes = async () => {
        setCarregando(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            let url = `${apiUrl}/api/tesouraria/transacoes/${caixaId}?loja_id=${acesso.loja_id}&`;
            if (mes && mes !== 0) url += `mes=${mes}&`;
            if (ano && mes !== 0) url += `ano=${ano}&`;
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

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir(key === 'data_vencimento' ? 'desc' : 'asc');
        }
    };

    const transacoesFiltradas = transacoes.filter(t => {
        if (!busca) return true;
        const s = busca.toLowerCase();
        return (
            (t.descricao || '').toLowerCase().includes(s) ||
            (t.categoria || '').toLowerCase().includes(s) ||
            (t.pessoa_nome || '').toLowerCase().includes(s)
        );
    });

    const transacoesOrdenadas = [...transacoesFiltradas].sort((a, b) => {
        let aVal: any = a[sortKey];
        let bVal: any = b[sortKey];

        if (sortKey === 'data_vencimento') {
            aVal = aVal || '';
            bVal = bVal || '';
            return sortDir === 'asc' 
                ? aVal.localeCompare(bVal) 
                : bVal.localeCompare(aVal);
        }

        if (sortKey === 'valor') {
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // String comparisons
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
        return sortDir === 'asc' 
            ? aVal.localeCompare(bVal) 
            : bVal.localeCompare(aVal);
    });

    useEffect(() => {
        carregarTransacoes();
    }, [caixaId, mes, ano, statusFiltro, busca]);

    if (carregando) {
        return <div className="text-center py-10 text-gray-400 text-[10px] uppercase tracking-widest font-medium font-sans">Atualizando histórico...</div>;
    }

    if (transacoes.length === 0) {
        return (
            <div className="text-center py-20 bg-white/5 rounded-xl border border-dashed border-white/10">
                <p className="text-gray-500 font-sans text-xs uppercase tracking-widest font-medium">Nenhum lançamento encontrado para este caixa.</p>
            </div>
        );
    }

    const podeEditar = acesso.role === 'admin' || acesso.role === 'loja' || acesso.role === 'tesoureiro';

    const thClass = "px-5 py-4 text-[9px] cursor-pointer select-none hover:text-yellow-400 transition-colors whitespace-nowrap";

    return (
        <>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm">
            <table className="w-full text-left border-collapse font-sans">
                <thead>
                    <tr className="border-b border-white/10 bg-white/5 uppercase tracking-widest text-gray-400 font-medium">
                        <th className={thClass} onClick={() => handleSort('mes_referencia')}>
                            Ref. <SortIcon active={sortKey === 'mes_referencia'} dir={sortDir} />
                        </th>
                        <th className={thClass} onClick={() => handleSort('data_vencimento')}>
                            Venc. <SortIcon active={sortKey === 'data_vencimento'} dir={sortDir} />
                        </th>
                        <th className={thClass} onClick={() => handleSort('data_pagamento')}>
                            Lanç. <SortIcon active={sortKey === 'data_pagamento'} dir={sortDir} />
                        </th>
                        <th className={thClass} onClick={() => handleSort('descricao')}>
                            Descrição <SortIcon active={sortKey === 'descricao'} dir={sortDir} />
                        </th>
                        <th className={thClass} onClick={() => handleSort('categoria')}>
                            Categoria <SortIcon active={sortKey === 'categoria'} dir={sortDir} />
                        </th>
                        <th className={thClass} onClick={() => handleSort('valor')}>
                            Valor <SortIcon active={sortKey === 'valor'} dir={sortDir} />
                        </th>
                        {podeEditar && <th className="px-5 py-4 text-[9px] text-right uppercase tracking-widest">Ações</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {transacoesOrdenadas.map(t => (
                        <tr key={t.id} className="hover:bg-white/[0.03] transition-colors group">
                            <td className="px-5 py-4 text-[10px] text-gray-500 font-sans tabular-nums tracking-widest whitespace-nowrap">
                                {t.mes_referencia ? t.mes_referencia.split('-').reverse().join('/') : (t.data_vencimento.substring(0, 7).split('-').reverse().join('/'))}
                            </td>
                            <td className="px-5 py-4 text-[10px] text-gray-400 font-sans tabular-nums tracking-widest whitespace-nowrap">
                                {t.data_vencimento ? t.data_vencimento.split('-').reverse().join('/') : '-'}
                            </td>
                            <td className="px-5 py-4 text-[11px] text-gray-300 whitespace-nowrap font-medium font-sans tabular-nums tracking-widest">
                                {t.data_pagamento ? t.data_pagamento.split('-').reverse().join('/') : (t.status === 'pago' ? t.data_vencimento.split('-').reverse().join('/') : '---')}
                            </td>
                            <td className="px-5 py-4">
                                <div className="text-[11px] font-medium font-sans tracking-widest text-gray-200">{t.descricao}</div>
                                {t.pessoa_nome && (
                                    <div className="text-[9px] text-yellow-500 uppercase tracking-wider font-sans mt-0.5">Irmão: {t.pessoa_nome}</div>
                                )}
                                {(t.recorrencia && t.recorrencia !== 'nenhuma') && (
                                    <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-blue-500/20 bg-blue-500/10 text-[8px] uppercase tracking-wider text-blue-400">
                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Conta Recorrente (Estorna se excluída)
                                    </div>
                                )}
                            </td>
                            <td className="px-5 py-4 text-[10px] uppercase tracking-widest text-gray-500 font-medium font-sans">
                                {t.categoria}
                            </td>
                            <td className={`px-5 py-4 text-xs font-medium tabular-nums whitespace-nowrap ${t.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
                                {t.tipo === 'entrada' ? '+' : '-'} R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            {podeEditar && (
                                <td className="px-5 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {t.anexo_url && (
                                            <a 
                                                href={`${process.env.NEXT_PUBLIC_API_URL || ""}${t.anexo_url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 hover:bg-white/10 rounded-lg text-blue-400 transition-colors"
                                                title="Ver Comprovante"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.414a6 6 0 108.486 8.486L20.5 13" />
                                                </svg>
                                            </a>
                                        )}
                                        <button 
                                            onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/tesouraria/relatorio/individual/${t.id}`, '_blank')}
                                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-green-400 transition-colors"
                                            title="Gerar Relatório / Recibo"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </button>
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

        <ModalConfirmacao 
            isOpen={itemParaExcluir !== null}
            onClose={() => setItemParaExcluir(null)}
            onConfirm={confirmDelete}
            titulo={transacoes.find(t => t.id === itemParaExcluir)?.status === 'pago' ? "Estornar Lançamento" : "Excluir Lançamento"}
            mensagem={
                (() => {
                    const t = transacoes.find(x => x.id === itemParaExcluir);
                    if (!t) return "";
                    if (t.status === 'pago') {
                        const destino = t.tipo === 'entrada' ? 'Contas a Receber' : 'Contas a Pagar';
                        return `Este lançamento já está liquidado no sistema. Ao confirmar, ele NÃO será apagado permanentemente, mas sim ESTORNADO e retornará para a sua lista de ${destino} como pendente. O saldo bancário do caixa será ajustado automaticamente.`;
                    }
                    return "Tem certeza que deseja excluir este lançamento? Esta operação é irreversível e o saldo bancário do caixa será ajustado automaticamente.";
                })()
            }
            confirmText={
                transacoes.find(t => t.id === itemParaExcluir)?.status === 'pago'
                    ? "Sim, Estornar Agora"
                    : "Sim, Excluir Agora"
            }
            cancelText="Manter Lançamento"
        />
    </>
);
}

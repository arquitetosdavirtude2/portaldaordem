'use client';

import { useEffect, useState } from 'react';

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

export default function ListaTransacoes({ caixaId, onStatusChanged }: { caixaId: number, onStatusChanged: () => void }) {
    const [transacoes, setTransacoes] = useState<Transacao[]>([]);
    const [carregando, setCarregando] = useState(true);

    const carregarTransacoes = async () => {
        setCarregando(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            const res = await fetch(`${apiUrl}/api/tesouraria/transacoes/${caixaId}`);
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

    useEffect(() => {
        carregarTransacoes();
    }, [caixaId]);

    if (carregando) {
        return <div className="text-center py-10 text-gray-400 text-[10px] uppercase tracking-widest font-bold">Atualizando histórico...</div>;
    }

    if (transacoes.length === 0) {
        return (
            <div className="text-center py-20 bg-white/5 rounded-xl border border-dashed border-white/10">
                <p className="text-gray-500 font-serif italic">Nenhum lançamento encontrado para este caixa.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-white/10 bg-white/5 uppercase tracking-widest text-gray-400 font-sans font-bold">
                        <th className="px-5 py-4 text-[9px]">Data Venc.</th>
                        <th className="px-5 py-4 text-[9px]">Descrição</th>
                        <th className="px-5 py-4 text-[9px]">Categoria</th>
                        <th className="px-5 py-4 text-[9px]">Valor</th>
                        <th className="px-5 py-4 text-[9px]">Status</th>
                        <th className="px-5 py-4 text-[9px] text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {transacoes.map(t => (
                        <tr key={t.id} className="hover:bg-white/[0.03] transition-colors">
                            <td className="px-5 py-4 font-sans text-[11px] text-gray-300">
                                {new Date(t.data_vencimento).toLocaleDateString('pt-BR')}
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
                            <td className={`px-5 py-4 font-sans text-xs font-bold ${t.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
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
                            <td className="px-5 py-4 text-right">
                                {t.status === 'pendente' && (
                                    <button 
                                        onClick={() => handleMarcarComoPago(t.id)}
                                        className="text-[9px] font-bold uppercase tracking-widest text-yellow-500 hover:text-yellow-400 transition-colors"
                                    >
                                        Marcar Pago
                                    </button>
                                )}
                                {t.status === 'pago' && (
                                    <span className="text-[10px] text-gray-600">Concluído</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

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

export default function DashboardFinanceiro({ acesso, onNovoLancamento, chaveAtualizacao }: { acesso: any, onNovoLancamento: () => void, chaveAtualizacao?: any }) {
    const [resumo, setResumo] = useState<Resumo | null>(null);
    const [caixaAtivo, setCaixaAtivo] = useState<number | null>(null);
    const [carregando, setCarregando] = useState(true);

    const carregarResumo = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            const res = await fetch(`${apiUrl}/api/tesouraria/resumo/${acesso.loja_id}`);
            if (res.ok) {
                const data = await res.json();
                setResumo(data);
                if (data.caixas.length > 0 && !caixaAtivo) {
                    setCaixaAtivo(data.caixas[0].id);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar resumo financeiro:', error);
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        carregarResumo();
    }, [acesso.loja_id, chaveAtualizacao]);

    if (carregando) {
        return <div className="text-center py-10 text-gray-500">Carregando dados financeiros...</div>;
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

            {/* Summary Cards - The "4 Cards" */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Caixa Geral */}
                {resumo?.caixas.map(caixa => (
                    <div 
                        key={caixa.id}
                        onClick={() => setCaixaAtivo(caixa.id)}
                        className={`group relative p-6 rounded-2xl border transition-all duration-500 overflow-hidden ${caixaAtivo === caixa.id ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border-yellow-500/50 shadow-[0_0_25px_rgba(234,179,8,0.15)] ring-1 ring-yellow-500/30' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                            <span className="text-4xl">💰</span>
                        </div>
                        <div className="relative z-10">
                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">{caixa.nome}</div>
                            <div className={`text-2xl font-black ${caixa.saldo_atual >= 0 ? 'text-white' : 'text-red-400'} tracking-tight`}>
                                R$ {caixa.saldo_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Always show at least these if they exist */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <span className="text-4xl text-green-500">📥</span>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Entradas Pendentes</div>
                    <div className="text-2xl font-black text-green-400 tracking-tight">
                        R$ {resumo?.total_entrada_pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </div>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <span className="text-4xl text-red-500">📤</span>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Saídas Pendentes</div>
                    <div className="text-2xl font-black text-red-500 tracking-tight">
                        R$ {resumo?.total_saida_pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="bg-black/20 rounded-2xl border border-white/5 p-1">
                {caixaAtivo && (
                    <ListaTransacoes 
                        caixaId={caixaAtivo} 
                        chaveAtualizacao={resumo?.total_entrada_pendente} // More reliable trigger
                        onStatusChanged={carregarResumo}
                    />
                )}
            </div>

        </div>
    );
}

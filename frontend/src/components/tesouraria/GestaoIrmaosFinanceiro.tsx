'use client';

import { useEffect, useState } from 'react';

interface IrmaoFinanceiro {
    id: number;
    nome: string;
    joia_paga: number;
    joia_pendente: number;
    mensalidade_paga: number;
    mensalidade_pendente: number;
}

export default function GestaoIrmaosFinanceiro({ acesso }: { acesso: any }) {
    const [irmaos, setIrmaos] = useState<IrmaoFinanceiro[]>([]);
    const [mesAtivo, setMesAtivo] = useState<number>(new Date().getMonth() + 1);
    const [anoAtivo, setAnoAtivo] = useState<number>(new Date().getFullYear());
    const [carregando, setCarregando] = useState(true);

    const carregarFinanceiroIrmaos = async () => {
        setCarregando(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            let url = `${apiUrl}/api/tesouraria/irmaos/${acesso.loja_id}?ano=${anoAtivo}&mes=${mesAtivo}`;
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
    }, [acesso.loja_id, mesAtivo, anoAtivo]);

    if (carregando) {
        return <div className="text-center py-10 text-gray-400">Cruzando dados dos irmãos...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-bold text-yellow-500 uppercase tracking-tight">Situação Financeira por Obreiro</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-relaxed">
                        Extrato de Joias e Mensalidades do período selecionado.
                    </p>
                </div>

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

            <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 backdrop-blur-md">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5 uppercase tracking-widest text-gray-400 font-sans font-bold text-[9px]">
                            <th className="px-5 py-4">Obreiro</th>
                            <th className="px-5 py-4 text-center">Joia (Paga / Pendente)</th>
                            <th className="px-5 py-4 text-center">Mensalidade (Paga / Pendente)</th>
                            <th className="px-5 py-4 text-right">Saúde Financeira</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {irmaos.map(irmao => (
                            <tr key={irmao.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-5 py-4">
                                    <div className="text-[12px] font-bold text-gray-100 group-hover:text-yellow-500 transition-colors">
                                        {irmao.nome}
                                    </div>
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
                                    <span className={irmao.mensalidade_pendente > 0 ? 'text-red-400 font-bold' : 'text-gray-500 italic'}>
                                        R$ {irmao.mensalidade_pendente.toFixed(0)}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                    {(irmao.joia_pendente + irmao.mensalidade_pendente) === 0 ? (
                                        <div className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                                            Regular
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20">
                                            R$ {(irmao.joia_pendente + irmao.mensalidade_pendente).toLocaleString('pt-BR')} Pendente
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

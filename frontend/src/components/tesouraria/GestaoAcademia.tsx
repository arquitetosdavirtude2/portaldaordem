'use client';

import { useState, useEffect } from 'react';

interface IndicadorComissao {
    indicador_id: number;
    nome: string;
    telefone: string;
    pix: string;
    banco_info: string;
    quantidade_indicados: number;
    total_joia_paga: number;
    total_comissao: number;
    indicados: {
        id: number;
        nome: string;
        joia_paga: number;
        comissao_gerada: number;
    }[];
}

export default function GestaoAcademia({ acesso }: { acesso: any }) {
    const [indicadores, setIndicadores] = useState<IndicadorComissao[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [exibirForm, setExibirForm] = useState(false);
    const [selecionado, setSelecionado] = useState<IndicadorComissao | null>(null);

    // Form fields
    const [nome, setNome] = useState('');
    const [telefone, setTelefone] = useState('');
    const [pix, setPix] = useState('');
    const [bancoInfo, setBancoInfo] = useState('');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

    const carregarDados = async () => {
        setCarregando(true);
        try {
            const res = await fetch(`${apiUrl}/api/academia/comissoes/${acesso.loja_id}`);
            if (res.ok) {
                setIndicadores(await res.json());
            }
        } catch (error) {
            console.error('Erro ao carregar academia:', error);
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, [acesso.loja_id]);

    const handleCriarIndicador = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${apiUrl}/api/academia/indicadores`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome,
                    telefone,
                    pix,
                    banco_info: bancoInfo,
                    loja_id: acesso.loja_id
                })
            });
            if (res.ok) {
                setNome(''); setTelefone(''); setPix(''); setBancoInfo('');
                setExibirForm(false);
                carregarDados();
            }
        } catch (error) {
            console.error('Erro ao criar indicador:', error);
        }
    };

    if (carregando) return <div className="py-10 text-center text-[10px] uppercase text-gray-500 animate-pulse">Carregando dados da Academia...</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center">
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-bold text-yellow-500 uppercase tracking-tight">Gestão de Academia</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-relaxed">
                        Indicadores recebem 50% do valor da Joia pago pelos irmãos indicados.
                    </p>
                </div>
                <button 
                    onClick={() => setExibirForm(!exibirForm)}
                    className="px-4 py-2 bg-yellow-500 text-black rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/10"
                >
                    {exibirForm ? '✕ Cancelar' : '+ Novo Indicador'}
                </button>
            </div>

            {exibirForm && (
                <form onSubmit={handleCriarIndicador} className="bg-white/5 border border-white/10 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                        <input type="text" value={nome} onChange={e => setNome(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-yellow-500/50 outline-none" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">WhatsApp</label>
                        <input type="text" value={telefone} onChange={e => setTelefone(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-yellow-500/50 outline-none" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Chave PIX</label>
                        <input type="text" value={pix} onChange={e => setPix(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-yellow-500/50 outline-none" />
                    </div>
                    <div className="flex items-end">
                        <button type="submit" className="w-full py-2 bg-yellow-500/20 border border-yellow-500/40 text-yellow-500 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-500/30 transition-all">
                            Cadastrar Indicador
                        </button>
                    </div>
                    <div className="md:col-span-4">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Outros Dados Bancários (Opcional)</label>
                        <textarea value={bancoInfo} onChange={e => setBancoInfo(e.target.value)} rows={2} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-yellow-500/50 outline-none resize-none"></textarea>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lista de Indicadores */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-black/20 border border-white/10 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/5 text-[9px] text-gray-400 uppercase font-bold tracking-widest border-b border-white/10">
                                    <th className="px-5 py-4">Indicador</th>
                                    <th className="px-5 py-4 text-center">Indicados</th>
                                    <th className="px-5 py-4 text-right">Crédito Acumulado</th>
                                    <th className="px-5 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {indicadores.map(ind => (
                                    <tr key={ind.indicador_id} className={`hover:bg-white/[0.02] transition-colors ${selecionado?.indicador_id === ind.indicador_id ? 'bg-yellow-500/5' : ''}`}>
                                        <td className="px-5 py-4">
                                            <div className="text-xs font-bold text-gray-100">{ind.nome}</div>
                                            <div className="text-[9px] text-gray-500">{ind.telefone || 'Sem telefone'}</div>
                                        </td>
                                        <td className="px-5 py-4 text-center text-xs font-mono text-gray-300">
                                            {ind.quantidade_indicados}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="text-xs font-bold text-green-400">R$ {ind.total_comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                            <div className="text-[9px] text-gray-500 uppercase">Sobre R$ {ind.total_joia_paga.toLocaleString('pt-BR')} pagos</div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button 
                                                onClick={() => setSelecionado(ind)}
                                                className="text-[9px] font-bold uppercase text-yellow-500 border border-yellow-500/30 px-2 py-1 rounded hover:bg-yellow-500/10 transition-all"
                                            >
                                                Detalhes
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {indicadores.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-10 text-center text-gray-500 text-xs italic">Nenhum indicador cadastrado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detalhes do Selecionado */}
                <div className="space-y-4">
                    {selecionado ? (
                        <div className="bg-[#0f1d45] border border-yellow-500/20 rounded-2xl p-6 space-y-6 animate-in slide-in-from-right-4">
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-tighter">{selecionado.nome}</h3>
                                <p className="text-[10px] text-gray-400 font-mono">{selecionado.pix || 'Sem PIX cadastrado'}</p>
                            </div>

                            <div className="space-y-3">
                                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/10 pb-1">Irmãos Indicados</div>
                                {selecionado.indicados.map(p => (
                                    <div key={p.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-gray-200">{p.nome}</span>
                                            <span className="text-[9px] text-gray-500">Joia Paga: R$ {p.joia_paga.toFixed(0)}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-bold text-green-400">R$ {p.comissao_gerada.toFixed(2)}</span>
                                            <div className="text-[8px] text-gray-500 uppercase font-black tracking-tighter">COMISSÃO</div>
                                        </div>
                                    </div>
                                ))}
                                {selecionado.indicados.length === 0 && (
                                    <p className="text-[10px] text-gray-600 italic">Nenhuma indicação vinculada ainda.</p>
                                )}
                            </div>

                            {selecionado.banco_info && (
                                <div className="p-3 bg-black/40 rounded-lg border border-white/5">
                                    <div className="text-[8px] font-bold text-gray-500 uppercase mb-1">Dados Bancários</div>
                                    <p className="text-[10px] text-gray-300 whitespace-pre-wrap">{selecionado.banco_info}</p>
                                </div>
                            )}

                            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Crédito Total</span>
                                <span className="text-lg font-bold text-yellow-500">R$ {selecionado.total_comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full bg-black/20 border border-white/5 rounded-2xl flex flex-col items-center justify-center p-10 text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Selecione um indicador para ver detalhes e indicações.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

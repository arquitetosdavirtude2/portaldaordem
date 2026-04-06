'use client';

import { useEffect, useState } from 'react';

interface Caixa {
    id: number;
    nome: string;
}

export default function ModalCompromisso({ acesso, caixas, onClose, onSuccess, transacaoInicial }: {
    acesso: any,
    caixas: Caixa[],
    onClose: () => void,
    onSuccess: () => void,
    transacaoInicial?: any
}) {
    const isEdit = !!transacaoInicial;
    const [enviando, setEnviando] = useState(false);
    
    const [form, setForm] = useState({
        caixa_id: transacaoInicial?.caixa_id || caixas[0]?.id || 1,
        categoria: transacaoInicial?.categoria || 'utilidades',
        valor: transacaoInicial?.valor?.toString() || '',
        data_vencimento: transacaoInicial?.data_vencimento || new Date().toISOString().split('T')[0],
        descricao: transacaoInicial?.descricao || '',
        notas: transacaoInicial?.notas || '',
        status: transacaoInicial?.status || 'pendente'
    });

    const categoriasSaida = [
        { id: 'aluguel', label: 'Aluguel / Condomínio' },
        { id: 'utilidades', label: 'Água / Luz / Internet' },
        { id: 'taxas_gomb', label: 'Per Capita / Taxas GOMB' },
        { id: 'agape', label: 'Ágape / Refeições' },
        { id: 'manutencao', label: 'Manutenção de Templo' },
        { id: 'insumos', label: 'Velas / Incenso / Materiais' },
        { id: 'caridade', label: 'Caridade / Donativos' },
        { id: 'social', label: 'Social / Outros' },
        { id: 'outro_saida', label: 'Outras Despesas' }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEnviando(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            const payload = {
                caixa_id: form.caixa_id,
                tipo: 'saida',
                categoria: form.categoria,
                valor: parseFloat(form.valor),
                data_vencimento: form.data_vencimento,
                descricao: form.descricao,
                notas: form.notas,
                status: form.status,
                pessoa_id: null,
                usuario_id: acesso.id || 1
            };

            const url = isEdit 
                ? `${apiUrl}/api/tesouraria/transacoes/${transacaoInicial.id}`
                : `${apiUrl}/api/tesouraria/transacoes/`;
            
            const res = await fetch(url, {
                method: isEdit ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                onSuccess();
            }
        } catch (error) {
            console.error('Erro ao salvar compromisso:', error);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] overflow-y-auto bg-black/80 py-12 px-4">
            <div className="absolute inset-0 -z-10" onClick={onClose}></div>
            
            <div className="relative mx-auto bg-[#0f1d45] border border-white/20 rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.9)] w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
                <div className="p-5 border-b border-white/5 bg-black/20 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">
                            {isEdit ? 'Editar Despesa' : 'Novo Compromisso de Pagamento'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 font-sans">
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Conta de Origem</label>
                        <select 
                            value={form.caixa_id}
                            onChange={e => setForm({...form, caixa_id: parseInt(e.target.value)})}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-red-500/50 appearance-none cursor-pointer"
                        >
                            {caixas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Descrição / Motivo da Despesa</label>
                        <input 
                            type="text"
                            required
                            value={form.descricao}
                            onChange={e => setForm({...form, descricao: e.target.value})}
                            placeholder="Ex: Conta de Luz - Ref. Abril"
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-red-500/50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Categoria</label>
                            <select 
                                value={form.categoria}
                                onChange={e => setForm({...form, categoria: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-red-500/50 appearance-none cursor-pointer"
                            >
                                {categoriasSaida.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Valor Previsto</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">R$</span>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    required
                                    value={form.valor}
                                    onChange={e => setForm({...form, valor: e.target.value})}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-9 text-xs text-gray-200 outline-none focus:border-red-500/50 font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Data do Vencimento</label>
                        <input 
                            type="date"
                            required
                            value={form.data_vencimento}
                            onChange={e => setForm({...form, data_vencimento: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-red-500/50 cursor-pointer color-scheme-dark"
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={enviando}
                            className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white font-bold uppercase tracking-[0.2em] text-[11px] rounded-xl transition-all shadow-xl active:scale-95"
                        >
                            {enviando ? 'Gravando...' : isEdit ? 'Salvar Alterações' : 'Lançar Compromisso'}
                        </button>
                    </div>
                </form>
            </div>
            <style jsx>{` .color-scheme-dark { color-scheme: dark; } `}</style>
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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
    

    const categoriasSaida = [
        { id: 'aluguel', label: 'Aluguel / Condomínio' },
        { id: 'per_capita', label: 'Per Capita (Mensal)' },
        { id: 'taxas_gomb', label: 'Taxas GOMB (Eventuais)' },
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
            const url = isEdit 
                ? `${apiUrl}/api/tesouraria/transacoes/${transacaoInicial.id}`
                : `${apiUrl}/api/tesouraria/transacoes/`;

            if (isEdit) {
                // PATCH expects JSON
                const payload = {
                    caixa_id: form.caixa_id,
                    tipo: 'saida',
                    categoria: form.categoria,
                    valor: parseFloat(form.valor),
                    data_vencimento: form.data_vencimento,
                    descricao: form.descricao,
                    notas: form.notas,
                    status: form.status,
                    recorrencia: form.recorrencia,
                    modo_atualizacao: form.modo_atualizacao
                };
                const res = await fetch(url, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) onSuccess();
            } else {
                // POST expects Form (because it might have files in other modes)
                const formData = new FormData();
                formData.append('caixa_id', form.caixa_id.toString());
                formData.append('tipo', 'saida');
                formData.append('categoria', form.categoria);
                formData.append('valor', form.valor);
                formData.append('data_vencimento', form.data_vencimento);
                formData.append('recorrencia', form.recorrencia);
                if (form.recorrencia === 'parcelado') {
                    formData.append('total_parcelas', form.total_parcelas.toString());
                }
                
                const descFinal = `${form.descricao} ${form.recorrencia !== 'nenhuma' && form.recorrencia !== 'parcelado' ? `(${form.recorrencia})` : ''} - Ref: ${form.mes_ref}`;
                formData.append('descricao', descFinal);
                formData.append('notas', form.notas);
                formData.append('status', form.status);
                formData.append('usuario_id', (acesso.id || acesso.usuario_id || 1).toString());

                const res = await fetch(url, {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) onSuccess();
            }
        } catch (error) {
            console.error('Erro ao salvar compromisso:', error);
        } finally {
            setEnviando(false);
        }
    };

    const [form, setForm] = useState({
        caixa_id: transacaoInicial?.caixa_id || caixas[0]?.id || 1,
        categoria: transacaoInicial?.categoria || 'outro_saida',
        valor: transacaoInicial?.valor?.toString() || '',
        data_vencimento: transacaoInicial?.data_vencimento || new Date().toISOString().split('T')[0],
        descricao: transacaoInicial?.descricao || '',
        notas: transacaoInicial?.notas || '',
        status: transacaoInicial?.status || 'pendente',
        mes_ref: new Date().toISOString().slice(0, 7), // YYYY-MM
        recorrencia: transacaoInicial?.recorrencia || 'nenhuma',
        total_parcelas: transacaoInicial?.total_parcelas || 1,
        modo_atualizacao: 'unica'
    });

    const [calculandoPerCapita, setCalculandoPerCapita] = useState(false);
    const [infoPerCapita, setInfoPerCapita] = useState<{ contagem: number, total: number } | null>(null);

    // Efeito para cálculo automático de Per Capita
    useEffect(() => {
        if (form.categoria === 'per_capita' && !isEdit) {
            const calcular = async () => {
                setCalculandoPerCapita(true);
                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
                    const res = await fetch(`${apiUrl}/api/tesouraria/contagem-per-capita/${acesso.loja_id}?mes_ref=${form.mes_ref}`);
                    if (res.ok) {
                        const data = await res.json();
                        setInfoPerCapita(data);
                        setForm(prev => ({ ...prev, valor: data.total.toString(), descricao: `Per Capita - ${data.contagem} Obreiros` }));
                    }
                } catch (error) {
                    console.error('Erro ao calcular per capita:', error);
                } finally {
                    setCalculandoPerCapita(false);
                }
            };
            calcular();
        } else {
            setInfoPerCapita(null);
        }
    }, [form.categoria, form.mes_ref, acesso.loja_id]);

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);

    if (!isMounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md transition-all animate-in fade-in duration-300">
            <div className="relative bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 m-4">
            
                <div className="p-6 border-b border-white/5 bg-black/20 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <h3 className="text-sm font-medium text-white uppercase tracking-[0.2em]">
                            {isEdit ? 'Editar Despesa' : 'Novo Compromisso de Pagamento'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 text-xl">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 font-sans">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-medium text-gray-500 tracking-wider">Conta de Origem</label>
                            <select 
                                value={form.caixa_id}
                                onChange={e => setForm({...form, caixa_id: parseInt(e.target.value)})}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-red-500/50 appearance-none cursor-pointer"
                            >
                                {caixas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-medium text-gray-500 tracking-wider">Descrição / Motivo da Despesa</label>
                            <input 
                                type="text"
                                required
                                value={form.descricao}
                                onChange={e => setForm({...form, descricao: e.target.value})}
                                placeholder="Ex: Conta de Luz"
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-red-500/50"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-medium text-gray-500 tracking-wider">Mês de Referência</label>
                            <input 
                                type="month"
                                value={form.mes_ref}
                                onChange={e => setForm({...form, mes_ref: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-red-500/50 cursor-pointer color-scheme-dark"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-medium text-gray-500 tracking-wider">Categoria</label>
                            <select 
                                value={form.categoria}
                                onChange={e => setForm({...form, categoria: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-red-500/50 appearance-none cursor-pointer"
                            >
                                {categoriasSaida.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-medium text-gray-500 tracking-wider">Valor Previsto</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">R$</span>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    required
                                    readOnly={form.categoria === 'per_capita'}
                                    value={form.valor}
                                    onChange={e => setForm({...form, valor: e.target.value})}
                                    className={`w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-9 text-xs text-gray-200 outline-none focus:border-red-500/50 font-medium ${form.categoria === 'per_capita' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                />
                                {calculandoPerCapita && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="w-3 h-3 border border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>
                            {infoPerCapita && (
                                <p className="text-[9px] text-yellow-500/70 font-medium uppercase tracking-widest font-sans mt-1 px-1">
                                    Cálculo Automático: {infoPerCapita.contagem} Obreiros x R$ 50,00 (VM Isento)
                                </p>
                            )}
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

                        {!isEdit && (
                            <div className="space-y-1.5 md:col-span-2 pt-2 border-t border-white/5">
                                <label className="text-[10px] uppercase font-medium text-gray-400 tracking-wider">Recorrência / Parcelamento</label>
                                <div className="flex gap-4">
                                    <select
                                        value={form.recorrencia}
                                        onChange={e => setForm({ ...form, recorrencia: e.target.value })}
                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-red-500/50 appearance-none cursor-pointer"
                                    >
                                        <option value="nenhuma" className="bg-[#0f172a]">Única (S/ Recorrência)</option>
                                        <option value="mensal" className="bg-[#0f172a]">Recorrente (Mensal)</option>
                                        <option value="anual" className="bg-[#0f172a]">Recorrente (Anual)</option>
                                        <option value="parcelado" className="bg-[#0f172a]">Parcelado (Múltiplas vezes)</option>
                                    </select>

                                    {form.recorrencia === 'parcelado' && (
                                        <div className="w-1/3">
                                            <input
                                                type="number"
                                                min="2"
                                                max="120"
                                                value={form.total_parcelas}
                                                onChange={e => setForm({ ...form, total_parcelas: parseInt(e.target.value) || 2 })}
                                                placeholder="Nº Parcelas"
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-red-500/50 text-center"
                                            />
                                        </div>
                                    )}
                                </div>
                                {form.recorrencia === 'mensal' && <p className="text-[9px] text-gray-500 mt-1 uppercase tracking-wider">O sistema irá gerar 12 meses futuros.</p>}
                                {form.recorrencia === 'parcelado' && (
                                    <p className="text-[9px] text-gray-500 mt-1 uppercase tracking-wider">
                                        {form.valor && !isNaN(parseFloat(form.valor)) ? (
                                            <span className="text-yellow-500/90 font-medium">
                                                Prévia: {form.total_parcelas}x de aproximadamente R$ {(parseFloat(form.valor) / form.total_parcelas).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        ) : (
                                            "Preencha o Valor Previsto para ver a prévia das parcelas."
                                        )}
                                    </p>
                                )}
                            </div>
                        )}

                        {isEdit && transacaoInicial?.grupo_recorrencia && (
                            <div className="space-y-1.5 md:col-span-2 pt-2 border-t border-white/5">
                                <label className="text-[10px] font-medium text-yellow-500/80 uppercase tracking-wider">Modo de Edição em Lote</label>
                                <select
                                    value={form.modo_atualizacao}
                                    onChange={e => setForm({ ...form, modo_atualizacao: e.target.value })}
                                    className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-xs text-yellow-500 outline-none focus:border-yellow-500 appearance-none cursor-pointer"
                                >
                                    <option value="unica" className="bg-[#0f172a]">Alterar apenas esta</option>
                                    <option value="futuras" className="bg-[#0f172a]">Alterar esta e as próximas</option>
                                    <option value="todas" className="bg-[#0f172a]">Alterar todas do grupo (passadas e futuras)</option>
                                </select>
                                <p className="text-[9px] text-yellow-500/60 mt-1 uppercase tracking-wider">Esta conta faz parte de um grupo recorrente/parcelado.</p>
                            </div>
                        )}
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={enviando}
                            className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white font-medium uppercase tracking-widest font-sans text-[11px] rounded-xl transition-all shadow-xl active:scale-95 h-14"
                        >
                            {enviando ? 'Gravando no Banco...' : isEdit ? 'Salvar Alterações' : 'Lançar Compromisso'}
                        </button>
                    </div>
                </form>
            </div>
            <style jsx>{` .color-scheme-dark { color-scheme: dark; } `}</style>
        </div>,
        document.body
    );
}

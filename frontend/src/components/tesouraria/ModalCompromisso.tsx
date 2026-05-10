'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Caixa {
    id: number;
    nome: string;
}

export default function ModalCompromisso({ acesso, caixas, onClose, onSuccess, transacaoInicial, tipoInicial = 'saida' }: {
    acesso: any,
    caixas: Caixa[],
    onClose: () => void,
    onSuccess: () => void,
    transacaoInicial?: any,
    tipoInicial?: 'entrada' | 'saida'
}) {
    const isEdit = !!transacaoInicial;
    const [enviando, setEnviando] = useState(false);
    
    const [tipo, setTipo] = useState<'entrada' | 'saida'>(transacaoInicial?.tipo || tipoInicial);
    

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

    const categoriasEntrada = [
        { id: 'mensalidade', label: 'Mensalidade' },
        { id: 'joia', label: 'Joia de Ingresso' },
        { id: 'doacao', label: 'Doação / Patrocínio' },
        { id: 'evento', label: 'Arrecadação de Eventos' },
        { id: 'ressarcimento', label: 'Ressarcimento / Reembolso' },
        { id: 'outro_entrada', label: 'Outras Receitas' }
    ];

    const categoriasAtuais = tipo === 'saida' ? categoriasSaida : categoriasEntrada;

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
                    pessoa_id: form.pessoa_id || null,
                    tipo: tipo,
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
                if (form.pessoa_id) formData.append('pessoa_id', form.pessoa_id.toString());
                formData.append('tipo', tipo);
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

    const [pessoas, setPessoas] = useState<any[]>([]);
    const [form, setForm] = useState({
        caixa_id: transacaoInicial?.caixa_id || caixas[0]?.id || 1,
        pessoa_id: transacaoInicial?.pessoa_id || '',
        categoria: transacaoInicial?.categoria || (tipo === 'saida' ? 'outro_saida' : 'outro_entrada'),
        valor: transacaoInicial?.valor?.toString() || '',
        data_vencimento: transacaoInicial?.data_vencimento || new Date().toISOString().split('T')[0],
        descricao: transacaoInicial?.descricao || '',
        notas: transacaoInicial?.notas || '',
        status: transacaoInicial?.status || 'pendente',
        recorrencia: transacaoInicial?.recorrencia || 'nenhuma',
        total_parcelas: transacaoInicial?.total_parcelas || 2,
        mes_ref: transacaoInicial?.data_vencimento?.substring(0, 7) || new Date().toISOString().substring(0, 7),
        modo_atualizacao: 'unica'
    });

    // Carregar lista de pessoas (Irmãos)
    useEffect(() => {
        const fetchPessoas = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
                const res = await fetch(`${apiUrl}/api/pessoas/loja/${acesso.loja_id}`);
                if (res.ok) {
                    const data = await res.json();
                    setPessoas(data.sort((a: any, b: any) => a.nome.localeCompare(b.nome)));
                }
            } catch (error) {
                console.error('Erro ao buscar pessoas:', error);
            }
        };
        fetchPessoas();
    }, [acesso.loja_id]);

    // Reset categoria when tipo changes
    useEffect(() => {
        if (!isEdit) {
            setForm(prev => ({
                ...prev,
                categoria: tipo === 'saida' ? 'outro_saida' : 'outro_entrada'
            }));
        }
    }, [tipo, isEdit]);

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
            
                <div className="p-6 border-b border-white/5">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full ${tipo === 'saida' ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></span>
                                <h2 className="text-xl font-serif tracking-[0.2em] text-white uppercase">
                                    {isEdit ? 'Editar Lançamento' : tipo === 'saida' ? 'Novo Compromisso de Pagamento' : 'Novo Lançamento a Receber'}
                                </h2>
                            </div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-sans ml-4">
                                {isEdit ? 'Atualize as informações do registro' : 'Agende um lançamento futuro no sistema'}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!isEdit && (
                            <div className="flex p-1 bg-black/40 border border-white/5 rounded-xl mb-6">
                                <button
                                    type="button"
                                    onClick={() => setTipo('saida')}
                                    className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all ${tipo === 'saida' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-500'}`}
                                >
                                    Contas a Pagar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTipo('entrada')}
                                    className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all ${tipo === 'entrada' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-500'}`}
                                >
                                    Contas a Receber
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {/* Linha 1: Conta e Descrição */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-medium text-gray-500 tracking-widest ml-1">Conta de Destino/Origem</label>
                                <select 
                                    value={form.caixa_id}
                                    onChange={e => setForm({...form, caixa_id: parseInt(e.target.value)})}
                                    className={`w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none ${tipo === 'saida' ? 'focus:border-red-500/50' : 'focus:border-green-500/50'} appearance-none cursor-pointer transition-all hover:border-white/20`}
                                >
                                    {caixas.map(c => <option key={c.id} value={c.id} className="bg-[#0f172a]">{c.nome}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-medium text-gray-500 tracking-widest ml-1">Descrição / Motivo</label>
                                <input 
                                    type="text"
                                    required
                                    value={form.descricao}
                                    onChange={e => setForm({...form, descricao: e.target.value})}
                                    placeholder="Ex: Pagamento Mensal"
                                    className={`w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none ${tipo === 'saida' ? 'focus:border-red-500/50' : 'focus:border-green-500/50'} transition-all hover:border-white/20`}
                                />
                            </div>

                            {/* Linha 2: Mês Ref e Categoria */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-medium text-gray-500 tracking-widest ml-1">Mês de Referência</label>
                                <input 
                                    type="month"
                                    value={form.mes_ref}
                                    onChange={e => setForm({...form, mes_ref: e.target.value})}
                                    className={`w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none ${tipo === 'saida' ? 'focus:border-red-500/50' : 'focus:border-green-500/50'} cursor-pointer color-scheme-dark transition-all hover:border-white/20`}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-medium text-gray-500 tracking-widest ml-1">Categoria</label>
                                <select 
                                    value={form.categoria}
                                    onChange={e => setForm({...form, categoria: e.target.value})}
                                    className={`w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none ${tipo === 'saida' ? 'focus:border-red-500/50' : 'focus:border-green-500/50'} appearance-none cursor-pointer transition-all hover:border-white/20`}
                                >
                                    {categoriasAtuais.map(cat => <option key={cat.id} value={cat.id} className="bg-[#0f172a]">{cat.label}</option>)}
                                </select>
                            </div>

                            {/* Linha 3: Irmão e Valor */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-medium text-gray-500 tracking-widest ml-1">Vincular Irmão (Opcional)</label>
                                <select 
                                    value={form.pessoa_id}
                                    onChange={e => setForm({...form, pessoa_id: e.target.value})}
                                    className={`w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none ${tipo === 'saida' ? 'focus:border-red-500/50' : 'focus:border-green-500/50'} appearance-none cursor-pointer transition-all hover:border-white/20`}
                                >
                                    <option value="" className="bg-[#0f172a]">Nenhum / Diversos</option>
                                    {pessoas.map(p => (
                                        <option key={p.id} value={p.id} className="bg-[#0f172a]">{p.nome}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-medium text-gray-500 tracking-widest ml-1">Valor</label>
                                <div className="relative group">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">R$</span>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        required
                                        readOnly={form.categoria === 'per_capita'}
                                        value={form.valor}
                                        onChange={e => setForm({...form, valor: e.target.value})}
                                        className={`w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-9 text-xs text-gray-200 outline-none ${tipo === 'saida' ? 'focus:border-red-500/50' : 'focus:border-green-500/50'} font-medium transition-all hover:border-white/20 ${form.categoria === 'per_capita' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                    {calculandoPerCapita && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <div className="w-3 h-3 border border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Linha 4: Data e Recorrência */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-medium text-gray-500 tracking-widest ml-1">Data</label>
                                <input 
                                    type="date"
                                    required
                                    value={form.data_vencimento}
                                    onChange={e => setForm({...form, data_vencimento: e.target.value})}
                                    className={`w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none ${tipo === 'saida' ? 'focus:border-red-500/50' : 'focus:border-green-500/50'} cursor-pointer color-scheme-dark transition-all hover:border-white/20`}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-medium text-gray-500 tracking-widest ml-1">Recorrência / Parcelamento</label>
                                <div className="flex gap-2">
                                    <select
                                        disabled={isEdit && !!transacaoInicial?.grupo_recorrencia}
                                        value={form.recorrencia}
                                        onChange={e => setForm({ ...form, recorrencia: e.target.value })}
                                        className={`flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none ${tipo === 'saida' ? 'focus:border-red-500/50' : 'focus:border-green-500/50'} appearance-none cursor-pointer transition-all hover:border-white/20 ${isEdit && transacaoInicial?.grupo_recorrencia ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <option value="nenhuma" className="bg-[#0f172a]">Única (S/ Recorrência)</option>
                                        <option value="mensal" className="bg-[#0f172a]">Recorrente (Mensal)</option>
                                        <option value="anual" className="bg-[#0f172a]">Recorrente (Anual)</option>
                                        <option value="parcelado" className="bg-[#0f172a]">Parcelado (Múltiplas vezes)</option>
                                    </select>

                                    {form.recorrencia === 'parcelado' && (
                                        <div className="w-20">
                                            <input
                                                type="number"
                                                min="2"
                                                max="120"
                                                disabled={isEdit}
                                                value={form.total_parcelas}
                                                onChange={e => setForm({ ...form, total_parcelas: parseInt(e.target.value) || 2 })}
                                                className={`w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none ${tipo === 'saida' ? 'focus:border-red-500/50' : 'focus:border-green-500/50'} text-center transition-all hover:border-white/20 ${isEdit ? 'opacity-50' : ''}`}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Informações Extras (Per Capita ou Edição) */}
                            {infoPerCapita && (
                                <div className="md:col-span-2 px-1 py-2 bg-yellow-500/5 border border-yellow-500/20 rounded-xl space-y-1">
                                    <p className="text-[9px] text-yellow-500/70 font-medium uppercase tracking-widest font-sans px-2">
                                        Cálculo Automático: {infoPerCapita.contagem} Obreiros x R$ 50,00 (VM Isento)
                                    </p>
                                    <p className="text-[8px] text-blue-400/80 font-medium uppercase tracking-tighter font-sans flex items-center gap-1 px-2">
                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Contas futuras pendentes serão atualizadas automaticamente se o quadro de obreiros mudar.
                                    </p>
                                </div>
                            )}

                            {isEdit && transacaoInicial?.grupo_recorrencia && (
                                <div className="space-y-1.5 md:col-span-2 pt-2 border-t border-white/5">
                                    <label className="text-[10px] uppercase font-bold text-blue-400 tracking-wider flex items-center gap-1.5 ml-1">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Opções de Edição para Conta Recorrente
                                    </label>
                                    <select 
                                        value={form.modo_atualizacao}
                                        onChange={e => setForm({...form, modo_atualizacao: e.target.value})}
                                        className="w-full bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-100 outline-none focus:border-blue-500/50 appearance-none cursor-pointer transition-all hover:border-blue-500/30"
                                    >
                                        <option value="unica" className="bg-[#0f172a]">Alterar APENAS esta parcela ({transacaoInicial.parcela_atual}/{transacaoInicial.total_parcelas})</option>
                                        <option value="futuras" className="bg-[#0f172a]">Alterar esta parcela e todas as FUTURAS</option>
                                        <option value="todas" className="bg-[#0f172a]">Alterar TODAS as parcelas deste compromisso</option>
                                    </select>
                                </div>
                            )}

                            {/* Campo de Observações Internas (Ocupa a linha toda) */}
                            <div className="md:col-span-2 space-y-1.5 pt-2">
                                <label className="text-[10px] uppercase font-medium text-gray-500 tracking-widest ml-1">Observações Internas</label>
                                <textarea 
                                    value={form.notas}
                                    onChange={e => setForm({...form, notas: e.target.value})}
                                    placeholder="Anotações privadas para a tesouraria..."
                                    rows={3}
                                    className={`w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none ${tipo === 'saida' ? 'focus:border-red-500/50' : 'focus:border-green-500/50'} transition-all hover:border-white/20 resize-none`}
                                />
                            </div>
                        </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={enviando}
                            className={`w-full py-4 ${tipo === 'saida' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} disabled:bg-gray-700 text-white font-medium uppercase tracking-widest font-sans text-[11px] rounded-xl transition-all shadow-xl active:scale-95 h-14`}
                        >
                            {enviando ? 'Gravando no Banco...' : isEdit ? 'Salvar Alterações' : tipo === 'saida' ? 'Lançar Compromisso' : 'Lançar Recebível'}
                        </button>
                    </div>
                </form>
            </div>
            <style jsx>{` .color-scheme-dark { color-scheme: dark; } `}</style>
        </div>
        </div>,
        document.body
    );
}

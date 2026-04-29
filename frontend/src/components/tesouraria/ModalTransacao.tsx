'use client';

import { useEffect, useState } from 'react';

interface Caixa {
    id: number;
    nome: string;
    tipo?: string;
}

interface Pessoa {
    id: number;
    nome: string;
}

export default function ModalTransacao({ acesso, caixas, onClose, onSuccess, onCaixaAdicionado, transacaoInicial }: {
    acesso: any,
    caixas: Caixa[],
    onClose: () => void,
    onSuccess: () => void,
    onCaixaAdicionado?: () => void,
    transacaoInicial?: any
}) {
    const isEdit = !!transacaoInicial;
    const [pessoas, setPessoas] = useState<Pessoa[]>([]);
    const [mostrarNovoCaixa, setMostrarNovoCaixa] = useState(false);
    const [novoCaixaForm, setNovoCaixaForm] = useState({ 
        nome: '', 
        tipo: 'geral',
        descricao: '',
        saldo_inicial: '0' 
    });
    const [carregandoCaixa, setCarregandoCaixa] = useState(false);
    
    const [form, setForm] = useState({
        caixa_id: transacaoInicial?.caixa_id || caixas[0]?.id || 0,
        pessoa_id: transacaoInicial?.pessoa_id?.toString() || '',
        tipo: transacaoInicial?.tipo || 'entrada',
        grupo: '', // Calculated below
        categoria: transacaoInicial?.categoria || 'mensalidade',
        valor: transacaoInicial?.valor?.toString() || '',
        data_vencimento: transacaoInicial?.data_vencimento || new Date().toISOString().split('T')[0],
        data_pagamento: transacaoInicial?.data_pagamento || '',
        descricao: transacaoInicial?.descricao || '',
        notas: transacaoInicial?.notas || '',
        status: transacaoInicial?.status || 'pago'
    });

    const [arquivo, setArquivo] = useState<File | null>(null);
    const [enviando, setEnviando] = useState(false);

    // Hierarquia de categorias por tipo
    const categoriasHierarquicas: Record<string, { nome: string, categorias: { id: string, label: string }[] }[]> = {
        entrada: [
            { 
                nome: 'Receitas de Obreiros',
                categorias: [
                    { id: 'mensalidade', label: 'Mensalidade' },
                    { id: 'joia', label: 'Joia de Ingresso' },
                    { id: 'benevolencia', label: 'Benevolência / Caridade' }
                ]
            },
            {
                nome: 'Outras Receitas',
                categorias: [
                    { id: 'doacao', label: 'Doação / Patrocínio' },
                    { id: 'evento', label: 'Arrecadação de Eventos' },
                    { id: 'outro_entrada', label: 'Resíduo / Outros' }
                ]
            }
        ],
        saida: [
            {
                nome: 'Despesas Fixas',
                categorias: [
                    { id: 'aluguel', label: 'Aluguel / Condomínio' },
                    { id: 'utilidades', label: 'Água / Luz / Internet' },
                    { id: 'taxas_gomb', label: 'Per Capita / Taxas GOMB' }
                ]
            },
            {
                nome: 'Despesas Variáveis',
                categorias: [
                    { id: 'agape', label: 'Ágape / Refeições' },
                    { id: 'manutencao', label: 'Manutenção de Templo' },
                    { id: 'insumos', label: 'Velas / Incenso / Materiais' },
                    { id: 'caridade', label: 'Caridade / Donativos' },
                    { id: 'social', label: 'Social / Outros' }
                ]
            }
        ]
    };

    // Calculate initial group based on category
    useEffect(() => {
        if (form.tipo && form.categoria && !form.grupo) {
            const grupos = categoriasHierarquicas[form.tipo] || [];
            const grupoEncontrado = grupos.find(g => g.categorias.some(c => c.id === form.categoria));
            if (grupoEncontrado) {
                setForm(f => ({ ...f, grupo: grupoEncontrado.nome }));
            } else if (grupos.length > 0) {
                setForm(f => ({ ...f, grupo: grupos[0].nome }));
            }
        }
    }, [form.tipo, form.categoria]);

    useEffect(() => {
        // Ensure default caixa is set when caixas prop loads
        if (caixas.length > 0 && form.caixa_id === 0) {
            setForm(f => ({ ...f, caixa_id: caixas[0].id }));
        }
    }, [caixas]);

    // Lógica para selecionar banco automaticamente (Banco Pan para Joias/Mensalidades)
    useEffect(() => {
        if (form.categoria === 'joia' || form.categoria === 'mensalidade') {
            const caixaPan = caixas.find(c => c.tipo === 'joias_mensalidade');
            if (caixaPan && form.caixa_id !== caixaPan.id) {
                setForm(f => ({ ...f, caixa_id: caixaPan.id }));
            }
        }
    }, [form.categoria, caixas]);

    useEffect(() => {
        const carregarPessoas = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
                const res = await fetch(`${apiUrl}/api/pessoas/loja/${acesso.loja_id}`);
                if (res.ok) {
                    setPessoas(await res.json());
                }
            } catch (error) {
                console.error('Erro ao carregar pessoas:', error);
            }
        };
        carregarPessoas();
    }, [acesso.loja_id]);

    const [erro, setErro] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEnviando(true);
        setErro(null);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

            // usuario_id: usa loja_id do acesso como proxy para o usuário da loja
            const usuarioId = acesso?.loja_id || 1;
            
            if (isEdit) {
                const payload = {
                    caixa_id: form.caixa_id,
                    tipo: form.tipo,
                    categoria: form.categoria,
                    valor: parseFloat(form.valor),
                    data_vencimento: form.data_vencimento,
                    descricao: form.descricao,
                    notas: form.notas,
                    status: form.status,
                    pessoa_id: form.pessoa_id ? parseInt(form.pessoa_id) : null
                };
                const res = await fetch(`${apiUrl}/api/tesouraria/transacoes/${transacaoInicial.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    onSuccess();
                } else {
                    const body = await res.json().catch(() => ({}));
                    setErro(body.detail || `Erro ${res.status} ao editar lançamento`);
                }
            } else {
                const formData = new FormData();
                formData.append('caixa_id', form.caixa_id.toString());
                formData.append('tipo', form.tipo);
                formData.append('categoria', form.categoria);
                formData.append('valor', form.valor);
                formData.append('data_vencimento', form.data_vencimento);
                formData.append('descricao', form.descricao);
                formData.append('notas', form.notas || '');
                formData.append('status', form.status || 'pendente');
                formData.append('usuario_id', String(usuarioId));
                if (form.pessoa_id) formData.append('pessoa_id', form.pessoa_id);
                if (arquivo) formData.append('comprovante', arquivo);

                const res = await fetch(`${apiUrl}/api/tesouraria/transacoes/`, {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) {
                    onSuccess();
                } else {
                    const body = await res.json().catch(() => ({}));
                    setErro(body.detail || `Erro ${res.status} ao criar lançamento`);
                }
            }
        } catch (error) {
            console.error('Erro ao salvar transação:', error);
            setErro('Erro de conexão com o servidor.');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] overflow-y-auto bg-black/80 py-6 sm:py-12 px-4 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]">
            {/* Backdrop click to close - absolute to fill the fixed container */}
            <div className="absolute inset-0 -z-10" onClick={onClose}></div>
            
            <div className="relative mx-auto bg-[#0f1d45] border border-white/20 rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.9)] w-full max-w-lg overflow-hidden flex flex-col min-h-0 animate-in zoom-in duration-300 gap-0">
                <div className="p-5 border-b border-white/5 bg-black/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isEdit ? 'bg-blue-500' : 'bg-yellow-500'} animate-pulse`}></div>
                        <h3 className={`text-sm font-bold ${isEdit ? 'text-blue-400' : 'text-yellow-500'} uppercase tracking-[0.2em]`}>
                            {isEdit ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 font-sans custom-scrollbar flex-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5 flex-1">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Conta / Caixa</label>
                                {!isEdit && (
                                    <button 
                                        type="button"
                                        onClick={() => setMostrarNovoCaixa(!mostrarNovoCaixa)}
                                        className="text-[10px] text-yellow-500 hover:text-yellow-400 font-bold uppercase"
                                    >
                                        {mostrarNovoCaixa ? 'Cancelar' : '+ Nova'}
                                    </button>
                                )}
                            </div>
                            <select 
                                value={form.caixa_id}
                                onChange={e => setForm({...form, caixa_id: parseInt(e.target.value)})}
                                disabled={isEdit} // Block changing account in edit mode to avoid complex balance logic for now
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-yellow-500/50 appearance-none cursor-pointer disabled:opacity-50"
                            >
                                {caixas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Tipo de Movimentação</label>
                            <select 
                                value={form.tipo}
                                onChange={e => {
                                    const novoTipo = e.target.value;
                                    const primeiroGrupo = categoriasHierarquicas[novoTipo][0];
                                    setForm({
                                        ...form, 
                                        tipo: novoTipo,
                                        grupo: primeiroGrupo.nome,
                                        categoria: primeiroGrupo.categorias[0].id
                                    });
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-yellow-500/50 appearance-none cursor-pointer"
                            >
                                <option value="entrada">Entrada (+)</option>
                                <option value="saida">Saída (-)</option>
                            </select>
                        </div>
                    </div>

                    {/* Quick Caixa Creation Form */}
                    {mostrarNovoCaixa && !isEdit && (
                        <div className="p-5 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl space-y-4 animate-in fade-in zoom-in duration-300 shadow-inner">
                            {/* ... (Keep existing caixa form logic) ... */}
                            <div className="flex justify-between items-center">
                                <div className="text-[10px] uppercase font-bold text-yellow-500 tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                                    Nova Conta ou Caixa
                                </div>
                                <button onClick={() => setMostrarNovoCaixa(false)} className="text-[9px] text-gray-500 hover:text-white uppercase font-bold tracking-tighter">Fechar</button>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Nome da Conta / Banco</label>
                                        <input 
                                            type="text"
                                            placeholder="Ex: Banco Pan, Recarga Pay..."
                                            value={novoCaixaForm.nome}
                                            onChange={e => setNovoCaixaForm({...novoCaixaForm, nome: e.target.value})}
                                            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-yellow-500/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Finalidade do Caixa</label>
                                        <select 
                                            value={novoCaixaForm.tipo}
                                            onChange={e => setNovoCaixaForm({...novoCaixaForm, tipo: e.target.value})}
                                            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-yellow-500/50 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="geral">Geral (Fluxo de Caixa)</option>
                                            <option value="benevolencia">Benevolência (Recarga Pay)</option>
                                            <option value="joias_mensalidade">Joias e Mensalidades (Banco Pan)</option>
                                        </select>
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={async () => {
                                        setCarregandoCaixa(true);
                                        try {
                                            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
                                            const res = await fetch(`${apiUrl}/api/tesouraria/caixas`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    loja_id: acesso.loja_id,
                                                    nome: novoCaixaForm.nome,
                                                    tipo: novoCaixaForm.tipo,
                                                    descricao: novoCaixaForm.descricao,
                                                    saldo_inicial: parseFloat(novoCaixaForm.saldo_inicial || '0')
                                                })
                                            });
                                            if (res.ok) {
                                                if (onCaixaAdicionado) onCaixaAdicionado();
                                                setMostrarNovoCaixa(false);
                                                setNovoCaixaForm({ nome: '', tipo: 'geral', descricao: '', saldo_inicial: '0' });
                                            }
                                        } catch (err) {
                                            console.error(err);
                                        } finally {
                                            setCarregandoCaixa(false);
                                        }
                                    }}
                                    className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-black text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                    {carregandoCaixa ? 'Cadastrando...' : 'Confirmar Cadastro'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Grupo de Categoria</label>
                            <select 
                                value={form.grupo}
                                onChange={e => {
                                    const novoGrupo = e.target.value;
                                    const categoriasDoGrupo = categoriasHierarquicas[form.tipo].find(g => g.nome === novoGrupo)?.categorias || [];
                                    setForm({
                                        ...form, 
                                        grupo: novoGrupo,
                                        categoria: categoriasDoGrupo[0]?.id || ''
                                    });
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-yellow-500/50 appearance-none cursor-pointer"
                            >
                                {categoriasHierarquicas[form.tipo].map(grupo => (
                                    <option key={grupo.nome} value={grupo.nome}>{grupo.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Categoria Específica</label>
                            <select 
                                value={form.categoria}
                                onChange={e => setForm({...form, categoria: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-yellow-500/50 appearance-none cursor-pointer"
                            >
                                {categoriasHierarquicas[form.tipo]
                                    .find(g => g.nome === form.grupo)?.categorias.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))
                                }
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Irmão Vinculado</label>
                            <select 
                                value={form.pessoa_id}
                                onChange={e => setForm({...form, pessoa_id: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-yellow-500/50 appearance-none cursor-pointer"
                            >
                                <option value="">Não vinculado a Irmão</option>
                                {pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Valor do Lançamento</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">R$</span>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    required
                                    value={form.valor}
                                    onChange={e => setForm({...form, valor: e.target.value})}
                                    placeholder="0,00"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-9 text-xs text-gray-200 outline-none focus:border-yellow-500/50 font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5 relative">
                            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Data do Vencimento</label>
                            <input 
                                type="date"
                                required
                                value={form.data_vencimento}
                                onChange={e => setForm({...form, data_vencimento: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-yellow-500/50 cursor-pointer color-scheme-dark"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Descrição / Título do Lançamento</label>
                        <input 
                            type="text"
                            required
                            value={form.descricao}
                            onChange={e => setForm({...form, descricao: e.target.value})}
                            placeholder="Ex: Mensalidade de Março - Ir. Fulano"
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-yellow-500/50"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Observações Internas (Opcional)</label>
                        <textarea 
                            rows={3}
                            value={form.notas}
                            onChange={e => setForm({...form, notas: e.target.value})}
                            placeholder="Anote aqui detalhes importantes..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-yellow-500/50 resize-none leading-relaxed"
                        ></textarea>
                    </div>

                    {erro && (
                        <div className="bg-red-900/30 border border-red-500/50 text-red-400 text-xs p-3 rounded-xl">
                            ⚠️ {erro}
                        </div>
                    )}

                    <div className="pt-4 pb-2">
                        <button
                            type="submit"
                            disabled={enviando}
                            className={`w-full py-4 ${isEdit ? 'bg-blue-600 hover:bg-blue-700' : 'bg-yellow-500 hover:bg-yellow-600'} disabled:bg-gray-700 text-white font-bold uppercase tracking-[0.2em] text-[11px] rounded-xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2`}
                        >
                            {enviando ? 'Processando...' : isEdit ? 'Salvar Alterações' : 'Efetuar Lançamento'}
                        </button>
                    </div>
                </form>
            </div>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(234, 179, 8, 0.3); }
                .color-scheme-dark { color-scheme: dark; }
            `}</style>
        </div>
    );
}

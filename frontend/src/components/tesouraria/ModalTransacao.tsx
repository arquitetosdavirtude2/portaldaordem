'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Caixa {
    id: number;
    nome: string;
    tipo?: string;
    finalidade?: string;
}

interface Pessoa {
    id: number;
    nome: string;
    ativo: number;
    status?: string;
    cargo_nome?: string | null;
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
        finalidade: 'mensalidade', // 'mensalidade' = Geral no novo padrão
        descricao: '',
        saldo_inicial: '0' 
    });
    const [carregandoCaixa, setCarregandoCaixa] = useState(false);
    const [mostrarAdormecidos, setMostrarAdormecidos] = useState(false);
    const [buscaPessoa, setBuscaPessoa] = useState('');
    const [isDropdownAberto, setIsDropdownAberto] = useState(false);
    
    // Lógica de inicialização de datas
    const initialPagamento = transacaoInicial?.data_pagamento || transacaoInicial?.data_vencimento || new Date().toISOString().split('T')[0];
    const initialVencimento = transacaoInicial?.data_vencimento || new Date().toISOString().split('T')[0];

    const [form, setForm] = useState({
        caixa_id: transacaoInicial?.caixa_id || caixas[0]?.id || 0,
        pessoa_id: transacaoInicial?.pessoa_id?.toString() || '',
        tipo: transacaoInicial?.tipo || 'entrada',
        grupo: '', 
        categoria: transacaoInicial?.categoria || 'mensalidade',
        valor: transacaoInicial?.valor?.toString() || '',
        data_vencimento: initialVencimento,
        data_pagamento: initialPagamento,
        descricao: transacaoInicial?.descricao || '',
        notas: transacaoInicial?.notas || '',
        status: transacaoInicial?.status || 'pago'
    });

    const [arquivo, setArquivo] = useState<File | null>(null);
    const [enviando, setEnviando] = useState(false);
    
    const [mesReferencia, setMesReferencia] = useState<string>(() => {
        if (transacaoInicial?.data_vencimento) {
            return transacaoInicial.data_vencimento.substring(0, 7);
        }
        const hoje = new Date();
        return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    });

    // Lógica Dinâmica de Categorias Baseada no Banco
    const getCategoriasPorBanco = () => {
        const caixaSelecionado = caixas.find(c => c.id === form.caixa_id);
        const finalidade = caixaSelecionado?.finalidade || 'mensalidade';

        if (finalidade === 'benevolencia') {
            return {
                entrada: [
                    { 
                        nome: 'Receitas de Obreiros',
                        categorias: [{ id: 'benevolencia', label: 'Benevolência / Caridade' }]
                    },
                    {
                        nome: 'Outras Receitas',
                        categorias: [
                            { id: 'doacao', label: 'Doação / Patrocínio' },
                            { id: 'evento', label: 'Arrecadação de Eventos' }
                        ]
                    }
                ],
                saida: [
                    {
                        nome: 'Despesas Variáveis',
                        categorias: [{ id: 'caridade', label: 'Caridade / Donativos' }]
                    }
                ]
            };
        }

        // Padrão (Banco Pan / Geral / Mensalidade)
        return {
            entrada: [
                { 
                    nome: 'Receitas de Obreiros',
                    categorias: [
                        { id: 'mensalidade', label: 'Mensalidade' },
                        { id: 'joia', label: 'Joia de Ingresso' }
                    ]
                },
                {
                    nome: 'Outras Receitas',
                    categorias: [
                        { id: 'outro_entrada', label: 'Resíduo / Outros' }
                    ]
                }
            ],
            saida: [
                {
                    nome: 'Despesas Fixas',
                    categorias: [
                        { id: 'aluguel', label: 'Aluguel / Condomínio' },
                        { id: 'per_capita', label: 'Per Capita (Mensal)' },
                        { id: 'taxas_gomb', label: 'Taxas GOMB (Eventuais)' }
                    ]
                },
                {
                    nome: 'Despesas Variáveis',
                    categorias: [
                        { id: 'agape', label: 'Ágape / Refeições' },
                        { id: 'manutencao', label: 'Manutenção de Templo' },
                        { id: 'insumos', label: 'Velas / Incenso / Materiais' },
                        { id: 'caridade', label: 'Caridade / Donativos' },
                        { id: 'social', label: 'Social / Outros' },
                        { id: 'outro_saida', label: 'Outras Despesas' }
                    ]
                }
            ]
        };
    };

    const categoriasHierarquicas = getCategoriasPorBanco();

    useEffect(() => {
        const categoriasDisponiveis = categoriasHierarquicas[form.tipo as 'entrada' | 'saida'] || [];
        const todasCategorias = categoriasDisponiveis.flatMap(g => g.categorias.map(c => c.id));
        
        if (!todasCategorias.includes(form.categoria)) {
            const primeiroGrupo = categoriasDisponiveis[0];
            if (primeiroGrupo) {
                setForm(f => ({ 
                    ...f, 
                    grupo: primeiroGrupo.nome, 
                    categoria: primeiroGrupo.categorias[0].id 
                }));
            }
        }
    }, [form.caixa_id, form.tipo]);

    useEffect(() => {
        if (form.tipo && form.categoria && !form.grupo) {
            const grupos = categoriasHierarquicas[form.tipo as 'entrada' | 'saida'] || [];
            const grupoEncontrado = grupos.find(g => g.categorias.some(c => c.id === form.categoria));
            if (grupoEncontrado) {
                setForm(f => ({ ...f, grupo: grupoEncontrado.nome }));
            }
        }
    }, [form.tipo, form.categoria]);

    useEffect(() => {
        if (caixas.length > 0 && form.caixa_id === 0) {
            setForm(f => ({ ...f, caixa_id: caixas[0].id }));
        }
    }, [caixas]);

    useEffect(() => {
        const carregarPessoas = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
                const res = await fetch(`${apiUrl}/api/pessoas/loja/${acesso.loja_id}`);
                if (res.ok) {
                    const data: Pessoa[] = await res.json();
                    setPessoas(data);
                    
                    // Se for edição, preencher o nome da pessoa no campo de busca
                    if (isEdit && form.pessoa_id) {
                        const pessoa = data.find(p => p.id.toString() === form.pessoa_id);
                        if (pessoa) setBuscaPessoa(pessoa.nome);
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar pessoas:', error);
            }
        };
        carregarPessoas();
    }, [acesso.loja_id]);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.dropdown-obreiro')) {
                setIsDropdownAberto(false);
            }
        };
        if (isDropdownAberto) {
            document.addEventListener('mousedown', handleOutsideClick);
        }
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isDropdownAberto]);

    const [erro, setErro] = useState<string | null>(null);

    const handleCriarCaixa = async () => {
        if (!novoCaixaForm.nome) return;
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
                    finalidade: novoCaixaForm.finalidade,
                    descricao: novoCaixaForm.descricao,
                    saldo_inicial: parseFloat(novoCaixaForm.saldo_inicial)
                })
            });
            if (res.ok) {
                setMostrarNovoCaixa(false);
                setNovoCaixaForm({ nome: '', tipo: 'geral', finalidade: 'mensalidade', descricao: '', saldo_inicial: '0' });
                if (onCaixaAdicionado) onCaixaAdicionado();
            }
        } catch (error) {
            console.error('Erro ao criar caixa:', error);
        } finally {
            setCarregandoCaixa(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEnviando(true);
        setErro(null);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            const usuarioId = acesso?.loja_id || 1;
            
            const isMensalidadeOrJoia = form.categoria === 'mensalidade' || form.categoria === 'joia';
            const dataVencimentoFinal = isMensalidadeOrJoia && mesReferencia
                ? `${mesReferencia}-01`
                : form.data_pagamento;

            if (isEdit) {
                const payload = {
                    caixa_id: form.caixa_id,
                    tipo: form.tipo,
                    categoria: form.categoria,
                    valor: parseFloat(form.valor),
                    data_vencimento: dataVencimentoFinal,
                    data_pagamento: form.data_pagamento,
                    descricao: form.descricao,
                    notas: form.notas,
                    status: 'pago',
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
                formData.append('data_vencimento', dataVencimentoFinal);
                formData.append('data_pagamento', form.data_pagamento);
                formData.append('descricao', form.descricao);
                formData.append('notas', form.notas || '');
                formData.append('status', 'pago');
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

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);

    if (!isMounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all animate-in fade-in duration-300">
            <div className="relative bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 m-4">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${isEdit ? 'bg-blue-500' : 'bg-yellow-500'} animate-pulse`}></div>
                        <h3 className="text-sm font-medium text-white uppercase tracking-[0.2em]">
                            {isEdit ? 'Editar Movimentação' : 'Novo Lançamento'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                    
                    {/* Linha 1: Conta e Tipo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[10px] uppercase font-medium text-gray-500 tracking-widest">Conta de Origem/Destino</label>
                                {!isEdit && (
                                    <button 
                                        type="button"
                                        onClick={() => setMostrarNovoCaixa(!mostrarNovoCaixa)}
                                        className="text-[9px] uppercase font-medium text-yellow-500 hover:text-yellow-400 transition-colors"
                                    >
                                        {mostrarNovoCaixa ? 'Voltar' : '+ Nova Conta'}
                                    </button>
                                )}
                            </div>
                            
                            {!mostrarNovoCaixa ? (
                                <select 
                                    value={form.caixa_id}
                                    onChange={e => setForm({...form, caixa_id: parseInt(e.target.value)})}
                                    disabled={isEdit}
                                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-4 text-xs text-gray-200 outline-none focus:border-yellow-500/50 appearance-none cursor-pointer disabled:opacity-50 transition-all hover:border-white/20"
                                >
                                    {caixas.map(c => <option key={c.id} value={c.id} className="bg-[#0a0a0a]">{c.nome}</option>)}
                                </select>
                            ) : (
                                <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10 animate-in slide-in-from-top-2">
                                    <input 
                                        type="text"
                                        placeholder="Nome do Banco/Conta (Ex: Recarga Pay)"
                                        value={novoCaixaForm.nome}
                                        onChange={e => setNovoCaixaForm({...novoCaixaForm, nome: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white outline-none focus:border-yellow-500"
                                    />
                                    <select
                                        value={novoCaixaForm.finalidade}
                                        onChange={e => setNovoCaixaForm({...novoCaixaForm, finalidade: e.target.value})}
                                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-xs text-white outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="mensalidade" className="bg-[#0a0a0a]">Finalidade: Geral (Mensalidades/Joias)</option>
                                        <option value="benevolencia" className="bg-[#0a0a0a]">Finalidade: Benevolência (Caridade)</option>
                                    </select>
                                    <input 
                                        type="number"
                                        placeholder="Saldo Inicial (R$)"
                                        value={novoCaixaForm.saldo_inicial}
                                        onChange={e => setNovoCaixaForm({...novoCaixaForm, saldo_inicial: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white outline-none focus:border-yellow-500"
                                    />
                                    <button 
                                        type="button"
                                        onClick={handleCriarCaixa}
                                        disabled={carregandoCaixa}
                                        className="w-full py-3 bg-yellow-500 text-black text-[10px] font-medium uppercase rounded-lg hover:bg-yellow-400 transition-all"
                                    >
                                        {carregandoCaixa ? 'Cadastrando...' : 'Confirmar Cadastro'}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-medium text-gray-500 tracking-widest ml-1">Tipo de Operação</label>
                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                                <button 
                                    type="button"
                                    onClick={() => setForm({...form, tipo: 'entrada'})}
                                    className={`flex-1 py-3 rounded-lg text-[10px] uppercase font-medium transition-all ${form.tipo === 'entrada' ? 'bg-green-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Entrada (+)
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setForm({...form, tipo: 'saida'})}
                                    className={`flex-1 py-3 rounded-lg text-[10px] uppercase font-medium transition-all ${form.tipo === 'saida' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Saída (-)
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Linha 2: Categoria e Subcategoria */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-medium text-gray-500 tracking-widest ml-1">Grupo</label>
                            <select 
                                value={form.grupo}
                                onChange={e => {
                                    const novoGrupo = e.target.value;
                                    const categoriasDoGrupo = categoriasHierarquicas[form.tipo as 'entrada' | 'saida'].find(g => g.nome === novoGrupo)?.categorias || [];
                                    setForm({ ...form, grupo: novoGrupo, categoria: categoriasDoGrupo[0]?.id || '' });
                                }}
                                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-4 text-xs text-gray-200 outline-none focus:border-yellow-500/50 appearance-none cursor-pointer transition-all hover:border-white/20"
                            >
                                {categoriasHierarquicas[form.tipo as 'entrada' | 'saida'].map(grupo => (
                                    <option key={grupo.nome} value={grupo.nome} className="bg-[#0a0a0a]">{grupo.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-medium text-gray-500 tracking-widest ml-1">Categoria</label>
                            <select 
                                value={form.categoria}
                                onChange={e => setForm({...form, categoria: e.target.value})}
                                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-4 text-xs text-gray-200 outline-none focus:border-yellow-500/50 appearance-none cursor-pointer transition-all hover:border-white/20"
                            >
                                {categoriasHierarquicas[form.tipo as 'entrada' | 'saida'].find(g => g.nome === form.grupo)?.categorias.map(cat => (
                                    <option key={cat.id} value={cat.id} className="bg-[#0a0a0a]">{cat.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Linha 3: Irmão e Valor */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1 min-h-[24px]">
                                <label className="text-[10px] uppercase font-medium text-gray-500 tracking-widest">Obreiro Relacionado</label>
                                <label className="flex items-center gap-1.5 cursor-pointer group h-full">
                                    <input 
                                        type="checkbox" 
                                        checked={mostrarAdormecidos}
                                        onChange={(e) => setMostrarAdormecidos(e.target.checked)}
                                        className="w-3.5 h-3.5 rounded border-white/10 bg-black/40 text-yellow-500 focus:ring-0 focus:ring-offset-0"
                                    />
                                    <span className="text-[9px] font-medium text-gray-500 group-hover:text-gray-400 uppercase tracking-wider transition-colors">Ver Adormecidos</span>
                                </label>
                            </div>
                            <div className="relative dropdown-obreiro">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">
                                    <span className="text-gray-500 text-xs">🔍</span>
                                </div>
                                <input 
                                    type="text"
                                    placeholder="Buscar obreiro por nome ou cargo..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-10 text-xs text-white outline-none focus:border-yellow-500/50 transition-all hover:border-white/20"
                                    onFocus={() => setIsDropdownAberto(true)}
                                    onChange={(e) => {
                                        setBuscaPessoa(e.target.value);
                                        setIsDropdownAberto(true);
                                    }}
                                    value={buscaPessoa}
                                />
                                
                                {isDropdownAberto && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl z-[100] max-h-60 overflow-y-auto custom-scrollbar">
                                        <div 
                                            className="p-3 text-[10px] text-gray-500 hover:bg-white/5 cursor-pointer uppercase tracking-widest border-b border-white/5"
                                            onClick={() => {
                                                setForm({...form, pessoa_id: ''});
                                                setBuscaPessoa('');
                                                setIsDropdownAberto(false);
                                            }}
                                        >
                                            Nenhum
                                        </div>
                                        {pessoas
                                          .filter(p => (mostrarAdormecidos || p.ativo === 1))
                                          .filter(p => {
                                              if (!buscaPessoa) return true;
                                              const b = buscaPessoa.toLowerCase();
                                              return p.nome.toLowerCase().includes(b) || 
                                                     (p.cargo_nome || '').toLowerCase().includes(b) ||
                                                     (p.status || '').toLowerCase().includes(b);
                                          })
                                          .map(p => (
                                            <div 
                                                key={p.id} 
                                                className="p-3 border-b border-white/5 last:border-0 hover:bg-yellow-500/10 cursor-pointer transition-colors group"
                                                onClick={() => {
                                                    setForm({...form, pessoa_id: p.id.toString()});
                                                    setBuscaPessoa(p.nome);
                                                    setIsDropdownAberto(false);
                                                }}
                                            >
                                                <div className="text-[11px] text-gray-200 group-hover:text-yellow-500 transition-colors font-medium">
                                                    {p.nome}
                                                </div>
                                                <div className="text-[9px] text-gray-500 uppercase tracking-tighter">
                                                    {p.cargo_nome || p.status || 'Aprendiz'} {p.ativo === 0 ? '• ADORMECIDO' : ''}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center ml-1 min-h-[24px]">
                                <label className="text-[10px] uppercase font-medium text-gray-500 tracking-widest">Valor Total (R$)</label>
                            </div>
                            <input 
                                type="number" 
                                step="0.01"
                                required
                                value={form.valor}
                                onChange={e => setForm({...form, valor: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-white font-medium outline-none focus:border-yellow-500/50 transition-all"
                                placeholder="0,00"
                            />
                        </div>
                    </div>

                    {/* Linha 4: Datas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {(form.categoria === 'mensalidade' || form.categoria === 'joia') ? (
                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                <label className="text-[10px] uppercase font-medium text-yellow-500 tracking-widest ml-1 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                                    Mês de Referência
                                </label>
                                <input
                                    type="month"
                                    value={mesReferencia}
                                    onChange={e => setMesReferencia(e.target.value)}
                                    className="w-full bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 text-xs text-yellow-100 outline-none focus:border-yellow-500/60 color-scheme-dark transition-all font-medium"
                                />
                            </div>
                        ) : null}
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-medium text-gray-500 tracking-widest ml-1">Data Efetiva do Pagamento</label>
                            <input 
                                type="date"
                                required
                                value={form.data_pagamento}
                                onChange={e => setForm({...form, data_pagamento: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-gray-200 outline-none focus:border-yellow-500/50 cursor-pointer color-scheme-dark transition-all hover:border-white/20"
                            />
                        </div>
                    </div>

                    {/* Linha 5: Descrição */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-medium text-gray-500 tracking-widest ml-1">Descrição do Lançamento</label>
                        <input 
                            type="text"
                            required
                            value={form.descricao}
                            onChange={e => setForm({...form, descricao: e.target.value})}
                            placeholder="Ex: Pagamento Mensalidade Abril"
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-white outline-none focus:border-yellow-500/50 transition-all hover:border-white/20"
                        />
                    </div>

                    {/* Linha 6: Notas */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-medium text-gray-500 tracking-widest ml-1">Observações Internas</label>
                        <textarea 
                            rows={3}
                            value={form.notas}
                            onChange={e => setForm({...form, notas: e.target.value})}
                            placeholder="Informações adicionais para auditoria..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-gray-400 outline-none focus:border-yellow-500/50 resize-none transition-all hover:border-white/20"
                        ></textarea>
                    </div>

                    {erro && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] uppercase font-medium tracking-widest text-center animate-pulse">
                            {erro}
                        </div>
                    )}
                </form>

                {/* Footer Buttons */}
                <div className="px-8 py-6 border-t border-white/5 bg-white/5 flex gap-4">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="flex-1 py-4 text-[10px] uppercase font-medium text-gray-500 hover:bg-white/5 rounded-xl transition-all tracking-widest"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={enviando}
                        className={`flex-[2] py-4 rounded-xl text-[11px] uppercase font-medium tracking-[0.2em] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 bg-yellow-500 hover:bg-yellow-400 text-black`}
                    >
                        {enviando ? 'Processando...' : isEdit ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                    </button>
                </div>
            </div>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(234, 179, 8, 0.2); }
                .color-scheme-dark { color-scheme: dark; }
            `}</style>
        </div>,
        document.body
    );
}

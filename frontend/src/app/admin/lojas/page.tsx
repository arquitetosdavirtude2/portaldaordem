'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

interface Loja {
    id: number;
    nome: string;
    numero: string;
    estado_id: number;
    estado_sigla: string;
    endereco: string | null;
    rito?: string | null;
    total_membros?: number;
}

interface Estado {
    id: number;
    sigla: string;
    nome: string;
}

const ESTADOS_STATIC: Estado[] = [
    { id: 1, sigla: 'AC', nome: 'Acre' }, { id: 2, sigla: 'AL', nome: 'Alagoas' }, { id: 3, sigla: 'AP', nome: 'Amapá' },
    { id: 4, sigla: 'AM', nome: 'Amazonas' }, { id: 5, sigla: 'BA', nome: 'Bahia' }, { id: 6, sigla: 'CE', nome: 'Ceará' },
    { id: 7, sigla: 'DF', nome: 'Distrito Federal' }, { id: 8, sigla: 'ES', nome: 'Espírito Santo' }, { id: 9, sigla: 'GO', nome: 'Goiás' },
    { id: 10, sigla: 'MA', nome: 'Maranhão' }, { id: 11, sigla: 'MT', nome: 'Mato Grosso' }, { id: 12, sigla: 'MS', nome: 'Mato Grosso do Sul' },
    { id: 13, sigla: 'MG', nome: 'Minas Gerais' }, { id: 14, sigla: 'PA', nome: 'Pará' }, { id: 15, sigla: 'PB', nome: 'Paraíba' },
    { id: 16, sigla: 'PR', nome: 'Paraná' }, { id: 17, sigla: 'PE', nome: 'Pernambuco' }, { id: 18, sigla: 'PI', nome: 'Piauí' },
    { id: 19, sigla: 'RJ', nome: 'Rio de Janeiro' }, { id: 20, sigla: 'RN', nome: 'Rio Grande do Norte' }, { id: 21, sigla: 'RS', nome: 'Rio Grande do Sul' },
    { id: 22, sigla: 'RO', nome: 'Rondônia' }, { id: 23, sigla: 'RR', nome: 'Roraima' }, { id: 24, sigla: 'SC', nome: 'Santa Catarina' },
    { id: 25, sigla: 'SP', nome: 'São Paulo' }, { id: 26, sigla: 'SE', nome: 'Sergipe' }, { id: 27, sigla: 'TO', nome: 'Tocantins' }
].sort((a, b) => a.nome.localeCompare(b.nome));

export default function LojasPage() {
    const router = useRouter();
    const [lojas, setLojas] = useState<Loja[]>([]);
    const [estados] = useState<Estado[]>(ESTADOS_STATIC);
    const [loading, setLoading] = useState(true);

    const [nome, setNome] = useState('');
    const [numero, setNumero] = useState('');
    const [estadoId, setEstadoId] = useState<number | ''>('');
    const [endereco, setEndereco] = useState('');
    const [rito, setRito] = useState<string>('');

    const [editingId, setEditingId] = useState<number | null>(null);
    const [msg, setMsg] = useState('');
    const [lojaParaDeletar, setLojaParaDeletar] = useState<Loja | null>(null);
    const [deletando, setDeletando] = useState(false);
    const [erroDelecao, setErroDelecao] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const [isModalAberto, setIsModalAberto] = useState(false);

    useEffect(() => { setIsMounted(true); }, []);

    useEffect(() => {
        const access = localStorage.getItem('acesso');
        if (!access) {
            router.push('/master-admin');
            return;
        }
        const userObj = JSON.parse(access);
        const isMaster = userObj.tipo === 'master';
        const isAdmin = userObj.role === 'admin';
        
        if (!isMaster && !isAdmin) {
            router.push('/login');
            return;
        }
        fetchData();
    }, [router]);

    const fetchData = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            const res = await fetch(`${apiUrl}/api/lojas`);
            if (res.ok) {
                setLojas(await res.json());
            }
        } catch (error) {
            console.error("Erro ao buscar lojas", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (loja: Loja) => {
        setEditingId(loja.id);
        setNome(loja.nome);
        setNumero(loja.numero);
        setEstadoId(loja.estado_id);
        setEndereco(loja.endereco || '');
        setRito(loja.rito || '');
        setIsModalAberto(true);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setNome('');
        setNumero('');
        setEstadoId('');
        setEndereco('');
        setRito('');
        setIsModalAberto(false);
        setMsg('');
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg('');

        if (!nome || !numero || !estadoId) {
            setMsg('⚠️ Preencha nome, número e estado.');
            return;
        }

        setLoading(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            const payload = {
                nome,
                numero,
                estado_id: Number(estadoId),
                endereco,
                rito: rito || null
            };

            const url = editingId ? `${apiUrl}/api/lojas/${editingId}` : `${apiUrl}/api/lojas`;
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setMsg(editingId ? '✅ Loja atualizada com sucesso!' : '✅ Loja cadastrada com sucesso!');
                setTimeout(() => {
                    handleCancelEdit();
                    fetchData();
                }, 1500);
            } else {
                const data = await res.json();
                setMsg(`❌ Erro: ${data.detail || 'Falha ao salvar'}`);
            }
        } catch (error) {
            setMsg('⚠️ Erro de conexão.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (loja: Loja) => {
        setLojaParaDeletar(loja);
        setErroDelecao('');
    };

    const executarDelecaoLoja = async () => {
        if (!lojaParaDeletar) return;
        setDeletando(true);
        setErroDelecao('');
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            const res = await fetch(`${apiUrl}/api/lojas/${lojaParaDeletar.id}`, { method: 'DELETE' });
            if (res.ok) {
                setLojas(lojas.filter(l => l.id !== lojaParaDeletar.id));
                setLojaParaDeletar(null);
            } else {
                const data = await res.json();
                setErroDelecao(data.detail || 'Erro ao excluir a loja.');
            }
        } catch (error) {
            setErroDelecao('Erro de conexão ao tentar excluir.');
            console.error(error);
        } finally {
            setDeletando(false);
        }
    };

    if (loading && !lojas.length) return (
        <div className="min-h-screen bg-masonic-blue flex items-center justify-center text-masonic-gold font-serif tracking-widest animate-pulse">
            Carregando Lojas...
        </div>
    );

    return (
        <div className="min-h-screen bg-masonic-blue text-gray-100 font-serif relative overflow-hidden selection:bg-masonic-gold selection:text-masonic-blue">
            <div className="absolute inset-0 bg-[url('/texture-noise.png')] opacity-5 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-masonic-gold/5 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto p-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 pb-6 border-b border-masonic-gold/20">
                    <div>
                        <h1 className="text-3xl text-masonic-gold font-bold uppercase tracking-[0.2em] drop-shadow-md">
                            Gestão de Lojas
                        </h1>
                        <p className="text-gray-400 text-xs uppercase tracking-[0.15em] mt-2">
                            CADASTRO DE LOJAS E ORIENTES
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-4 md:mt-0 justify-end">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-6 py-2 bg-blue-900/20 border border-blue-500/30 text-blue-400 rounded hover:bg-blue-900/40 transition-all text-[10px] uppercase tracking-widest hover:text-blue-300 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] font-bold flex items-center gap-2"
                        >
                            <span>🏠</span> Voltar ao Painel
                        </button>
                        <button
                            onClick={() => {
                                localStorage.removeItem('acesso');
                                router.push('/login');
                            }}
                            className="px-6 py-2 bg-red-900/20 border border-red-500/30 text-red-400 rounded hover:bg-red-900/40 transition-all text-[10px] uppercase tracking-widest hover:text-red-300 hover:shadow-[0_0_15px_rgba(220,38,38,0.2)] font-bold flex items-center gap-2"
                        >
                            <span>🚪</span> Sair
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-6 px-2">
                    <h2 className="text-sm font-bold text-masonic-gold uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-2 h-2 bg-masonic-gold rounded-full animate-pulse"></span>
                        Lojas Registradas
                    </h2>
                    <button
                        onClick={() => {
                            handleCancelEdit();
                            setIsModalAberto(true);
                        }}
                        className="px-6 py-2.5 bg-masonic-gold hover:bg-yellow-500 text-masonic-blue rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)] flex items-center gap-2 active:scale-95"
                    >
                        <span>➕</span> Nova Loja
                    </button>
                </div>

                {/* Table - Full width */}
                <div className="bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-black/40 text-masonic-gold uppercase text-[10px] tracking-[0.2em] border-b border-white/5">
                                    <th className="p-4 font-bold whitespace-nowrap">Loja</th>
                                    <th className="p-4 font-bold whitespace-nowrap">Estado</th>
                                    <th className="p-4 font-bold whitespace-nowrap">Rito</th>
                                    <th className="p-4 font-bold text-center whitespace-nowrap">Membros</th>
                                    <th className="p-4 font-bold whitespace-nowrap">Endereço</th>
                                    <th className="p-4 font-bold text-right whitespace-nowrap">Controle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {lojas.map(l => (
                                    <tr key={l.id} className="transition-colors group hover:bg-white/5">
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-200 font-bold text-sm">{l.nome}</span>
                                                <span className="text-xs text-gray-500 font-mono bg-black/30 px-2 py-0.5 rounded border border-white/5 flex-shrink-0">Nº {l.numero}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm font-bold text-gray-300 whitespace-nowrap">
                                            {l.estado_sigla}
                                        </td>
                                        <td className="p-4 text-xs whitespace-nowrap">
                                            {l.rito ? (
                                                <span className="bg-purple-900/10 text-purple-400 px-2 py-1 rounded text-[10px] uppercase font-bold border border-purple-500/20">
                                                    {l.rito}
                                                </span>
                                            ) : (
                                                <span className="text-gray-500 italic">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1 bg-masonic-gold/10 text-masonic-gold text-xs font-bold px-2.5 py-1 rounded-full border border-masonic-gold/20">
                                                👤 {l.total_membros ?? 0}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs text-gray-400 w-full max-w-xs truncate">
                                            {l.endereco || '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(l)} className="p-2 text-blue-400 hover:text-white hover:bg-blue-600 rounded-lg transition-all" title="Editar">✏️</button>
                                                <button onClick={() => handleDelete(l)} className="p-2 text-red-500 hover:text-white hover:bg-red-600 rounded-lg transition-all" title="Excluir">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {lojas.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-gray-500 text-sm italic">
                                            Nenhuma loja cadastrada.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal de Cadastro/Edição via Portal */}
            {isMounted && isModalAberto && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className={`relative z-20 bg-[#0f1d45] border rounded-2xl p-0 w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] ${editingId ? 'border-masonic-gold' : 'border-white/10'} transition-all duration-300 animate-in zoom-in duration-300`}>
                        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-black/20">
                            <h2 className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 ${editingId ? 'text-masonic-gold' : 'text-gray-200'}`}>
                                {editingId ? <><span>✏️</span> Editar Loja</> : <><span>➕</span> Nova Loja</>}
                            </h2>
                            <button 
                                onClick={handleCancelEdit} 
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="space-y-2">
                                    <label className="block text-[10px] text-masonic-gold/80 uppercase tracking-widest font-bold">Nome da Loja</label>
                                    <input
                                        type="text"
                                        value={nome}
                                        onChange={e => setNome(e.target.value)}
                                        placeholder="Ex: Acácia"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-masonic-gold focus:outline-none focus:bg-black/60 transition-all placeholder-gray-600 text-sm font-sans"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] text-masonic-gold/80 uppercase tracking-widest font-bold">Número</label>
                                    <input
                                        type="text"
                                        value={numero}
                                        onChange={e => setNumero(e.target.value)}
                                        placeholder="Ex: 123"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-masonic-gold focus:outline-none focus:bg-black/60 transition-all placeholder-gray-600 text-sm font-sans"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] text-masonic-gold/80 uppercase tracking-widest font-bold">Rito</label>
                                    <select
                                        value={rito}
                                        onChange={e => setRito(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-masonic-gold focus:outline-none appearance-none transition-all text-sm font-sans cursor-pointer"
                                    >
                                        <option value="" disabled>Selecione...</option>
                                        <option value="Emulação">Emulação</option>
                                        <option value="REAA">REAA</option>
                                        <option value="Adonhiramita">Adonhiramita</option>
                                        <option value="York">York</option>
                                        <option value="Moderno">Moderno</option>
                                        <option value="Brasileiro">Brasileiro</option>
                                        <option value="Schröder">Schröder</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] text-masonic-gold/80 uppercase tracking-widest font-bold">Estado</label>
                                    <select
                                        value={estadoId}
                                        onChange={e => setEstadoId(Number(e.target.value))}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-masonic-gold focus:outline-none appearance-none transition-all text-sm font-sans cursor-pointer"
                                    >
                                        <option value="" disabled>Selecione...</option>
                                        {estados.map(est => (
                                            <option key={est.id} value={est.id}>{est.nome} ({est.sigla})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="block text-[10px] text-masonic-gold/80 uppercase tracking-widest font-bold">Endereço (Opcional)</label>
                                    <input
                                        type="text"
                                        value={endereco}
                                        onChange={e => setEndereco(e.target.value)}
                                        placeholder="Endereço Completo"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-masonic-gold focus:outline-none focus:bg-black/60 transition-all placeholder-gray-600 text-sm font-sans"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                {msg && (
                                    <div className={`p-4 rounded-xl text-xs text-center border font-bold animate-in fade-in slide-in-from-top-2 ${msg.includes('✅') ? 'bg-green-900/20 text-green-400 border-green-500/30' : 'bg-red-900/20 text-red-400 border-red-500/30'}`}>
                                        {msg}
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <button 
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border border-white/10"
                                    >
                                        Cancelar
                                    </button>
                                    <button type="submit" className={`flex-[2] px-8 py-3 font-bold rounded-xl uppercase tracking-[0.2em] transition-all cursor-pointer text-xs shadow-lg whitespace-nowrap ${editingId ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-500 text-white border border-yellow-500/20'}`}>
                                        {editingId ? 'Salvar Alterações' : 'Cadastrar Loja'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal via Portal */}
            {isMounted && lojaParaDeletar && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md transition-all animate-in fade-in duration-300">
                    <div className="relative bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-900/20 text-red-500 mb-4 border border-red-500/20 mx-auto">
                                <span className="text-2xl">⚠️</span>
                            </div>
                            <h3 className="text-xl font-bold text-center text-red-500 font-serif mb-2 uppercase tracking-wide">
                                Confirmar Exclusão
                            </h3>
                            <p className="text-gray-400 text-center text-sm mb-6">
                                Tem certeza que deseja remover a Loja <br />
                                <strong className="text-gray-200 text-base">{lojaParaDeletar.nome} Nº {lojaParaDeletar.numero}</strong>?
                                <br /><br />
                                Esta ação não pode ser desfeita.
                            </p>
                            {erroDelecao && (
                                <div className="bg-red-900/30 border border-red-500/40 text-red-300 text-xs p-3 rounded-lg mb-4 text-center leading-relaxed">
                                    ⛔ {erroDelecao}
                                </div>
                            )}
                            <div className="flex gap-3 justify-center mt-4">
                                <button
                                    onClick={() => setLojaParaDeletar(null)}
                                    disabled={deletando}
                                    className="px-6 py-2.5 rounded border border-white/10 text-gray-300 hover:bg-white/5 transition-colors font-medium text-sm tracking-wide disabled:opacity-50"
                                >
                                    CANCELAR
                                </button>
                                {!erroDelecao && (
                                    <button
                                        onClick={executarDelecaoLoja}
                                        disabled={deletando}
                                        className="px-6 py-2.5 rounded bg-red-900/80 hover:bg-red-800 text-white border border-red-500/50 transition-all font-bold text-sm tracking-wider uppercase disabled:opacity-50"
                                    >
                                        {deletando ? 'REMOVENDO...' : 'SIM, EXCLUIR'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

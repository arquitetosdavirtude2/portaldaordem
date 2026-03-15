'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Loja {
    id: number;
    nome: string;
    numero: string;
    estado_id: number;
    estado_sigla: string;
    endereco: string | null;
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

    const [editingId, setEditingId] = useState<number | null>(null);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        const access = localStorage.getItem('acesso');
        if (!access) {
            router.push('/master-admin');
            return;
        }
        const userObj = JSON.parse(access);
        if (userObj.tipo !== 'master') {
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setNome('');
        setNumero('');
        setEstadoId('');
        setEndereco('');
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
                endereco
            };

            const url = editingId ? `${apiUrl}/api/lojas/${editingId}` : `${apiUrl}/api/lojas`;
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setMsg(editingId ? '✅ Loja atualizada!' : '✅ Loja cadastrada!');
                handleCancelEdit();
                fetchData();
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

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja apagar esta loja?')) return;
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            const res = await fetch(`${apiUrl}/api/lojas/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setLojas(lojas.filter(l => l.id !== id));
            }
        } catch (error) {
            console.error(error);
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
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 pb-6 border-b border-masonic-gold/20">
                    <div>
                        <h1 className="text-3xl text-masonic-gold font-bold uppercase tracking-[0.2em] drop-shadow-md">
                            Gestão de Lojas
                        </h1>
                        <p className="text-gray-400 text-xs uppercase tracking-[0.15em] mt-2">
                            CADASTRO DE LOJAS E ORIENTES
                        </p>
                    </div>
                    <div className="flex gap-4 mt-4 md:mt-0">
                        <button
                            onClick={() => router.push('/admin/users')}
                            className="px-6 py-2 bg-blue-900/20 border border-blue-500/30 text-blue-400 rounded hover:bg-blue-900/40 transition-all text-xs uppercase tracking-widest hover:text-blue-300"
                        >
                            Gestão de Usuários
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className={`lg:col-span-1 bg-black/30 backdrop-blur-xl rounded-2xl p-6 border ${editingId ? 'border-masonic-gold/50 shadow-[0_0_30px_rgba(212,175,55,0.1)]' : 'border-white/10'} h-fit transition-all duration-300`}>
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                            <h2 className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 ${editingId ? 'text-masonic-gold' : 'text-gray-200'}`}>
                                {editingId ? <><span>✏️</span> Editar Loja</> : <><span>➕</span> Nova Loja</>}
                            </h2>
                            {editingId && (
                                <button onClick={handleCancelEdit} className="text-[10px] text-red-400 hover:text-red-300 uppercase tracking-wider border border-red-900/50 px-2 py-1 rounded hover:bg-red-900/20 transition-colors">
                                    Cancelar
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleCreate} className="space-y-5">
                            <div className="space-y-1">
                                <label className="block text-[10px] text-masonic-gold/80 uppercase tracking-widest font-bold">Nome da Loja</label>
                                <input
                                    type="text"
                                    value={nome}
                                    onChange={e => setNome(e.target.value)}
                                    placeholder="Ex: Acácia"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-masonic-gold focus:outline-none focus:bg-black/60 transition-all placeholder-gray-600 text-sm font-sans"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] text-masonic-gold/80 uppercase tracking-widest font-bold">Número</label>
                                <input
                                    type="text"
                                    value={numero}
                                    onChange={e => setNumero(e.target.value)}
                                    placeholder="Ex: 123"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-masonic-gold focus:outline-none focus:bg-black/60 transition-all placeholder-gray-600 text-sm font-sans"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] text-masonic-gold/80 uppercase tracking-widest font-bold">Estado (Oriente)</label>
                                <select
                                    value={estadoId}
                                    onChange={e => setEstadoId(Number(e.target.value))}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-masonic-gold focus:outline-none appearance-none transition-all text-sm font-sans cursor-pointer"
                                >
                                    <option value="" disabled>Selecione um estado...</option>
                                    {estados.map(est => (
                                        <option key={est.id} value={est.id}>{est.nome} ({est.sigla})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] text-masonic-gold/80 uppercase tracking-widest font-bold">Endereço (Opcional)</label>
                                <input
                                    type="text"
                                    value={endereco}
                                    onChange={e => setEndereco(e.target.value)}
                                    placeholder="Endereço completo"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-masonic-gold focus:outline-none focus:bg-black/60 transition-all placeholder-gray-600 text-sm font-sans"
                                />
                            </div>

                            <div className="pt-4">
                                {msg && (
                                    <div className={`mb-4 p-3 rounded text-xs text-center border font-bold ${msg.includes('✅') ? 'bg-green-900/20 text-green-400 border-green-500/30' : 'bg-red-900/20 text-red-400 border-red-500/30'}`}>
                                        {msg}
                                    </div>
                                )}
                                <button type="submit" className={`w-full py-3 font-bold rounded-lg uppercase tracking-[0.2em] transition-all cursor-pointer text-xs shadow-lg ${editingId ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20' : 'bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-500 text-white border border-yellow-500/20 shadow-yellow-900/20'}`}>
                                    {editingId ? 'Salvar Alterações' : 'Cadastrar Loja'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-black/40 text-masonic-gold uppercase text-[10px] tracking-[0.2em] border-b border-white/5">
                                            <th className="p-4 font-bold">Loja</th>
                                            <th className="p-4 font-bold">Oriente (Estado)</th>
                                            <th className="p-4 font-bold">Endereço</th>
                                            <th className="p-4 font-bold text-right">Controle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {lojas.map(l => (
                                            <tr key={l.id} className="transition-colors group hover:bg-white/5">
                                                <td className="p-4">
                                                    <div className="text-gray-200 font-bold text-sm mb-1">{l.nome}</div>
                                                    <div className="text-xs text-gray-500 font-mono bg-black/30 inline-block px-2 py-0.5 rounded border border-white/5">N° {l.numero}</div>
                                                </td>
                                                <td className="p-4 text-sm font-bold text-gray-300">
                                                    {l.estado_sigla}
                                                </td>
                                                <td className="p-4 text-xs text-gray-400">
                                                    {l.endereco || '-'}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEdit(l)} className="p-2 text-blue-400 hover:text-white hover:bg-blue-600 rounded-lg transition-all" title="Editar">✏️</button>
                                                        <button onClick={() => handleDelete(l.id)} className="p-2 text-red-500 hover:text-white hover:bg-red-600 rounded-lg transition-all" title="Excluir">🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {lojas.length === 0 && !loading && (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-gray-500 text-sm italic">
                                                    Nenhuma loja cadastrada.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: number;
    nome: string;
    login: string;
    role: string;
    estados: string[];
}

interface Estado {
    id: number;
    sigla: string;
    nome: string;
}

// Static Fallback Data - Guaranteed to be present
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

export default function AdminUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    // Initialize with static data so it's NEVER empty
    const [estados, setEstados] = useState<Estado[]>(ESTADOS_STATIC);
    const [loading, setLoading] = useState(true);

    // Form state
    const [nome, setNome] = useState('');
    const [login, setLogin] = useState('');
    const [senha, setSenha] = useState('');
    const [role, setRole] = useState('mestre'); // 'mestre' or 'admin' 
    const [selectedEstados, setSelectedEstados] = useState<number[]>([]);

    // Dropdown state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

        // Click outside listener
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [router]);

    const fetchData = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            console.log("Fetching from:", apiUrl);

            // Fetch users
            const usersRes = await fetch(`${apiUrl}/api/admin/users`);
            if (usersRes.ok) {
                setUsers(await usersRes.json());
            }

            // Try to fetch states from API to get any updates, but we already have static
            try {
                const estadosRes = await fetch(`${apiUrl}/api/admin/estados`);
                if (estadosRes.ok) {
                    const estadosApi = await estadosRes.json();
                    if (estadosApi && estadosApi.length > 0) {
                        setEstados(estadosApi);
                        console.log("Estados atualizados via API");
                    }
                }
            } catch (e) {
                console.warn("Falha ao buscar estados da API, mantendo estático.", e);
            }

        } catch (error) {
            console.error("Erro ao buscar dados", error);
            const errString = error instanceof Error ? error.message : String(error);
            setMsg(`⚠️ Erro de conexão (Offline): ${errString}`);
        } finally {
            setLoading(false);
        }
    };

    const [editingId, setEditingId] = useState<number | null>(null);

    const handleEdit = (user: User) => {
        setEditingId(user.id);
        setNome(user.nome);
        setLogin(user.login);
        // Password field is left empty. If user wants to change, they type it. 
        // If they leave it empty, we send a placeholder or handle it in backend.
        // For security, we force re-entry or just assume empty = no change if we handle it that way.
        // Current Backend Logic: If password provided, it updates. If we send empty string, backend might set it to empty string?
        // Let's check backend logic again. 
        // Backend: `if user_update.senha: db_user.senha = user_update.senha`
        // So if we send "", it won't update. Perfect.
        setSenha('');
        setRole(user.role);

        // Find state IDs from Siglas
        const userStateIds = estados
            .filter(e => user.estados.includes(e.sigla))
            .map(e => e.id);
        setSelectedEstados(userStateIds);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setNome('');
        setLogin('');
        setSenha('');
        setRole('mestre');
        setSelectedEstados([]);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg('');

        if (selectedEstados.length === 0 && role !== 'admin') {
            setMsg('⚠️ Selecione pelo menos um estado.');
            return;
        }

        // Only require password for NEW users
        if (!editingId && !senha) {
            setMsg('⚠️ Senha é obrigatória para novos usuários.');
            return;
        }

        setLoading(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

            const payload = {
                nome,
                login,
                senha, // Send empty string if not changed. Backend checks `if user_update.senha:`
                role,
                estado_ids: selectedEstados
            };

            let method = 'POST';
            let url = `${apiUrl}/api/admin/users`;

            if (editingId) {
                method = 'PUT';
                url = `${apiUrl}/api/admin/users/${editingId}`;
            }

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setMsg(editingId ? '✅ Usuário atualizado com sucesso!' : '✅ Usuário criado com sucesso!');
                handleCancelEdit(); // Clear form and exit edit mode
                fetchData();
            } else {
                const data = await res.json();
                setMsg(`❌ Erro: ${data.detail || 'Falha ao salvar'}`);
            }

        } catch (error) {
            console.error("Erro ao salvar", error);
            const errString = error instanceof Error ? error.message : String(error);
            setMsg(`⚠️ Erro de conexão (Offline): ${errString}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza? Isso apagará o acesso deste usuário.')) return;

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
            const res = await fetch(`${apiUrl}/api/admin/users/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setUsers(users.filter(u => u.id !== id));
            }
        } catch (error) {
            console.error("Erro ao deletar", error);
        }
    };

    const toggleEstado = (id: number) => {
        if (selectedEstados.includes(id)) {
            setSelectedEstados(selectedEstados.filter(sid => sid !== id));
        } else {
            setSelectedEstados([...selectedEstados, id]);
        }
    };

    if (loading && !users.length) return (
        <div className="min-h-screen bg-masonic-blue flex items-center justify-center text-masonic-gold font-serif tracking-widest animate-pulse">
            Carregando Sistema...
        </div>
    );

    return (
        <div className="min-h-screen bg-masonic-blue text-gray-100 font-serif relative overflow-hidden selection:bg-masonic-gold selection:text-masonic-blue">

            {/* Background Texture/Overlay */}
            <div className="absolute inset-0 bg-[url('/texture-noise.png')] opacity-5 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-masonic-gold/5 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto p-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 pb-6 border-b border-masonic-gold/20">
                    <div>
                        <h1 className="text-3xl text-masonic-gold font-bold uppercase tracking-[0.2em] drop-shadow-md">
                            Gestão de Usuários
                        </h1>
                        <p className="text-gray-400 text-xs uppercase tracking-[0.15em] mt-2">
                            Cadastro de Grão-Mestrados Federais e Estaduais
                        </p>
                    </div>
                    <div className="flex gap-4 mt-4 md:mt-0">
                        {/* 'Voltar ao Painel' removed as per user request to avoid redirect loops */}
                        <button
                            onClick={() => {
                                localStorage.removeItem('acesso');
                                router.push('/master-admin');
                            }}
                            className="px-6 py-2 bg-red-900/20 border border-red-500/30 text-red-400 rounded hover:bg-red-900/40 transition-all text-xs uppercase tracking-widest hover:text-red-300 hover:shadow-[0_0_15px_rgba(220,38,38,0.2)]"
                        >
                            Sair (Admin)
                        </button>
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Form Column */}
                    <div className={`lg:col-span-1 bg-black/30 backdrop-blur-xl rounded-2xl p-6 border ${editingId ? 'border-masonic-gold/50 shadow-[0_0_30px_rgba(212,175,55,0.1)]' : 'border-white/10'} h-fit transition-all duration-300`}>
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                            <h2 className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 ${editingId ? 'text-masonic-gold' : 'text-gray-200'}`}>
                                {editingId ? (
                                    <><span>✏️</span> Editar Usuário</>
                                ) : (
                                    <><span>➕</span> Novo Cadastro</>
                                )}
                            </h2>
                            {editingId && (
                                <button onClick={handleCancelEdit} className="text-[10px] text-red-400 hover:text-red-300 uppercase tracking-wider border border-red-900/50 px-2 py-1 rounded hover:bg-red-900/20 transition-colors">
                                    Cancelar
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleCreate} className="space-y-5">
                            <div className="space-y-1">
                                <label className="block text-[10px] text-masonic-gold/80 uppercase tracking-widest font-bold">Nome Completo</label>
                                <input
                                    type="text"
                                    value={nome}
                                    onChange={e => setNome(e.target.value)}
                                    placeholder="Ex: Ir. João"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-masonic-gold focus:outline-none focus:bg-black/60 transition-all placeholder-gray-600 text-sm font-sans"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] text-masonic-gold/80 uppercase tracking-widest font-bold">Login de Acesso</label>
                                <input
                                    type="text"
                                    value={login}
                                    onChange={e => setLogin(e.target.value)}
                                    placeholder="Ex: joao.silva"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-masonic-gold focus:outline-none focus:bg-black/60 transition-all placeholder-gray-600 text-sm font-sans"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] text-masonic-gold/80 uppercase tracking-widest font-bold">
                                    {editingId ? 'Nova Senha (Opcional)' : 'Senha Inicial'}
                                </label>
                                <input
                                    type="password"
                                    value={senha}
                                    onChange={e => setSenha(e.target.value)}
                                    placeholder={editingId ? "Manter atual" : "******"}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-masonic-gold focus:outline-none focus:bg-black/60 transition-all placeholder-gray-600 text-sm font-sans"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] text-masonic-gold/80 uppercase tracking-widest font-bold">Perfil de Acesso</label>
                                <select
                                    value={role}
                                    onChange={e => setRole(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-masonic-gold focus:outline-none appearance-none transition-all text-sm font-sans cursor-pointer"
                                >
                                    <option value="mestre">Grão-Mestrado Estadual</option>
                                    <option value="admin">Grão-Mestrado Federal</option>
                                </select>
                            </div>

                            {/* Custom Multi-Select Dropdown */}
                            {role === 'mestre' && (
                                <div className="space-y-1 relative" ref={dropdownRef}>
                                    <label className="block text-[10px] text-masonic-gold/80 uppercase tracking-widest font-bold">Estados Permitidos</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-left text-white focus:border-masonic-gold focus:outline-none flex justify-between items-center cursor-pointer min-h-[46px] hover:bg-black/50 transition-colors"
                                    >
                                        <span className="truncate pr-4 text-sm">
                                            {selectedEstados.length > 0
                                                ? estados.filter(e => selectedEstados.includes(e.id)).map(e => e.sigla).join(', ')
                                                : <span className="text-gray-500 italic">Selecione os estados...</span>}
                                        </span>
                                        <span className="text-masonic-gold text-xs">▼</span>
                                    </button>

                                    {isDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-2 bg-gray-900 border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-h-60 overflow-y-auto custom-scrollbar p-2">
                                            <div className="grid grid-cols-2 gap-1">
                                                {estados.map(est => (
                                                    <label
                                                        key={est.id}
                                                        className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors border border-transparent ${selectedEstados.includes(est.id)
                                                            ? 'bg-masonic-gold/20 border-masonic-gold/30'
                                                            : 'hover:bg-white/5'
                                                            }`}
                                                    >
                                                        <div className={`w-3 h-3 rounded-sm border flex items-center justify-center mr-2 flex-shrink-0 ${selectedEstados.includes(est.id)
                                                            ? 'bg-masonic-gold border-masonic-gold'
                                                            : 'border-gray-600 bg-transparent'
                                                            }`}>
                                                            {selectedEstados.includes(est.id) && (
                                                                <span className="text-black text-[8px] font-bold">✓</span>
                                                            )}
                                                        </div>
                                                        <span className={`text-xs ${selectedEstados.includes(est.id) ? 'text-masonic-gold font-bold' : 'text-gray-400'}`}>
                                                            {est.nome}
                                                        </span>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedEstados.includes(est.id)}
                                                            onChange={() => toggleEstado(est.id)}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {role === 'admin' && (
                                <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20 text-center">
                                    <p className="text-blue-300 text-xs leading-relaxed">👑 Usuários <strong>Grão-Mestrado Federal</strong> possuem acesso irrestrito a todos os Orientes.</p>
                                </div>
                            )}

                            <div className="pt-4">
                                {msg && (
                                    <div className={`mb-4 p-3 rounded text-xs text-center border font-bold ${msg.includes('✅')
                                        ? 'bg-green-900/20 text-green-400 border-green-500/30'
                                        : 'bg-red-900/20 text-red-400 border-red-500/30'}`}>
                                        {msg}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className={`w-full py-3 font-bold rounded-lg uppercase tracking-[0.2em] transition-all cursor-pointer text-xs shadow-lg ${editingId
                                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
                                        : 'bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-500 text-white border border-yellow-500/20 shadow-yellow-900/20'
                                        }`}
                                >
                                    {editingId ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* List Column */}
                    <div className="lg:col-span-2">
                        <div className="bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-black/40 text-masonic-gold uppercase text-[10px] tracking-[0.2em] border-b border-white/5">
                                            <th className="p-4 font-bold">Credenciais</th>
                                            <th className="p-4 font-bold">Perfil</th>
                                            <th className="p-4 font-bold">Orientes Permitidos</th>
                                            <th className="p-4 font-bold text-right">Controle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {users.map(u => (
                                            <tr key={u.id} className={`transition-colors group ${editingId === u.id ? 'bg-masonic-gold/5' : 'hover:bg-white/5'}`}>
                                                <td className="p-4">
                                                    <div className="text-gray-200 font-bold text-sm mb-1">{u.nome}</div>
                                                    <div className="text-xs text-gray-500 font-mono bg-black/30 inline-block px-2 py-0.5 rounded border border-white/5">{u.login}</div>
                                                </td>
                                                <td className="p-4">
                                                    {u.role === 'admin' ? (
                                                        <span className="bg-masonic-gold/20 text-masonic-gold px-2 py-1 rounded text-[10px] uppercase tracking-wider border border-masonic-gold/30 font-bold shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                                                            👑 Grão-Mestrado Federal
                                                        </span>
                                                    ) : (
                                                        <span className="bg-blue-900/30 text-blue-300 px-2 py-1 rounded text-[10px] uppercase tracking-wider border border-blue-500/30 font-bold">
                                                            👑 Grão-Mestrado Estadual
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    {u.role === 'admin' ? (
                                                        <span className="text-gray-400 text-xs italic">Acesso Universal</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1 max-w-xs">
                                                            {u.estados && u.estados.length > 0 ? u.estados.map(sigla => (
                                                                <span key={sigla} className="bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded text-[10px] text-gray-300 border border-white/5 transition-colors cursor-default" title={ESTADOS_STATIC.find(e => e.sigla === sigla)?.nome}>
                                                                    {sigla}
                                                                </span>
                                                            )) : <span className="text-gray-600 text-xs">-</span>}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEdit(u)}
                                                            className="p-2 text-blue-400 hover:text-white hover:bg-blue-600 rounded-lg transition-all"
                                                            title="Editar"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(u.id)}
                                                            className="p-2 text-red-500 hover:text-white hover:bg-red-600 rounded-lg transition-all"
                                                            title="Excluir"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {users.length === 0 && !loading && (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-gray-500 text-sm italic">
                                                    Nenhum usuário cadastrado.
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

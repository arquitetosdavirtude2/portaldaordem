'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MasterAdminLogin() {
    const router = useRouter();
    const [login, setLogin] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/auth/admin-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, senha })
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('acesso', JSON.stringify({ tipo: 'master' }));
                router.push('/admin/users');
            } else {
                setErro(data.message);
            }
        } catch (error) {
            setErro('Erro de conexão');
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 font-mono">
            <div className="w-full max-w-sm">
                <h1 className="text-red-600 text-center text-xl mb-4 uppercase tracking-widest border-b border-red-900 pb-2">
                    Acesso Restrito
                </h1>

                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Admin Login"
                        value={login}
                        onChange={e => setLogin(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 text-red-500 p-2 text-center rounded focus:outline-none focus:border-red-600"
                    />
                    <input
                        type="password"
                        placeholder="Key"
                        value={senha}
                        onChange={e => setSenha(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 text-red-500 p-2 text-center rounded focus:outline-none focus:border-red-600"
                    />

                    {erro && <p className="text-red-500 text-xs text-center">{erro}</p>}

                    <button className="w-full bg-red-900/30 border border-red-900 text-red-600 py-2 hover:bg-red-900/50 transition uppercase text-xs tracking-widest">
                        Autenticar
                    </button>
                </form>
            </div>
        </div>
    );
}

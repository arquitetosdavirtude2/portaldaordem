'use client';

import { useState, useEffect, useRef } from 'react';

interface ModalMateriaisTrabalhoProps {
    conteudo: any;
    tipoMaterial: 'video' | 'pdf';
    onClose: () => void;
    onSuccess: () => void;
}

interface Material {
    id: number;
    conteudo_id: number;
    tipo: string;
    nome_arquivo: string;
    url: string;
    titulo: string | null;
    descricao: string | null;
    ordem: number;
    duracao_segundos: number | null;
    data_upload: string | null;
}

// ---- Upload Form Sub-Component ----
function FormUpload({ conteudoId, tipoMaterial, totalExistente, onUploaded }: {
    conteudoId: number; tipoMaterial: string; totalExistente: number; onUploaded: () => void;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [feedback, setFeedback] = useState<{msg: string, type: 'error'|'success'}|null>(null);

    const isVideo = tipoMaterial === 'video';

    const handleSubmit = async () => {
        if (!file || !titulo.trim()) {
            setFeedback({ msg: 'Título e arquivo são obrigatórios.', type: 'error' });
            return;
        }
        setLoading(true);
        setFeedback(null);
        try {
            const formData = new FormData();
            formData.append('conteudo_id', conteudoId.toString());
            formData.append('tipo', tipoMaterial);
            formData.append('file', file);
            formData.append('titulo', titulo.trim());
            if (descricao.trim()) formData.append('descricao', descricao.trim());
            formData.append('ordem', (totalExistente + 1).toString());

            const res = await fetch('/api/trabalhos/material/upload', { method: 'POST', body: formData });
            
            const rawText = await res.text();
            let data: any = null;
            try {
                if (rawText) data = JSON.parse(rawText);
            } catch {
                data = { message: rawText };
            }

            if (res.ok && data?.success !== false) {
                setFile(null);
                setTitulo('');
                setDescricao('');
                if (fileInputRef.current) fileInputRef.current.value = '';
                setFeedback({ msg: 'Material enviado com sucesso.', type: 'success' });
                onUploaded();
            } else {
                const errMsg = data?.message || data?.detail || 'Não foi possível enviar o material. Verifique o arquivo e tente novamente.';
                setFeedback({ msg: 'Não foi possível enviar: ' + errMsg, type: 'error' });
            }
        } catch (e) {
            console.error(e);
            setFeedback({ msg: 'Não foi possível enviar o material. Verifique sua conexão e tente novamente.', type: 'error' });
        } finally {
            setLoading(false);
            setTimeout(() => setFeedback(null), 5000);
        }
    };

    return (
        <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-xl p-5 space-y-4">
            <h4 className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest">
                Enviar Novo {isVideo ? 'Video' : 'Material de Apoio'}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Titulo *</label>
                    <input
                        value={titulo}
                        onChange={e => setTitulo(e.target.value)}
                        placeholder={isVideo ? 'Ex: Aula 01 - Introducao' : 'Ex: Manual do Aprendiz'}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500/40 transition-colors"
                    />
                </div>
                <div>
                    <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Descricao (opcional)</label>
                    <input
                        value={descricao}
                        onChange={e => setDescricao(e.target.value)}
                        placeholder="Breve descricao do conteudo..."
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500/40 transition-colors"
                    />
                </div>
            </div>

            {feedback && (
                <div className={`text-[10px] px-4 py-2 rounded-lg border font-bold uppercase tracking-wider ${feedback.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                    {feedback.msg}
                </div>
            )}

            <div className="flex items-center gap-4">
                <div
                    className="flex-1 border border-dashed border-white/10 hover:border-yellow-500/30 rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer transition-all group"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <span className="text-lg opacity-50 group-hover:opacity-100 transition-opacity">
                        {isVideo ? '🎬' : '📄'}
                    </span>
                    <span className="text-[10px] text-gray-400 group-hover:text-gray-200 transition-colors truncate">
                        {file ? file.name : `Clique para selecionar ${isVideo ? 'video' : 'documento'}...`}
                    </span>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept={isVideo ? 'video/mp4,video/webm,video/quicktime' : 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
                        onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
                    />
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={loading || !file || !titulo.trim()}
                    className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black text-[9px] font-bold uppercase tracking-widest rounded-lg cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                    {loading ? 'Enviando...' : 'Enviar'}
                </button>
            </div>
        </div>
    );
}

// ---- Edit Inline Form ----
function FormEditarMaterial({ material, onSaved, onCancel }: { material: Material; onSaved: () => void; onCancel: () => void }) {
    const [titulo, setTitulo] = useState(material.titulo || '');
    const [descricao, setDescricao] = useState(material.descricao || '');
    const [saving, setSaving] = useState(false);

    const [feedback, setFeedback] = useState<{msg: string, type: 'error'|'success'}|null>(null);

    const handleSave = async () => {
        setSaving(true);
        setFeedback(null);
        try {
            const formData = new FormData();
            formData.append('titulo', titulo.trim());
            formData.append('descricao', descricao.trim());
            const res = await fetch(`/api/trabalhos/material/${material.id}`, { method: 'PUT', body: formData });
            if (res.ok) {
                onSaved();
            } else {
                setFeedback({ msg: 'Erro ao salvar as alterações.', type: 'error' });
            }
        } catch (e) {
            console.error(e);
            setFeedback({ msg: 'Erro de conexão.', type: 'error' });
        }
        setSaving(false);
    };

    return (
        <div className="space-y-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-1">Titulo</label>
                    <input value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500" />
                </div>
                <div>
                    <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-1">Descricao</label>
                    <input value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500" />
                </div>
            </div>
            {feedback && (
                <div className="text-[9px] text-red-400 mt-2 font-bold uppercase">{feedback.msg}</div>
            )}
            <div className="flex gap-2 justify-end">
                <button onClick={onCancel} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-bold uppercase text-gray-400 cursor-pointer transition-all">Cancelar</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-[8px] font-bold uppercase cursor-pointer transition-all disabled:opacity-50">
                    {saving ? 'Salvando...' : 'Salvar'}
                </button>
            </div>
        </div>
    );
}


// ---- Main Component ----
export default function ModalMateriaisTrabalho({ conteudo, tipoMaterial, onClose, onSuccess }: ModalMateriaisTrabalhoProps) {
    const [materiais, setMateriais] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [excluindoId, setExcluindoId] = useState<number | null>(null);
    const [feedbackModal, setFeedbackModal] = useState<{msg: string, type: 'error'|'success'}|null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewType, setPreviewType] = useState<'video' | 'pdf'>('video');

    const isVideo = tipoMaterial === 'video';
    const tituloModal = isVideo ? 'Gestao de Videos' : 'Gestao de Materiais de Apoio';
    const iconModal = isVideo ? '🎬' : '📄';

    const loadMateriais = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/trabalhos/materiais/${conteudo.id}`);
            if (res.ok) {
                const data: Material[] = await res.json();
                // Filter by type
                const filtered = data.filter(m =>
                    isVideo ? m.tipo === 'video' : (m.tipo === 'pdf' || m.tipo === 'docx')
                );
                setMateriais(filtered.sort((a, b) => a.ordem - b.ordem));
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { loadMateriais(); }, [conteudo.id]);

    const handleReorder = async (materialId: number, direction: 'up' | 'down') => {
        const idx = materiais.findIndex(m => m.id === materialId);
        if (idx < 0) return;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= materiais.length) return;

        const a = materiais[idx];
        const b = materiais[swapIdx];

        // Swap orders via API
        try {
            const fd1 = new FormData(); fd1.append('ordem', b.ordem.toString());
            const fd2 = new FormData(); fd2.append('ordem', a.ordem.toString());
            await Promise.all([
                fetch(`/api/trabalhos/material/${a.id}`, { method: 'PUT', body: fd1 }),
                fetch(`/api/trabalhos/material/${b.id}`, { method: 'PUT', body: fd2 })
            ]);
            await loadMateriais();
            onSuccess();
        } catch (e) { console.error(e); }
    };

    const handleExcluir = async (materialId: number) => {
        try {
            const res = await fetch(`/api/trabalhos/material/${materialId}`, { method: 'DELETE' });
            if (res.ok) {
                setExcluindoId(null);
                setFeedbackModal({ msg: 'Material excluído com sucesso.', type: 'success' });
                await loadMateriais();
                onSuccess();
            } else {
                setFeedbackModal({ msg: 'Erro ao excluir material.', type: 'error' });
            }
        } catch (e) {
            console.error(e);
            setFeedbackModal({ msg: 'Erro de conexão.', type: 'error' });
        }
        setTimeout(() => setFeedbackModal(null), 3000);
    };

    const formatDate = (d: string | null) => {
        if (!d) return '---';
        try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
    };

    const formatDuration = (s: number | null) => {
        if (!s) return null;
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col relative z-10">
                {/* Header */}
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02] shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">{iconModal}</span>
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">{tituloModal}</h3>
                            <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">{conteudo.titulo}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] text-gray-500 font-bold uppercase">
                            {materiais.length} {isVideo ? (materiais.length === 1 ? 'video' : 'videos') : (materiais.length === 1 ? 'documento' : 'documentos')}
                        </span>
                        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 cursor-pointer transition-all">✕</button>
                    </div>
                </div>

                {/* Feedback Toast do Modal Principal */}
                {feedbackModal && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl border font-bold uppercase tracking-widest text-[10px] shadow-2xl backdrop-blur-md animate-fade-in"
                         style={{ 
                             backgroundColor: feedbackModal.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                             borderColor: feedbackModal.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)',
                             color: feedbackModal.type === 'error' ? '#f87171' : '#4ade80'
                         }}>
                        {feedbackModal.msg}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                    {/* Upload Form */}
                    <FormUpload
                        conteudoId={conteudo.id}
                        tipoMaterial={tipoMaterial}
                        totalExistente={materiais.length}
                        onUploaded={() => { loadMateriais(); onSuccess(); }}
                    />

                    {/* Materials List */}
                    {loading ? (
                        <div className="py-12 text-center text-gray-500 text-[10px] uppercase tracking-widest animate-pulse">
                            Carregando materiais...
                        </div>
                    ) : materiais.length === 0 ? (
                        <div className="py-16 text-center space-y-3 bg-white/[0.01] border border-white/5 rounded-xl">
                            <p className="text-2xl opacity-30">{isVideo ? '🎬' : '📄'}</p>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                                Nenhum {isVideo ? 'video cadastrado' : 'material de apoio cadastrado'} para este trabalho.
                            </p>
                            <p className="text-gray-600 text-[9px]">
                                {isVideo
                                    ? 'Envie o primeiro video para compor a sequencia de estudo.'
                                    : 'Envie o primeiro material para orientar o estudo do irmao.'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {materiais.map((m, idx) => (
                                <div key={m.id} className="bg-white/[0.02] hover:bg-white/[0.035] border border-white/5 hover:border-white/10 rounded-xl transition-all duration-200 group">
                                    <div className="px-4 py-3 flex items-start gap-3">
                                        {/* Order Badge */}
                                        <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center text-[9px] font-bold text-gray-500 shrink-0 mt-0.5">
                                            {String(idx + 1).padStart(2, '0')}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h5 className="text-[11px] font-bold text-gray-200 truncate">
                                                    {m.titulo || m.nome_arquivo}
                                                </h5>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[8px] text-gray-600 uppercase">{m.nome_arquivo}</span>
                                                {m.duracao_segundos && (
                                                    <>
                                                        <span className="text-gray-700">·</span>
                                                        <span className="text-[8px] text-gray-500">{formatDuration(m.duracao_segundos)}</span>
                                                    </>
                                                )}
                                                <span className="text-gray-700">·</span>
                                                <span className="text-[8px] text-gray-600">{formatDate(m.data_upload)}</span>
                                                {m.descricao && (
                                                    <>
                                                        <span className="text-gray-700">·</span>
                                                        <span className="text-[8px] text-gray-500 italic truncate max-w-[200px]">{m.descricao}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {/* Preview (apenas para pdf ou video) */}
                                            {(!m.nome_arquivo?.toLowerCase().endsWith('.docx') && !m.nome_arquivo?.toLowerCase().endsWith('.doc')) && (
                                                <button
                                                    onClick={() => { setPreviewUrl(`/api/trabalhos/materiais/${m.id}/arquivo?download=false`); setPreviewType(m.tipo === 'video' ? 'video' : 'pdf'); }}
                                                    className="p-1.5 bg-white/[0.03] hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 rounded-lg cursor-pointer transition-all"
                                                    title="Visualizar"
                                                >
                                                    <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                            )}
                                            {/* Download */}
                                            <a
                                                href={`/api/trabalhos/materiais/${m.id}/arquivo?download=true`}
                                                download
                                                className="p-1.5 bg-white/[0.03] hover:bg-green-500/10 border border-transparent hover:border-green-500/20 rounded-lg cursor-pointer transition-all flex items-center justify-center text-gray-400 group/down"
                                                title="Baixar Arquivo"
                                            >
                                                <svg className="w-3.5 h-3.5 opacity-50 group-hover/down:opacity-100 group-hover/down:text-green-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                            </a>
                                            {/* Edit */}
                                            <button
                                                onClick={() => setEditandoId(editandoId === m.id ? null : m.id)}
                                                className={`p-1.5 border rounded-lg cursor-pointer transition-all ${editandoId === m.id ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-white/[0.03] border-transparent hover:bg-yellow-500/10 hover:border-yellow-500/20'}`}
                                                title="Editar"
                                            >
                                                <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                            {/* Move Up */}
                                            <button
                                                onClick={() => handleReorder(m.id, 'up')}
                                                disabled={idx === 0}
                                                className="p-1.5 bg-white/[0.03] hover:bg-white/[0.06] border border-transparent rounded-lg cursor-pointer transition-all disabled:opacity-20 disabled:cursor-not-allowed text-gray-400 hover:text-white"
                                                title="Mover para cima"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                                </svg>
                                            </button>
                                            {/* Move Down */}
                                            <button
                                                onClick={() => handleReorder(m.id, 'down')}
                                                disabled={idx === materiais.length - 1}
                                                className="p-1.5 bg-white/[0.03] hover:bg-white/[0.06] border border-transparent rounded-lg cursor-pointer transition-all disabled:opacity-20 disabled:cursor-not-allowed text-gray-400 hover:text-white"
                                                title="Mover para baixo"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                                </svg>
                                            </button>
                                            {/* Delete */}
                                            <button
                                                onClick={() => setExcluindoId(m.id)}
                                                className="p-1.5 bg-white/[0.03] hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg cursor-pointer transition-all text-red-500/50 group-hover:text-red-500"
                                                title="Excluir"
                                            >
                                                <svg className="w-3.5 h-3.5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Inline Edit Form */}
                                    {editandoId === m.id && (
                                        <div className="px-4 pb-4">
                                            <FormEditarMaterial
                                                material={m}
                                                onSaved={() => { setEditandoId(null); loadMateriais(); onSuccess(); }}
                                                onCancel={() => setEditandoId(null)}
                                            />
                                        </div>
                                    )}

                                    {/* Delete Confirmation */}
                                    {excluindoId === m.id && (
                                        <div className="px-4 pb-4">
                                            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 space-y-3">
                                                <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Confirmar Exclusao</p>
                                                <p className="text-xs text-gray-300">
                                                    Tem certeza que deseja remover <strong className="text-white">{m.titulo || m.nome_arquivo}</strong>?
                                                </p>
                                                <p className="text-[9px] text-gray-500">
                                                    Essa acao removera o arquivo da sequencia de estudo deste trabalho.
                                                </p>
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => setExcluindoId(null)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-bold uppercase text-gray-400 cursor-pointer transition-all">
                                                        Cancelar
                                                    </button>
                                                    <button onClick={() => handleExcluir(m.id)} className="px-4 py-1.5 bg-red-500 hover:bg-red-400 text-white rounded-lg text-[8px] font-bold uppercase cursor-pointer transition-all">
                                                        Excluir Permanentemente
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Modal */}
            {previewUrl && (
                <div className="fixed inset-0 z-[350] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden w-full h-full flex flex-col relative">
                        <div className="p-4 flex justify-between items-center bg-white/[0.03] border-b border-white/5 shrink-0">
                            <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-2">
                                {previewType === 'video' ? '🎬 Preview do Video' : '📄 Leitor de Documentos'}
                            </h4>
                            <button onClick={() => setPreviewUrl(null)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer">✕</button>
                        </div>
                        <div className="flex-1 w-full">
                            {previewType === 'video' ? (
                                <video
                                    src={previewUrl}
                                    controls
                                    autoPlay
                                    className="w-full h-full bg-black"
                                />
                            ) : (
                                <iframe src={previewUrl} className="w-full h-full border-none bg-white" />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

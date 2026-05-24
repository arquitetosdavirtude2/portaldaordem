import { useState, useRef } from 'react';

interface ModalUploadMaterialProps {
    conteudoId: number;
    tipo: 'video' | 'pdf';
    onClose: () => void;
    onSuccess: () => void;
}

export default function ModalUploadMaterial({ conteudoId, tipo, onClose, onSuccess }: ModalUploadMaterialProps) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<{msg: string, type: 'error'|'success'}|null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        
        setLoading(true);
        setFeedback(null);
        try {
            const formData = new FormData();
            formData.append('conteudo_id', conteudoId.toString());
            formData.append('tipo', tipo);
            formData.append('file', file);

            const res = await fetch('/api/trabalhos/material/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json().catch(() => null);
                if (data && data.success === false) {
                    setFeedback({ msg: 'Erro ao enviar: ' + (data.message || 'Erro desconhecido'), type: 'error' });
                } else {
                    onSuccess();
                    onClose();
                }
            } else {
                setFeedback({ msg: 'Erro ao enviar arquivo', type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setFeedback({ msg: 'Erro ao enviar arquivo. Verifique sua conexão.', type: 'error' });
        } finally {
            setLoading(false);
            setTimeout(() => setFeedback(null), 5000);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md p-6 relative z-10">
                <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-6">
                    Enviar {tipo === 'video' ? 'Vídeo' : 'Material de Apoio'}
                </h3>

                {feedback && (
                    <div className={`text-[10px] px-4 py-2 mb-4 rounded-lg border font-bold uppercase tracking-wider ${feedback.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                        {feedback.msg}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div 
                        className="border-2 border-dashed border-white/10 hover:border-yellow-500/50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <span className="text-4xl mb-4">{tipo === 'video' ? '🎬' : '📄'}</span>
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                            {file ? file.name : 'Clique para selecionar o arquivo'}
                        </p>
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden"
                            accept={tipo === 'video' ? 'video/mp4,video/webm' : 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
                            onChange={e => {
                                if (e.target.files && e.target.files.length > 0) {
                                    setFile(e.target.files[0]);
                                }
                            }}
                        />
                    </div>

                    <div className="flex gap-4 mt-8">
                        <button type="button" onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
                            Cancelar
                        </button>
                        <button type="submit" disabled={!file || loading} className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50">
                            {loading ? 'Enviando...' : 'Enviar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

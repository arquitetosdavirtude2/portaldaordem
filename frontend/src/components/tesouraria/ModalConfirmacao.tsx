'use client';

interface ModalConfirmacaoProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    titulo: string;
    mensagem: string;
    tipo?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
}

export default function ModalConfirmacao({ 
    isOpen, 
    onClose, 
    onConfirm, 
    titulo, 
    mensagem, 
    tipo = 'danger',
    confirmText = 'Confirmar Exclusão',
    cancelText = 'Cancelar'
}: ModalConfirmacaoProps) {
    if (!isOpen) return null;

    const colors = {
        danger: 'text-red-500 border-red-500/20 bg-red-500/10',
        warning: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10',
        info: 'text-blue-500 border-blue-500/20 bg-blue-500/10'
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with extra blur and darkness */}
            <div 
                className="absolute inset-0 bg-[#0a1536]/80 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />
            
            <div className="relative w-full max-w-md bg-[#0f1d45] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                {/* Decorative gradients */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
                
                <div className="p-8 text-center">
                    {/* Icon section */}
                    <div className="mx-auto w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
                        {tipo === 'danger' && (
                            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        )}
                        {tipo === 'warning' && (
                            <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        )}
                    </div>

                    <h3 className="text-xl font-serif font-black text-white italic mb-2 uppercase tracking-tight">
                        {titulo}
                    </h3>
                    
                    <p className="text-sm text-gray-400 font-sans leading-relaxed mb-8 px-4">
                        {mensagem}
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={onClose}
                            className="py-3.5 px-6 rounded-xl border border-white/10 text-gray-400 text-[10px] uppercase font-black tracking-widest hover:bg-white/5 hover:text-white transition-all active:scale-95"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`py-3.5 px-6 rounded-xl text-black text-[10px] uppercase font-black tracking-widest transition-all active:scale-95 shadow-lg ${
                                tipo === 'danger' ? 'bg-red-500 hover:bg-red-400 shadow-red-500/20' : 
                                tipo === 'warning' ? 'bg-yellow-500 hover:bg-yellow-400 shadow-yellow-500/20' : 
                                'bg-blue-500 hover:bg-blue-400 shadow-blue-500/20'
                            }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

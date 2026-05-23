import React from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    loading?: boolean;
    isAlertOnly?: boolean; // If true, only shows the confirm button
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    onConfirm,
    onCancel,
    variant = 'warning',
    loading = false,
    isAlertOnly = false
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    // Define colors based on variant
    const getConfirmButtonStyles = () => {
        switch (variant) {
            case 'danger':
                return 'bg-red-500 hover:bg-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.2)]';
            case 'success':
                return 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]';
            case 'info':
                return 'bg-blue-500 hover:bg-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]';
            case 'warning':
            default:
                return 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_15px_rgba(234,179,8,0.2)]';
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity" 
                onClick={() => !loading && onCancel && onCancel()}
            ></div>

            {/* Modal Card */}
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0b0f] p-6 lg:p-8 shadow-2xl relative z-10 animate-fade-in-up">
                
                {/* Efeito luminoso no topo baseado na variante */}
                {variant === 'warning' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[200px] h-20 bg-yellow-500/10 blur-[40px] pointer-events-none"></div>
                )}
                {variant === 'danger' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[200px] h-20 bg-red-500/10 blur-[40px] pointer-events-none"></div>
                )}

                <h3 className="font-serif text-xl lg:text-2xl text-white font-bold tracking-tight mb-4 relative z-10">
                    {title}
                </h3>

                <div className="text-sm leading-relaxed text-gray-400 mb-8 relative z-10 font-medium">
                    {message}
                </div>

                <div className="flex gap-3 relative z-10">
                    {!isAlertOnly && onCancel && (
                        <button 
                            onClick={onCancel}
                            disabled={loading}
                            className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-gray-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {cancelLabel}
                        </button>
                    )}

                    <button 
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all transform hover:-translate-y-0.5 disabled:transform-none disabled:opacity-50 disabled:cursor-not-allowed ${getConfirmButtonStyles()}`}
                    >
                        {loading ? 'Aguarde...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, X } from 'lucide-react';

interface ResetarSenhaModalProps {
    isOpen: boolean;
    token: string | null;
    onClose: () => void;
}

const API_BASE_URL =
    typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8001/api'
        : ((import.meta as any).env?.VITE_API_URL || '/api');

const ResetarSenhaModal: React.FC<ResetarSenhaModalProps> = ({ isOpen, token, onClose }) => {
    const [isValidating, setIsValidating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTokenValid, setIsTokenValid] = useState(false);
    const [username, setUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (!isOpen || !token) return;
        let mounted = true;
        const validateToken = async () => {
            try {
                setIsValidating(true);
                setError('');
                const response = await fetch(`${API_BASE_URL}/auth/validar-token/${encodeURIComponent(token)}`);
                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || 'Token inválido ou expirado.');
                }

                if (!mounted) return;
                setIsTokenValid(true);
                setUsername(result.username || '');
            } catch (validationError: any) {
                if (!mounted) return;
                setIsTokenValid(false);
                setError(validationError.message || 'Token inválido ou expirado.');
            } finally {
                if (mounted) setIsValidating(false);
            }
        };
        validateToken();
        return () => {
            mounted = false;
        };
    }, [isOpen, token]);

    if (!isOpen) return null;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (!newPassword || !confirmPassword) {
            setError('Preencha os dois campos de senha.');
            return;
        }
        if (newPassword.length < 6) {
            setError('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await fetch(`${API_BASE_URL}/auth/resetar-senha`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    newPassword: newPassword
                })
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Não foi possível redefinir a senha.');
            }
            setSuccess(result.message || 'Senha redefinida com sucesso.');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => onClose(), 2000);
        } catch (submitError: any) {
            setError(submitError.message || 'Erro ao redefinir senha.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={(event) => {
                if (event.target === event.currentTarget && !isSubmitting) onClose();
            }}
        >
            <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-amber-100 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-amber-50 rounded-t-xl">
                    <h2 className="text-lg font-semibold text-amber-900 flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-amber-600" />
                        Redefinir senha
                    </h2>
                    <button
                        onClick={() => {
                            if (!isSubmitting) onClose();
                        }}
                        className="p-2 rounded-full text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {isValidating ? (
                        <p className="text-sm text-gray-600 animate-pulse">Validando token de recuperação...</p>
                    ) : null}

                    {!isValidating && isTokenValid && !success ? (
                        <p className="text-sm text-gray-600">
                            Olá{username ? `, ${username}` : ''}. Defina sua nova senha para continuar.
                        </p>
                    ) : null}

                    {error ? <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-100">{error}</p> : null}
                    {success ? <p className="text-sm text-green-600 bg-green-50 p-2 rounded-md border border-green-100">{success}</p> : null}

                    {!isValidating && isTokenValid && !success ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(event) => setNewPassword(event.target.value)}
                                        className="w-full px-3 py-2 pr-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                                        placeholder="Digite a nova senha"
                                        autoComplete="new-password"
                                        disabled={isSubmitting}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword((prev) => !prev)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 outline-none"
                                    >
                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        className="w-full px-3 py-2 pr-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                                        placeholder="Digite novamente a nova senha"
                                        autoComplete="new-password"
                                        disabled={isSubmitting}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 outline-none"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : null}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            disabled={isSubmitting}
                        >
                            Recusar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 font-medium text-white bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 transition-all shadow-sm"
                            disabled={isSubmitting || isValidating || !isTokenValid || !!success}
                        >
                            {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetarSenhaModal;

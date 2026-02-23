import React, { useState } from 'react';
import { Mail, User, X } from 'lucide-react';

interface EsqueciSenhaModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const API_BASE_URL =
    typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8001/api'
        : ((import.meta as any).env?.VITE_API_URL || '/api');

const EsqueciSenhaModal: React.FC<EsqueciSenhaModalProps> = ({ isOpen, onClose }) => {
    const [emailOuUsername, setEmailOuUsername] = useState('');
    const [usernameAuxiliar, setUsernameAuxiliar] = useState('');
    const [showUsernameAuxiliar, setShowUsernameAuxiliar] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    if (!isOpen) return null;

    const handleClose = () => {
        if (isSubmitting) return;
        setError('');
        setSuccess('');
        setEmailOuUsername('');
        setUsernameAuxiliar('');
        setShowUsernameAuxiliar(false);
        onClose();
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (!emailOuUsername.trim()) {
            setError('Informe seu email ou nome de usuário.');
            return;
        }

        if (showUsernameAuxiliar && !usernameAuxiliar.trim()) {
            setError('Informe também o nome de usuário.');
            return;
        }

        try {
            setIsSubmitting(true);

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const body: { login?: string } = {};

            if (showUsernameAuxiliar) {
                body.login = usernameAuxiliar.trim(); // Se pediu o user extra, usa o user extra
            } else {
                body.login = emailOuUsername.trim().toLowerCase();
            }

            const response = await fetch(`${API_BASE_URL}/auth/recuperar-senha`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const result = await response.json();
            if (!response.ok) {
                if (result.error === 'MULTIPLE_USERS') {
                    setShowUsernameAuxiliar(true);
                    setError(result.message || 'Este email está associado a múltiplas contas. Informe também o nome de usuário.');
                    return;
                }
                throw new Error(result.error || 'Não foi possível processar a solicitação.');
            }

            setSuccess(
                result.message ||
                'Se as informações estiverem corretas, você receberá um e-mail com as instruções para redefinir sua senha.'
            );
            setUsernameAuxiliar('');
            setShowUsernameAuxiliar(false);
            setEmailOuUsername('');
        } catch (requestError: any) {
            setError(requestError.message || 'Erro ao solicitar recuperação de senha.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={(event) => {
                if (event.target === event.currentTarget) handleClose();
            }}
        >
            <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-amber-100 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-amber-50 rounded-t-xl">
                    <h2 className="text-lg font-semibold text-amber-900 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-amber-600" />
                        Recuperar senha
                    </h2>
                    <button onClick={handleClose} className="p-2 rounded-full text-amber-700 hover:bg-amber-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    <p className="text-sm text-gray-600">
                        Digite seu email ou nome de usuário. Você receberá um link para redefinir sua senha.
                    </p>

                    {error ? <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-100">{error}</p> : null}
                    {success ? <p className="text-sm text-green-600 bg-green-50 p-2 rounded-md border border-green-100">{success}</p> : null}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {showUsernameAuxiliar ? 'Email' : 'Email ou nome de usuário'}
                        </label>
                        <input
                            type="text"
                            value={emailOuUsername}
                            onChange={(event) => setEmailOuUsername(event.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                            placeholder="Digite seu email ou usuário"
                            disabled={isSubmitting || showUsernameAuxiliar}
                        />
                    </div>

                    {showUsernameAuxiliar ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome de usuário</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={usernameAuxiliar}
                                    onChange={(event) => setUsernameAuxiliar(event.target.value)}
                                    className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                                    placeholder="Digite o nome de usuário"
                                    disabled={isSubmitting}
                                />
                                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>
                    ) : null}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 font-medium text-white bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 transition-all shadow-sm"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Enviando...' : 'Enviar link'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EsqueciSenhaModal;

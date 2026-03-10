import React from 'react';
import './PasswordStrengthIndicator.css';

interface PasswordStrength {
  score: number; // 0-5
  strength: 'muito fraca' | 'fraca' | 'média' | 'forte' | 'muito forte';
  feedback: string[];
  color: string;
  percentage: number;
}

interface Props {
  password: string;
  showFeedback?: boolean;
  compact?: boolean;
}

const PasswordStrengthIndicator: React.FC<Props> = ({
  password,
  showFeedback = true,
  compact = false
}) => {
  const calculateStrength = (pwd: string): PasswordStrength => {
    if (!pwd) {
      return {
        score: 0,
        strength: 'muito fraca',
        feedback: ['Digite uma senha'],
        color: '#d32f2f',
        percentage: 0
      };
    }

    let score = 0;
    const feedback: string[] = [];

    // Critério 1: Comprimento
    if (pwd.length >= 8) {
      score++;
    } else {
      feedback.push('Use pelo menos 8 caracteres');
    }

    if (pwd.length >= 12) {
      score++;
    }

    // Critério 2: Letras maiúsculas
    if (/[A-Z]/.test(pwd)) {
      score++;
    } else {
      feedback.push('Adicione letras MAIÚSCULAS');
    }

    // Critério 3: Letras minúsculas
    if (/[a-z]/.test(pwd)) {
      score++;
    } else {
      feedback.push('Adicione letras minúsculas');
    }

    // Critério 4: Números
    if (/[0-9]/.test(pwd)) {
      score++;
    } else {
      feedback.push('Adicione números');
    }

    // Critério 5: Caracteres especiais
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
      score++;
    } else {
      feedback.push('Adicione caracteres especiais (!@#$%&*)');
    }

    // Penalidades
    // Sequências comuns
    const commonSequences = ['123', 'abc', 'qwerty', 'password', 'admin', '000', '111'];
    if (commonSequences.some(seq => pwd.toLowerCase().includes(seq))) {
      score = Math.max(0, score - 1);
      feedback.push('Evite sequências comuns');
    }

    // Repetições
    if (/(.)\1{2,}/.test(pwd)) {
      score = Math.max(0, score - 1);
      feedback.push('Evite caracteres repetidos');
    }

    // Determinar força
    let strength: PasswordStrength['strength'];
    let color: string;
    let percentage: number;

    if (score === 0) {
      strength = 'muito fraca';
      color = '#d32f2f';
      percentage = 10;
    } else if (score <= 2) {
      strength = 'fraca';
      color = '#f57c00';
      percentage = 30;
    } else if (score === 3) {
      strength = 'média';
      color = '#fbc02d';
      percentage = 50;
    } else if (score === 4) {
      strength = 'forte';
      color = '#7cb342';
      percentage = 75;
    } else {
      strength = 'muito forte';
      color = '#388e3c';
      percentage = 100;
    }

    return {
      score,
      strength,
      feedback,
      color,
      percentage
    };
  };

  const result = calculateStrength(password);

  if (compact) {
    return (
      <div className="password-strength-compact">
        <div className="strength-bar-compact">
          <div
            className="strength-bar-fill-compact"
            style={{
              width: `${result.percentage}%`,
              backgroundColor: result.color
            }}
          />
        </div>
        <span className="strength-label-compact" style={{ color: result.color }}>
          {result.strength}
        </span>
      </div>
    );
  }

  return (
    <div className="password-strength-indicator">
      <div className="strength-header">
        <span className="strength-label">Força da senha:</span>
        <span className="strength-value" style={{ color: result.color }}>
          {result.strength.toUpperCase()}
        </span>
      </div>

      <div className="strength-bar">
        <div
          className="strength-bar-fill"
          style={{
            width: `${result.percentage}%`,
            backgroundColor: result.color
          }}
        >
          <span className="strength-percentage">{result.percentage}%</span>
        </div>
      </div>

      {showFeedback && result.feedback.length > 0 && (
        <div className="strength-feedback">
          <div className="feedback-title">
            {result.score >= 5 ? '✅ Senha forte!' : '💡 Sugestões para melhorar:'}
          </div>
          <ul className="feedback-list">
            {result.feedback.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {result.score >= 5 && showFeedback && (
        <div className="strength-success">
          ✅ Excelente! Sua senha atende todos os requisitos de segurança.
        </div>
      )}

      <div className="strength-requirements">
        <div className="requirement-title">Requisitos:</div>
        <div className="requirement-grid">
          <div className={`requirement-item ${password.length >= 8 ? 'met' : 'unmet'}`}>
            {password.length >= 8 ? '✓' : '○'} 8+ caracteres
          </div>
          <div className={`requirement-item ${/[A-Z]/.test(password) ? 'met' : 'unmet'}`}>
            {/[A-Z]/.test(password) ? '✓' : '○'} Maiúsculas
          </div>
          <div className={`requirement-item ${/[a-z]/.test(password) ? 'met' : 'unmet'}`}>
            {/[a-z]/.test(password) ? '✓' : '○'} Minúsculas
          </div>
          <div className={`requirement-item ${/[0-9]/.test(password) ? 'met' : 'unmet'}`}>
            {/[0-9]/.test(password) ? '✓' : '○'} Números
          </div>
          <div className={`requirement-item ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'met' : 'unmet'}`}>
            {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? '✓' : '○'} Especiais
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;

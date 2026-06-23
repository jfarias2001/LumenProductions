import {
  VALIDATION_THRESHOLDS,
  ValidationVerdict,
} from '@content-engine/shared';

export interface ValidationScores {
  dorQuente: number;
  clareza: number;
  contraste: number;
  especificidadeAgencia: number;
  potencialComentarios: number;
  potencialComercial: number;
}

export function calculateValidation(scores: ValidationScores): { total: number; verdict: ValidationVerdict } {
  const total =
    scores.dorQuente +
    scores.clareza +
    scores.contraste +
    scores.especificidadeAgencia +
    scores.potencialComentarios +
    scores.potencialComercial;

  let verdict: ValidationVerdict;
  if (total <= VALIDATION_THRESHOLDS.DESCARTAR_MAX) {
    verdict = ValidationVerdict.DESCARTAR;
  } else if (total <= VALIDATION_THRESHOLDS.MELHORAR_MAX) {
    verdict = ValidationVerdict.MELHORAR_ANGULO;
  } else {
    verdict = ValidationVerdict.SEGUIR_ROTEIRO;
  }

  return { total, verdict };
}

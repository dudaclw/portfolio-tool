'use client';

import { useCallback, useEffect, useState } from 'react';
import { chamarApi, ErroDaApi } from './api';

interface Estado<T> {
  carregando: boolean;
  dados: T | null;
  erro: string | null;
}

/** Carrega um recurso de GET /api/v1{caminho} e permite recarregar. */
export function useRecurso<T>(caminho: string) {
  const [estado, setEstado] = useState<Estado<T>>({ carregando: true, dados: null, erro: null });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    chamarApi<T>(caminho).then(
      (dados) => {
        if (ativo) setEstado({ carregando: false, dados, erro: null });
      },
      (erro: unknown) => {
        const mensagem =
          erro instanceof ErroDaApi ? erro.message : 'Algo deu errado. Tente novamente.';
        if (ativo) setEstado({ carregando: false, dados: null, erro: mensagem });
      },
    );
    return () => {
      ativo = false;
    };
  }, [caminho, tentativa]);

  const recarregar = useCallback(() => {
    setEstado((atual) => ({ ...atual, carregando: true }));
    setTentativa((n) => n + 1);
  }, []);

  return { ...estado, recarregar };
}

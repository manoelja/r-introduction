import { describe, it, expect } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from '../components/Dashboard/Dashboard';
import '../i18n';

describe('Filtro UF — regressão', () => {
  it('selecionar UF GO aplica o filtro e mostra apenas GO no gráfico', async () => {
    render(<Dashboard />);

    // Abre o sub-filtro UF (2º botão primário)
    const primarios = document.querySelectorAll('.primary-filter-btn');
    fireEvent.click(primarios[1]);

    // Clica na UF GO
    const goBtn = Array.from(document.querySelectorAll('.uf-btns .control-btn')).find(
      (b) => b.textContent?.trim() === 'GO',
    ) as HTMLButtonElement;
    fireEvent.click(goBtn);

    await waitFor(() => {
      const titulo = document.querySelector('.chart-title');
      expect(titulo?.textContent).toContain('Selected states');
      const linhas = Array.from(document.querySelectorAll('.bar-label')).map((l) => l.textContent);
      expect(linhas).toEqual(['GO']);
    });
  });
});

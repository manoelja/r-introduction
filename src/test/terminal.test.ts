import { describe, it, expect } from 'vitest';
import { executarR, executarDados } from '../components/Footer/terminalLogic';

const texto = (linhas: { text: string }[]) => linhas.map((l) => l.text).join('\n');

describe('Terminal — shell R (respostas reais)', () => {
  it('max(goiania$casos_acumulados) retorna 216.065', () => {
    const out = executarR('max(goiania$casos_acumulados)');
    expect(texto(out)).toContain('216.065');
  });

  it('sum(goiania$obitos_novos) retorna 1.850', () => {
    const out = executarR('sum(goiania$obitos_novos)');
    expect(texto(out)).toContain('1.850');
  });

  it('nrow(goiania) retorna 52', () => {
    const out = executarR('nrow(goiania)');
    expect(texto(out)).toContain('[1] 52');
  });

  it('head(goiania) lista as semanas 1-5', () => {
    const out = executarR('head(goiania)');
    const t = texto(out);
    expect(t).toContain('1');
    expect(t).toContain('5');
  });

  it('group_by(regiao) lista as 5 regiões', () => {
    const out = executarR('group_by(regiao)');
    for (const reg of ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul']) {
      expect(texto(out)).toContain(reg);
    }
  });

  it('filter(goiania, semana == 20) retorna uma linha', () => {
    const out = executarR('filter(goiania, semana == 20)');
    expect(out.length).toBeGreaterThan(1);
  });

  it('comando desconhecido retorna erro', () => {
    const out = executarR('foo()');
    expect(out[0].type).toBe('error');
  });
});

describe('Terminal — shell Dados (consultas em português)', () => {
  it('goiania mostra os totais reais do Item 6', () => {
    const out = executarDados('goiania');
    const t = texto(out);
    expect(t).toContain('216.065');
    expect(t).toContain('6.991');
    expect(t).toContain('42.422');
    expect(t).toContain('1.850');
  });

  it('resumo mostra a visão geral da base', () => {
    const out = executarDados('resumo');
    const t = texto(out);
    expect(t).toContain('289.640');
    expect(t).toContain('5.570');
  });

  it('top estados lista as 5 maiores UFs', () => {
    const out = executarDados('top estados');
    const t = texto(out);
    expect(t).toContain('SP');
    expect(out.filter((l) => l.type === 'output').length).toBeGreaterThanOrEqual(5);
  });

  it('regiao sudeste mostra totais da região', () => {
    const out = executarDados('regiao sudeste');
    const t = texto(out);
    expect(t).toContain('Sudeste');
    expect(out.some((l) => l.type === 'success')).toBe(true);
  });

  it('regiao inexistente retorna erro', () => {
    const out = executarDados('regiao lua');
    expect(out[0].type).toBe('error');
  });

  it('semana 20 retorna a semana de Goiânia', () => {
    const out = executarDados('semana 20');
    expect(out.some((l) => l.type === 'success')).toBe(true);
  });

  it('metro x interior compara os dois grupos', () => {
    const out = executarDados('metro x interior');
    const t = texto(out);
    expect(t).toContain('Interior');
    expect(t).toContain('Reg. Metropolitana');
  });
});

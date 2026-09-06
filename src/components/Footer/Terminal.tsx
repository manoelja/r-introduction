import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Command, Search, Terminal as TerminalIcon } from 'lucide-react';
import { executarR, executarDados, type Line } from './terminalLogic';
import './Terminal.css';

type Shell = 'r' | 'dados';

const CHIPS: Record<Shell, string[]> = {
  r: [
    'head(goiania)',
    'summary(goiania)',
    'max(goiania$casos_acumulados)',
    'sum(goiania$casos_novos)',
    'group_by(regiao)',
    'table(metro_interior)',
    'top(uf)',
    'filter(goiania, semana == 20)',
    'ajuda()',
  ],
  dados: ['goiania', 'resumo', 'top estados', 'regiao sudeste', 'semana 20', 'metro x interior', 'ajuda'],
};

const Terminal = () => {
  const { t } = useTranslation();
  const [shell, setShell] = useState<Shell>('r');
  const [history, setHistory] = useState<Line[]>([
    { type: 'info', text: '> Terminal da análise COVID-19 · Goiânia 2021' },
    { type: 'info', text: '> Escolha a aba R ou Dados e digite ajuda.' },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [expandedHeight, setExpandedHeight] = useState<number | null>(null);
  const measuredRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // No 1º comando, mede a altura real da saída (como a referência: ajusta ao conteúdo, máx 300px)
    const last = history[history.length - 1];
    const hasResult = !!last && last.type !== 'input';
    if (expanded && !measuredRef.current && hasResult && contentRef.current) {
      measuredRef.current = true;
      setExpandedHeight(Math.min(contentRef.current.scrollHeight, 300));
    }
    // Mantém o final da saída sempre visível
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [history, expanded]);

  const getPrompt = () => (shell === 'r' ? 'R > ' : 'DADOS > ');

  const run = (raw: string) => {
    const cmd = raw.trim();
    if (!cmd || isProcessing) return;
    setHistory((prev) => [...prev, { type: 'input', text: `${getPrompt()}${cmd}` }]);
    setInput('');

    if (/^(limpar|clear)$/.test(cmd)) {
      setHistory([]);
      inputRef.current?.focus();
      return;
    }

    // Expande (altura fixa) apenas no primeiro comando executado
    if (!expanded) setExpanded(true);

    setIsProcessing(true);
    setTimeout(() => {
      const resultado = shell === 'r' ? executarR(cmd) : executarDados(cmd);
      setHistory((prev) => [...prev, ...resultado]);
      setIsProcessing(false);
      inputRef.current?.focus();
    }, 150);
  };

  const focusInput = () => inputRef.current?.focus();

  return (
    <div className={`covid-terminal${expanded ? ' expanded' : ''}`}>
      <div className="terminal-header">
        <div className="dot red"></div>
        <div className="dot yellow"></div>
        <div className="dot green"></div>
        <span className="terminal-label">COVID_ANALYSIS.SH</span>
      </div>

      <div className="shell-selector">
        <button className={`shell-btn ${shell === 'r' ? 'active' : ''}`} onClick={() => { setShell('r'); setHistory([]); setExpanded(false); setExpandedHeight(null); measuredRef.current = false; }}>
          <Command size={14} /> R
        </button>
        <button className={`shell-btn ${shell === 'dados' ? 'active' : ''}`} onClick={() => { setShell('dados'); setHistory([]); setExpanded(false); setExpandedHeight(null); measuredRef.current = false; }}>
          <Search size={14} /> {t('footer.tab_dados')}
        </button>
      </div>

      <div
        className={`terminal-content${expanded ? ' expanded' : ''}`}
        ref={contentRef}
        style={expandedHeight ? { height: expandedHeight } : undefined}
        onClick={focusInput}
      >
        {history.map((line, i) => (
          <div key={i} className={`terminal-line terminal-${line.type}`}>
            {line.text}
          </div>
        ))}
        <div className="terminal-input-line">
          <span className="terminal-prompt">{getPrompt()}</span>
          <input
            ref={inputRef}
            type="text"
            id="terminal-input"
            name="terminal-input"
            className="terminal-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run(input)}
            disabled={isProcessing}
            spellCheck={false}
            autoComplete="off"
            placeholder={isProcessing ? 'processando...' : t('footer.terminal_placeholder')}
          />
          {!isProcessing && <span className="terminal-cursor"></span>}
        </div>
      </div>

      <div className="terminal-chips">
        {CHIPS[shell].map((chip) => (
          <button key={chip} className="terminal-chip" onClick={() => run(chip)}>
            <TerminalIcon size={10} />
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Terminal;

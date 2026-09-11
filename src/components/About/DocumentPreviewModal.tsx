import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Download, FileText, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './DocumentPreviewModal.css';

export interface SummarySection {
  heading: string;
  items: string[];
}

export interface DocInfo {
  name: string;
  /** Nome-base usado no arquivo gerado (ex.: 'Resumo_Tecnico'). */
  slug: string;
  summary: SummarySection[];
}

interface DocumentPreviewModalProps {
  doc: DocInfo | null;
  onClose: () => void;
}

/** A4 retrato em 96 DPI — usado na cópia off-screen que gera o arquivo. */
const A4_W = 794;
const A4_H = 1123;

const normalizeLang = (lang: string): string => {
  const base = lang.split('-')[0].toLowerCase();
  return ['pt', 'en', 'es'].includes(base) ? base : 'pt';
};

/** Cor de destaque de acordo com o tema. */
const getAccentColor = (): string =>
  document.documentElement.classList.contains('light-theme') ? '#0891b2' : '#06b6d4';

/** Estilos aplicados APENAS à cópia off-screen usada para gerar o PDF/PNG. */
const getDocPrintStyles = (accentColor: string): string => `
  .doc-pdf-container * { box-sizing: border-box; margin: 0; padding: 0; }
  .doc-pdf-container {
    width: ${A4_W}px;
    min-height: ${A4_H}px;
    padding: 42px 48px;
    background: #ffffff;
    color: #1a1a2e;
    font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .doc-paper {
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 0;
    box-shadow: none;
  }
  .doc-paper-header {
    margin-bottom: 26px;
    padding-bottom: 18px;
    border-bottom: 2px solid ${accentColor};
  }
  .doc-paper-title {
    font-size: 23px;
    font-weight: 900;
    letter-spacing: -0.5px;
    color: #1a1a2e;
  }
  .doc-paper-subtitle {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: #64748b;
    margin-top: 6px;
  }
  .doc-summary-section { margin-bottom: 20px; }
  .doc-summary-heading {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: ${accentColor};
    margin-bottom: 8px;
  }
  .doc-summary-heading::before { display: none; }
  .doc-summary-list { list-style: none; }
  .doc-summary-list li {
    font-size: 10.5px;
    color: #334155;
    line-height: 1.65;
    padding-left: 14px;
    position: relative;
    text-align: justify;
    margin-bottom: 4px;
  }
  .doc-summary-list li::before {
    content: '▸';
    position: absolute;
    left: 0;
    color: ${accentColor};
    font-weight: 800;
  }
`;

/**
 * Modal de pré-visualização de documentos — clica no botão, o modal mostra o
 * preview e o "Baixar PDF/PNG" GERA o arquivo na hora (html2canvas + jsPDF),
 * de acordo com o idioma (conteúdo e nome do arquivo) e o tema (cor de
 * destaque). O PDF é ajustado proporcionalmente em A4, em UMA única página.
 *
 * A abertura e o fechamento são INSTANTÂNEOS (sem transição), como no CVModal
 * do manoelja: o clique no botão revela o modal na hora e o fechamento também.
 */
const DocumentPreviewModal = ({ doc, onClose }: DocumentPreviewModalProps) => {
  const { t, i18n } = useTranslation();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState<'pdf' | 'png' | null>(null);

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!doc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    const prevOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevActive = document.activeElement as HTMLElement | null;

    window.addEventListener('keydown', handleKeyDown);
    // Igual ao CVModal (window.scrollTo(0, 0) do manoelja): ao abrir, a página
    // volta ao topo ANTES de travar o scroll — o modal é fixo no topo do
    // viewport, então o que aparece atrás dele é o início da página. Como o
    // `html` tem `scroll-behavior: smooth`, a subida ao topo é animada.
    window.scrollTo(0, 0);
    // Trava o scroll em html E body: com `html { overflow-x: clip }`, travar
    // só o body deixa a barra de rolagem da página visível mas inutilizável.
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    closeBtnRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      // Sem restauração de scroll: como no CVModal, a página permanece no topo
      // depois de fechar. `preventScroll` é obrigatório aqui: o `focus()` no
      // botão de origem (lá na seção About) rolaria a página de volta até ele.
      prevActive?.focus?.({ preventScroll: true });
    };
  }, [doc, handleClose]);

  const activeLang = doc ? normalizeLang(i18n.language) : 'pt';
  const baseName = doc ? doc.slug : 'documento';

  const mountPrintCopy = (): { wrapper: HTMLElement } | null => {
    if (!paperRef.current) return null;
    const container = document.createElement('div');
    container.className = 'doc-pdf-container';
    container.innerHTML = paperRef.current.innerHTML;
    const style = document.createElement('style');
    style.textContent = getDocPrintStyles(getAccentColor());
    const wrapper = document.createElement('div');
    wrapper.appendChild(style);
    wrapper.appendChild(container);
    document.body.appendChild(wrapper);
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    return { wrapper };
  };

  const generateFile = async (kind: 'pdf' | 'png') => {
    if (!doc || isGenerating) return;
    setIsGenerating(kind);
    const copy = mountPrintCopy();
    if (!copy) {
      setIsGenerating(null);
      return;
    }
    const { wrapper } = copy;
    try {
      const container = wrapper.querySelector('.doc-pdf-container') as HTMLElement;
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });

      if (kind === 'png') {
        const link = document.createElement('a');
        link.download = `${baseName}_${activeLang}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        const pageW = 210;
        const pageH = 297;
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const ratio = canvas.width / canvas.height;
        let w = pageW;
        let h = w / ratio;
        if (h > pageH) {
          h = pageH;
          w = h * ratio;
        }
        const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        pdf.addImage(imgData, 'JPEG', (pageW - w) / 2, (pageH - h) / 2, w, h);
        pdf.save(`${baseName}_${activeLang}.pdf`);
      }
    } catch {
      alert(t('about.download_error'));
    } finally {
      document.body.removeChild(wrapper);
      setIsGenerating(null);
    }
  };

  return createPortal(
    <>
      {doc && (
        <div className={`doc-modal-portal${isGenerating ? ' generating' : ''}`}>
          <div className="doc-modal-backdrop" onClick={handleClose} />

          <div
            className="doc-modal-container"
            role="dialog"
            aria-modal="true"
            aria-label={doc.name}
          >
            <div className="doc-modal-header">
              <div className="doc-modal-title-group">
                <FileText size={18} />
                <h3 className="doc-modal-title">{doc.name}</h3>
                <span className="doc-modal-tag">{activeLang.toUpperCase()}</span>
              </div>

              <div className="doc-modal-actions">
                <button
                  type="button"
                  className="doc-control-btn doc-download-btn"
                  onClick={() => generateFile('pdf')}
                  disabled={isGenerating !== null}
                  title={t('about.download_pdf')}
                >
                  <Download size={16} />
                  <span>{t('about.download_pdf')}</span>
                </button>
                <button
                  type="button"
                  className="doc-control-btn"
                  onClick={() => generateFile('png')}
                  disabled={isGenerating !== null}
                  title={t('about.download_png')}
                >
                  <ImageIcon size={16} />
                  <span>{t('about.download_png')}</span>
                </button>
                <button
                  ref={closeBtnRef}
                  type="button"
                  className="doc-control-btn doc-close-btn"
                  onClick={handleClose}
                  aria-label={t('about.close_modal')}
                  title={t('about.close_modal')}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="doc-modal-body doc-summary-body">
              <div className="doc-paper" ref={paperRef}>
                <div className="doc-paper-header">
                  <div className="doc-paper-title">{doc.name}</div>
                  <div className="doc-paper-subtitle">{t('footer.title')}</div>
                </div>
                <div className="doc-paper-content">
                  {doc.summary.map((section) => (
                    <div className="doc-summary-section" key={section.heading}>
                      <h4 className="doc-summary-heading">{section.heading}</h4>
                      <ul className="doc-summary-list">
                        {section.items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {doc && isGenerating && (
        <div className="doc-fullscreen-loading">
          <div className="doc-loading-spinner">
            <div className="doc-spinner-ring"></div>
            <span className="doc-loading-text">
              {isGenerating === 'pdf' ? t('about.generating_pdf') : t('about.generating_png')}
            </span>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};

export default DocumentPreviewModal;

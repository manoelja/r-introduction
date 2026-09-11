import { useEffect, useState } from 'react';
import type { DocInfo } from './components/About/DocumentPreviewModal';
import Navbar from './components/Navbar/Navbar';
import Hero from './components/Hero/Hero';
import About from './components/About/About';
import Skills from './components/Skills/Skills';
import Projects from './components/Projects/Projects';
import Dashboard from './components/Dashboard/Dashboard';
import Footer from './components/Footer/Footer';
import CyberBackground from './components/CyberBackground/CyberBackground';
import './styles/global.css';

function App() {
  const [previewDoc, setPreviewDoc] = useState<DocInfo | null>(null);

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    // Reseta o scroll de forma INSTANTÂNEA: sem behavior: smooth (herdado do
    // `html { scroll-behavior: smooth }`), o navegador mobile não anima o
    // viewport de volta ao topo, evitando o efeito de "zoom" na entrada.
    window.scrollTo({ top: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  return (
    <div className="App">
      <CyberBackground />

      <Navbar isDocOpen={previewDoc !== null} />

      {/* Sem a classe container aqui: cada seção já aplica o próprio .container,
          e o duplo padding deixava o conteúdo (4rem) desalinhado com a navbar (2rem). */}
      <main className={previewDoc ? 'doc-open' : undefined}>
        <Hero />
        <About previewDoc={previewDoc} setPreviewDoc={setPreviewDoc} />
        <Skills />
        <Projects />
        <Dashboard />
        <Footer />
      </main>
    </div>
  );
}
export default App;

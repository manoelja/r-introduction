import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Pré-bundla libs de geração de arquivo para evitar o erro "Outdated Optimize
  // Dep" (504) no dev server após instalar/remover dependências.
  optimizeDeps: {
    include: ['jspdf', 'html2canvas']
  }
})

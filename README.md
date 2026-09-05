<div align="center">

# COVID Goiânia Dashboard

### Um ano de pandemia em números — contado de forma simples e visual

</div>

---

## Sobre o projeto

Este site nasceu de uma atividade avaliativa de análise de dados, mas foi pensado para ser muito mais do que um trabalho de faculdade: a ideia é **contar a história da COVID-19 em Goiânia durante 2021** de um jeito que qualquer pessoa consiga entender.

Em vez de entregar planilhas enormes cheias de números soltos, o projeto transforma **os dados oficiais do Ministério da Saúde** em gráficos interativos, filtros fáceis de usar e visualizações que mostram, semana a semana, como a doença se comportou na capital de Goiás.

---

## O que ele faz

Com dados de **quase 290 mil registros** sobre casos e óbitos de COVID-19, o site permite:

- **Ver o ano inteiro de uma vez** — Quantos casos e óbitos aconteceram em Goiânia, acumulados e semana a semana, durante as 52 semanas de 2021.
- **Explorar o Brasil inteiro** — Compare as 5 regiões do país (Norte, Nordeste, Centro-Oeste, Sudeste e Sul), cada estado e até cada município.
- **Acompanhar a evolução temporal** — Um gráfico de linha mostra os altos e baixos da pandemia, incluindo o pico da segunda onda em meados do ano.
- **Comparar regiões** — Descubra que algumas regiões tiveram ondas mais cedo e outras mais tarde, e como cada uma se recuperou.
- **Escolher como ver os dados** — 7 tipos de gráfico (barras, linhas, pizza, tabela e outros), filtros combináveis e a opção de "clicar para aprofundar": do Brasil para a região, para o estado, até chegar ao município.
- **Brincar com um terminal** — Um terminal interativo simula comandos de R, SQL e CMD para quem quiser sentir o gostinho de como os dados são analisados.

---

## Como funciona a limpeza dos dados

Dados reais de saúde pública chegam cheios de imperfeições — e parte importante do trabalho é deixá-los prontos para análise. Foram identificados e removidos **6.683 registros** (2,3% da base):

- **1.113 registros** sem município identificado (não dava para saber onde aconteceram)
- **5.570 registros** da "semana 53" (uma semana extra que não faz parte do calendário oficial de 2021)
- Alguns **valores negativos** de casos novos, que foram corrigidos para zero (não faz sentido ter menos que nenhum caso)

O que sobrou foram **289.640 registros limpos**, organizados por município e semana epidemiológica — a base usada em todos os gráficos do site.

---

## Um toque de diversão no fundo

Enquanto você navega, o fundo da página tem uma **animação animada** inspirada no tema: vírus e bactérias travam uma batalha contra cápsulas de remédio. A cada ciclo, a **vacina** entra em cena e solta ondas de cura que eliminam os vilões — uma metáfora visual da ciência vencendo a doença. Tudo desenhado em canvas, leve e discreto para não atrapalhar a leitura.

---

## O site oferece

- **7 tipos de gráficos** — Barras, linhas, donut, tabela e mais
- **Filtros combináveis** — Região, estado e capital/interior ao mesmo tempo
- **Drill-down** — Brasil → Região → Estado → Município com um clique
- **Modo claro e escuro** — Para gostar de cada um
- **3 idiomas** — Português, Inglês e Espanhol
- **Terminal interativo** — Simulador de comandos em R, SQL e CMD
- **Responsivo** — Funciona no celular e no desktop

---

## Como rodar

Precisa ter o [Node.js](https://nodejs.org/) instalado (versão 18 ou superior).

```bash
git clone https://github.com/manoelja/r-introducion.git
cd r-introducion
npm install
npm run dev
```

Depois é só abrir `http://localhost:5173` no navegador.

---

## Como os dados chegam ao site

Os dados originais (um arquivo Excel com mais de 290 mil linhas, fornecido pelo Ministério da Saúde) são processados por um script que aplica a mesma limpeza feita na análise em **R**. O resultado é um arquivo leve que o navegador carrega na hora — sem precisar de servidor nem esperar nada carregar.

---

## Tecnologias

O site foi construído com **React + TypeScript**, usando **Vite** para montar tudo rapidinho. Os dados foram processados em **R** (a análise original da atividade) e o script de exportação em **Node.js**. O visual conta com animações em **Framer Motion**, a interface está traduzida com **i18next** e a qualidade é garantida com testes automatizados (**Vitest**).

---

<div align="center">

**Feito com ❤️ para registrar e entender um capítulo importante da nossa história recente**

</div>

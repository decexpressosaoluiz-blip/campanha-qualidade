
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  const errorMsg = "Erro Crítico: Elemento raiz 'root' não encontrado no index.html. Verifique a estrutura do DOM.";
  console.error(errorMsg);
  document.body.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">${errorMsg}</div>`;
  throw new Error(errorMsg);
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ================================================================
// CONFIGURAÇÕES
// ================================================================
// Ambiente de TESTE (fporteladaTEST). Trocar API_URL para o
// dominio de producao (fportelada.pythonanywhere.com) quando for
// promover essas paginas para o ambiente real.
const API_URL = 'https://fporteladaTEST.pythonanywhere.com';

// DEV_MODE: quando true, pula o login do Google inteiramente e usa
// o usuario de teste (Teste ID 1). Usar SOMENTE no ambiente de teste.
// Isso espelha o bypass que o back-end tambem precisa ter (ver app.py).
const DEV_MODE = true;
const DEV_USER_ID = 1;
const DEV_USER_NOME = 'Teste ID 1';

let usuarioId = null;
let colecao = [];
let recomendacoes = [];
let editandoId = null;
let barcodeScanner = null;
let viewPreference = localStorage.getItem('discoteca_view') || 'cards';
let groupPreference = localStorage.getItem('discoteca_group') || 'separado';
let colecaoFiltrada = [];
let confirmCallback = null;

// ================================================================
// NAVEGAÇÃO (abas viraram links entre paginas separadas)
// ================================================================
const NAV_ITEMS = [
  { id: 'tab-compras', href: 'index.html', label: '📋 Compras' },
  { id: 'tab-estatisticas', href: 'estatisticas.html', label: '📊 Estatísticas' },
  { id: 'tab-colecao', href: 'colecao.html', label: '💿 Coleção', badge: true },
  { id: 'tab-importar', href: 'importar.html', label: '📤 Importar' }
];

function renderNav(paginaAtiva) {
  const container = document.getElementById('navContainer');
  if (!container) return;
  const html = NAV_ITEMS.map(item => {
    const ativo = item.href === paginaAtiva ? ' active' : '';
    const badge = item.badge ? ' <span class="tab-badge" id="colecao-badge">0</span>' : '';
    return `<a class="tab-btn${ativo}" data-tab="${item.id}" href="${item.href}">${item.label}${badge}</a>`;
  }).join('');
  container.innerHTML = html;
}

// Atualiza o badge de contagem da coleção no menu, quando presente na página.
function atualizarBadgeColecao(n) {
  const el = document.getElementById('colecao-badge');
  if (el) el.textContent = n;
}

// Usado pelas páginas que não carregam a coleção inteira, apenas para
// manter o número no menu (badge) sincronizado.
function sincronizarBadge() {
  if (!usuarioId) return;
  fetch(API_URL + '/colecao?user_id=' + usuarioId)
    .then(r => r.json())
    .then(data => atualizarBadgeColecao(Array.isArray(data) ? data.length : 0))
    .catch(() => {});
}

// ================================================================
// LOGIN
// ================================================================
function salvarSessao(userId, nome) {
  localStorage.setItem('discoteca_user_id', userId);
  localStorage.setItem('discoteca_user_nome', nome);
}

function carregarSessao() {
  const userId = localStorage.getItem('discoteca_user_id');
  const nome = localStorage.getItem('discoteca_user_nome');
  if (userId && nome) return { userId, nome };
  return null;
}

function limparSessao() {
  localStorage.removeItem('discoteca_user_id');
  localStorage.removeItem('discoteca_user_nome');
}

function ativarTelaApp(nome) {
  const loginScreen = document.getElementById('loginScreen');
  const appScreen = document.getElementById('appScreen');
  if (loginScreen) loginScreen.style.display = 'none';
  if (appScreen) appScreen.style.display = 'block';
  const nomeDisplay = document.getElementById('userNameDisplay');
  if (nomeDisplay) nomeDisplay.textContent = '👤 ' + nome;
}

document.addEventListener('DOMContentLoaded', function() {
  const btnLogin = document.getElementById('btnLogin');
  if (btnLogin) {
    btnLogin.addEventListener('click', function() {
      const btn = this;
      const error = document.getElementById('loginError');
      btn.disabled = true;
      if (error) error.style.display = 'none';
      fetch(API_URL + '/login')
        .then(r => r.json())
        .then(d => {
          if (d.auth_url) window.location.href = d.auth_url;
          else throw new Error('URL não recebida');
        })
        .catch(() => {
          if (error) error.style.display = 'block';
          btn.disabled = false;
        });
    });
  }

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', function() {
      limparSessao();
      window.location.href = 'index.html';
    });
  }
});

// ================================================================
// VERIFICAR SESSÃO
// ================================================================
function verificarSessao() {
  // Bypass de ambiente de teste: nao depende do Google OAuth.
  if (DEV_MODE) {
    usuarioId = DEV_USER_ID;
    salvarSessao(DEV_USER_ID, DEV_USER_NOME);
    ativarTelaApp(DEV_USER_NOME);
    if (typeof onPaginaPronta === 'function') onPaginaPronta();
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const userId = params.get('user_id');
  const nome = params.get('nome');

  if (userId && nome) {
    salvarSessao(userId, nome);
    usuarioId = userId;
    ativarTelaApp(nome);
    window.history.replaceState({}, document.title, window.location.pathname);
    if (typeof onPaginaPronta === 'function') onPaginaPronta();
    return;
  }

  const sessao = carregarSessao();
  if (sessao) {
    usuarioId = sessao.userId;
    ativarTelaApp(sessao.nome);
    if (typeof onPaginaPronta === 'function') onPaginaPronta();
    return;
  }

  fetch(API_URL + '/sessao')
    .then(r => r.json())
    .then(data => {
      if (data.logado) {
        usuarioId = data.usuario_id;
        salvarSessao(data.usuario_id, data.nome || 'Usuário');
        ativarTelaApp(data.nome || 'Usuário');
        if (typeof onPaginaPronta === 'function') onPaginaPronta();
      }
    })
    .catch(() => {});
}

// ================================================================
// MODAL: CONFIRMAÇÃO (compartilhado entre páginas)
// ================================================================
function abrirConfirm(mensagem, callback) {
  document.getElementById('confirmMessage').textContent = mensagem;
  confirmCallback = callback;
  document.getElementById('modalConfirm').classList.add('open');
}

document.addEventListener('DOMContentLoaded', function() {
  const btnFecharConfirm = document.getElementById('btnFecharConfirm');
  const btnConfirmCancel = document.getElementById('btnConfirmCancel');
  const btnConfirmAction = document.getElementById('btnConfirmAction');

  if (btnFecharConfirm) {
    btnFecharConfirm.addEventListener('click', function() {
      document.getElementById('modalConfirm').classList.remove('open');
      confirmCallback = null;
    });
  }
  if (btnConfirmCancel) {
    btnConfirmCancel.addEventListener('click', function() {
      document.getElementById('modalConfirm').classList.remove('open');
      confirmCallback = null;
    });
  }
  if (btnConfirmAction) {
    btnConfirmAction.addEventListener('click', function() {
      if (confirmCallback) {
        confirmCallback();
        confirmCallback = null;
      }
      document.getElementById('modalConfirm').classList.remove('open');
    });
  }
});

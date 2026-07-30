// ================================================================
// DISCOTECA V0.10 - JAVASCRIPT COMPARTILHADO
// ================================================================

// ================================================================
// CONFIGURAÇÕES
// ================================================================
const API_URL = 'https://fporteladatest.pythonanywhere.com';
let usuarioId = null;
let usuarioNome = null;
let confirmCallback = null;

// ================================================================
// FUNÇÕES DE SESSÃO
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

// ================================================================
// LOGIN
// ================================================================
function fazerLogin() {
  const btn = document.getElementById('btnLogin');
  const error = document.getElementById('loginError');
  if (btn) btn.disabled = true;
  if (error) error.style.display = 'none';

  fetch(API_URL + '/login')
    .then(r => r.json())
    .then(d => {
      if (d.auth_url) window.location.href = d.auth_url;
      else throw new Error('URL não recebida');
    })
    .catch(() => {
      if (error) error.style.display = 'block';
      if (btn) btn.disabled = false;
    });
}

function fazerLogout() {
  limparSessao();
  window.location.href = window.location.pathname;
}

// ================================================================
// VERIFICAR SESSÃO (para todas as páginas)
// ================================================================
function verificarSessao(redirectUrl = '/') {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('user_id');
  const nome = params.get('nome');

  if (userId && nome) {
    salvarSessao(userId, nome);
    usuarioId = userId;
    usuarioNome = nome;
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  }

  const sessao = carregarSessao();
  if (sessao) {
    usuarioId = sessao.userId;
    usuarioNome = sessao.nome;
    return true;
  }

  // Tenta buscar da API
  fetch(API_URL + '/sessao')
    .then(r => r.json())
    .then(data => {
      if (data.logado) {
        usuarioId = data.usuario_id;
        usuarioNome = data.nome || 'Usuário';
        salvarSessao(data.usuario_id, usuarioNome);
        return true;
      } else {
        window.location.href = redirectUrl;
        return false;
      }
    })
    .catch(() => {
      window.location.href = redirectUrl;
      return false;
    });
}

// ================================================================
// ATUALIZAR BARRA DO USUÁRIO
// ================================================================
function atualizarBarraUsuario() {
  const nomeEl = document.getElementById('userNameDisplay');
  const avatarEl = document.getElementById('userAvatarText');
  const avatarContainer = document.getElementById('userAvatar');

  if (nomeEl) nomeEl.textContent = '👤 ' + (usuarioNome || 'Usuário');
  if (avatarEl) avatarEl.textContent = (usuarioNome || '?').charAt(0).toUpperCase();

  if (usuarioId && avatarContainer) {
    fetch(API_URL + '/perfil/' + usuarioId)
      .then(r => r.json())
      .then(data => {
        if (data.foto_url) {
          avatarContainer.innerHTML = `<img src="${data.foto_url}" alt="Avatar">`;
        }
      })
      .catch(() => {});
  }
}

// ================================================================
// MODAL DE CONFIRMAÇÃO (global)
// ================================================================
function abrirConfirm(mensagem, callback) {
  const msgEl = document.getElementById('confirmMessage');
  const modal = document.getElementById('modalConfirm');
  if (msgEl) msgEl.textContent = mensagem;
  confirmCallback = callback;
  if (modal) modal.classList.add('open');
}

function fecharConfirm() {
  const modal = document.getElementById('modalConfirm');
  if (modal) modal.classList.remove('open');
  confirmCallback = null;
}

function confirmarAcao() {
  if (confirmCallback) {
    confirmCallback();
    confirmCallback = null;
  }
  fecharConfirm();
}

// ================================================================
// COPIAR LINK DO PERFIL
// ================================================================
function copiarLinkPerfil() {
  if (!usuarioId) return;
  const url = `${window.location.origin}/perfil-publico.html?id=${usuarioId}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => alert('✅ Link copiado!'));
  } else {
    prompt('Copie o link:', url);
  }
}

// ================================================================
// INICIALIZAR (chamar em cada página)
// ================================================================
function initApp() {
  // Login buttons
  document.getElementById('btnLogin')?.addEventListener('click', fazerLogin);
  document.getElementById('btnLogout')?.addEventListener('click', fazerLogout);

  // Confirm modal
  document.getElementById('btnFecharConfirm')?.addEventListener('click', fecharConfirm);
  document.getElementById('btnConfirmCancel')?.addEventListener('click', fecharConfirm);
  document.getElementById('btnConfirmAction')?.addEventListener('click', confirmarAcao);

  // Verificar sessão
  const logado = verificarSessao('/');
  if (logado) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';
    atualizarBarraUsuario();
  }
}

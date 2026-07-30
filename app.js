// ================================================================
// DISCOTECA V0.9.1 - JAVASCRIPT COMPARTILHADO
// ================================================================

// ================================================================
// CONFIGURAÇÕES
// ================================================================
const isDev = window.location.hostname.includes('test') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isDev 
    ? 'https://fporteladatest.pythonanywhere.com' 
    : 'https://fportelada.pythonanywhere.com';

const DEV_MODE = true;
const DEV_USER_ID = 1;
const DEV_USER_NOME = 'Teste ID 1';

let usuarioId = null;
let usuarioNome = null;
let confirmCallback = null;

// ================================================================
// CACHE DE CAPAS (localStorage)
// ================================================================
const COVER_CACHE_KEY = 'discoteca_covers_v2';

function getCachedCover(artist, album) {
    try {
        const key = `${artist.toLowerCase().trim()}|${album.toLowerCase().trim()}`;
        const cache = JSON.parse(localStorage.getItem(COVER_CACHE_KEY) || '{}');
        return cache[key] || null;
    } catch { return null; }
}

function setCachedCover(artist, album, url) {
    try {
        const key = `${artist.toLowerCase().trim()}|${album.toLowerCase().trim()}`;
        const cache = JSON.parse(localStorage.getItem(COVER_CACHE_KEY) || '{}');
        if (url) {
            cache[key] = url;
        } else {
            delete cache[key];
        }
        localStorage.setItem(COVER_CACHE_KEY, JSON.stringify(cache));
    } catch {}
}

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
// VERIFICAR SESSÃO (com DEV_MODE e sem loop)
// ================================================================
function verificarSessao() {
    // DEV_MODE: bypass completo
    if (DEV_MODE) {
        usuarioId = DEV_USER_ID;
        usuarioNome = DEV_USER_NOME;
        salvarSessao(DEV_USER_ID, DEV_USER_NOME);
        return true;
    }

    // 1. Tenta localStorage
    const sessao = carregarSessao();
    if (sessao) {
        usuarioId = sessao.userId;
        usuarioNome = sessao.nome;
        return true;
    }

    // 2. Tenta URL params (callback do Google)
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

    // 3. Tenta API (com timeout)
    return fetch(API_URL + '/sessao', { 
        signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined 
    })
        .then(r => r.json())
        .then(data => {
            if (data.logado) {
                usuarioId = data.usuario_id;
                usuarioNome = data.nome || 'Usuário';
                salvarSessao(data.usuario_id, usuarioNome);
                return true;
            }
            mostrarLogin(false);
            return false;
        })
        .catch(() => {
            mostrarLogin(true);
            return false;
        });
}

// ================================================================
// MOSTRAR TELA DE LOGIN
// ================================================================
function mostrarLogin(erro = false) {
    const loginScreen = document.getElementById('loginScreen');
    const appScreen = document.getElementById('appScreen');
    const error = document.getElementById('loginError');
    
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appScreen) appScreen.style.display = 'none';
    if (error) {
        if (erro) {
            error.textContent = '❌ Erro de conexão com o servidor. Tente novamente.';
            error.style.display = 'block';
        } else {
            error.style.display = 'none';
        }
    }
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

    // Buscar foto do perfil
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
// BUSCAR CAPA VIA BACKEND (PROXY)
// ================================================================
async function getCoverUrl(artist, album) {
    if (!artist || !album) return null;
    
    // 1. Tenta cache
    const cached = getCachedCover(artist, album);
    if (cached) return cached;
    
    // 2. Busca via backend
    try {
        const url = `${API_URL}/capa/${encodeURIComponent(artist)}/${encodeURIComponent(album)}?user_id=${usuarioId}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.url) {
            setCachedCover(artist, album, data.url);
            return data.url;
        }
        return null;
    } catch {
        return null;
    }
}

// ================================================================
// CARREGAR CAPA NO ELEMENTO
// ================================================================
async function fetchAlbumArt(artist, album, artId, fallbackId) {
    const artWrap = document.getElementById(artId);
    const fallback = document.getElementById(fallbackId);
    if (!artWrap) return;
    
    try {
        const url = await getCoverUrl(artist, album);
        if (url) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
                img.onload = () => {
                    clearTimeout(timeout);
                    artWrap.style.backgroundImage = `url('${url}')`;
                    artWrap.style.backgroundSize = 'cover';
                    artWrap.style.backgroundPosition = 'center';
                    artWrap.classList.add('has-image');
                    if (fallback) fallback.style.opacity = '0';
                    resolve();
                };
                img.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('Failed to load'));
                };
                img.src = url;
            });
        } else {
            if (fallback) fallback.style.opacity = '0.7';
        }
    } catch {
        if (fallback) fallback.style.opacity = '0.7';
    }
}

// ================================================================
// ATUALIZAR BADGES
// ================================================================
function atualizarBadges() {
    if (!usuarioId) return;
    
    // Badge da coleção
    fetch(API_URL + '/colecao?user_id=' + usuarioId)
        .then(r => r.json())
        .then(data => {
            const badge = document.getElementById('colecao-badge');
            if (badge) badge.textContent = data.length || 0;
        })
        .catch(() => {});

    // Badge da wishlist
    fetch(API_URL + '/recomendacoes?user_id=' + usuarioId)
        .then(r => r.json())
        .then(data => {
            const badge = document.getElementById('wishlist-badge');
            if (badge) badge.textContent = (data || []).filter(r => r.comprado === 0).length || 0;
        })
        .catch(() => {});
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
    const logado = verificarSessao();
    if (logado) {
        const loginScreen = document.getElementById('loginScreen');
        const appScreen = document.getElementById('appScreen');
        if (loginScreen) loginScreen.style.display = 'none';
        if (appScreen) appScreen.style.display = 'block';
        atualizarBarraUsuario();
        atualizarBadges();
        return true;
    }
    return false;
}

// ================================================================
// PÁGINA: COMPRAS (WISHLIST) — index.html
// ================================================================
function onPaginaPronta() {
  carregarDados();
  sincronizarBadge();
}

function carregarDados() {
  if (!usuarioId) return;
  fetch(API_URL + '/recomendacoes?user_id=' + usuarioId)
    .then(r => r.json())
    .then(data => {
      recomendacoes = Array.isArray(data) ? data : [];
      renderRecomendacoes(recomendacoes);
    })
    .catch(() => {});
}

    function renderRecomendacoes(dados) {
      const container = document.getElementById('compras-container');

      const hasActiveRecommendations = dados && dados.some(item => item.comprado === 0);

      if (!dados || dados.length === 0 || !hasActiveRecommendations) {
        container.innerHTML = `
          <div class="empty-state-full" style="padding:80px 20px;">
            <div class="icon">💰</div>
            <h3>Sua carteira está cheia... de expectativas!</h3>
            <p>Faça upload da sua playlist para gerar recomendações personalizadas.</p>
            <p class="empty-hint">Vá para a aba "Importar" e comece agora 🚀</p>
          </div>
        `;
        return;
      }

      const tiers = { S: [], A: [], B: [], C: [] };
      dados.forEach(item => {
        if (item.comprado === 0 && tiers[item.tier]) {
          tiers[item.tier].push(item);
        }
      });

      let html = '';
      ['S', 'A', 'B', 'C'].forEach(tier => {
        const items = tiers[tier] || [];
        const tierColor = tier === 'S' ? '#D6432F' : tier === 'A' ? '#E39A2E' : tier === 'B' ? '#4E7A8C' :
          '#8A8378';
        const tierDesc = tier === 'S' ? 'Prioridade Máxima' : tier === 'A' ? 'Alta Prioridade' : tier === 'B' ?
          'Sem Urgência' : 'Baixa Prioridade';
        const tierDetail = tier === 'S' ?
          'Comprar assim que aparecer. Fecham trilogias, completam tríades e representam o auge da coleção.' :
          tier === 'A' ?
          'Comprar na sequência — bons preços, boas edições, ou entrada de banda importante na coleção.' :
          tier === 'B' ?
          'Pegar em promoção ou naturalmente, sem pressa de garimpo.' :
          'Só entram se aparecer oportunidade excepcional (preço/edição).';

        html += `
          <section class="section" style="--tier-color:${tierColor}">
            <div class="tier-head">
              <div class="tier-stamp">${tier}</div>
              <div class="tier-info">
                <h2>${tierDesc}</h2>
                <p>${tierDetail}</p>
              </div>
              ${tier === 'S' ? `<div class="add-btn-wrap"><button class="add-btn" onclick="abrirWishlist()" title="Adicionar manual à lista">+</button></div>` : ''}
            </div>
            <div class="grid">
        `;

        if (items.length === 0) {
          html += `
            <div class="empty-state" style="padding:40px 20px;">
              <div class="icon" style="font-size:32px;">📭</div>
              <h3 style="font-size:18px;">Nenhum disco ${tier} ainda</h3>
              <p style="font-size:13px;">Importe mais playlists ou adicione manualmente.</p>
            </div>
          `;
        } else {
          items.forEach((item, idx) => {
            const letter = item.album ? item.album.charAt(0) : '?';
            const id = `rec-${tier}-${idx}`;
            const origem = item.origem || 'algoritmo';
            const frase = item.frase || `${item.album}: Álbum em destaque na sua coleção`;

            html += `
              <div class="card" id="${id}" data-id="${item.id || ''}">
                <div class="art-wrap" id="art-${id}" style="background: ${tierColor}; background-size: cover; background-position: center;">
                  <span class="priority-tag" style="background:${tierColor};color:var(--ink);">${tier} ${origem === 'manual' ? '✏️' : ''}</span>
                  <div class="spine-letter">${letter}</div>
                  <div class="art-fallback" id="fallback-${id}" style="opacity:0.6;">${item.artista || '?'}<br>${item.album || '?'}</div>
                </div>
                <div class="card-body">
                  <h3>${item.album || 'Álbum'}</h3>
                  <div class="artist" style="color:${tierColor};">${item.artista || 'Artista'}</div>
                  <div class="wishlist-phrase">${frase}</div>
                  <div class="meta-block">
                    <div class="meta-row"><span class="label">Estratégia</span><span class="val">${item.estrategia || ''}</span></div>
                    ${item.justificativa ? `<div class="meta-row" style="flex-wrap:wrap;"><span class="label">Justificativa</span><span class="val" style="text-align:left; max-width:100%; font-size:11px; opacity:0.7; margin-top:4px;">${item.justificativa}</span></div>` : ''}
                    ${item.nota ? `<div class="meta-row"><span class="label">Nota</span><span class="val">${item.nota}</span></div>` : ''}
                    ${item.origem === 'manual' ? `<div class="meta-row"><span class="label">Origem</span><span class="val">Adicionado manualmente</span></div>` : ''}
                  </div>
                  <div class="card-actions">
                    <button class="btn-icon btn-tier" onclick="abrirEditTier('${item.id || ''}', '${item.artista || ''}', '${item.album || ''}', '${item.tier || 'A'}')" title="Editar Tier">✎</button>
                    <button class="btn-icon btn-move" onclick="marcarComoTenho('${item.id || ''}', '${item.artista || ''}', '${item.album || ''}')" title="Já tenho">✓</button>
                    <button class="btn-icon btn-remove" onclick="removerDaWishlist('${item.id || ''}', '${item.artista || ''}', '${item.album || ''}')" title="Remover">✕</button>
                  </div>
                </div>
              </div>
            `;
          });
        }

        html += `</div></section>`;
      });

      container.innerHTML = html;

      ['S', 'A', 'B', 'C'].forEach(tier => {
        const items = tiers[tier] || [];
        items.forEach((item, idx) => {
          const id = `rec-${tier}-${idx}`;
          fetchAlbumArt(item.artista, item.album, 'art-' + id, 'fallback-' + id);
        });
      });
    }

    function marcarComoTenho(id, artista, album) {
      if (!id) {
        alert('❌ ID da recomendação não encontrado.');
        return;
      }
      abrirConfirm(`Marcar "${artista} - ${album}" como JÁ TENHO?`, function() {
        fetch(API_URL + `/marcar_como_tenho/${id}?user_id=${usuarioId}`, { method: 'POST' })
          .then(r => r.json())
          .then(data => {
            if (data.sucesso) {
              carregarDados();
            } else {
              alert('❌ ' + (data.erro || 'Erro ao marcar'));
            }
          })
          .catch(() => alert('❌ Erro de conexão'));
      });
    }
    window.marcarComoTenho = marcarComoTenho;

    function removerDaWishlist(id, artista, album) {
      if (!id) {
        alert('❌ ID não encontrado.');
        return;
      }
      abrirConfirm(`Remover "${artista} - ${album}" da lista de compras?`, function() {
        fetch(API_URL + `/wishlist/remove/${id}?user_id=${usuarioId}`, { method: 'DELETE' })
          .then(r => r.json())
          .then(data => {
            if (data.sucesso) {
              carregarDados();
            } else {
              alert('❌ ' + (data.erro || 'Erro ao remover'));
            }
          })
          .catch(() => alert('❌ Erro de conexão'));
      });
    }
    window.removerDaWishlist = removerDaWishlist;

    const modalWish = document.getElementById('modalAddWishlist');
    const btnFecharWish = document.getElementById('btnFecharWishlist');
    const formWish = document.getElementById('form-wishlist');

    function abrirWishlist() {
      document.getElementById('wish-artista').value = '';
      document.getElementById('wish-album').value = '';
      document.getElementById('wish-tier').value = 'S';
      document.getElementById('wish-notas').value = '';
      document.getElementById('wish-msg').textContent = '';
      document.getElementById('wish-msg').className = 'form-msg';
      modalWish.classList.add('open');
    }
    window.abrirWishlist = abrirWishlist;

    btnFecharWish.addEventListener('click', () => modalWish.classList.remove('open'));
    modalWish.addEventListener('click', function(e) { if (e.target === this) modalWish.classList.remove('open'); });

    formWish.addEventListener('submit', function(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-wish-submit');
      const msg = document.getElementById('wish-msg');
      btn.disabled = true;
      msg.textContent = '⏳ Salvando...';
      msg.className = 'form-msg';

      const dados = {
        artista: document.getElementById('wish-artista').value.trim(),
        album: document.getElementById('wish-album').value.trim(),
        tier: document.getElementById('wish-tier').value,
        notas: document.getElementById('wish-notas').value.trim()
      };

      if (!dados.artista || !dados.album) {
        msg.textContent = '⚠️ Artista e álbum são obrigatórios!';
        msg.className = 'form-msg error';
        btn.disabled = false;
        return;
      }

      fetch(API_URL + '/adicionar_recomendacao?user_id=' + usuarioId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados)
        })
        .then(r => r.json())
        .then(resultado => {
          if (resultado.sucesso) {
            msg.textContent = '✅ ' + resultado.mensagem;
            msg.className = 'form-msg success';
            carregarDados();
            formWish.reset();
            setTimeout(() => modalWish.classList.remove('open'), 1000);
          } else {
            msg.textContent = '❌ ' + (resultado.erro || 'Erro ao adicionar');
            msg.className = 'form-msg error';
            btn.disabled = false;
          }
        })
        .catch(() => {
          msg.textContent = '❌ Erro de conexão';
          msg.className = 'form-msg error';
          btn.disabled = false;
        });
    });

    const modalEditTier = document.getElementById('modalEditTier');
    const btnFecharEditTier = document.getElementById('btnFecharEditTier');
    const formEditTier = document.getElementById('form-edit-tier');

    function abrirEditTier(id, artista, album, tierAtual) {
      document.getElementById('edit-tier-id').value = '';
      document.getElementById('edit-tier-artista').value = '';
      document.getElementById('edit-tier-album').value = '';
      document.getElementById('edit-tier-select').value = 'A';
      document.getElementById('edit-tier-msg').textContent = '';
      document.getElementById('edit-tier-msg').className = 'form-msg';
      document.getElementById('btn-edit-tier-submit').disabled = false;
      
      document.getElementById('edit-tier-id').value = id;
      document.getElementById('edit-tier-artista').value = artista;
      document.getElementById('edit-tier-album').value = album;
      document.getElementById('edit-tier-select').value = tierAtual || 'A';
      
      modalEditTier.classList.add('open');
    }
    window.abrirEditTier = abrirEditTier;

    btnFecharEditTier.addEventListener('click', function() {
      modalEditTier.classList.remove('open');
    });
    modalEditTier.addEventListener('click', function(e) {
      if (e.target === this) modalEditTier.classList.remove('open');
    });

    formEditTier.addEventListener('submit', function(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-edit-tier-submit');
      const msg = document.getElementById('edit-tier-msg');
      const id = document.getElementById('edit-tier-id').value;
      const novoTier = document.getElementById('edit-tier-select').value;

      btn.disabled = true;
      msg.textContent = '⏳ Salvando...';
      msg.className = 'form-msg';

      fetch(API_URL + `/wishlist/update_tier/${id}?user_id=${usuarioId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier: novoTier })
        })
        .then(r => r.json())
        .then(data => {
          if (data.sucesso) {
            msg.textContent = '✅ ' + data.mensagem;
            msg.className = 'form-msg success';
            carregarDados();
            formEditTier.reset();
            setTimeout(() => modalEditTier.classList.remove('open'), 800);
          } else {
            msg.textContent = '❌ ' + (data.erro || 'Erro ao atualizar');
            msg.className = 'form-msg error';
            btn.disabled = false;
          }
        })
        .catch(() => {
          msg.textContent = '❌ Erro de conexão';
          msg.className = 'form-msg error';
          btn.disabled = false;
        });
    });

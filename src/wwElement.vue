<template>
  <div class="anfrage-module" :style="moduleStyle">
    <!-- Form Section -->
    <div class="section form-section">
      <h2 class="section-title">{{ content.formTitle || 'Neue Anfrage erstellen' }}</h2>

      <form @submit.prevent="submitForm">
        <!-- Titel -->
        <div class="field">
          <label>{{ content.titleLabel || 'Titel' }}</label>
          <input
            v-model="form.produkt_titel"
            type="text"
            required
            placeholder="Titel eingeben..."
          />
        </div>

        <!-- Beschreibung -->
        <div class="field">
          <label>{{ content.descriptionLabel || 'Beschreibung' }}</label>
          <textarea
            v-model="form.produkt_beschreibung"
            required
            rows="5"
            placeholder="Beschreibung eingeben..."
          ></textarea>
        </div>

        <!-- Auflagen -->
        <div class="field">
          <label>{{ content.auflageLabel || 'Auflagen' }}</label>
          <div class="auflagen">
            <div v-for="(auflage, idx) in form.menge" :key="idx" class="auflage-row">
              <input
                v-model.number="form.menge[idx]"
                type="number"
                min="1"
                required
                :placeholder="content.auflagePlaceholder || 'z.B. 1000'"
              />
              <button
                v-if="form.menge.length > (content.minAuflagen || 1)"
                type="button"
                class="btn-remove"
                @click="form.menge.splice(idx, 1)"
              >
                ✕
              </button>
            </div>
          </div>
          <button
            v-if="form.menge.length < (content.maxAuflagen || 10)"
            type="button"
            class="btn-add"
            @click="form.menge.push(0)"
          >
            {{ content.addAuflageButtonText || '+ Auflage hinzufügen' }}
          </button>
        </div>

        <!-- Status Message -->
        <div v-if="statusMsg" :class="['status', statusType]">
          {{ statusMsg }}
        </div>

        <!-- Actions -->
        <div class="actions">
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? 'Wird gesendet...' : (content.submitButtonText || 'Anfrage senden') }}
          </button>
          <button type="button" class="btn-secondary" @click="resetForm" :disabled="loading">
            {{ content.resetButtonText || 'Zurücksetzen' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Favoriten Section -->
    <div v-if="content.showFavoriten" class="section favoriten-section">
      <h2 class="section-title">{{ content.favoritenTitle || 'Meine Favoriten' }}</h2>

      <div v-if="loadingFav" class="empty">Lade Favoriten...</div>
      <div v-else-if="favorites.length === 0" class="empty">Noch keine Favoriten</div>
      <div v-else class="items">
        <div v-for="fav in paginatedFavorites" :key="fav.id" class="item favorite-item">
          <div class="item-header">
            <h3>{{ fav.product_beschreibung_anfrage?.produkt_titel || 'Unbekannt' }}</h3>
            <button class="btn-heart" @click="removeFavorite(fav.id)">❤️</button>
          </div>
          <p>{{ fav.product_beschreibung_anfrage?.produkt_beschreibung }}</p>
          <div class="meta">
            <strong>Auflagen:</strong>
            {{ formatMenge(fav.product_beschreibung_anfrage?.menge) }}
          </div>
          <button class="btn-template" @click="loadTemplate(fav.product_beschreibung_anfrage)">
            {{ content.loadTemplateButtonText || 'Als Vorlage laden' }}
          </button>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalFavPages > 1" class="pagination">
        <button @click="favPage--" :disabled="favPage === 1">‹</button>
        <span>{{ favPage }} / {{ totalFavPages }}</span>
        <button @click="favPage++" :disabled="favPage === totalFavPages">›</button>
      </div>
    </div>

    <!-- Historie Section -->
    <div v-if="content.showHistorie" class="section historie-section">
      <h2 class="section-title">{{ content.historieTitle || 'Vergangene Anfragen' }}</h2>

      <!-- Search -->
      <div class="search">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="content.historieSearchPlaceholder || 'Suchen...'"
          @input="onSearch"
        />
        <button v-if="searchQuery" class="btn-clear" @click="clearSearch">✕</button>
      </div>

      <div v-if="loadingHist" class="empty">Lade Historie...</div>
      <div v-else-if="historie.length === 0" class="empty">Keine Anfragen gefunden</div>
      <div v-else class="items">
        <div v-for="item in paginatedHistorie" :key="item.id" class="item">
          <div class="item-header">
            <h3>{{ item.produkt_titel }}</h3>
            <button class="btn-heart" @click="toggleFavorite(item.id)">
              {{ isFavorite(item.id) ? '❤️' : '🤍' }}
            </button>
          </div>
          <div class="date">{{ formatDate(item.created_at) }}</div>
          <p>{{ item.produkt_beschreibung }}</p>
          <div class="meta">
            <strong>Auflagen:</strong> {{ formatMenge(item.menge) }}
          </div>
          <button class="btn-template" @click="loadTemplate(item)">
            {{ content.loadTemplateButtonText || 'Als Vorlage laden' }}
          </button>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalHistPages > 1" class="pagination">
        <button @click="histPage--" :disabled="histPage === 1">‹</button>
        <span>{{ histPage }} / {{ totalHistPages }}</span>
        <button @click="histPage++" :disabled="histPage === totalHistPages">›</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue';

export default {
  props: {
    uid: { type: String, required: true },
    content: { type: Object, required: true },
    wwEditorState: { type: Object },
  },
  emits: ['trigger-event'],
  setup(props, { emit }) {
    // Form state
    const form = ref({
      produkt_titel: '',
      produkt_beschreibung: '',
      menge: [0]
    });

    const loading = ref(false);
    const statusMsg = ref('');
    const statusType = ref('');

    // Historie state
    const historie = ref([]);
    const loadingHist = ref(false);
    const searchQuery = ref('');
    const searchTimer = ref(null);
    const histPage = ref(1);

    // Favoriten state
    const favorites = ref([]);
    const loadingFav = ref(false);
    const favPage = ref(1);

    // Computed
    const moduleStyle = computed(() => ({
      '--bg': props.content.backgroundColor || '#fff',
      '--border': props.content.borderColor || '#e0e0e0',
      '--radius': props.content.borderRadius || '8px',
      '--text': props.content.textColor || '#333',
      '--label': props.content.labelColor || '#666',
      '--primary': props.content.primaryButtonColor || '#007bff',
      '--secondary': props.content.secondaryButtonColor || '#6c757d',
    }));

    const itemsPerPage = computed(() => props.content.historieItemsPerPage || 10);
    const favItemsPerPage = computed(() => props.content.favoritenItemsPerPage || 10);

    const totalHistPages = computed(() =>
      Math.ceil(historie.value.length / itemsPerPage.value)
    );

    const totalFavPages = computed(() =>
      Math.ceil(favorites.value.length / favItemsPerPage.value)
    );

    const paginatedHistorie = computed(() => {
      const start = (histPage.value - 1) * itemsPerPage.value;
      return historie.value.slice(start, start + itemsPerPage.value);
    });

    const paginatedFavorites = computed(() => {
      const start = (favPage.value - 1) * favItemsPerPage.value;
      return favorites.value.slice(start, start + favItemsPerPage.value);
    });

    // API calls
    const submitForm = async () => {
      if (!props.content.userId) {
        showStatus('User ID fehlt', 'error');
        return;
      }

      loading.value = true;
      statusMsg.value = '';

      try {
        const url = props.content.apiEndpoint ||
          'https://xv05-su7k-rvc8.f2.xano.io/api:SBdZMdsy/product_beschreibung_anfrage';

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: parseInt(props.content.userId),
            produkt_titel: form.value.produkt_titel,
            produkt_beschreibung: form.value.produkt_beschreibung,
            menge: form.value.menge.filter(m => m > 0),
          }),
        });

        if (!res.ok) throw new Error('Fehler beim Senden');

        const data = await res.json();

        showStatus(props.content.successMessage || 'Erfolgreich gesendet!', 'success');

        emit('trigger-event', {
          name: 'submit-success',
          event: { ...form.value, response: data },
        });

        setTimeout(() => {
          resetForm();
          loadHistorie();
        }, 2000);

      } catch (err) {
        showStatus(props.content.errorMessage || 'Fehler beim Senden', 'error');
        emit('trigger-event', { name: 'submit-error', event: { error: err.message } });
      } finally {
        loading.value = false;
      }
    };

    const loadHistorie = async () => {
      if (!props.content.showHistorie) return;

      loadingHist.value = true;

      try {
        const url = props.content.historieEndpoint ||
          'https://xv05-su7k-rvc8.f2.xano.io/api:SBdZMdsy/product_beschreibung_anfrage';

        const res = await fetch(url);
        if (!res.ok) throw new Error('Load failed');

        const data = await res.json();
        historie.value = Array.isArray(data) ? data : [];
        histPage.value = 1;

        emit('trigger-event', {
          name: 'historie-loaded',
          event: { count: historie.value.length, items: historie.value },
        });

      } catch (err) {
        historie.value = [];
      } finally {
        loadingHist.value = false;
      }
    };

    const searchHistorie = async (query) => {
      if (!query) {
        loadHistorie();
        return;
      }

      loadingHist.value = true;

      try {
        const url = props.content.historieSearchEndpoint ||
          'https://xv05-su7k-rvc8.f2.xano.io/api:SBdZMdsy/search';

        const res = await fetch(`${url}?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Search failed');

        const data = await res.json();
        historie.value = Array.isArray(data) ? data : [];
        histPage.value = 1;

        emit('trigger-event', {
          name: 'historie-searched',
          event: { query, count: historie.value.length, items: historie.value },
        });

      } catch (err) {
        historie.value = [];
      } finally {
        loadingHist.value = false;
      }
    };

    const loadFavorites = async () => {
      if (!props.content.showFavoriten || !props.content.userId) {
        favorites.value = [];
        return;
      }

      loadingFav.value = true;

      try {
        const url = props.content.favoritenListEndpoint ||
          'https://xv05-su7k-rvc8.f2.xano.io/api:SBdZMdsy/favoriten_list';

        const fullUrl = `${url}?user_id=${parseInt(props.content.userId)}&page=1&per_page=100`;
        console.log('Loading favorites:', fullUrl);

        const res = await fetch(fullUrl);
        console.log('Load favorites response:', res.status, res.statusText);

        if (!res.ok) {
          const errorText = await res.text().catch(() => '');
          console.error('Load favorites error:', { status: res.status, body: errorText });
          throw new Error('Load failed');
        }

        const data = await res.json();
        console.log('Favorites data:', data);

        favorites.value = Array.isArray(data.favorites) ? data.favorites :
                         Array.isArray(data) ? data : [];
        console.log('Favorites loaded:', favorites.value.length, 'items');
        favPage.value = 1;

        emit('trigger-event', {
          name: 'favoriten-loaded',
          event: { count: favorites.value.length, items: favorites.value },
        });

      } catch (err) {
        console.error('loadFavorites error:', err);
        favorites.value = [];
      } finally {
        loadingFav.value = false;
      }
    };

    const toggleFavorite = async (anfrageId) => {
      if (!props.content.userId) return;

      if (isFavorite(anfrageId)) {
        const fav = favorites.value.find(f => f.product_beschreibung_anfrage_id === anfrageId);
        if (fav) await removeFavorite(fav.id);
      } else {
        await addFavorite(anfrageId);
      }
    };

    const addFavorite = async (anfrageId) => {
      const userId = props.content.userId;
      if (!userId) {
        console.error('addFavorite: user_id is required');
        showStatus('User ID fehlt', 'error');
        return;
      }

      try {
        const url = props.content.favoritenAddEndpoint ||
          'https://xv05-su7k-rvc8.f2.xano.io/api:SBdZMdsy/favoriten_add';

        const payload = {
          user_id: parseInt(userId),
          product_beschreibung_anfrage_id: anfrageId,
        };

        console.log('Adding favorite:', { url, payload });

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        console.log('Add favorite response:', res.status, res.statusText);

        if (!res.ok) {
          const errorText = await res.text().catch(() => '');
          console.error('Add favorite error:', { status: res.status, body: errorText });
          throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
        }

        const responseData = await res.json();
        console.log('Add favorite success:', responseData);

        await loadFavorites();

        emit('trigger-event', {
          name: 'favorite-added',
          event: { anfrage_id: anfrageId },
        });

      } catch (err) {
        console.error('addFavorite error:', err);
        showStatus('Fehler beim Hinzufügen', 'error');
      }
    };

    const removeFavorite = async (favId) => {
      try {
        const url = props.content.favoritenDeleteEndpoint ||
          'https://xv05-su7k-rvc8.f2.xano.io/api:SBdZMdsy/favoriten_delete';

        const res = await fetch(`${url}?id=${favId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) throw new Error('Delete failed');

        favorites.value = favorites.value.filter(f => f.id !== favId);

        emit('trigger-event', {
          name: 'favorite-removed',
          event: { favorit_id: favId },
        });

      } catch (err) {
        showStatus('Fehler beim Entfernen', 'error');
      }
    };

    const isFavorite = (anfrageId) => {
      return favorites.value.some(f => f.product_beschreibung_anfrage_id === anfrageId);
    };

    const loadTemplate = (item) => {
      form.value = {
        produkt_titel: item.produkt_titel || '',
        produkt_beschreibung: item.produkt_beschreibung || '',
        menge: Array.isArray(item.menge) && item.menge.length > 0 ? [...item.menge] : [0]
      };

      showStatus('Vorlage geladen!', 'success');

      emit('trigger-event', {
        name: 'template-loaded',
        event: { ...form.value },
      });
    };

    const resetForm = () => {
      form.value = { produkt_titel: '', produkt_beschreibung: '', menge: [0] };
      statusMsg.value = '';
      emit('trigger-event', { name: 'form-reset', event: {} });
    };

    const showStatus = (msg, type) => {
      statusMsg.value = msg;
      statusType.value = type;
      setTimeout(() => { statusMsg.value = ''; }, 3000);
    };

    const onSearch = () => {
      if (searchTimer.value) clearTimeout(searchTimer.value);
      searchTimer.value = setTimeout(() => {
        searchHistorie(searchQuery.value.trim());
      }, 500);
    };

    const clearSearch = () => {
      searchQuery.value = '';
      loadHistorie();
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      try {
        return new Date(dateStr).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return dateStr;
      }
    };

    const formatMenge = (menge) => {
      if (Array.isArray(menge) && menge.length > 0) {
        return menge.join(', ');
      }
      return '-';
    };

    // Watchers
    watch(() => props.content.userId, () => {
      if (props.content.showFavoriten) loadFavorites();
    });

    // Lifecycle
    onMounted(() => {
      console.log('=== Component Mounted ===');
      console.log('Config:', {
        userId: props.content.userId,
        showHistorie: props.content.showHistorie,
        showFavoriten: props.content.showFavoriten,
        historieEndpoint: props.content.historieEndpoint,
        historieSearchEndpoint: props.content.historieSearchEndpoint,
        favoritenAddEndpoint: props.content.favoritenAddEndpoint,
        favoritenDeleteEndpoint: props.content.favoritenDeleteEndpoint,
        favoritenListEndpoint: props.content.favoritenListEndpoint,
      });
      console.log('=========================');

      if (props.content.showHistorie) loadHistorie();
      if (props.content.showFavoriten) loadFavorites();
    });

    return {
      form,
      loading,
      statusMsg,
      statusType,
      historie,
      loadingHist,
      searchQuery,
      histPage,
      totalHistPages,
      paginatedHistorie,
      favorites,
      loadingFav,
      favPage,
      totalFavPages,
      paginatedFavorites,
      moduleStyle,
      submitForm,
      resetForm,
      loadTemplate,
      toggleFavorite,
      removeFavorite,
      isFavorite,
      onSearch,
      clearSearch,
      formatDate,
      formatMenge,
    };
  },
};
</script>

<style scoped>
.anfrage-module {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  color: var(--text);
  display: grid;
  grid-template-columns: 1fr 350px 350px;
  gap: 24px;
}

@media (max-width: 1200px) {
  .anfrage-module {
    grid-template-columns: 1fr;
  }
}

.section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  border-bottom: 2px solid var(--border);
  padding-bottom: 8px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 14px;
  font-weight: 500;
  color: var(--label);
}

.field input,
.field textarea {
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: inherit;
}

.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.auflagen {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.auflage-row {
  display: flex;
  gap: 8px;
}

.auflage-row input {
  flex: 1;
}

.btn-remove {
  width: 36px;
  height: 36px;
  padding: 0;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
}

.btn-add {
  padding: 10px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.status {
  padding: 12px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.status.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.actions {
  display: flex;
  gap: 12px;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: white;
}

.btn-primary {
  background: var(--primary);
}

.btn-secondary {
  background: var(--secondary);
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search {
  position: relative;
}

.search input {
  width: 100%;
  padding: 10px 40px 10px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 14px;
}

.btn-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #999;
  border-radius: 50%;
}

.btn-clear:hover {
  background: rgba(0, 0, 0, 0.05);
}

.empty {
  padding: 20px;
  text-align: center;
  color: #999;
  border: 1px dashed var(--border);
  border-radius: 4px;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 600px;
  overflow-y: auto;
}

.item {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.favorite-item {
  background: linear-gradient(135deg, #fffbf0 0%, #fff9e6 100%);
  border: 2px solid #ffd700;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.item-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  flex: 1;
}

.btn-heart {
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 18px;
  border-radius: 50%;
  transition: all 0.2s;
}

.btn-heart:hover {
  background: rgba(255, 0, 0, 0.1);
  transform: scale(1.2);
}

.date {
  font-size: 11px;
  color: #999;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 3px;
  display: inline-block;
  margin-bottom: 8px;
}

.item p {
  margin: 0 0 10px;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.meta {
  font-size: 12px;
  color: #555;
  padding: 6px 10px;
  background: #f9f9f9;
  border-radius: 4px;
  border-left: 3px solid var(--primary);
  margin-bottom: 12px;
}

.btn-template {
  width: 100%;
  padding: 10px 16px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.pagination button {
  padding: 8px 12px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination span {
  font-size: 14px;
  color: var(--text);
}
</style>

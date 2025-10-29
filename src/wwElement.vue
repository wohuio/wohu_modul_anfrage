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
            <h3>{{ getFavTitel(fav) }}</h3>
            <button class="btn-heart" @click="removeFavorite(fav.id)">❤️</button>
          </div>
          <p>{{ getFavBeschreibung(fav) }}</p>
          <div class="meta">
            <strong>Auflagen:</strong>
            {{ getFavMenge(fav) }}
          </div>
          <button class="btn-template" @click="loadTemplate(getFavData(fav))">
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
          'https://xv05-su7k-rvc8.f2.xano.io/api:SBdZMdsy/favoriten_list_id';

        const fullUrl = `${url}?user_id=${parseInt(props.content.userId)}`;
        console.log('Loading favorites:', fullUrl);

        const res = await fetch(fullUrl);
        console.log('Load favorites response:', res.status, res.statusText);

        if (!res.ok) {
          const errorText = await res.text().catch(() => '');
          console.error('Load favorites error:', {
            status: res.status,
            statusText: res.statusText,
            body: errorText,
            url: fullUrl
          });

          // Try to parse error as JSON
          try {
            const errorJson = JSON.parse(errorText);
            console.error('Load favorites error details:', errorJson);
          } catch (e) {
            console.error('Error response is not JSON:', errorText);
          }

          throw new Error('Load failed');
        }

        const data = await res.json();
        console.log('Favorites data:', data);
        console.log('Favorites data type:', typeof data, Array.isArray(data));
        console.log('Favorites data keys:', Object.keys(data));

        // Handle different response structures
        favorites.value = Array.isArray(data) ? data :
                         Array.isArray(data.favorites) ? data.favorites :
                         Array.isArray(data.items) ? data.items : [];

        console.log('Favorites loaded:', favorites.value.length, 'items');

        // Log first item structure for debugging
        if (favorites.value.length > 0) {
          const firstItem = favorites.value[0];
          console.log('First favorite item structure:', firstItem);
          console.log('Keys in first item:', Object.keys(firstItem));
          console.log('First item details:', JSON.stringify(firstItem, null, 2));
        }

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

    // Helper functions for favorites - supports different data structures
    const getFavTitel = (fav) => {
      return fav.product_beschreibung_anfrage?.produkt_titel ||
             fav.produkt_titel ||
             fav.titel ||
             'Unbekannt';
    };

    const getFavBeschreibung = (fav) => {
      return fav.product_beschreibung_anfrage?.produkt_beschreibung ||
             fav.produkt_beschreibung ||
             fav.beschreibung ||
             '';
    };

    const getFavMenge = (fav) => {
      const menge = fav.product_beschreibung_anfrage?.menge ||
                    fav.menge ||
                    [];
      return formatMenge(menge);
    };

    const getFavData = (fav) => {
      // Return the full anfrage object for loading as template
      return fav.product_beschreibung_anfrage || fav || {};
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
      getFavTitel,
      getFavBeschreibung,
      getFavMenge,
      getFavData,
    };
  },
};
</script>

<style scoped>
/* Use Dashboard Design System */
:root {
  --primary-teal: #00bcd4;
  --primary-dark-blue: #2c5f7c;
  --white: #ffffff;
  --light-gray: #f5f7fa;
  --gray-100: #f0f2f5;
  --gray-200: #e4e7eb;
  --gray-300: #cbd5e0;
  --gray-400: #a0aec0;
  --gray-500: #718096;
  --gray-600: #4a5568;
  --gray-700: #2d3748;
  --gray-800: #1a202c;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
}

* {
  box-sizing: border-box;
}

.anfrage-module {
  background: var(--light-gray);
  padding: var(--space-xl);
  color: var(--gray-700);
  display: grid;
  grid-template-columns: 1fr 420px 420px;
  gap: var(--space-xl);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

@media (max-width: 1200px) {
  .anfrage-module {
    grid-template-columns: 1fr;
  }
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  background: var(--white);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  box-shadow: var(--shadow-md);
  border: none;
}

.section-title {
  margin: 0 0 var(--space-lg);
  font-size: 20px;
  font-weight: 600;
  color: var(--gray-800);
  letter-spacing: -0.01em;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.field label {
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-700);
  margin-bottom: 4px;
}

.field input,
.field textarea {
  padding: var(--space-sm) var(--space-md);
  font-size: 14px;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  font-family: inherit;
  transition: all var(--transition-fast);
  background: var(--white);
  color: var(--gray-800);
}

.field input:hover,
.field textarea:hover {
  border-color: var(--gray-400);
}

.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: var(--primary-teal);
  box-shadow: 0 0 0 3px rgba(0, 188, 212, 0.1);
}

.auflagen {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auflage-row {
  display: flex;
  gap: 10px;
}

.auflage-row input {
  flex: 1;
}

.btn-remove {
  width: 36px;
  height: 36px;
  padding: 0;
  background: var(--white);
  color: #ef5350;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 16px;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-remove:hover {
  background: #ffebee;
  border-color: #ef5350;
  color: #d32f2f;
}

.btn-add {
  padding: var(--space-sm) var(--space-md);
  background: white;
  color: var(--primary-teal);
  border: 1px dashed var(--gray-300);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.btn-add:hover {
  background: rgba(0, 188, 212, 0.05);
  border-color: var(--primary-teal);
  border-style: solid;
}

.status {
  padding: var(--space-md);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
}

.status.success {
  background: rgba(76, 175, 80, 0.1);
  color: #2e7d32;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.status.error {
  background: rgba(239, 83, 80, 0.1);
  color: #c62828;
  border: 1px solid rgba(239, 83, 80, 0.3);
}

.actions {
  display: flex;
  gap: 14px;
  margin-top: 4px;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: var(--space-sm) var(--space-lg);
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  border: none;
}

.btn-primary {
  background: var(--primary-teal);
  color: var(--white);
  box-shadow: var(--shadow-sm);
}

.btn-primary:hover:not(:disabled) {
  background: #00acc1;
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--white);
  color: var(--gray-700);
  border: 1px solid var(--gray-300);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--gray-100);
  border-color: var(--gray-400);
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.search {
  position: relative;
}

.search input {
  width: 100%;
  padding: var(--space-sm) 40px var(--space-sm) var(--space-md);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  font-size: 14px;
  transition: all var(--transition-fast);
}

.search input:focus {
  border-color: var(--primary-teal);
  box-shadow: 0 0 0 3px rgba(0, 188, 212, 0.1);
}

.btn-clear {
  position: absolute;
  right: var(--space-sm);
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--gray-400);
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.btn-clear:hover {
  background: var(--gray-200);
  color: var(--gray-600);
}

.empty {
  padding: var(--space-xl) var(--space-lg);
  text-align: center;
  color: var(--gray-500);
  font-size: 14px;
  border: 2px dashed var(--gray-300);
  border-radius: var(--radius-md);
  background: var(--gray-100);
}

.items {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 600px;
  overflow-y: auto;
  padding-right: 4px;
}

.items::-webkit-scrollbar {
  width: 8px;
}

.items::-webkit-scrollbar-track {
  background: var(--gray-200);
  border-radius: var(--radius-md);
}

.items::-webkit-scrollbar-thumb {
  background: var(--gray-400);
  border-radius: var(--radius-md);
}

.items::-webkit-scrollbar-thumb:hover {
  background: var(--gray-500);
}

.item {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  transition: all var(--transition-base);
}

.item:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--gray-300);
}

.favorite-item {
  background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);
  border: 2px solid var(--primary-teal);
  box-shadow: 0 2px 8px rgba(0, 188, 212, 0.15);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.item-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  flex: 1;
  color: var(--gray-800);
}

.btn-heart {
  width: 36px;
  height: 36px;
  padding: 0;
  background: var(--white);
  border: 1px solid var(--gray-300);
  cursor: pointer;
  font-size: 18px;
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-heart:hover {
  background: rgba(239, 83, 80, 0.1);
  border-color: #ef5350;
  transform: scale(1.08);
}

.date {
  font-size: 11px;
  color: var(--gray-600);
  background: var(--gray-200);
  padding: 4px 10px;
  border-radius: var(--radius-md);
  display: inline-block;
  margin-bottom: var(--space-sm);
  font-weight: 500;
}

.item p {
  margin: 0 0 var(--space-md);
  font-size: 13px;
  color: var(--gray-600);
  line-height: 1.6;
}

.meta {
  font-size: 12px;
  color: var(--gray-700);
  padding: var(--space-sm) var(--space-md);
  background: var(--gray-100);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--primary-teal);
  margin-bottom: var(--space-md);
}

.btn-template {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--primary-teal);
  color: var(--white);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all var(--transition-base);
}

.btn-template:hover {
  background: #00acc1;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding-top: var(--space-md);
  margin-top: var(--space-md);
  border-top: 1px solid var(--gray-200);
}

.pagination button {
  width: 32px;
  height: 32px;
  padding: 0;
  background: var(--white);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-700);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination button:hover:not(:disabled) {
  background: var(--gray-100);
  border-color: var(--gray-400);
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination span {
  font-size: 13px;
  color: var(--gray-600);
  font-weight: 500;
  padding: 0 var(--space-sm);
}
</style>

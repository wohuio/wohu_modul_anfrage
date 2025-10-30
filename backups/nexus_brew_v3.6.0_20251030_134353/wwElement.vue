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
                class="btn-remove holo-button"
                @click="form.menge.splice(idx, 1)"
              >
                ✕
              </button>
            </div>
          </div>
          <button
            v-if="form.menge.length < (content.maxAuflagen || 10)"
            type="button"
            class="btn-add holo-button"
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
          <button type="submit" class="btn-primary holo-button" :disabled="loading">
            {{ loading ? 'Wird gesendet...' : (content.submitButtonText || 'Anfrage senden') }}
          </button>
          <button type="button" class="btn-secondary holo-button" @click="resetForm" :disabled="loading">
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
            <button class="btn-heart holo-button" @click="removeFavorite(fav.id)">❤️</button>
          </div>
          <p>{{ getFavBeschreibung(fav) }}</p>
          <div class="meta">
            <strong>Auflagen:</strong>
            {{ getFavMenge(fav) }}
          </div>
          <button class="btn-template holo-button" @click="loadTemplate(getFavData(fav))">
            {{ content.loadTemplateButtonText || 'Als Vorlage laden' }}
          </button>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalFavPages > 1" class="pagination">
        <button class="holo-button" @click="favPage--" :disabled="favPage === 1">‹</button>
        <span>{{ favPage }} / {{ totalFavPages }}</span>
        <button class="holo-button" @click="favPage++" :disabled="favPage === totalFavPages">›</button>
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
        <button v-if="searchQuery" class="btn-clear holo-button" @click="clearSearch">✕</button>
      </div>

      <div v-if="loadingHist" class="empty">Lade Historie...</div>
      <div v-else-if="historie.length === 0" class="empty">Keine Anfragen gefunden</div>
      <div v-else class="items">
        <div v-for="item in paginatedHistorie" :key="item.id" class="item">
          <div class="item-header">
            <h3>{{ item.produkt_titel }}</h3>
            <button class="btn-heart holo-button" @click="toggleFavorite(item.id)">
              {{ isFavorite(item.id) ? '❤️' : '🤍' }}
            </button>
          </div>
          <div class="date">{{ formatDate(item.created_at) }}</div>
          <p>{{ item.produkt_beschreibung }}</p>
          <div class="meta">
            <strong>Auflagen:</strong> {{ formatMenge(item.menge) }}
          </div>
          <button class="btn-template holo-button" @click="loadTemplate(item)">
            {{ content.loadTemplateButtonText || 'Als Vorlage laden' }}
          </button>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalHistPages > 1" class="pagination">
        <button class="holo-button" @click="histPage--" :disabled="histPage === 1">‹</button>
        <span>{{ histPage }} / {{ totalHistPages }}</span>
        <button class="holo-button" @click="histPage++" :disabled="histPage === totalHistPages">›</button>
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

        // Add user_id filter if available
        let fullUrl = url;
        if (props.content.userId) {
          const userId = parseInt(props.content.userId);
          if (!isNaN(userId)) {
            const params = new URLSearchParams({ user_id: userId.toString() });
            fullUrl = `${url}?${params.toString()}`;
            console.log('Loading historie with user filter:', fullUrl);
          }
        }

        const res = await fetch(fullUrl);
        if (!res.ok) throw new Error('Load failed');

        const data = await res.json();
        historie.value = Array.isArray(data) ? data : [];
        histPage.value = 1;

        console.log('Historie loaded:', historie.value.length, 'items for user', props.content.userId);

        emit('trigger-event', {
          name: 'historie-loaded',
          event: { count: historie.value.length, items: historie.value },
        });

      } catch (err) {
        console.error('loadHistorie error:', err);
        historie.value = [];
      } finally {
        loadingHist.value = false;
      }
    };

    const searchHistorie = async (query) => {
      if (!query || query.trim() === '') {
        loadHistorie();
        return;
      }

      if (!props.content.userId) {
        console.error('searchHistorie: user_id is required but not provided');
        showStatus('User ID fehlt für Suche', 'error');
        loadHistorie();
        return;
      }

      loadingHist.value = true;

      try {
        const url = props.content.historieSearchEndpoint ||
          'https://xv05-su7k-rvc8.f2.xano.io/api:SBdZMdsy/text_search';

        const userId = parseInt(props.content.userId);

        if (isNaN(userId)) {
          console.error('searchHistorie: user_id is not a valid number:', props.content.userId);
          showStatus('User ID ist ungültig', 'error');
          loadHistorie();
          return;
        }

        const params = new URLSearchParams({
          user_id: userId.toString(),
          search_term: query.trim(),
          page: '1',
          per_page: '100'
        });

        console.log('=== Searching history ===');
        console.log('URL:', url);
        console.log('Parameters:', {
          user_id: userId,
          search_term: query.trim(),
          page: 1,
          per_page: 100
        });
        console.log('Full URL:', `${url}?${params.toString()}`);

        const res = await fetch(`${url}?${params.toString()}`);
        console.log('Search response status:', res.status, res.statusText);

        if (!res.ok) {
          const errorText = await res.text().catch(() => '');
          console.error('=== Search API Error ===');
          console.error('Status:', res.status);
          console.error('Status Text:', res.statusText);
          console.error('Response Body:', errorText);
          console.error('Request URL:', `${url}?${params.toString()}`);

          // Try to parse error as JSON
          try {
            const errorJson = JSON.parse(errorText);
            console.error('Error Details:', errorJson);
          } catch (e) {
            console.error('Error response is not JSON');
          }

          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        console.log('Search response data:', data);
        console.log('Response type:', typeof data, 'Is array:', Array.isArray(data));

        if (data && typeof data === 'object') {
          console.log('Response keys:', Object.keys(data));
        }

        // Handle response structure
        historie.value = Array.isArray(data) ? data :
                        Array.isArray(data.items) ? data.items :
                        Array.isArray(data.results) ? data.results :
                        Array.isArray(data.search_results) ? data.search_results :
                        Array.isArray(data.data) ? data.data : [];

        histPage.value = 1;

        console.log('=== Search completed ===');
        console.log('Results found:', historie.value.length);
        if (historie.value.length > 0) {
          console.log('First result:', historie.value[0]);
        }

        emit('trigger-event', {
          name: 'historie-searched',
          event: { query, count: historie.value.length, items: historie.value },
        });

      } catch (err) {
        console.error('=== searchHistorie error ===');
        console.error('Error:', err);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        historie.value = [];
        showStatus('Suchfehler: ' + err.message, 'error');
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
        // Step 1: Load favorites list (IDs only)
        const listUrl = props.content.favoritenListEndpoint ||
          'https://xv05-su7k-rvc8.f2.xano.io/api:SBdZMdsy/favoriten_list_id';

        const fullUrl = `${listUrl}?user_id=${parseInt(props.content.userId)}`;
        console.log('=== Loading favorites (Step 1) ===');
        console.log('URL:', fullUrl);

        const res = await fetch(fullUrl);
        console.log('Response:', res.status, res.statusText);

        if (!res.ok) {
          const errorText = await res.text().catch(() => '');
          console.error('Load favorites error:', {
            status: res.status,
            statusText: res.statusText,
            body: errorText,
            url: fullUrl
          });
          throw new Error('Load failed');
        }

        const data = await res.json();
        console.log('Favorites list data:', data);

        // Extract favorites array
        const favList = Array.isArray(data) ? data :
                       Array.isArray(data.favorites) ? data.favorites :
                       Array.isArray(data.items) ? data.items : [];

        console.log('Found', favList.length, 'favorites');

        if (favList.length === 0) {
          favorites.value = [];
          favPage.value = 1;
          emit('trigger-event', {
            name: 'favoriten-loaded',
            event: { count: 0, items: [] },
          });
          return;
        }

        // Step 2: Load product details for each favorite
        const detailEndpoint = props.content.produktDetailEndpoint ||
          'https://xv05-su7k-rvc8.f2.xano.io/api:SBdZMdsy/product_beschreibung_anfrage_by_id';

        console.log('=== Loading product details (Step 2) ===');
        console.log('Detail endpoint:', detailEndpoint);

        // Create array of promises to load all product details in parallel
        const productRequests = favList.map(async (fav) => {
          const productId = fav.product_beschreibung_anfrage_id;
          if (!productId) {
            console.warn('Favorite has no product_beschreibung_anfrage_id:', fav);
            return { ...fav, product_beschreibung_anfrage: null };
          }

          try {
            const productUrl = `${detailEndpoint}?id=${productId}`;
            console.log('Fetching product:', productUrl);

            const productRes = await fetch(productUrl);

            if (!productRes.ok) {
              console.error('Failed to load product', productId, ':', productRes.status);
              return { ...fav, product_beschreibung_anfrage: null };
            }

            const productData = await productRes.json();
            console.log('Product', productId, 'loaded:', productData);

            // Merge product data into favorite
            return {
              ...fav,
              product_beschreibung_anfrage: productData
            };

          } catch (err) {
            console.error('Error loading product', productId, ':', err);
            return { ...fav, product_beschreibung_anfrage: null };
          }
        });

        // Wait for all product requests to complete
        const enrichedFavorites = await Promise.all(productRequests);

        console.log('=== All product details loaded ===');
        console.log('Enriched favorites:', enrichedFavorites);

        // Log first enriched item for debugging
        if (enrichedFavorites.length > 0) {
          console.log('First enriched favorite:', JSON.stringify(enrichedFavorites[0], null, 2));
        }

        favorites.value = enrichedFavorites;
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
      if (!props.content.userId) {
        showStatus('User ID fehlt', 'error');
        return;
      }

      try {
        const url = props.content.favoritenDeleteEndpoint ||
          'https://xv05-su7k-rvc8.f2.xano.io/api:SBdZMdsy/favoriten_delete';

        const userId = parseInt(props.content.userId);
        const fullUrl = `${url}?id=${favId}&user_id=${userId}`;

        console.log('=== Removing favorite ===');
        console.log('URL:', fullUrl);
        console.log('Favorite ID:', favId);
        console.log('User ID:', userId);

        const res = await fetch(fullUrl, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        console.log('Delete response:', res.status, res.statusText);

        if (!res.ok) {
          const errorText = await res.text().catch(() => '');
          console.error('Delete error:', {
            status: res.status,
            statusText: res.statusText,
            body: errorText
          });
          throw new Error('Delete failed');
        }

        const data = await res.json();
        console.log('Delete success:', data);

        // Remove from local state
        favorites.value = favorites.value.filter(f => f.id !== favId);

        showStatus('Favorit entfernt!', 'success');

        emit('trigger-event', {
          name: 'favorite-removed',
          event: { favorit_id: favId, user_id: userId },
        });

      } catch (err) {
        console.error('removeFavorite error:', err);
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
/* Import Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Exo+2:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap');

/* CSS Variables - Nexus Brew Design System */
:root {
  --primary-gradient: linear-gradient(135deg, #d1346e, #7b45c7, #4b7ed9);
  --secondary-gradient: linear-gradient(45deg, #40c4cc, #d1346e, #e06040);
  --muted-gradient: linear-gradient(135deg, #b8306a, #6d3fb3, #3d6cc7);
  --dark-bg: #0a0a0a;
  --card-bg: rgba(20, 20, 20, 0.8);
  --text-primary: #e0e0e0;
  --text-secondary: #9a9a9a;
  --neon-pink: #d1346e;
  --neon-blue: #40c4cc;
  --neon-purple: #7b45c7;
  --muted-pink: #b8306a;
  --muted-blue: #3a9da3;
  --muted-purple: #6d3fb3;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Main Container with Nexus Brew Background */
.anfrage-module {
  font-family: 'Exo 2', sans-serif;
  background: #000000;
  color: var(--text-primary);
  padding: 32px;
  display: grid;
  grid-template-columns: 1fr 420px 420px;
  gap: 32px;
  position: relative;
  overflow: hidden;
  min-height: 100vh;
}

/* Background Layers */
.anfrage-module::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    linear-gradient(135deg,
      #0a0014 0%,
      #1a0a2e 25%,
      #16213e 50%,
      #0f3460 75%,
      #0a0014 100%),
    radial-gradient(ellipse at top left, rgba(138, 43, 226, 0.25) 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, rgba(255, 0, 110, 0.25) 0%, transparent 50%),
    radial-gradient(ellipse at center, rgba(0, 245, 255, 0.15) 0%, transparent 60%);
  z-index: -3;
  animation: gradientShift 15s ease-in-out infinite;
}

@keyframes gradientShift {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1) rotate(0deg);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1) rotate(180deg);
  }
}

/* Grid Pattern Overlay */
.anfrage-module::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    linear-gradient(rgba(138, 43, 226, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 0, 110, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  z-index: -1;
  animation: gridMove 10s linear infinite;
}

@keyframes gridMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}

/* Section Cards with Gradient Borders */
.section {
  display: flex;
  flex-direction: column;
  gap: 24px;
  background: var(--card-bg);
  border-radius: 15px;
  padding: 32px;
  position: relative;
  overflow: hidden;
  border: 1px solid transparent;
  background-clip: padding-box;
  transition: all 0.4s ease;
  box-shadow: 0 10px 30px rgba(109, 63, 179, 0.3);
}

.section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 15px;
  padding: 1px;
  background: var(--muted-gradient);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.6;
  pointer-events: none;
}

.section:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(138, 43, 226, 0.4);
}

.section:hover::before {
  opacity: 1;
}

/* Section Title with Glitch Effect */
.section-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 24px;
  background: var(--muted-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-transform: uppercase;
  letter-spacing: 3px;
  position: relative;
  text-shadow: 0.05em 0 0 var(--muted-pink), -0.025em -0.05em 0 var(--muted-blue),
    0.025em 0.05em 0 var(--muted-purple);
  animation: glitch 500ms infinite;
}

@keyframes glitch {
  0%, 100% {
    text-shadow: 0.05em 0 0 var(--muted-pink), -0.025em -0.05em 0 var(--muted-blue),
      0.025em 0.05em 0 var(--muted-purple);
  }
  14% {
    text-shadow: 0.05em 0 0 var(--muted-pink), -0.025em -0.05em 0 var(--muted-blue),
      0.025em 0.05em 0 var(--muted-purple);
  }
  15% {
    text-shadow: -0.05em -0.025em 0 var(--muted-pink), 0.025em 0.025em 0 var(--muted-blue),
      -0.05em -0.05em 0 var(--muted-purple);
  }
  49% {
    text-shadow: -0.05em -0.025em 0 var(--muted-pink), 0.025em 0.025em 0 var(--muted-blue),
      -0.05em -0.05em 0 var(--muted-purple);
  }
  50% {
    text-shadow: 0.025em 0.05em 0 var(--muted-pink), 0.05em 0 0 var(--muted-blue),
      0 -0.05em 0 var(--muted-purple);
  }
  99% {
    text-shadow: 0.025em 0.05em 0 var(--muted-pink), 0.05em 0 0 var(--muted-blue),
      0 -0.05em 0 var(--muted-purple);
  }
}

/* Form Fields */
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field label {
  font-family: 'Share Tech Mono', monospace;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted-blue);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.3s ease;
}

.field label:hover {
  text-shadow: 0 0 8px rgba(58, 157, 163, 0.3);
}

.field input,
.field textarea {
  padding: 12px 16px;
  font-size: 14px;
  background: rgba(10, 10, 10, 0.8);
  border: 1px solid rgba(109, 63, 179, 0.3);
  border-radius: 8px;
  font-family: 'Exo 2', sans-serif;
  transition: all 0.3s ease;
  color: var(--text-primary);
}

.field input:hover,
.field textarea:hover {
  border-color: rgba(109, 63, 179, 0.5);
}

.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: var(--muted-pink);
  box-shadow: 0 0 15px rgba(184, 48, 106, 0.3);
  background: rgba(10, 10, 10, 0.95);
}

.field input::placeholder,
.field textarea::placeholder {
  color: rgba(154, 154, 154, 0.5);
}

/* Auflagen */
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

/* Buttons */
.btn-remove,
.btn-add,
.btn-primary,
.btn-secondary,
.btn-heart,
.btn-template,
.btn-clear,
.pagination button {
  font-family: 'Exo 2', sans-serif;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.btn-remove {
  width: 40px;
  height: 40px;
  padding: 0;
  background: rgba(239, 83, 80, 0.1);
  color: #ef5350;
  border: 1px solid rgba(239, 83, 80, 0.3);
  border-radius: 8px;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-remove:hover {
  background: rgba(239, 83, 80, 0.2);
  border-color: #ef5350;
  transform: scale(1.1);
  box-shadow: 0 0 15px rgba(239, 83, 80, 0.4);
}

.btn-add {
  padding: 12px 20px;
  background: transparent;
  color: var(--muted-blue);
  border: 1px dashed rgba(58, 157, 163, 0.4);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.btn-add:hover {
  background: rgba(58, 157, 163, 0.1);
  border-color: var(--muted-blue);
  border-style: solid;
  box-shadow: 0 0 10px rgba(58, 157, 163, 0.3);
}

/* Status Messages */
.status {
  padding: 16px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  border-left: 4px solid;
  transition: all 0.3s ease;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.status.success {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
  border-left-color: #4caf50;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.2);
}

.status.error {
  background: rgba(239, 83, 80, 0.1);
  color: #ef5350;
  border-left-color: #ef5350;
  box-shadow: 0 0 10px rgba(239, 83, 80, 0.2);
}

/* Action Buttons */
.actions {
  display: flex;
  gap: 14px;
  margin-top: 4px;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 14px 24px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.btn-primary {
  background: var(--muted-gradient);
  color: white;
  box-shadow: 0 5px 15px rgba(123, 69, 199, 0.3);
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(123, 69, 199, 0.5);
  background: linear-gradient(135deg, #a02859, #5e3492, #325aa6);
}

.btn-primary:hover:not(:disabled)::before {
  left: 100%;
}

.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 2px solid;
  border-image: var(--muted-gradient) 1;
}

.btn-secondary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: var(--muted-gradient);
  transition: left 0.3s ease;
  z-index: -1;
}

.btn-secondary:hover:not(:disabled) {
  color: white;
  border-image: none;
  border: 2px solid transparent;
}

.btn-secondary:hover:not(:disabled)::before {
  left: 0;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

/* Search */
.search {
  position: relative;
}

.search input {
  width: 100%;
  padding: 12px 40px 12px 16px;
  background: rgba(10, 10, 10, 0.8);
  border: 1px solid rgba(109, 63, 179, 0.3);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary);
  transition: all 0.3s ease;
  font-family: 'Exo 2', sans-serif;
}

.search input:focus {
  border-color: var(--muted-pink);
  box-shadow: 0 0 15px rgba(184, 48, 106, 0.3);
}

.btn-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  padding: 0;
  background: rgba(109, 63, 179, 0.2);
  border: 1px solid rgba(109, 63, 179, 0.3);
  border-radius: 50%;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.btn-clear:hover {
  background: rgba(109, 63, 179, 0.4);
  color: white;
  box-shadow: 0 0 10px rgba(109, 63, 179, 0.3);
}

/* Empty State */
.empty {
  padding: 48px 24px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  border: 2px dashed rgba(109, 63, 179, 0.3);
  border-radius: 8px;
  background: rgba(109, 63, 179, 0.05);
}

/* Items List */
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
  background: rgba(10, 10, 10, 0.5);
  border-radius: 8px;
}

.items::-webkit-scrollbar-thumb {
  background: var(--muted-gradient);
  border-radius: 8px;
}

.items::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #a02859, #5e3492, #325aa6);
}

/* Item Cards with Menu Hover Effect */
.item {
  background: rgba(20, 20, 20, 0.9);
  border: 1px solid rgba(109, 63, 179, 0.2);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.item::before {
  content: '';
  position: absolute;
  left: -100%;
  top: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg,
    transparent,
    rgba(138, 43, 226, 0.1),
    rgba(255, 0, 110, 0.1),
    transparent);
  transition: left 0.5s ease;
  z-index: 0;
}

.item:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px rgba(109, 63, 179, 0.4);
  border-color: var(--muted-purple);
}

.item:hover::before {
  left: 100%;
}

.favorite-item {
  background: rgba(184, 48, 106, 0.05);
  border: 2px solid rgba(184, 48, 106, 0.3);
  box-shadow: 0px 8px 20px rgba(184, 48, 106, 0.2);
}

/* Item Header */
.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
}

.item-header h3 {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 16px;
  font-weight: 600;
  flex: 1;
  color: var(--text-primary);
  transition: all 0.3s ease;
}

.item:hover .item-header h3 {
  color: var(--muted-pink);
  text-shadow: 0 0 8px rgba(184, 48, 106, 0.3);
}

.btn-heart {
  width: 40px;
  height: 40px;
  padding: 0;
  background: rgba(184, 48, 106, 0.1);
  border: 1px solid rgba(184, 48, 106, 0.3);
  cursor: pointer;
  font-size: 18px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-heart:hover {
  background: rgba(184, 48, 106, 0.2);
  border-color: var(--muted-pink);
  transform: scale(1.15);
  box-shadow: 0 0 15px rgba(184, 48, 106, 0.4);
}

/* Date Badge */
.date {
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  color: var(--muted-blue);
  background: rgba(58, 157, 163, 0.1);
  padding: 6px 12px;
  border-radius: 20px;
  display: inline-block;
  margin-bottom: 12px;
  font-weight: 500;
  border: 1px solid rgba(58, 157, 163, 0.3);
  letter-spacing: 1px;
  position: relative;
  z-index: 1;
}

.item p {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  position: relative;
  z-index: 1;
}

/* Meta Info */
.meta {
  font-family: 'Share Tech Mono', monospace;
  font-size: 12px;
  color: var(--text-primary);
  padding: 12px 16px;
  background: rgba(109, 63, 179, 0.1);
  border-radius: 8px;
  border-left: 3px solid var(--muted-purple);
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
  letter-spacing: 0.5px;
}

.meta strong {
  color: var(--muted-pink);
}

/* Template Button */
.btn-template {
  width: 100%;
  padding: 12px 20px;
  background: var(--muted-gradient);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  position: relative;
  z-index: 1;
}

.btn-template::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transform: rotate(45deg);
  transition: all 0.6s ease;
  opacity: 0;
}

.btn-template:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(109, 63, 179, 0.4);
  background: linear-gradient(135deg, #a02859, #5e3492, #325aa6);
}

.btn-template:hover::before {
  opacity: 1;
  animation: shimmer 0.6s ease;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%) translateY(-100%) rotate(45deg);
  }
  100% {
    transform: translateX(100%) translateY(100%) rotate(45deg);
  }
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid rgba(109, 63, 179, 0.2);
}

.pagination button {
  width: 36px;
  height: 36px;
  padding: 0;
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid rgba(109, 63, 179, 0.3);
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--muted-blue);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination button:hover:not(:disabled) {
  background: var(--muted-gradient);
  border-color: transparent;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(109, 63, 179, 0.3);
}

.pagination button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pagination span {
  font-family: 'Share Tech Mono', monospace;
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  padding: 0 12px;
  letter-spacing: 1px;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .anfrage-module {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .anfrage-module {
    padding: 16px;
    gap: 16px;
  }

  .section {
    padding: 24px;
  }

  .section-title {
    font-size: 1.5rem;
  }

  .actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>

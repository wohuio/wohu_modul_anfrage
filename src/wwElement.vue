<template>
  <div class="anfrage-module" :style="containerStyle" :class="layoutClass">
    <!-- Form Section -->
    <div class="form-section">
      <h2 v-if="content?.formTitle" class="section-title">{{ content.formTitle }}</h2>

      <form @submit.prevent="handleSubmit" class="form-content">
        <!-- Titel Field -->
        <div class="form-group">
          <label :style="{ color: content?.labelColor }">
            {{ content?.titleLabel || 'Titel' }}
          </label>
          <input
            v-model="formData.produkt_titel"
            type="text"
            class="form-input"
            :style="inputStyle"
            placeholder="Titel eingeben..."
            required
          />
        </div>

        <!-- Beschreibung Field -->
        <div class="form-group">
          <label :style="{ color: content?.labelColor }">
            {{ content?.descriptionLabel || 'Beschreibung' }}
          </label>
          <textarea
            v-model="formData.produkt_beschreibung"
            class="form-textarea"
            :style="inputStyle"
            placeholder="Beschreibung eingeben..."
            rows="5"
            required
          ></textarea>
        </div>

        <!-- Auflagen Fields (Dynamic Array) -->
        <div class="form-group">
          <label :style="{ color: content?.labelColor }">
            {{ content?.auflageLabel || 'Auflagen' }}
          </label>

          <div class="auflagen-list">
            <div
              v-for="(auflage, index) in formData.menge"
              :key="index"
              class="auflage-item"
            >
              <input
                v-model.number="formData.menge[index]"
                type="number"
                class="form-input auflage-input"
                :style="inputStyle"
                :placeholder="content?.auflagePlaceholder || 'z.B. 1000'"
                min="1"
                required
              />
              <button
                v-if="formData.menge.length > (content?.minAuflagen || 1)"
                type="button"
                class="btn btn-remove"
                :style="removeButtonStyle"
                @click="removeAuflage(index)"
                :title="content?.removeAuflageButtonText || 'Entfernen'"
              >
                ✕
              </button>
            </div>
          </div>

          <button
            v-if="formData.menge.length < (content?.maxAuflagen || 10)"
            type="button"
            class="btn btn-add"
            :style="addButtonStyle"
            @click="addAuflage"
          >
            {{ content?.addAuflageButtonText || '+ Auflage hinzufügen' }}
          </button>
        </div>

        <!-- Status Messages -->
        <div v-if="statusMessage" :class="['status-message', statusType]">
          {{ statusMessage }}
        </div>

        <!-- Action Buttons -->
        <div class="form-actions">
          <button
            type="submit"
            class="btn btn-primary"
            :style="primaryButtonStyle"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? 'Wird gesendet...' : (content?.submitButtonText || 'Anfrage senden') }}
          </button>

          <button
            type="button"
            class="btn btn-secondary"
            :style="secondaryButtonStyle"
            @click="handleReset"
            :disabled="isSubmitting"
          >
            {{ content?.resetButtonText || 'Zurücksetzen' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Favoriten Section -->
    <div v-if="content?.showFavoriten" class="favoriten-section">
      <h2 class="section-title">{{ content?.favoritenTitle || 'Meine Favoriten' }}</h2>

      <div v-if="isLoadingFavoriten" class="favoriten-loading">
        Lade Favoriten...
      </div>

      <div v-else-if="favoritenError" class="favoriten-error">
        {{ favoritenError }}
      </div>

      <div v-else-if="favoritenItems.length === 0" class="favoriten-empty">
        Noch keine Favoriten vorhanden
      </div>

      <div v-else class="favoriten-list">
        <div
          v-for="favorit in displayedFavoritenItems"
          :key="favorit.id"
          class="favoriten-item"
        >
          <div class="favoriten-item-header">
            <h3 class="favoriten-item-title">
              {{ favorit.product_beschreibung_anfrage?.produkt_titel || 'Unbekannt' }}
            </h3>
            <button
              type="button"
              class="btn btn-heart-filled"
              @click="removeFavorite(favorit)"
              :disabled="isTogglingFavorite"
              title="Von Favoriten entfernen"
            >
              ❤️
            </button>
          </div>

          <p class="favoriten-item-description">
            {{ favorit.product_beschreibung_anfrage?.produkt_beschreibung || '' }}
          </p>

          <div class="favoriten-item-menge">
            <strong>Auflagen:</strong>
            <span v-if="Array.isArray(favorit.product_beschreibung_anfrage?.menge) && favorit.product_beschreibung_anfrage.menge.length > 0">
              {{ favorit.product_beschreibung_anfrage.menge.join(', ') }}
            </span>
            <span v-else class="text-muted">Keine Auflagen</span>
          </div>

          <button
            type="button"
            class="btn btn-template"
            :style="primaryButtonStyle"
            @click="loadTemplate(favorit.product_beschreibung_anfrage)"
          >
            {{ content?.loadTemplateButtonText || 'Als Vorlage laden' }}
          </button>
        </div>
      </div>

      <!-- Favoriten Pagination -->
      <div v-if="favoritenItems.length > favoritenItemsPerPage" class="pagination">
        <button
          class="pagination-btn"
          @click="goToFavoritenPage(currentFavoritenPage - 1)"
          :disabled="currentFavoritenPage === 1"
        >
          ‹ Zurück
        </button>

        <div class="pagination-numbers">
          <button
            v-for="page in getPageNumbers(currentFavoritenPage, favoritenTotalPages)"
            :key="page"
            class="pagination-number"
            :class="{ active: page === currentFavoritenPage, ellipsis: page === '...' }"
            @click="page !== '...' && goToFavoritenPage(page)"
            :disabled="page === '...'"
          >
            {{ page }}
          </button>
        </div>

        <button
          class="pagination-btn"
          @click="goToFavoritenPage(currentFavoritenPage + 1)"
          :disabled="currentFavoritenPage === favoritenTotalPages"
        >
          Weiter ›
        </button>
      </div>
    </div>

    <!-- Historie Section -->
    <div v-if="content?.showHistorie" class="historie-section">
      <h2 class="section-title">{{ content?.historieTitle || 'Vergangene Anfragen' }}</h2>

      <div v-if="isLoadingHistorie" class="historie-loading">
        Lade Historie...
      </div>

      <div v-else-if="historieError" class="historie-error">
        {{ historieError }}
      </div>

      <div v-else-if="historieItems.length === 0" class="historie-empty">
        Keine vergangenen Anfragen vorhanden
      </div>

      <div v-else class="historie-list">
        <div
          v-for="item in displayedHistorieItems"
          :key="item.id"
          class="historie-item"
        >
          <div class="historie-item-header">
            <h3 class="historie-item-title">{{ item.produkt_titel }}</h3>
            <button
              type="button"
              class="btn btn-heart"
              @click="toggleFavorite(item)"
              :disabled="isTogglingFavorite"
              :title="isFavorite(item.id) ? 'Von Favoriten entfernen' : 'Zu Favoriten hinzufügen'"
            >
              {{ isFavorite(item.id) ? '❤️' : '🤍' }}
            </button>
          </div>

          <div class="historie-item-meta">
            <span class="historie-item-date">{{ formatDate(item.created_at) }}</span>
          </div>

          <p class="historie-item-description">{{ item.produkt_beschreibung }}</p>

          <div class="historie-item-menge">
            <strong>Auflagen:</strong>
            <span v-if="Array.isArray(item.menge) && item.menge.length > 0">
              {{ item.menge.join(', ') }}
            </span>
            <span v-else class="text-muted">-</span>
          </div>

          <button
            type="button"
            class="btn btn-template"
            :style="primaryButtonStyle"
            @click="loadTemplate(item)"
          >
            {{ content?.loadTemplateButtonText || 'Als Vorlage laden' }}
          </button>
        </div>
      </div>

      <!-- Historie Pagination -->
      <div v-if="historieItems.length > historieItemsPerPage" class="pagination">
        <button
          class="pagination-btn"
          @click="goToHistoriePage(currentHistoriePage - 1)"
          :disabled="currentHistoriePage === 1"
        >
          ‹ Zurück
        </button>

        <div class="pagination-numbers">
          <button
            v-for="page in getPageNumbers(currentHistoriePage, historieTotalPages)"
            :key="page"
            class="pagination-number"
            :class="{ active: page === currentHistoriePage, ellipsis: page === '...' }"
            @click="page !== '...' && goToHistoriePage(page)"
            :disabled="page === '...'"
          >
            {{ page }}
          </button>
        </div>

        <button
          class="pagination-btn"
          @click="goToHistoriePage(currentHistoriePage + 1)"
          :disabled="currentHistoriePage === historieTotalPages"
        >
          Weiter ›
        </button>
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
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
  },
  emits: ['trigger-event'],
  setup(props, { emit }) {
    // Form data
    const formData = ref({
      produkt_titel: '',
      produkt_beschreibung: '',
      menge: [0]
    });

    // Status tracking
    const isSubmitting = ref(false);
    const statusMessage = ref('');
    const statusType = ref(''); // 'success' or 'error'

    // Historie tracking
    const isLoadingHistorie = ref(false);
    const historieError = ref('');
    const historieItems = ref([]);

    // Favoriten tracking
    const isLoadingFavoriten = ref(false);
    const favoritenError = ref('');
    const favoritenItems = ref([]);
    const isTogglingFavorite = ref(false);

    // Pagination
    const currentHistoriePage = ref(1);
    const currentFavoritenPage = ref(1);

    // Internal variables for NoCode users
    const { value: lastRequestData, setValue: setLastRequestData } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'lastRequestData',
        type: 'object',
        defaultValue: {},
      });

    const { value: requestCount, setValue: setRequestCount } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'requestCount',
        type: 'number',
        defaultValue: 0,
      });

    // Computed properties
    const layoutClass = computed(() => {
      const showHistorie = props.content?.showHistorie;
      const showFavoriten = props.content?.showFavoriten;
      const position = props.content?.historiePosition || 'right';

      if (showHistorie && showFavoriten) {
        return 'layout-three';
      } else if (showHistorie || showFavoriten) {
        return `layout-${position}`;
      }
      return 'layout-single';
    });

    const historieItemsPerPage = computed(() => props.content?.historieItemsPerPage || 10);
    const historieTotalPages = computed(() =>
      Math.ceil(historieItems.value.length / historieItemsPerPage.value)
    );

    const displayedHistorieItems = computed(() => {
      const start = (currentHistoriePage.value - 1) * historieItemsPerPage.value;
      const end = start + historieItemsPerPage.value;
      return historieItems.value.slice(start, end);
    });

    const favoritenItemsPerPage = computed(() => props.content?.favoritenItemsPerPage || 10);
    const favoritenTotalPages = computed(() =>
      Math.ceil(favoritenItems.value.length / favoritenItemsPerPage.value)
    );

    const displayedFavoritenItems = computed(() => {
      const start = (currentFavoritenPage.value - 1) * favoritenItemsPerPage.value;
      const end = start + favoritenItemsPerPage.value;
      return favoritenItems.value.slice(start, end);
    });

    // Computed styles
    const containerStyle = computed(() => ({
      '--bg-color': props.content?.backgroundColor || '#ffffff',
      '--border-color': props.content?.borderColor || '#e0e0e0',
      '--border-radius': props.content?.borderRadius || '8px',
      '--text-color': props.content?.textColor || '#333333',
    }));

    const inputStyle = computed(() => ({
      borderColor: props.content?.borderColor || '#e0e0e0',
      color: props.content?.textColor || '#333333',
    }));

    const primaryButtonStyle = computed(() => ({
      backgroundColor: props.content?.primaryButtonColor || '#007bff',
      borderColor: props.content?.primaryButtonColor || '#007bff',
    }));

    const secondaryButtonStyle = computed(() => ({
      backgroundColor: props.content?.secondaryButtonColor || '#6c757d',
      borderColor: props.content?.secondaryButtonColor || '#6c757d',
    }));

    const removeButtonStyle = computed(() => ({
      backgroundColor: props.content?.removeButtonColor || '#dc3545',
      borderColor: props.content?.removeButtonColor || '#dc3545',
    }));

    const addButtonStyle = computed(() => ({
      backgroundColor: props.content?.addButtonColor || '#28a745',
      borderColor: props.content?.addButtonColor || '#28a745',
    }));

    // Auflage management
    const addAuflage = () => {
      const maxAuflagen = props.content?.maxAuflagen || 10;
      if (formData.value.menge.length < maxAuflagen) {
        formData.value.menge.push(0);
      }
    };

    const removeAuflage = (index) => {
      const minAuflagen = props.content?.minAuflagen || 1;
      if (formData.value.menge.length > minAuflagen) {
        formData.value.menge.splice(index, 1);
      }
    };

    // Load Historie from API
    const loadHistorie = async () => {
      if (!props.content?.showHistorie) return;

      isLoadingHistorie.value = true;
      historieError.value = '';

      try {
        const endpoint = props.content?.historieEndpoint ||
          'https://xv05-su7k-rvc8.f2.xano.io/api:SBdZMdsy/product_beschreibung_anfrage';

        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        historieItems.value = Array.isArray(data) ? data : [];

        // Reset to first page when data changes
        currentHistoriePage.value = 1;

        // Emit historie-loaded event
        emit('trigger-event', {
          name: 'historie-loaded',
          event: {
            count: historieItems.value.length,
            items: historieItems.value,
          },
        });

      } catch (error) {
        historieError.value = 'Fehler beim Laden der Historie';
        console.error('Historie loading error:', error);
      } finally {
        isLoadingHistorie.value = false;
      }
    };

    // Load Favoriten from API
    const loadFavoriten = async () => {
      if (!props.content?.showFavoriten) return;

      const userId = props.content?.userId;
      if (!userId) {
        favoritenError.value = 'User ID fehlt';
        return;
      }

      isLoadingFavoriten.value = true;
      favoritenError.value = '';

      try {
        const endpoint = props.content?.favoritenListEndpoint ||
          'https://xv05-su7k-rvc8.f2.xano.io/api:mEnQftQz/favoriten_list';

        const url = `${endpoint}?user_id=${userId}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        favoritenItems.value = Array.isArray(data) ? data : [];

        // Reset to first page when data changes
        currentFavoritenPage.value = 1;

        // Emit favoriten-loaded event
        emit('trigger-event', {
          name: 'favoriten-loaded',
          event: {
            count: favoritenItems.value.length,
            items: favoritenItems.value,
          },
        });

      } catch (error) {
        favoritenError.value = 'Fehler beim Laden der Favoriten';
        console.error('Favoriten loading error:', error);
      } finally {
        isLoadingFavoriten.value = false;
      }
    };

    // Check if item is favorite
    const isFavorite = (anfrageId) => {
      return favoritenItems.value.some(
        fav => fav.product_beschreibung_anfrage_id === anfrageId
      );
    };

    // Get favorit ID by anfrage ID
    const getFavoritId = (anfrageId) => {
      const favorit = favoritenItems.value.find(
        fav => fav.product_beschreibung_anfrage_id === anfrageId
      );
      return favorit?.id || null;
    };

    // Toggle favorite (add or remove)
    const toggleFavorite = async (item) => {
      const userId = props.content?.userId;
      if (!userId) {
        statusMessage.value = 'User ID fehlt';
        statusType.value = 'error';
        return;
      }

      isTogglingFavorite.value = true;

      try {
        if (isFavorite(item.id)) {
          // Remove from favorites
          const favoritId = getFavoritId(item.id);
          if (!favoritId) throw new Error('Favorit ID nicht gefunden');

          const endpoint = props.content?.favoritenDeleteEndpoint ||
            'https://xv05-su7k-rvc8.f2.xano.io/api:mEnQftQz/favoriten_delete';

          const response = await fetch(`${endpoint}?id=${favoritId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Remove from local state
          favoritenItems.value = favoritenItems.value.filter(fav => fav.id !== favoritId);

          // Emit event
          emit('trigger-event', {
            name: 'favorite-removed',
            event: {
              favorit_id: favoritId,
              anfrage_id: item.id,
            },
          });

        } else {
          // Add to favorites
          const endpoint = props.content?.favoritenAddEndpoint ||
            'https://xv05-su7k-rvc8.f2.xano.io/api:mEnQftQz/favoriten';

          const payload = {
            user_id: parseInt(userId),
            product_beschreibung_anfrage_id: item.id,
          };

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Reload favorites to get the full object with joined data
          await loadFavoriten();

          // Emit event
          emit('trigger-event', {
            name: 'favorite-added',
            event: {
              favorit_id: 0, // Will be set after reload
              anfrage_id: item.id,
            },
          });
        }

      } catch (error) {
        statusMessage.value = 'Fehler beim Aktualisieren der Favoriten';
        statusType.value = 'error';
        console.error('Toggle favorite error:', error);

        setTimeout(() => {
          if (statusMessage.value === 'Fehler beim Aktualisieren der Favoriten') {
            statusMessage.value = '';
            statusType.value = '';
          }
        }, 3000);
      } finally {
        isTogglingFavorite.value = false;
      }
    };

    // Remove favorite
    const removeFavorite = async (favorit) => {
      const userId = props.content?.userId;
      if (!userId) {
        statusMessage.value = 'User ID fehlt';
        statusType.value = 'error';
        return;
      }

      isTogglingFavorite.value = true;

      try {
        const endpoint = props.content?.favoritenDeleteEndpoint ||
          'https://xv05-su7k-rvc8.f2.xano.io/api:mEnQftQz/favoriten_delete';

        const response = await fetch(`${endpoint}?id=${favorit.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Remove from local state
        favoritenItems.value = favoritenItems.value.filter(fav => fav.id !== favorit.id);

        // Emit event
        emit('trigger-event', {
          name: 'favorite-removed',
          event: {
            favorit_id: favorit.id,
            anfrage_id: favorit.product_beschreibung_anfrage_id,
          },
        });

      } catch (error) {
        statusMessage.value = 'Fehler beim Entfernen des Favoriten';
        statusType.value = 'error';
        console.error('Remove favorite error:', error);

        setTimeout(() => {
          if (statusMessage.value === 'Fehler beim Entfernen des Favoriten') {
            statusMessage.value = '';
            statusType.value = '';
          }
        }, 3000);
      } finally {
        isTogglingFavorite.value = false;
      }
    };

    // Load template from historie item
    const loadTemplate = (item) => {
      formData.value = {
        produkt_titel: item.produkt_titel || '',
        produkt_beschreibung: item.produkt_beschreibung || '',
        menge: Array.isArray(item.menge) && item.menge.length > 0 ? [...item.menge] : [0]
      };

      statusMessage.value = 'Vorlage geladen!';
      statusType.value = 'success';

      // Emit template-loaded event
      emit('trigger-event', {
        name: 'template-loaded',
        event: {
          produkt_titel: formData.value.produkt_titel,
          produkt_beschreibung: formData.value.produkt_beschreibung,
          menge: formData.value.menge,
        },
      });

      // Clear message after 2 seconds
      setTimeout(() => {
        if (statusMessage.value === 'Vorlage geladen!') {
          statusMessage.value = '';
          statusType.value = '';
        }
      }, 2000);
    };

    // Handle form submission
    const handleSubmit = async () => {
      isSubmitting.value = true;
      statusMessage.value = '';
      statusType.value = '';

      try {
        const userId = props.content?.userId;
        if (!userId) {
          throw new Error('User ID fehlt');
        }

        const endpoint = props.content?.apiEndpoint ||
          'https://xv05-su7k-rvc8.f2.xano.io/api:SBdZMdsy/product_beschreibung_anfrage';

        // Create JSON payload
        const payload = {
          user_id: parseInt(userId),
          produkt_titel: formData.value.produkt_titel,
          produkt_beschreibung: formData.value.produkt_beschreibung,
          menge: formData.value.menge.filter(m => m > 0), // Remove zeros
        };

        // Make API call
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();

        // Update internal variables
        setLastRequestData(payload);
        setRequestCount(requestCount.value + 1);

        // Show success message
        statusMessage.value = props.content?.successMessage || 'Anfrage erfolgreich gesendet!';
        statusType.value = 'success';

        // Emit success event
        emit('trigger-event', {
          name: 'submit-success',
          event: {
            produkt_titel: payload.produkt_titel,
            produkt_beschreibung: payload.produkt_beschreibung,
            menge: payload.menge,
            response: responseData,
          },
        });

        // Reload historie and reset form after success
        setTimeout(async () => {
          await loadHistorie();
          handleReset();
        }, 2000);

      } catch (error) {
        // Show error message
        statusMessage.value = props.content?.errorMessage || 'Fehler beim Senden der Anfrage';
        statusType.value = 'error';

        // Emit error event
        emit('trigger-event', {
          name: 'submit-error',
          event: {
            error: error.message,
          },
        });

        console.error('Submission error:', error);
      } finally {
        isSubmitting.value = false;
      }
    };

    // Handle form reset
    const handleReset = () => {
      formData.value = {
        produkt_titel: '',
        produkt_beschreibung: '',
        menge: [0],
      };
      statusMessage.value = '';
      statusType.value = '';

      // Emit reset event
      emit('trigger-event', {
        name: 'form-reset',
        event: {},
      });
    };

    // Format date helper
    const formatDate = (dateString) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (error) {
        return dateString;
      }
    };

    // Pagination helpers
    const goToHistoriePage = (page) => {
      if (page >= 1 && page <= historieTotalPages.value) {
        currentHistoriePage.value = page;
      }
    };

    const goToFavoritenPage = (page) => {
      if (page >= 1 && page <= favoritenTotalPages.value) {
        currentFavoritenPage.value = page;
      }
    };

    const getPageNumbers = (currentPage, totalPages) => {
      const pages = [];
      const maxVisible = 5;

      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) pages.push(i);
          pages.push('...');
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
          pages.push('...');
          pages.push(totalPages);
        }
      }

      return pages;
    };

    // Watch for showHistorie changes
    watch(
      () => props.content?.showHistorie,
      (newValue) => {
        if (newValue) {
          loadHistorie();
        }
      },
      { immediate: false }
    );

    // Watch for style changes (for reactivity)
    watch(
      () => [
        props.content?.backgroundColor,
        props.content?.borderColor,
        props.content?.borderRadius,
        props.content?.textColor,
        props.content?.labelColor,
        props.content?.primaryButtonColor,
        props.content?.secondaryButtonColor,
        props.content?.removeButtonColor,
        props.content?.addButtonColor,
        props.content?.historiePosition,
      ],
      () => {
        // Styles automatically update via computed properties
      },
      { deep: true }
    );

    // Watch for userId changes to reload favoriten
    watch(
      () => props.content?.userId,
      (newValue) => {
        if (newValue && props.content?.showFavoriten) {
          loadFavoriten();
        }
      }
    );

    // Load historie and favoriten on mount
    onMounted(() => {
      if (props.content?.showHistorie) {
        loadHistorie();
      }
      if (props.content?.showFavoriten) {
        loadFavoriten();
      }
    });

    return {
      formData,
      isSubmitting,
      statusMessage,
      statusType,
      isLoadingHistorie,
      historieError,
      historieItems,
      displayedHistorieItems,
      isLoadingFavoriten,
      favoritenError,
      favoritenItems,
      displayedFavoritenItems,
      isTogglingFavorite,
      currentHistoriePage,
      currentFavoritenPage,
      historieTotalPages,
      favoritenTotalPages,
      historieItemsPerPage,
      favoritenItemsPerPage,
      layoutClass,
      containerStyle,
      inputStyle,
      primaryButtonStyle,
      secondaryButtonStyle,
      removeButtonStyle,
      addButtonStyle,
      addAuflage,
      removeAuflage,
      loadTemplate,
      handleSubmit,
      handleReset,
      formatDate,
      isFavorite,
      toggleFavorite,
      removeFavorite,
      goToHistoriePage,
      goToFavoritenPage,
      getPageNumbers,
    };
  },
};
</script>

<style lang="scss" scoped>
.anfrage-module {
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: 24px;
  color: var(--text-color);
  max-width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 24px;

  &.layout-single {
    flex-direction: column;

    .form-section {
      width: 100%;
    }
  }

  &.layout-right {
    flex-direction: row;
    align-items: flex-start;

    .form-section {
      flex: 1;
      min-width: 0;
    }

    .historie-section {
      flex: 0 0 400px;
      max-width: 400px;
    }
  }

  &.layout-bottom {
    flex-direction: column;

    .form-section,
    .historie-section {
      width: 100%;
    }
  }

  &.layout-three {
    flex-direction: row;
    align-items: flex-start;

    .form-section {
      flex: 1;
      min-width: 0;
    }

    .historie-section,
    .favoriten-section {
      flex: 0 0 350px;
      max-width: 350px;
    }
  }
}

.form-section,
.historie-section,
.favoriten-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-color);
  border-bottom: 3px solid var(--border-color);
  padding-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 14px;
    font-weight: 500;
    margin: 0;
  }
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid;
  border-radius: 4px;
  transition: border-color 0.2s, box-shadow 0.2s;
  background-color: #ffffff;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }

  &::placeholder {
    color: #999999;
  }
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

// Auflagen Array Inputs
.auflagen-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.auflage-item {
  display: flex;
  gap: 8px;
  align-items: center;

  .auflage-input {
    flex: 1;
  }

  .btn-remove {
    flex: 0 0 auto;
    width: 36px;
    height: 36px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }
}

.status-message {
  padding: 12px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;

  &.success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  &.error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.btn {
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  color: #ffffff;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn-primary {
  flex: 1;
}

.btn-secondary {
  flex: 1;
}

.btn-add {
  width: 100%;
  margin-top: 4px;
}

.btn-template {
  width: 100%;
  font-size: 13px;
  padding: 10px 16px;
  font-weight: 500;
}

.btn-heart,
.btn-heart-filled {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: transparent;
  border: none;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background-color: rgba(255, 0, 0, 0.1);
    transform: scale(1.2);
  }

  &:active:not(:disabled) {
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// Historie Section
.historie-loading,
.historie-error,
.historie-empty {
  padding: 20px;
  text-align: center;
  color: #666;
  font-size: 14px;
  border: 1px dashed var(--border-color);
  border-radius: 4px;
}

.historie-error {
  color: #dc3545;
  background-color: #f8d7da;
}

.historie-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 700px;
  overflow-y: auto;
  padding-right: 6px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f5f5f5;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #bbb;
    border-radius: 4px;

    &:hover {
      background: #999;
    }
  }
}

.historie-item {
  background-color: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: #007bff;
    transform: translateY(-2px);
  }
}

.historie-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.historie-item-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color);
  flex: 1;
  word-break: break-word;
  line-height: 1.3;
}

.historie-item-meta {
  margin-bottom: 8px;
}

.historie-item-date {
  font-size: 11px;
  color: #999;
  background-color: #f5f5f5;
  padding: 2px 8px;
  border-radius: 3px;
  display: inline-block;
}

.historie-item-description {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.historie-item-menge {
  font-size: 12px;
  color: #555;
  margin-bottom: 12px;
  background-color: #f9f9f9;
  padding: 6px 10px;
  border-radius: 4px;
  border-left: 3px solid #007bff;

  strong {
    font-weight: 600;
    margin-right: 6px;
  }

  .text-muted {
    color: #999;
    font-style: italic;
  }
}

// Favoriten Section
.favoriten-loading,
.favoriten-error,
.favoriten-empty {
  padding: 20px;
  text-align: center;
  color: #666;
  font-size: 14px;
  border: 1px dashed var(--border-color);
  border-radius: 4px;
}

.favoriten-error {
  color: #dc3545;
  background-color: #f8d7da;
}

.favoriten-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 700px;
  overflow-y: auto;
  padding-right: 6px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f5f5f5;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #ffd700;
    border-radius: 4px;

    &:hover {
      background: #ffb700;
    }
  }
}

.favoriten-item {
  background: linear-gradient(135deg, #fffbf0 0%, #fff9e6 100%);
  border: 2px solid #ffd700;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
  box-shadow: 0 2px 6px rgba(255, 215, 0, 0.2);

  &:hover {
    box-shadow: 0 6px 16px rgba(255, 215, 0, 0.4);
    border-color: #ffb700;
    transform: translateY(-2px);
  }
}

.favoriten-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.favoriten-item-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color);
  flex: 1;
  word-break: break-word;
  line-height: 1.3;
}

.favoriten-item-description {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.favoriten-item-menge {
  font-size: 12px;
  color: #555;
  margin-bottom: 12px;
  background-color: rgba(255, 255, 255, 0.6);
  padding: 6px 10px;
  border-radius: 4px;
  border-left: 3px solid #ffd700;

  strong {
    font-weight: 600;
    margin-right: 6px;
  }

  .text-muted {
    color: #999;
    font-style: italic;
  }
}

// Pagination
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.pagination-btn {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: #ffffff;
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background-color: #f5f5f5;
    border-color: #007bff;
    color: #007bff;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    background-color: #f9f9f9;
  }
}

.pagination-numbers {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.pagination-number {
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: #ffffff;
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled):not(.ellipsis) {
    background-color: #f5f5f5;
    border-color: #007bff;
    color: #007bff;
    transform: translateY(-2px);
    box-shadow: 0 2px 6px rgba(0, 123, 255, 0.2);
  }

  &.active {
    background-color: #007bff;
    border-color: #007bff;
    color: #ffffff;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
  }

  &.ellipsis {
    border: none;
    background: transparent;
    cursor: default;
    font-weight: bold;
    color: #999;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

// Responsive design
@media (max-width: 1024px) {
  .anfrage-module.layout-right,
  .anfrage-module.layout-three {
    flex-direction: column;

    .historie-section,
    .favoriten-section {
      flex: 1;
      max-width: 100%;
    }
  }
}

@media (max-width: 768px) {
  .anfrage-module {
    padding: 16px;
    gap: 20px;
  }

  .section-title {
    font-size: 18px;
  }

  .form-actions {
    flex-direction: column;

    .btn {
      width: 100%;
    }
  }

  .historie-list {
    max-height: 400px;
  }

  .historie-item-header {
    flex-direction: column;
    gap: 4px;
  }

  .historie-item-date {
    align-self: flex-start;
  }

  .pagination {
    flex-direction: column;
    gap: 12px;
  }

  .pagination-btn {
    width: 100%;
  }

  .pagination-numbers {
    width: 100%;
    justify-content: center;
  }
}
</style>

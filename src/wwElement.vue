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
            <span class="historie-item-date">{{ formatDate(item.created_at) }}</span>
          </div>

          <p class="historie-item-description">{{ item.produkt_beschreibung }}</p>

          <div class="historie-item-menge">
            <strong>Auflagen:</strong>
            <span v-if="Array.isArray(item.menge) && item.menge.length > 0">
              {{ item.menge.join(', ') }}
            </span>
            <span v-else class="text-muted">Keine Auflagen</span>
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
      const position = props.content?.historiePosition || 'right';
      const showHistorie = props.content?.showHistorie;
      return showHistorie ? `layout-${position}` : 'layout-single';
    });

    const displayedHistorieItems = computed(() => {
      const max = props.content?.maxHistorieItems || 10;
      return historieItems.value.slice(0, max);
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
        const endpoint = props.content?.apiEndpoint ||
          'https://xv05-su7k-rvc8.f2.xano.io/api:SBdZMdsy/product_beschreibung_anfrage';

        // Create JSON payload
        const payload = {
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

    // Load historie on mount
    onMounted(() => {
      if (props.content?.showHistorie) {
        loadHistorie();
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
}

.form-section,
.historie-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color);
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 8px;
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
  padding: 8px 12px;
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
  gap: 12px;
  max-height: 600px;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 3px;

    &:hover {
      background: #555;
    }
  }
}

.historie-item {
  background-color: #f9f9f9;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    border-color: #007bff;
  }
}

.historie-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.historie-item-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
  flex: 1;
  word-break: break-word;
}

.historie-item-date {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.historie-item-description {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.historie-item-menge {
  font-size: 13px;
  color: #555;
  margin-bottom: 12px;

  strong {
    font-weight: 600;
  }

  .text-muted {
    color: #999;
    font-style: italic;
  }
}

// Responsive design
@media (max-width: 1024px) {
  .anfrage-module.layout-right {
    flex-direction: column;

    .historie-section {
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
}
</style>

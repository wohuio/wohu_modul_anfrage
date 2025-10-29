<template>
  <div class="anfrage-form" :style="containerStyle">
    <h2 v-if="content?.formTitle" class="form-title">{{ content.formTitle }}</h2>

    <form @submit.prevent="handleSubmit" class="form-content">
      <!-- Titel Field -->
      <div class="form-group">
        <label :style="{ color: content?.labelColor }">
          {{ content?.titleLabel || 'Titel' }}
        </label>
        <input
          v-model="formData.titel"
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
          v-model="formData.beschreibung"
          class="form-textarea"
          :style="inputStyle"
          placeholder="Beschreibung eingeben..."
          rows="5"
          required
        ></textarea>
      </div>

      <!-- Auflage Field -->
      <div class="form-group">
        <label :style="{ color: content?.labelColor }">
          {{ content?.auflageLabel || 'Auflage' }}
        </label>
        <input
          v-model.number="formData.auflage"
          type="number"
          class="form-input"
          :style="inputStyle"
          placeholder="Auflage eingeben..."
          min="1"
          required
        />
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
</template>

<script>
import { ref, computed, watch } from 'vue';

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
      titel: '',
      beschreibung: '',
      auflage: 0
    });

    // Status tracking
    const isSubmitting = ref(false);
    const statusMessage = ref('');
    const statusType = ref(''); // 'success' or 'error'

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
          titel: formData.value.titel,
          beschreibung: formData.value.beschreibung,
          auflage: formData.value.auflage,
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
            titel: payload.titel,
            beschreibung: payload.beschreibung,
            auflage: payload.auflage,
            response: responseData,
          },
        });

        // Reset form after success
        setTimeout(() => {
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
        titel: '',
        beschreibung: '',
        auflage: 0,
      };
      statusMessage.value = '';
      statusType.value = '';

      // Emit reset event
      emit('trigger-event', {
        name: 'form-reset',
        event: {},
      });
    };

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
      ],
      () => {
        // Styles automatically update via computed properties
      },
      { deep: true }
    );

    return {
      formData,
      isSubmitting,
      statusMessage,
      statusType,
      containerStyle,
      inputStyle,
      primaryButtonStyle,
      secondaryButtonStyle,
      handleSubmit,
      handleReset,
    };
  },
};
</script>

<style lang="scss" scoped>
.anfrage-form {
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: 24px;
  color: var(--text-color);
  max-width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-title {
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-color);
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
  flex: 1;

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
  background-color: #007bff;
  border-color: #007bff;
}

.btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
}

// Responsive design
@media (max-width: 768px) {
  .anfrage-form {
    padding: 16px;
  }

  .form-title {
    font-size: 20px;
    margin-bottom: 16px;
  }

  .form-actions {
    flex-direction: column;

    .btn {
      width: 100%;
    }
  }
}
</style>

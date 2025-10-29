export default {
  editor: {
    label: {
      en: "Produkt Anfrage",
    },
    icon: "fontawesome/solid/file-invoice",
  },
  properties: {
    // Content Properties
    formTitle: {
      label: { en: "Form Title" },
      type: "Text",
      section: "settings",
      defaultValue: "Neue Anfrage erstellen",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Title of the request form",
      },
      /* wwEditor:end */
    },

    // API Configuration
    apiEndpoint: {
      label: { en: "API Endpoint" },
      type: "Text",
      section: "settings",
      defaultValue: "https://xv05-su7k-rvc8.f2.xano.io/api:SBdZMdsy/product_beschreibung_anfrage",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Xano API endpoint URL",
      },
      /* wwEditor:end */
    },

    // Form Field Labels
    titleLabel: {
      label: { en: "Title Label" },
      type: "Text",
      section: "settings",
      defaultValue: "Titel",
      bindable: true,
    },
    descriptionLabel: {
      label: { en: "Description Label" },
      type: "Text",
      section: "settings",
      defaultValue: "Beschreibung",
      bindable: true,
    },
    auflageLabel: {
      label: { en: "Auflage Label" },
      type: "Text",
      section: "settings",
      defaultValue: "Auflage",
      bindable: true,
    },

    // Button Text
    submitButtonText: {
      label: { en: "Submit Button Text" },
      type: "Text",
      section: "settings",
      defaultValue: "Anfrage senden",
      bindable: true,
    },
    resetButtonText: {
      label: { en: "Reset Button Text" },
      type: "Text",
      section: "settings",
      defaultValue: "Zurücksetzen",
      bindable: true,
    },

    // Success/Error Messages
    successMessage: {
      label: { en: "Success Message" },
      type: "Text",
      section: "settings",
      defaultValue: "Anfrage erfolgreich gesendet!",
      bindable: true,
    },
    errorMessage: {
      label: { en: "Error Message" },
      type: "Text",
      section: "settings",
      defaultValue: "Fehler beim Senden der Anfrage",
      bindable: true,
    },

    // Style Properties
    backgroundColor: {
      label: { en: "Background Color" },
      type: "Color",
      section: "style",
      defaultValue: "#ffffff",
      bindable: true,
    },
    borderColor: {
      label: { en: "Border Color" },
      type: "Color",
      section: "style",
      defaultValue: "#e0e0e0",
      bindable: true,
    },
    borderRadius: {
      label: { en: "Border Radius" },
      type: "Length",
      section: "style",
      defaultValue: "8px",
      bindable: true,
    },
    textColor: {
      label: { en: "Text Color" },
      type: "Color",
      section: "style",
      defaultValue: "#333333",
      bindable: true,
    },
    labelColor: {
      label: { en: "Label Color" },
      type: "Color",
      section: "style",
      defaultValue: "#666666",
      bindable: true,
    },
    primaryButtonColor: {
      label: { en: "Primary Button Color" },
      type: "Color",
      section: "style",
      defaultValue: "#007bff",
      bindable: true,
    },
    secondaryButtonColor: {
      label: { en: "Secondary Button Color" },
      type: "Color",
      section: "style",
      defaultValue: "#6c757d",
      bindable: true,
    },
  },
  triggerEvents: [
    {
      name: "submit-success",
      label: { en: "On Submit Success" },
      event: {
        titel: "",
        beschreibung: "",
        auflage: "",
        response: {}
      },
    },
    {
      name: "submit-error",
      label: { en: "On Submit Error" },
      event: {
        error: ""
      },
    },
    {
      name: "form-reset",
      label: { en: "On Form Reset" },
      event: {},
    },
  ],
};

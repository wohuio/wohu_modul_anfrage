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
    userId: {
      label: { en: "User ID" },
      type: "Text",
      section: "settings",
      defaultValue: "",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "number",
        tooltip: "Current user ID for API calls (bind to user.id)",
      },
      /* wwEditor:end */
    },
    apiEndpoint: {
      label: { en: "API Endpoint (POST)" },
      type: "Text",
      section: "settings",
      defaultValue: "https://xv05-su7k-rvc8.f2.xano.io/api:SBdZMdsy/product_beschreibung_anfrage",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Xano API endpoint URL for creating requests",
      },
      /* wwEditor:end */
    },
    historieEndpoint: {
      label: { en: "Historie Endpoint (GET)" },
      type: "Text",
      section: "settings",
      defaultValue: "https://xv05-su7k-rvc8.f2.xano.io/api:SBdZMdsy/product_beschreibung_anfrage",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Xano API endpoint URL for fetching history",
      },
      /* wwEditor:end */
    },
    favoritenAddEndpoint: {
      label: { en: "Favoriten Add Endpoint (POST)" },
      type: "Text",
      section: "settings",
      defaultValue: "https://xv05-su7k-rvc8.f2.xano.io/api:mEnQftQz/favoriten",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Xano API endpoint URL for adding favorites",
      },
      /* wwEditor:end */
    },
    favoritenDeleteEndpoint: {
      label: { en: "Favoriten Delete Endpoint (DELETE)" },
      type: "Text",
      section: "settings",
      defaultValue: "https://xv05-su7k-rvc8.f2.xano.io/api:mEnQftQz/favoriten_delete",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Xano API endpoint URL for deleting favorites",
      },
      /* wwEditor:end */
    },
    favoritenListEndpoint: {
      label: { en: "Favoriten List Endpoint (GET)" },
      type: "Text",
      section: "settings",
      defaultValue: "https://xv05-su7k-rvc8.f2.xano.io/api:mEnQftQz/favoriten_list",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Xano API endpoint URL for fetching favorites",
      },
      /* wwEditor:end */
    },

    // Layout Configuration
    showHistorie: {
      label: { en: "Show Historie" },
      type: "OnOff",
      section: "settings",
      defaultValue: true,
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "boolean",
        tooltip: "Show or hide the history section",
      },
      /* wwEditor:end */
    },
    historiePosition: {
      label: { en: "Historie Position" },
      type: "TextSelect",
      section: "settings",
      options: {
        options: [
          { value: "right", label: "Right Side" },
          { value: "bottom", label: "Bottom" },
        ],
      },
      defaultValue: "right",
      bindable: true,
      hidden: (content) => !content?.showHistorie,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Valid values: right | bottom",
      },
      /* wwEditor:end */
    },
    historieTitle: {
      label: { en: "Historie Title" },
      type: "Text",
      section: "settings",
      defaultValue: "Vergangene Anfragen",
      bindable: true,
      hidden: (content) => !content?.showHistorie,
    },
    maxHistorieItems: {
      label: { en: "Max Historie Items" },
      type: "Number",
      section: "settings",
      defaultValue: 10,
      bindable: true,
      hidden: (content) => !content?.showHistorie,
      /* wwEditor:start */
      bindingValidation: {
        type: "number",
        tooltip: "Maximum number of history items to display",
      },
      /* wwEditor:end */
    },
    loadTemplateButtonText: {
      label: { en: "Load Template Button Text" },
      type: "Text",
      section: "settings",
      defaultValue: "Als Vorlage laden",
      bindable: true,
      hidden: (content) => !content?.showHistorie,
    },

    // Favoriten Configuration
    showFavoriten: {
      label: { en: "Show Favoriten" },
      type: "OnOff",
      section: "settings",
      defaultValue: true,
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "boolean",
        tooltip: "Show or hide the favorites section",
      },
      /* wwEditor:end */
    },
    favoritenTitle: {
      label: { en: "Favoriten Title" },
      type: "Text",
      section: "settings",
      defaultValue: "Meine Favoriten",
      bindable: true,
      hidden: (content) => !content?.showFavoriten,
    },
    removeFromFavoritesButtonText: {
      label: { en: "Remove from Favorites Text" },
      type: "Text",
      section: "settings",
      defaultValue: "Entfernen",
      bindable: true,
      hidden: (content) => !content?.showFavoriten,
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
      defaultValue: "Auflagen",
      bindable: true,
    },
    addAuflageButtonText: {
      label: { en: "Add Auflage Button Text" },
      type: "Text",
      section: "settings",
      defaultValue: "+ Auflage hinzufügen",
      bindable: true,
    },
    removeAuflageButtonText: {
      label: { en: "Remove Auflage Button Text" },
      type: "Text",
      section: "settings",
      defaultValue: "Entfernen",
      bindable: true,
    },
    auflagePlaceholder: {
      label: { en: "Auflage Placeholder" },
      type: "Text",
      section: "settings",
      defaultValue: "z.B. 1000",
      bindable: true,
    },
    minAuflagen: {
      label: { en: "Minimum Auflagen" },
      type: "Number",
      section: "settings",
      defaultValue: 1,
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "number",
        tooltip: "Minimum number of Auflagen required",
      },
      /* wwEditor:end */
    },
    maxAuflagen: {
      label: { en: "Maximum Auflagen" },
      type: "Number",
      section: "settings",
      defaultValue: 10,
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "number",
        tooltip: "Maximum number of Auflagen allowed",
      },
      /* wwEditor:end */
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
        produkt_titel: "",
        produkt_beschreibung: "",
        menge: [],
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
    {
      name: "template-loaded",
      label: { en: "On Template Loaded" },
      event: {
        produkt_titel: "",
        produkt_beschreibung: "",
        menge: []
      },
    },
    {
      name: "historie-loaded",
      label: { en: "On Historie Loaded" },
      event: {
        count: 0,
        items: []
      },
    },
    {
      name: "favorite-added",
      label: { en: "On Favorite Added" },
      event: {
        favorit_id: 0,
        anfrage_id: 0
      },
    },
    {
      name: "favorite-removed",
      label: { en: "On Favorite Removed" },
      event: {
        favorit_id: 0,
        anfrage_id: 0
      },
    },
    {
      name: "favoriten-loaded",
      label: { en: "On Favoriten Loaded" },
      event: {
        count: 0,
        items: []
      },
    },
  ],
};

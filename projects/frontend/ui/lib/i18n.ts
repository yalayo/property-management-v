import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    common: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      back: "← Back",
      saving: "Saving...",
      deleting: "Deleting...",
      optional: "optional",
      comingSoon: "Coming soon",
      loading: "Loading...",
      appName: "PropManager",
    },
    nav: {
      overview: "Overview",
      properties: "Properties",
      apartments: "Apartments",
      tenants: "Tenants",
      documents: "Documents",
      analytics: "Analytics",
      logout: "Logout",
      openMenu: "Open menu",
      navigation: "Navigation",
      openSidebar: "Open sidebar",
    },
    auth: {
      login: {
        title: "Login",
        subtitle: "Enter your credentials to access your account",
        email: "Email",
        password: "Password",
        submit: "Login",
        submitting: "Logging in...",
        noAccount: "Don't have an account?",
        registerLink: "Register",
        hero: {
          title: "Property Management Simplified",
          subtitle:
            "Streamline your rental property management with our comprehensive solution. Track payments, manage maintenance requests, and more — all in one place.",
          features: {
            payments: "Automated payment tracking",
            documents: "Document management",
            maintenance: "Maintenance request handling",
            accounting: "Accounting & financial reporting",
          },
        },
        validation: {
          emailInvalid: "Please enter a valid email",
          passwordMin: "Password must be at least 6 characters",
        },
      },
      register: {
        title: "Create Account",
        subtitle: "Register to start managing your properties",
        email: "Email",
        name: "Full Name (Optional)",
        password: "Password",
        submit: "Register",
        submitting: "Creating account...",
        hasAccount: "Already have an account?",
        loginLink: "Login",
        hero: {
          title: "Join Our Property Management Platform",
          subtitle:
            "Create an account to start managing your properties efficiently. Our platform helps you streamline rental processes, track finances, and simplify property management.",
          features: {
            solution: "One-stop solution for landlords",
            communication: "Easy tenant communication",
            storage: "Secure document storage",
            financial: "Financial tracking and reporting",
          },
        },
        validation: {
          emailInvalid: "Please enter a valid email",
          passwordMin: "Password must be at least 6 characters",
        },
      },
    },
    home: {
      signIn: "Sign In",
      createAccount: "Create Account",
    },
    dashboard: {
      title: "Dashboard",
      summary: {
        properties: "Properties",
        propertiesDesc: "Total managed properties",
        tenants: "Tenants",
        tenantsDesc: "Active tenant contracts",
        occupancy: "Occupancy",
        occupancyDesc: "{{occupied}} of {{total}} units occupied",
        payments: "Payments",
        paymentsFor: "For {{month}}",
        late: "Late",
        onTime: "On time",
      },
    },
    properties: {
      title: "Properties ({{count}})",
      addProperty: "Add Property",
      addFirst: "Add Your First Property",
      addNew: "Add New Property",
      editProperty: "Edit Property",
      deleteProperty: "Delete Property",
      viewApartments: "View Apartments",
      saveProperty: "Save Property",
      saveChanges: "Save Changes",
      noProperties:
        "No properties found. Add your first property to get started.",
      deleteConfirm:
        "Are you sure you want to delete {{name}}? This action cannot be undone.",
      units: "Units: {{count}}",
      fields: {
        name: "Property Name",
        address: "Address",
        city: "City",
        postalCode: "Postal Code",
        units: "Number of Units",
        purchasePrice: "Purchase Price (€)",
        currentValue: "Current Value (€)",
      },
      placeholders: {
        name: "E.g., Riverside Apartment",
        address: "Street address",
        city: "City",
        postalCode: "Postal code",
        optional: "Optional",
      },
      validation: {
        nameRequired: "Property name is required",
        addressRequired: "Address is required",
        cityRequired: "City is required",
        postalCodeRequired: "Valid postal code is required",
        unitsInvalid: "Must be a valid number",
      },
    },
    tenants: {
      addTenant: "Add Tenant",
      fields: {
        name: "Full Name",
        email: "Email",
        phone: "Phone",
        startDate: "Start Date",
        apartment: "Apartment",
        noApartment: "No apartment assigned",
      },
      placeholders: {
        name: "E.g., Maria Schmidt",
        email: "tenant@example.com",
        phone: "+49 123 456789",
      },
      validation: {
        nameRequired: "Name is required",
        emailInvalid: "Invalid email address",
      },
    },
  },

  de: {
    common: {
      save: "Speichern",
      cancel: "Abbrechen",
      delete: "Löschen",
      edit: "Bearbeiten",
      back: "← Zurück",
      saving: "Wird gespeichert...",
      deleting: "Wird gelöscht...",
      optional: "optional",
      comingSoon: "Bald verfügbar",
      loading: "Laden...",
      appName: "PropManager",
    },
    nav: {
      overview: "Übersicht",
      properties: "Immobilien",
      apartments: "Wohnungen",
      tenants: "Mieter",
      documents: "Dokumente",
      analytics: "Analysen",
      logout: "Abmelden",
      openMenu: "Menü öffnen",
      navigation: "Navigation",
      openSidebar: "Seitenleiste öffnen",
    },
    auth: {
      login: {
        title: "Anmelden",
        subtitle: "Geben Sie Ihre Zugangsdaten ein, um auf Ihr Konto zuzugreifen",
        email: "E-Mail",
        password: "Passwort",
        submit: "Anmelden",
        submitting: "Anmeldung läuft...",
        noAccount: "Noch kein Konto?",
        registerLink: "Registrieren",
        hero: {
          title: "Immobilienverwaltung leicht gemacht",
          subtitle:
            "Optimieren Sie Ihre Immobilienverwaltung mit unserer umfassenden Lösung. Verfolgen Sie Zahlungen, verwalten Sie Wartungsanfragen und mehr – alles an einem Ort.",
          features: {
            payments: "Automatische Zahlungsverfolgung",
            documents: "Dokumentenverwaltung",
            maintenance: "Verwaltung von Wartungsanfragen",
            accounting: "Buchhaltung & Finanzberichte",
          },
        },
        validation: {
          emailInvalid: "Bitte geben Sie eine gültige E-Mail-Adresse ein",
          passwordMin: "Das Passwort muss mindestens 6 Zeichen lang sein",
        },
      },
      register: {
        title: "Konto erstellen",
        subtitle: "Registrieren Sie sich, um Ihre Immobilien zu verwalten",
        email: "E-Mail",
        name: "Vollständiger Name (Optional)",
        password: "Passwort",
        submit: "Registrieren",
        submitting: "Konto wird erstellt...",
        hasAccount: "Haben Sie bereits ein Konto?",
        loginLink: "Anmelden",
        hero: {
          title: "Treten Sie unserer Immobilienverwaltungsplattform bei",
          subtitle:
            "Erstellen Sie ein Konto, um Ihre Immobilien effizient zu verwalten. Unsere Plattform hilft Ihnen, Mietprozesse zu optimieren, Finanzen zu verfolgen und die Immobilienverwaltung zu vereinfachen.",
          features: {
            solution: "Komplettlösung für Vermieter",
            communication: "Einfache Mieterkommunikation",
            storage: "Sichere Dokumentenablage",
            financial: "Finanzverfolgung und Berichterstattung",
          },
        },
        validation: {
          emailInvalid: "Bitte geben Sie eine gültige E-Mail-Adresse ein",
          passwordMin: "Das Passwort muss mindestens 6 Zeichen lang sein",
        },
      },
    },
    home: {
      signIn: "Einloggen",
      createAccount: "Konto erstellen",
    },
    dashboard: {
      title: "Dashboard",
      summary: {
        properties: "Immobilien",
        propertiesDesc: "Verwaltete Immobilien gesamt",
        tenants: "Mieter",
        tenantsDesc: "Aktive Mietverträge",
        occupancy: "Belegung",
        occupancyDesc: "{{occupied}} von {{total}} Einheiten belegt",
        payments: "Zahlungen",
        paymentsFor: "Für {{month}}",
        late: "Verspätet",
        onTime: "Pünktlich",
      },
    },
    properties: {
      title: "Immobilien ({{count}})",
      addProperty: "Immobilie hinzufügen",
      addFirst: "Erste Immobilie hinzufügen",
      addNew: "Neue Immobilie hinzufügen",
      editProperty: "Immobilie bearbeiten",
      deleteProperty: "Immobilie löschen",
      viewApartments: "Wohnungen ansehen",
      saveProperty: "Immobilie speichern",
      saveChanges: "Änderungen speichern",
      noProperties:
        "Keine Immobilien gefunden. Fügen Sie Ihre erste Immobilie hinzu.",
      deleteConfirm:
        "Sind Sie sicher, dass Sie {{name}} löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.",
      units: "Einheiten: {{count}}",
      fields: {
        name: "Immobilienname",
        address: "Adresse",
        city: "Stadt",
        postalCode: "Postleitzahl",
        units: "Anzahl der Einheiten",
        purchasePrice: "Kaufpreis (€)",
        currentValue: "Aktueller Wert (€)",
      },
      placeholders: {
        name: "z.B. Riverside Apartment",
        address: "Straßenadresse",
        city: "Stadt",
        postalCode: "Postleitzahl",
        optional: "Optional",
      },
      validation: {
        nameRequired: "Immobilienname ist erforderlich",
        addressRequired: "Adresse ist erforderlich",
        cityRequired: "Stadt ist erforderlich",
        postalCodeRequired: "Gültige Postleitzahl ist erforderlich",
        unitsInvalid: "Muss eine gültige Zahl sein",
      },
    },
    tenants: {
      addTenant: "Mieter hinzufügen",
      fields: {
        name: "Vollständiger Name",
        email: "E-Mail",
        phone: "Telefon",
        startDate: "Startdatum",
        apartment: "Wohnung",
        noApartment: "Keine Wohnung zugewiesen",
      },
      placeholders: {
        name: "z.B. Maria Schmidt",
        email: "mieter@beispiel.de",
        phone: "+49 123 456789",
      },
      validation: {
        nameRequired: "Name ist erforderlich",
        emailInvalid: "Ungültige E-Mail-Adresse",
      },
    },
  },
};

const savedLocale =
  typeof localStorage !== "undefined"
    ? (localStorage.getItem("i18n-locale") ?? "de")
    : "de";

i18n.use(initReactI18next).init({
  resources,
  lng: savedLocale,
  fallbackLng: "en",
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

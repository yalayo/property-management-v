(ns app.core-ui.views
  (:require [re-frame.core :as re-frame]
            [clojure.set :as set]
            [app.core-ui.rules :as rules]
            [app.core-ui.events :as events]
            [app.core-ui.admin-dashboard :as admin]))

(defn not-found [] [:div "404 — page not found"])

(defn submitting [] [:div "Authenticating…"])

;; landing-page and auth-page are component functions injected via Integrant.
;; rules/current-section deref's the Reagent ratom, so this component
;; re-renders automatically whenever the odoyle session changes.
;; Navigation dispatches ::events/navigate which persists via ->local-store.
(defn- camel->form-data
  "Converts the camelCase JS form object from the landing page React component
  into a kebab-case ClojureScript map expected by the backend command handler."
  [js-form]
  (-> (js->clj js-form :keywordize-keys true)
      (set/rename-keys
       {:serviceType   :service-type
        :issueType     :issue-type
        :propertyType  :property-type
        :preferredDate :preferred-date
        :preferredTime :preferred-time})
      (dissoc :previousIssue)))

(defn component [{:keys [landing-page]}]
  (let [section          (rules/current-section)
        nav-to-auth      #(re-frame/dispatch [::events/navigate :auth])
        submit-sr        #(re-frame/dispatch [::events/submit :service-request (camel->form-data %)])]
    (case section
      :landing          [landing-page {:on-login-click          nav-to-auth
                                       :on-create-account-click nav-to-auth
                                       :on-submit               submit-sr}]
      :auth             [admin/login-form]
      :admin-dashboard  [admin/dashboard]
      :submitting       [submitting]
      [not-found])))

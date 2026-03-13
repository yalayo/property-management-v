(ns app.payment-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]
            [app.payment-ui.db :as db]
            [app.payment-ui.config :as config]))

(def local-storage-interceptor (after db/db->local-store))

;; ── Select a plan and fetch the client secret ─────────────────────────────────

(re-frame/reg-event-fx
 ::select-tier
 [local-storage-interceptor]
 (fn [{:keys [db]} [_ tier-id]]
   {:db         (-> db
                    (assoc-in [:payment :tier-id] tier-id)
                    (assoc-in [:payment :step] :checkout)
                    (assoc-in [:payment :client-secret] nil)
                    (assoc-in [:payment :intent-type] nil)
                    (assoc-in [:payment :loading?] true)
                    (assoc-in [:payment :error] nil))
    :http-xhrio {:method          :post
                 :uri             (str (config/get-api-url) "/api/create-payment-intent")
                 :params          {:tier-id tier-id}
                 :format          (ajax-edn/edn-request-format)
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         10000
                 :on-success      [::payment-intent-ready]
                 :on-failure      [::payment-intent-error]}}))

(re-frame/reg-event-db
 ::payment-intent-ready
 [local-storage-interceptor]
 (fn [db [_ {:keys [client-secret type]}]]
   (-> db
       (assoc-in [:payment :client-secret] client-secret)
       (assoc-in [:payment :intent-type] (keyword type))
       (assoc-in [:payment :loading?] false))))

(re-frame/reg-event-db
 ::payment-intent-error
 [local-storage-interceptor]
 (fn [db [_ error]]
   (js/console.error "Payment intent error:" error)
   (-> db
       (assoc-in [:payment :loading?] false)
       (assoc-in [:payment :error] "Failed to initialize payment. Please try again."))))

;; ── Payment succeeded — show registration form ────────────────────────────────

(re-frame/reg-event-db
 ::payment-success
 [local-storage-interceptor]
 (fn [db [_ intent-id]]
   (-> db
       (assoc-in [:payment :step] :register)
       (assoc-in [:payment :intent-id] intent-id))))

;; ── Registration done — go to auth ────────────────────────────────────────────

(re-frame/reg-event-db
 ::registration-done
 [local-storage-interceptor]
 (fn [db _]
   (-> db
       (assoc-in [:payment :step] nil)
       (assoc-in [:ui :active-section] "auth"))))

;; ── Navigation ────────────────────────────────────────────────────────────────

(re-frame/reg-event-db
 ::back-to-pricing
 [local-storage-interceptor]
 (fn [db _]
   (-> db
       (assoc-in [:payment :step] nil)
       (assoc-in [:payment :tier-id] nil)
       (assoc-in [:payment :client-secret] nil)
       (assoc-in [:ui :active-section] "features-pricing"))))

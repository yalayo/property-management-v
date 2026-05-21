(ns app.property-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]
            [app.property-ui.db :as db]
            [app.property-ui.config :as config]))

(def local-storage-interceptor (after db/db->local-store))

(re-frame/reg-event-fx
 ::load-properties
 (fn [{:keys [db]} _]
   (let [token (get-in db [:user :token] "")]
     {:http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/query")
                   :params          {:entity :property}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::properties-loaded]
                   :on-failure      [::properties-error]}})))

(re-frame/reg-event-db
 ::properties-loaded
 [local-storage-interceptor]
 (fn [db [_ {:keys [properties]}]]
   (-> db
       (assoc-in [:properties :list] properties)
       (assoc-in [:properties :loading?] false))))

(re-frame/reg-event-fx
 ::properties-error
 (fn [_ [_ error]]
   (js/console.error "Failed to load properties:" error)
   {}))

(re-frame/reg-event-fx
 ::add-property
 (fn [{:keys [db]} [_ property-data]]
   (let [token (get-in db [:user :token] "")]
     {:db         (assoc-in db [:properties :saving?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/command")
                   :params          {:command :create-property :data property-data}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::property-added]
                   :on-failure      [::property-save-error]}})))

(re-frame/reg-event-fx
 ::property-added
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:properties :saving?] false)
    :dispatch [::load-properties]}))

(re-frame/reg-event-db
 ::property-save-error
 [local-storage-interceptor]
 (fn [db [_ error]]
   (js/console.error "Failed to save property:" error)
   (assoc-in db [:properties :saving?] false)))

(re-frame/reg-event-fx
 ::update-property
 (fn [{:keys [db]} [_ id property-data]]
   (let [token (get-in db [:user :token] "")]
     {:db         (assoc-in db [:properties :saving?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/command")
                   :params          {:command :update-property :data (assoc property-data :id id)}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::property-updated]
                   :on-failure      [::property-save-error]}})))

(re-frame/reg-event-fx
 ::property-updated
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:properties :saving?] false)
    :dispatch [::load-properties]}))

(re-frame/reg-event-fx
 ::delete-property
 (fn [{:keys [db]} [_ id]]
   (let [token (get-in db [:user :token] "")]
     {:db         (assoc-in db [:properties :saving?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/command")
                   :params          {:command :delete-property :data {:id id}}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::property-deleted]
                   :on-failure      [::property-save-error]}})))

(re-frame/reg-event-fx
 ::property-deleted
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:properties :saving?] false)
    :dispatch [::load-properties]}))

(re-frame/reg-event-db
 ::go-to-dashboard
 [local-storage-interceptor]
 (fn [db _]
   (assoc-in db [:ui :active-section] "dashboard")))

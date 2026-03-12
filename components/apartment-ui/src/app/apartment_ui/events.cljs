(ns app.apartment-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]
            [app.apartment-ui.db :as db]
            [app.apartment-ui.config :as config]))

(def local-storage-interceptor (after db/db->local-store))

(re-frame/reg-event-db
 ::set-property-filter
 [local-storage-interceptor]
 (fn [db [_ property]]
   (assoc-in db [:apartments :property-filter] property)))

(re-frame/reg-event-fx
 ::load-apartments
 (fn [{:keys [db]} _]
   (let [property-id (get-in db [:apartments :property-filter :id])]
     {:http-xhrio {:method          :get
                   :uri             (if property-id
                                      (str (config/get-api-url) "/api/apartments/by-property/" property-id)
                                      (str (config/get-api-url) "/api/apartments"))
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::apartments-loaded]
                   :on-failure      [::apartments-error]}})))


(re-frame/reg-event-db
 ::apartments-loaded
 [local-storage-interceptor]
 (fn [db [_ {:keys [apartments]}]]
   (-> db
       (assoc-in [:apartments :list] apartments)
       (assoc-in [:apartments :loading?] false))))

(re-frame/reg-event-fx
 ::apartments-error
 (fn [_ [_ error]]
   (js/console.error "Failed to load apartments:" error)
   {}))

(re-frame/reg-event-db
 ::open-add-dialog
 [local-storage-interceptor]
 (fn [db _]
   (-> db
       (assoc-in [:apartments :add-dialog-open?] true)
       (assoc-in [:apartments :new-code] "")
       (assoc-in [:apartments :new-property-id] nil))))

(re-frame/reg-event-db
 ::close-add-dialog
 [local-storage-interceptor]
 (fn [db _]
   (assoc-in db [:apartments :add-dialog-open?] false)))

(re-frame/reg-event-db
 ::set-new-code
 [local-storage-interceptor]
 (fn [db [_ code]]
   (assoc-in db [:apartments :new-code] code)))

(re-frame/reg-event-db
 ::set-new-property-id
 [local-storage-interceptor]
 (fn [db [_ property-id]]
   (assoc-in db [:apartments :new-property-id] property-id)))

(re-frame/reg-event-fx
 ::add-apartment
 (fn [{:keys [db]} _]
   (let [code        (get-in db [:apartments :new-code])
         property-id (get-in db [:apartments :new-property-id])]
     {:db         (assoc-in db [:apartments :saving?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/apartments")
                   :params          {:code code :property-id property-id}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::apartment-added]
                   :on-failure      [::apartment-save-error]}})))

(re-frame/reg-event-fx
 ::apartment-added
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (-> db
                  (assoc-in [:apartments :saving?] false)
                  (assoc-in [:apartments :add-dialog-open?] false))
    :dispatch [::load-apartments]}))

(re-frame/reg-event-db
 ::apartment-save-error
 [local-storage-interceptor]
 (fn [db [_ error]]
   (js/console.error "Failed to save apartment:" error)
   (assoc-in db [:apartments :saving?] false)))

(re-frame/reg-event-db
 ::select-apartment
 [local-storage-interceptor]
 (fn [db [_ id]]
   (assoc-in db [:apartments :selected-id] id)))

(re-frame/reg-event-db
 ::clear-selected-apartment
 [local-storage-interceptor]
 (fn [db _]
   (assoc-in db [:apartments :selected-id] nil)))

(re-frame/reg-event-fx
 ::delete-apartment
 (fn [{:keys [db]} [_ id]]
   {:db         (assoc-in db [:apartments :saving?] true)
    :http-xhrio {:method          :delete
                 :uri             (str (config/get-api-url) "/api/apartments/" id)
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::apartment-deleted]
                 :on-failure      [::apartment-save-error]}}))

(re-frame/reg-event-fx
 ::apartment-deleted
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (-> db
                  (assoc-in [:apartments :saving?] false)
                  (assoc-in [:apartments :selected-id] nil))
    :dispatch [::load-apartments]}))

(re-frame/reg-event-fx
 ::update-apartment
 (fn [{:keys [db]} [_ id data]]
   {:db         (assoc-in db [:apartments :saving?] true)
    :http-xhrio {:method          :put
                 :uri             (str (config/get-api-url) "/api/apartments/" id)
                 :params          data
                 :format          (ajax-edn/edn-request-format)
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::apartment-updated]
                 :on-failure      [::apartment-save-error]}}))

(re-frame/reg-event-fx
 ::apartment-updated
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:apartments :saving?] false)
    :dispatch [::load-apartments]}))

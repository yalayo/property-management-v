(ns app.cost-ui.events
  (:require [re-frame.core :as re-frame]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]
            [app.cost-ui.config :as config]))

(re-frame/reg-event-fx
 ::load-costs
 (fn [{:keys [db]} [_ property-id]]
   (let [token (get-in db [:user :token] "")]
     {:db         (-> db
                      (assoc-in [:costs :loading?] true)
                      (assoc-in [:costs :property-id] property-id))
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/query")
                   :params          {:entity :cost :property-id property-id}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::costs-loaded]
                   :on-failure      [::costs-error]}})))

(re-frame/reg-event-db
 ::costs-loaded
 (fn [db [_ {:keys [costs]}]]
   (-> db
       (assoc-in [:costs :list] costs)
       (assoc-in [:costs :loading?] false))))

(re-frame/reg-event-db
 ::costs-error
 (fn [db _]
   (assoc-in db [:costs :loading?] false)))

(re-frame/reg-event-fx
 ::create-cost
 (fn [{:keys [db]} [_ data]]
   (let [token (get-in db [:user :token] "")]
     {:db         (assoc-in db [:costs :saving?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/command")
                   :params          {:command :create-cost :data data}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::cost-mutated]
                   :on-failure      [::cost-error]}})))

(re-frame/reg-event-fx
 ::update-cost
 (fn [{:keys [db]} [_ data]]
   (let [token (get-in db [:user :token] "")]
     {:db         (assoc-in db [:costs :saving?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/command")
                   :params          {:command :update-cost :data data}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::cost-mutated]
                   :on-failure      [::cost-error]}})))

(re-frame/reg-event-fx
 ::delete-cost
 (fn [{:keys [db]} [_ id]]
   (let [token       (get-in db [:user :token] "")
         property-id (get-in db [:costs :property-id])]
     {:db         (assoc-in db [:costs :saving?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/command")
                   :params          {:command :delete-cost :data {:id id}}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::cost-mutated]
                   :on-failure      [::cost-error]}})))

(re-frame/reg-event-fx
 ::cost-mutated
 (fn [{:keys [db]} _]
   (let [property-id (get-in db [:costs :property-id])]
     {:db       (assoc-in db [:costs :saving?] false)
      :dispatch [::load-costs property-id]})))

(re-frame/reg-event-db
 ::cost-error
 (fn [db _]
   (assoc-in db [:costs :saving?] false)))

;; ---------------------------------------------------------------------------
;; Apartment-cost events
;; ---------------------------------------------------------------------------

(re-frame/reg-event-fx
 ::load-apartment-costs
 (fn [{:keys [db]} [_ apartment-id]]
   (let [token (get-in db [:user :token] "")]
     {:db         (-> db
                      (assoc-in [:apartment-costs :loading?] true)
                      (assoc-in [:apartment-costs :apartment-id] apartment-id))
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/query")
                   :params          {:entity :apartment-cost :apartment-id apartment-id}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::apt-costs-loaded]
                   :on-failure      [::apt-costs-error]}})))

(re-frame/reg-event-db
 ::apt-costs-loaded
 (fn [db [_ {:keys [costs]}]]
   (-> db
       (assoc-in [:apartment-costs :list] costs)
       (assoc-in [:apartment-costs :loading?] false))))

(re-frame/reg-event-db
 ::apt-costs-error
 (fn [db _]
   (assoc-in db [:apartment-costs :loading?] false)))

(re-frame/reg-event-fx
 ::create-apartment-cost
 (fn [{:keys [db]} [_ data]]
   (let [token (get-in db [:user :token] "")]
     {:db         (assoc-in db [:apartment-costs :saving?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/command")
                   :params          {:command :create-apartment-cost :data data}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::apt-cost-mutated]
                   :on-failure      [::apt-cost-error]}})))

(re-frame/reg-event-fx
 ::update-apartment-cost
 (fn [{:keys [db]} [_ data]]
   (let [token (get-in db [:user :token] "")]
     {:db         (assoc-in db [:apartment-costs :saving?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/command")
                   :params          {:command :update-apartment-cost :data data}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::apt-cost-mutated]
                   :on-failure      [::apt-cost-error]}})))

(re-frame/reg-event-fx
 ::delete-apartment-cost
 (fn [{:keys [db]} [_ id]]
   (let [token       (get-in db [:user :token] "")
         apartment-id (get-in db [:apartment-costs :apartment-id])]
     {:db         (assoc-in db [:apartment-costs :saving?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/command")
                   :params          {:command :delete-apartment-cost :data {:id id}}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::apt-cost-mutated]
                   :on-failure      [::apt-cost-error]}})))

(re-frame/reg-event-fx
 ::apt-cost-mutated
 (fn [{:keys [db]} _]
   (let [apartment-id (get-in db [:apartment-costs :apartment-id])]
     {:db       (assoc-in db [:apartment-costs :saving?] false)
      :dispatch [::load-apartment-costs apartment-id]})))

(re-frame/reg-event-db
 ::apt-cost-error
 (fn [db _]
   (assoc-in db [:apartment-costs :saving?] false)))

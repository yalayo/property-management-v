(ns app.rent-ui.events
  (:require [re-frame.core :as re-frame]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]
            [app.rent-ui.config :as config]))

(re-frame/reg-event-fx
 ::load-rent-payments
 (fn [{:keys [db]} [_ apartment-id]]
   (let [token (get-in db [:user :token] "")]
     {:db         (-> db
                      (assoc-in [:rent-payments :loading?] true)
                      (assoc-in [:rent-payments :apartment-id] apartment-id))
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/query")
                   :params          {:entity :rent-payment :apartment-id apartment-id}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::rent-payments-loaded]
                   :on-failure      [::rent-error]}})))

(re-frame/reg-event-db
 ::rent-payments-loaded
 (fn [db [_ {:keys [rent-payments]}]]
   (-> db
       (assoc-in [:rent-payments :list] rent-payments)
       (assoc-in [:rent-payments :loading?] false))))

(re-frame/reg-event-db
 ::rent-error
 (fn [db _]
   (assoc-in db [:rent-payments :loading?] false)))

(re-frame/reg-event-fx
 ::create-rent-payment
 (fn [{:keys [db]} [_ data]]
   (let [token (get-in db [:user :token] "")]
     {:db         (assoc-in db [:rent-payments :saving?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/command")
                   :params          {:command :create-rent-payment :data data}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::rent-payment-mutated]
                   :on-failure      [::rent-save-error]}})))

(re-frame/reg-event-fx
 ::update-rent-payment
 (fn [{:keys [db]} [_ data]]
   (let [token (get-in db [:user :token] "")]
     {:db         (assoc-in db [:rent-payments :saving?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/command")
                   :params          {:command :update-rent-payment :data data}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::rent-payment-mutated]
                   :on-failure      [::rent-save-error]}})))

(re-frame/reg-event-fx
 ::delete-rent-payment
 (fn [{:keys [db]} [_ id]]
   (let [token        (get-in db [:user :token] "")
         apartment-id (get-in db [:rent-payments :apartment-id])]
     {:db         (assoc-in db [:rent-payments :saving?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/command")
                   :params          {:command :delete-rent-payment :data {:id id}}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::rent-payment-mutated]
                   :on-failure      [::rent-save-error]}})))

(re-frame/reg-event-fx
 ::rent-payment-mutated
 (fn [{:keys [db]} _]
   (let [apartment-id (get-in db [:rent-payments :apartment-id])]
     {:db       (assoc-in db [:rent-payments :saving?] false)
      :dispatch [::load-rent-payments apartment-id]})))

(re-frame/reg-event-db
 ::rent-save-error
 (fn [db _]
   (assoc-in db [:rent-payments :saving?] false)))

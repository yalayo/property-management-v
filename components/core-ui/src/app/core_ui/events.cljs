(ns app.core-ui.events
  (:require [re-frame.core :as re-frame]
            [cljs.reader]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]
            [app.core-ui.db :as db]
            [app.core-ui.interceptors :refer [->local-store]]
            [app.core-ui.rules :as rules]
            [app.core-ui.analytics :as analytics]))

(def interceptors [->local-store])

(defn- api-url []
  (if goog.DEBUG "http://localhost:8787" "https://immo-api.busqandote.com"))

;; ── Cofx ─────────────────────────────────────────────────────────────────────

(re-frame/reg-cofx
 :local-store-db
 (fn [cofx _]
   (assoc cofx :local-store-db
          (try
            (some->> (.getItem js/localStorage db/ls-key)
                     (cljs.reader/read-string))
            (catch :default _
              (.removeItem js/localStorage db/ls-key)
              nil)))))

;; ── Effects ──────────────────────────────────────────────────────────────────

(re-frame/reg-fx :analytics/form-submit
  (fn [{:keys [form-id cmd-type]}]
    (analytics/form-submit! form-id cmd-type)))

(re-frame/reg-fx :analytics/form-success
  (fn [{:keys [form-id cmd-type]}]
    (analytics/form-success! form-id cmd-type)))

(re-frame/reg-fx :analytics/form-error
  (fn [form-id]
    (analytics/form-error! form-id)))

(re-frame/reg-fx :rules/navigate
  (fn [intent] (rules/navigate-to! intent)))

(re-frame/reg-fx :rules/logout
  (fn [_] (rules/logout!)))

(re-frame/reg-fx :rules/set-submitting
  (fn [v] (rules/set-submitting! v)))

(re-frame/reg-fx :rules/on-success
  (fn [{:keys [form-id response]}] (rules/on-success! form-id response)))

(re-frame/reg-fx :rules/on-failure
  (fn [{:keys [form-id error]}] (rules/on-failure! form-id error)))

;; ── Events ───────────────────────────────────────────────────────────────────

(re-frame/reg-event-fx
 ::initialize-db
 (into [(re-frame/inject-cofx :local-store-db)] interceptors)
 (fn [{:keys [local-store-db]} _]
   {:db (merge db/default-db local-store-db)}))

(re-frame/reg-event-fx ::navigate
  [->local-store]
  (fn [{:keys [db]} [_ intent]]
    {:db             (assoc db :current-section intent)
     :rules/navigate intent}))

(re-frame/reg-event-fx ::restore-nav
  (fn [{:keys [db]} _]
    {:rules/navigate (get db :current-section :none)}))

(re-frame/reg-event-fx ::submit
  (fn [{:keys [db]} [_ form-id data]]
    (let [{:keys [data-path cmd-type]} (rules/form-command form-id)]
      {:db                      (assoc-in db data-path data)
       :rules/set-submitting    true
       :analytics/form-submit   {:form-id form-id :cmd-type cmd-type}
       :http-xhrio {:method          :post
                    :uri             (str (api-url) "/api/command")
                    :params          {:command cmd-type :data data}
                    :format          (ajax-edn/edn-request-format)
                    :response-format (ajax-edn/edn-response-format)
                    :timeout         8000
                    :on-success      [::on-success form-id]
                    :on-failure      [::on-failure form-id]}})))

(re-frame/reg-event-fx ::on-success
  [->local-store]
  (fn [{:keys [db]} [_ form-id response]]
    (let [{:keys [data-path cmd-type]} (rules/form-command form-id)
          db-update                    (rules/success-db-update form-id)]
      {:db                    (-> (db-update db response)
                                  (assoc-in data-path nil))
       :rules/on-success      {:form-id form-id :response response}
       :analytics/form-success {:form-id form-id :cmd-type cmd-type}})))

(re-frame/reg-event-fx ::on-failure
  (fn [{:keys [db]} [_ form-id error]]
    (let [db-update (rules/failure-db-update form-id)]
      {:db                  (db-update db error)
       :rules/on-failure    {:form-id form-id :error error}
       :analytics/form-error form-id})))

(re-frame/reg-event-fx ::logout
  [->local-store]
  (fn [{:keys [db]} _]
    {:db           (dissoc db :user)
     :rules/logout nil}))

;; ── Admin dashboard events ────────────────────────────────────────────────────

(re-frame/reg-event-fx ::load-service-requests
  (fn [{:keys [db]} _]
    {:db       (assoc-in db [:admin :loading?] true)
     :http-xhrio {:method          :get
                  :uri             (str (api-url) "/api/admin/service-requests")
                  :headers         {"Authorization" (str "Bearer " (get-in db [:user :token]))}
                  :response-format (ajax-edn/edn-response-format)
                  :timeout         10000
                  :on-success      [::load-service-requests-success]
                  :on-failure      [::load-service-requests-failure]}}))

(re-frame/reg-event-db ::load-service-requests-success
  (fn [db [_ response]]
    (-> db
        (assoc-in [:admin :service-requests] (:data response))
        (assoc-in [:admin :loading?] false)
        (assoc-in [:admin :error] nil))))

(re-frame/reg-event-db ::load-service-requests-failure
  (fn [db _]
    (-> db
        (assoc-in [:admin :loading?] false)
        (assoc-in [:admin :error] "Failed to load service requests"))))

(re-frame/reg-event-fx ::contact-service-request
  (fn [{:keys [db]} [_ id price]]
    {:http-xhrio {:method          :post
                  :uri             (str (api-url) "/api/admin/contact")
                  :headers         {"Authorization" (str "Bearer " (get-in db [:user :token]))}
                  :params          {:id id :price price}
                  :format          (ajax-edn/edn-request-format)
                  :response-format (ajax-edn/edn-response-format)
                  :timeout         8000
                  :on-success      [::contact-service-request-success id price]
                  :on-failure      [::contact-service-request-failure]}}))

(re-frame/reg-event-db ::contact-service-request-success
  (fn [db [_ id price _response]]
    (update-in db [:admin :service-requests]
               (fn [reqs]
                 (mapv (fn [req]
                         (if (= (:db/id req) id)
                           (assoc req
                                  :service-request/status           "contacted"
                                  :service-request/negotiated-price price)
                           req))
                       reqs)))))

(re-frame/reg-event-db ::contact-service-request-failure
  (fn [db _]
    (assoc-in db [:admin :error] "Failed to update request")))

;; ── Admin tab navigation ──────────────────────────────────────────────────────

(re-frame/reg-event-fx ::admin-show-users
  (fn [{:keys [db]} _]
    {:db (assoc-in db [:admin :users-tab?] true)
     :dispatch [::load-users]}))

(re-frame/reg-event-db ::admin-show-requests
  (fn [db _]
    (-> db
        (assoc-in [:admin :users-tab?] false)
        (assoc-in [:admin :user-create-success?] false)
        (assoc-in [:admin :user-create-error] nil))))

;; ── User management events ────────────────────────────────────────────────────

(re-frame/reg-event-fx ::load-users
  (fn [{:keys [db]} _]
    {:db (assoc-in db [:admin :users-loading?] true)
     :http-xhrio {:method          :get
                  :uri             (str (api-url) "/api/admin/users")
                  :headers         {"Authorization" (str "Bearer " (get-in db [:user :token]))}
                  :response-format (ajax-edn/edn-response-format)
                  :timeout         10000
                  :on-success      [::load-users-success]
                  :on-failure      [::load-users-failure]}}))

(re-frame/reg-event-db ::load-users-success
  (fn [db [_ response]]
    (-> db
        (assoc-in [:admin :users] (:data response))
        (assoc-in [:admin :users-loading?] false)
        (assoc-in [:admin :users-error] nil))))

(re-frame/reg-event-db ::load-users-failure
  (fn [db _]
    (-> db
        (assoc-in [:admin :users-loading?] false)
        (assoc-in [:admin :users-error] "Failed to load users"))))

(re-frame/reg-event-fx ::create-user
  (fn [{:keys [db]} [_ user-data]]
    {:db (assoc-in db [:admin :user-create-loading?] true)
     :http-xhrio {:method          :post
                  :uri             (str (api-url) "/api/admin/users")
                  :headers         {"Authorization" (str "Bearer " (get-in db [:user :token]))}
                  :params          user-data
                  :format          (ajax-edn/edn-request-format)
                  :response-format (ajax-edn/edn-response-format)
                  :timeout         10000
                  :on-success      [::create-user-success]
                  :on-failure      [::create-user-failure]}}))

(re-frame/reg-event-fx ::create-user-success
  (fn [{:keys [db]} [_ _response]]
    {:db       (-> db
                   (assoc-in [:admin :user-create-loading?] false)
                   (assoc-in [:admin :user-create-success?] true)
                   (assoc-in [:admin :user-create-error] nil))
     :dispatch [::load-users]}))

(re-frame/reg-event-db ::create-user-failure
  (fn [db [_ error]]
    (-> db
        (assoc-in [:admin :user-create-loading?] false)
        (assoc-in [:admin :user-create-success?] false)
        (assoc-in [:admin :user-create-error]
                  (or (get-in error [:response :error])
                      "Failed to create user")))))

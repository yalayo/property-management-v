(ns app.frontend.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [cljs.reader]
            [app.frontend.db :as db]
            [day8.re-frame.tracing :refer-macros [fn-traced]]))

;; Interceptors
(def ->local-store (after db/db->local-store))

;; Interceptor Chain
(def interceptors [->local-store])

;; To restore db from the browser's local storage
(re-frame/reg-cofx
 :local-store-db
 (fn [cofx _]
   (assoc cofx :local-store-db
						 ;; read in todos from localstore, and process into a sorted map
          (into (sorted-map)
                (some->> (.getItem js/localStorage db/ls-key)
                         (cljs.reader/read-string))))))

(re-frame/reg-event-fx
 ::initialize-db
 [(re-frame/inject-cofx :local-store-db)]
 (fn-traced [{:keys [db local-store-db]} _]
            (if (nil? local-store-db)
              {:db db/default-db}
              {:db local-store-db})))

(re-frame/reg-event-db
 ::signin
 (fn [db]
   (assoc db :user-loged-in? true)))

(re-frame/reg-event-db
 ::signout
 (fn [db]
   (assoc db :user-loged-in? false)))

(re-frame/reg-event-db
 ::update-register-address-form
 (fn [db [_ id val]]
   (assoc-in db [:form id] val)))

(re-frame/reg-event-db
 ::save-register-address-form
 interceptors
 (fn [db]
   (let [form-data (:form db)
         addresses (get db :addresses [])
         updated-addresses (conj addresses form-data)]
     (-> db
         (assoc :addresses updated-addresses)
         (dissoc :form)))))

(re-frame/reg-event-db
 ::show-register-address-form
 (fn [db]
   (assoc db :show-form true)))

(re-frame/reg-event-db
 ::cancel-register-address-form
 (fn [db]
   (assoc db :show-form false)))
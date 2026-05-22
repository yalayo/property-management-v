(ns app.core-ui.admin-dashboard
  (:require [re-frame.core :as re-frame]
            [reagent.core :as r]
            [app.core-ui.subs :as subs]
            [app.core-ui.events :as events]
            ["/pages/admin-login$default" :as admin-login-js]
            ["/pages/admin-service-requests$default" :as admin-sr-js]
            ["/pages/admin-users$default" :as admin-users-js]))

(def ^:private admin-login            (r/adapt-react-class admin-login-js))
(def ^:private admin-service-requests (r/adapt-react-class admin-sr-js))
(def ^:private admin-users            (r/adapt-react-class admin-users-js))

;; ---------------------------------------------------------------------------
;; Data normalization
;; ---------------------------------------------------------------------------

(defn- normalize-request [req]
  {:id                  (:db/id req)
   :customerName        (:service-request/customer-name req)
   :customerEmail       (:service-request/customer-email req)
   :customerPhone       (:service-request/customer-phone req)
   :company             (:service-request/company req)
   :serviceType         (:service-request/service-type req)
   :pickupAddress       (:service-request/pickup-address req)
   :deliveryAddress     (:service-request/delivery-address req)
   :pallets             (:service-request/pallets req)
   :weightLbs           (:service-request/weight-lbs req)
   :liftgateRequired    (:service-request/liftgate-required req)
   :specialInstructions (:service-request/special-instructions req)
   :negotiatedPrice     (:service-request/negotiated-price req)
   :contactedBy         (:service-request/contacted-by req)
   :status              (:service-request/status req)
   :submittedAt         (:service-request/submitted-at req)})

(defn- normalize-user [u]
  {:id        (:db/id u)
   :email     (:user/email u)
   :name      (:user/name u)
   :role      (:user/role u)
   :createdAt (:user/created-at u)})

;; ---------------------------------------------------------------------------
;; Public components
;; ---------------------------------------------------------------------------

(defn login-form []
  (let [error @(re-frame/subscribe [::subs/auth-error])]
    [admin-login
     {:on-submit #(re-frame/dispatch [::events/submit :auth {:email %1 :password %2}])
      :on-back   #(re-frame/dispatch [::events/navigate :none])
      :error     error}]))

(defn dashboard []
  (r/create-class
   {:component-did-mount
    (fn [_]
      (re-frame/dispatch [::events/load-service-requests]))
    :reagent-render
    (fn []
      (let [requests       @(re-frame/subscribe [::subs/service-requests])
            loading?       @(re-frame/subscribe [::subs/service-requests-loading?])
            error          @(re-frame/subscribe [::subs/admin-error])
            user-info      @(re-frame/subscribe [::subs/user-info])
            users-tab?     @(re-frame/subscribe [::subs/admin-users-tab?])
            users          @(re-frame/subscribe [::subs/users])
            users-loading? @(re-frame/subscribe [::subs/users-loading?])
            user-error     @(re-frame/subscribe [::subs/users-error])
            create-loading? @(re-frame/subscribe [::subs/user-create-loading?])
            create-error   @(re-frame/subscribe [::subs/user-create-error])
            create-success? @(re-frame/subscribe [::subs/user-create-success?])
            role           (:role user-info)]
        (if (and (= role "admin") users-tab?)
          ;; Admin → Users tab
          [admin-users
           {:users          (clj->js (mapv normalize-user users))
            :on-create-user #(re-frame/dispatch [::events/create-user (js->clj % :keywordize-keys true)])
            :on-back        #(re-frame/dispatch [::events/admin-show-requests])
            :loading        users-loading?
            :create-loading create-loading?
            :error          user-error
            :create-error   create-error
            :create-success create-success?}]
          ;; Requests tab (both admin and dispatcher)
          [admin-service-requests
           {:service-requests (clj->js (mapv normalize-request requests))
            :on-contact       #(re-frame/dispatch [::events/contact-service-request %1 %2])
            :on-refresh       #(re-frame/dispatch [::events/load-service-requests])
            :on-manage-users  (when (= role "admin")
                                #(re-frame/dispatch [::events/admin-show-users]))
            :on-logout        #(re-frame/dispatch [::events/logout])
            :loading          loading?
            :error            error
            :user-email       (:email user-info)
            :user-role        role}])))}))

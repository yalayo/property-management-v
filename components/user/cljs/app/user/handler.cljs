(ns app.user.handler
  (:require
   ["jsonwebtoken" :as jwt]
   [app.user.persistance :as persistance]
   [app.user.analytics :as analytics]
   [app.worker.async :refer [js-await]]
   [app.worker.cf :as cf]))

(defn passwords-match? [plain stored hashed-fn]
  (js-await [hashed (hashed-fn plain "temporary salt")]
            (= hashed stored)))

(defn post-sign-in [{:keys [request env]}]
  (js-await [data (cf/request->edn request)]
            (let [{:keys [user password]} data]
              (js-await [account (persistance/get-account user)]
                        (if (nil? account)
                          (cf/response-edn {:error "Invalid email or password"} {:status 401})
                          (js-await [ok? (passwords-match? password (:password account) persistance/hash-password)]
                                    (if-not ok?
                                      (cf/response-edn {:error "Invalid email or password"} {:status 401})
                                      
                                      ;; password matches → create JWT
                                      (let [claims #js {:email user
                                                        :exp (+ (js/Math.floor (/ (.now js/Date) 1000))
                                                                86400)}      ;; 24h
                                            token (jwt/sign claims (aget env "JWT_SECRET"))
                                            analytics-secret (aget env "GA_SECRET")
                                            user {:id (:user_id account) :name (:name account) :email (:email account)}]
                                        (analytics/send-event! "client-id" "sign_in_successfull" {:event :user-sign-in} analytics-secret)
                                        (cf/response-edn {:token token :user user} {:status 200})))))))))

(defn post-sign-up [{:keys [request env]}]
  (js-await [data (cf/request->edn request)]
            (let [{:keys [email name password]} data]
              (js-await
               [account-res (persistance/create-account env name email password)]
               (analytics/event email "sign_up_successfull" {:event :new-user} (aget env "GA_SECRET"))
               (cf/response-edn {:created true :account account-res} {:status 201})))))

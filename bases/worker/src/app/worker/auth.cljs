(ns app.worker.auth
  (:require ["jsonwebtoken" :as jwt]))

(defn base64url->uint8 [s]
  (let [pad (case (mod (count s) 4)
              2 "=="
              3 "="
              "")
        s (.replace (.replace (str s pad) "-" "+") "_" "/")]
    (js/Uint8Array. (js/atob s))))

(defn verify-jwt [token secret]
  (try
    (jwt/verify token secret)
    (catch :default _
      nil)))
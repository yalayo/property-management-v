(ns app.auth-ui.config
  (:require [clojure.string :as str]))

(defn cloudflare-dev? []
  (str/includes? (.-host js/window.location) "localhost:8081"))

(defn cloudflare-prod? []
  (str/includes? (.-host js/window.location) "alm.busqandote.com"))

(defn internal? []
  (str/includes? (.-host js/window.location) "localhost:9090"))

(defn get-api-url []
  (if goog.DEBUG
    (if (cloudflare-dev?)
      "http://localhost:8787"
      (if (internal?)
        "http://localhost:9090"
        "http://localhost:8081"))
    (if (cloudflare-prod?)
      "https://immo-api.busqandote.com"
      "https://immo-api.busqandote.com")))
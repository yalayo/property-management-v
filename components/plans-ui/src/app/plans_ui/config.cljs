(ns app.plans-ui.config
  (:require [clojure.string :as str]))

(defn cloudflare-dev? []
  (str/includes? (.-host js/window.location) "localhost:8081"))

(defn cloudflare-prod? []
  (str/includes? (.-host js/window.location) "miete.busqandote.com"))

(defn get-api-url []
  (if goog.DEBUG
    (if (cloudflare-dev?)
      "http://localhost:8787"
      "http://localhost:8081")
    "https://immo-api.busqandote.com"))

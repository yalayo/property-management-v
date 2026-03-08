(ns app.user.analytics)

(def measurement-id
  (if goog.DEBUG
    "G-DEV0000000"
    "G-G18268Q0GR"))

(def api-secret "YOUR_API_SECRET")

(defn gtag
  [& args]
  (when (exists? js/window.gtag)
    (.apply (.-gtag js/window) js/window (to-array args))))

(defn init []
  ;; optional if you already initialized in index.html
  (gtag "js" (js/Date.))
  (gtag "config" measurement-id))

(defn page-view [path]
  (gtag "event"
        "page_view"
        #js {:page_path path}))

(defn send-event! [client-id event-name params api-secret]
  (js/fetch
   (str "https://www.google-analytics.com/mp/collect"
        "?measurement_id=" measurement-id
        "&api_secret=" api-secret)
   #js {:method "POST"
        :headers #js {"Content-Type" "application/json"}
        :body (js/JSON.stringify
               #js {:client_id client-id
                    :events #js [#js {:name event-name
                                      :params (clj->js params)}]})}))
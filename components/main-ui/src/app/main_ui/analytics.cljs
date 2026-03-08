(ns app.main-ui.analytics)

(def measurement-id
  (if goog.DEBUG
    "G-DEV0000000"
    "G-G18268Q0GR"))

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

(defn event [event-name params]
  (gtag "event"
        event-name
        (clj->js params)))
(ns app.register-ui.analytics)

(defn event [event-name params]
  (when (exists? js/window.gtag)
    (.apply (.-gtag js/window) js/window
            (to-array ["event" event-name (clj->js params)]))))

(ns app.survey.analytics)

(def measurement-id
  (if goog.DEBUG
    "G-DEV0000000"
    "G-VRSYNH1GFG"))

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

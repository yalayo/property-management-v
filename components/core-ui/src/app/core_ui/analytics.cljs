(ns app.core-ui.analytics)

(defn- push! [event-map]
  (when (and (not goog.DEBUG)
             (exists? js/window.dataLayer))
    (.push (.-dataLayer js/window) (clj->js event-map))))

(defn page-view! [section]
  (push! {:event      "page_view"
          :page_path  (str "/" (name section))
          :page_title (name section)}))

(defn form-submit! [form-id cmd-type]
  (push! {:event        "form_submit"
          :form_id      (name form-id)
          :command_type (name cmd-type)}))

(defn form-success! [form-id cmd-type]
  (push! {:event        "form_success"
          :form_id      (name form-id)
          :command_type (name cmd-type)}))

(defn form-error! [form-id]
  (push! {:event   "form_error"
          :form_id (name form-id)}))

(defn event! [event-name params]
  (push! (merge {:event event-name} params)))

(ns app.storage.core)

(defn encode-value
  "Serialize a Clojure value to a JSON string for storage in the facts table.
   Keywords are converted to their qualified-name string before encoding."
  [v]
  (let [v' (cond
              (keyword? v) (str (when (namespace v) (str (namespace v) "/")) (name v))
              :else        (clj->js v))]
    (.stringify js/JSON v')))

(defn decode-value
  "Deserialize a JSON string from the facts table back to a Clojure value."
  [s]
  (js->clj (.parse js/JSON s) :keywordize-keys true))

(defn attr->sql
  "Convert a keyword like :user/name to the canonical SQL string 'user/name'."
  [kw]
  (if (keyword? kw)
    (str (when (namespace kw) (str (namespace kw) "/")) (name kw))
    (str kw)))

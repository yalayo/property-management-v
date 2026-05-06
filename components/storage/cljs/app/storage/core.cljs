(ns app.storage.core
  (:require [honey.sql :as sql]))

;; D1 docs https://developers.cloudflare.com/d1/

;; Per-request D1 binding — reset by the worker on each incoming request.
(def ^:private db-ref (atom nil))

(defn set-db! [db]
  (reset! db-ref db))

;; ---------------------------------------------------------------------------
;; D1 implementation — mirrors app.worker.db
;; ---------------------------------------------------------------------------

(defn ^js/Promise d1-query+ [query-map]
  (let [[sql & params] (sql/format query-map)
        stmt (.prepare ^js @db-ref sql)]
    (-> (.all (.apply (.-bind stmt) stmt (into-array params)))
        (.then (fn [result]
                 {:success true
                  :results (js->clj (.-results result) :keywordize-keys true)})))))

(defn ^js/Promise d1-run+ [query-map]
  (let [[sql & params] (sql/format query-map)
        stmt (.prepare ^js @db-ref sql)]
    (-> (.run (.apply (.-bind stmt) stmt (into-array params)))
        (.then (fn [result]
                 (js->clj result :keywordize-keys true))))))

;; ---------------------------------------------------------------------------
;; In-memory implementation — for testing / local development
;; ---------------------------------------------------------------------------

(defn- apply-where [rows where]
  (if-not where
    rows
    (let [[op col val] where]
      (case op
        := (filterv #(= (get % col) val) rows)
        rows))))

(defn mem-query+ [tables {:keys [from where limit]}]
  (let [table    (if (keyword? (first from)) (first from) (ffirst from))
        rows     (get @tables table [])
        filtered (apply-where rows where)
        result   (if limit (vec (take limit filtered)) (vec filtered))]
    (js/Promise.resolve {:success true :results result})))

(defn mem-run+ [tables query-map]
  (let [{:keys [insert-into columns values delete-from where]} query-map
        update-table (:update query-map)
        update-set   (:set query-map)]
    (cond
      insert-into
      (let [row (zipmap (map keyword columns) (first values))]
        (swap! tables update insert-into (fnil conj []) row)
        (js/Promise.resolve {:success true}))

      update-table
      (do (swap! tables update update-table
                 (fn [rows]
                   (mapv (fn [r]
                           (let [[op col val] where]
                             (if (and (= op :=) (= (get r col) val))
                               (merge r update-set)
                               r)))
                         (or rows []))))
          (js/Promise.resolve {:success true}))

      delete-from
      (do (swap! tables update delete-from
                 (fn [rows]
                   (let [[op col val] where]
                     (filterv #(not (and (= op :=) (= (get % col) val)))
                              (or rows [])))))
          (js/Promise.resolve {:success true}))

      :else (js/Promise.resolve {:success true}))))

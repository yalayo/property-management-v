(ns app.user.routes
  (:require [app.user.handler :as handler]))

(defn make-routes [storage]
  [["/sign-in" {:post {:handler (partial handler/post-sign-in storage)}}]
   ["/sign-up" {:post {:handler (partial handler/post-sign-up storage)}}]])

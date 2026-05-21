(ns app.user.routes
  (:require [app.user.handler :as handler]))

(defn create-routes [controller]
  [["/sign-in" {:post {:handler (handler/post-sign-in controller)}}]
   ["/sign-up" {:post {:handler (handler/post-sign-up controller)}}]])

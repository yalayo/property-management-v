(ns app.user.routes
  (:require [app.user.handler :as handler]))

(def routes [["/sign-in" {:post {:handler handler/post-sign-in}}]
             ["/sign-up" {:post {:handler handler/post-sign-up}}]])
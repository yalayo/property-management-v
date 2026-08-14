(ns app.desktop.core
  "Entry point. Opens the local SQLite file next to the running jar/exe (falls
  back to the working directory in `clj -M` dev mode — see db-path below),
  restores any previous session, and opens the main window on app.desktop.ui/root."
  (:require [clojure.java.io :as io]
            [io.github.humbleui.ui :as ui]
            [app.storage.sqlite :as storage]
            [app.desktop.ui :as desktop-ui])
  (:import [java.io File]))

(defn- app-dir
  "Directory the db file lives in. `user.dir` is correct for `clj -M` dev mode
  (this file's actual concern right now). NOTE for Phase 5 (jpackage
  packaging): jpackage-generated native launchers set the working directory to
  the app image directory by default on Windows, so this should keep working
  unchanged once packaged — but that needs verifying against a real packaged
  app image rather than assumed. (An earlier version tried to derive this via
  `(Class/forName \"app.desktop.core\")`, which only resolves when the
  namespace has been AOT-compiled to a same-named class — never true when
  running from source via `clj -M`, hence ClassNotFoundException.)"
  []
  (io/file (System/getProperty "user.dir")))

(defn- db-path []
  (.getAbsolutePath (File. (app-dir) "data.db")))

(defn -main [& _args]
  (let [conn (storage/open! (db-path))]
    (desktop-ui/init! conn)
    (ui/start-app!
     (ui/window {:title "Property Management — Desktop"} #'desktop-ui/root))))

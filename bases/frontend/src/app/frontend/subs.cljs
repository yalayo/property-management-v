(ns app.frontend.subs
  (:require [re-frame.core :as re-frame]))

(re-frame.core/reg-sub
 :initialised?
 (fn  [db _]
   (:initialised? db)))

(re-frame/reg-sub
 ::logged-in
 (fn [db [_ _]]
   (:user-loged-in? db)))

(re-frame/reg-sub
 ::show-form
 (fn [db]
   (:show-form db)))

(re-frame/reg-sub
 ::header
 (fn [db]
   (:header db)))

(re-frame/reg-sub
 ::title
 (fn [db]
   (:title db)))

(re-frame/reg-sub
 ::subject
 (fn [db]
   (:subject db)))

(re-frame/reg-sub
 ::first-name
 (fn [db]
   (:first-name db)))

(re-frame/reg-sub
 ::last-name
 (fn [db]
   (:last-name db)))

(re-frame/reg-sub
 ::street
 (fn [db]
   (:street db)))

(re-frame/reg-sub
 ::region
 (fn [db]
   (:name db)))

(re-frame/reg-sub
 ::postal-code
 (fn [db]
   (:postal-code db)))

(re-frame/reg-sub
 ::form
 (fn [db [_ id]]
   (get-in db [:form id] "")))

(re-frame/reg-sub
 ::form-is-valid?
 (fn [db [_ form-ids]]
   (every? #(not-empty (get-in db [:form %])) form-ids)))

(re-frame/reg-sub
 ::addresses
 (fn [db]
   (:addresses db)))
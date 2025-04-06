# As alternative use the each command onw its own
npx shadow-cljs server watch
npx shadow-cljs watch app

## Tailwind css
Create tailwind.css, use this command to watch that file and generate the index.css: 
npx tailwindcss -i ../../client/src/index.css -o ./public/css/index.css --watch

## To use react components in clojurescript
Babel
Use this command to translate the jsx, tsx, ts code to js (you can adapt it later to your project)
npx babel ../../client/src --out-dir ../../bases/frontend/js --extensions ".ts,.tsx,.jsx" --ignore "node_modules" --watch

The source of the above command and some ideas of how to use js react components in clojurescript I found it in this youtube video:
https://www.youtube.com/watch?v=Bp2d0jQx8Gs

## Working with storybook
Build storybook
npm run build-storybook

Use this command to run Storybook
npm run storybook
## To use react components in clojurescript
Babel
Use this command to translate the jsx, tsx, ts code to js (you can adapt it later to your project)
Open a terminal and run the following command:
npx babel ui --out-dir ./resources/js --extensions ".ts,.tsx,.jsx" --ignore "node_modules" --watch

## To generate the index.css with tailwind
npx tailwindcss -i ./ui/index.css -o ./resources/public/css/index.css --watch
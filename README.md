# Pravesh Bahadur Shahi: 3D Portfolio

Vite + Three.js + GSAP frontend, Node.js (Express) API, MySQL (XAMPP) database.

## Run
1. Start **MySQL** in XAMPP.
2. `npm run setup` (installs root, server and client dependencies)
3. `cp server/.env.example server/.env` (edit if your MySQL password isn't empty)
4. `npm run seed` (creates the `portfolio` database from `server/data.json`)
5. `npm run dev`, then open http://localhost:5173

If MySQL is down, the API serves `server/data.json` so the site still works.
To edit content, change `server/data.json` and run `npm run seed` again.
Build for production with `npm run build --prefix client`.

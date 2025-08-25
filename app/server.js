let axios = require("axios");
let express = require("express");
let session = require('express-session');
let bcrypt = require('bcrypt');
let app = express();
let apiFile = require("../env.json");
let { Pool } = require("pg");
let pool = new Pool(apiFile.db);
let apiKey = apiFile["api_key"];
let baseUrl = apiFile["api_url"];
const path = require('path');
let port = 3000;
let hostname = "localhost";


const { createServer } = require("node:http");
const { startSocketConnection }  = require("./socket/socket.js");

const server = createServer(app);

startSocketConnection(server);

app.use(express.static("public"));
app.use(express.json());

app.use(session({
  secret: 'jscripters2025',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.get("/", (req, res) => {
  console.log("Sending login.html");
  res.sendFile("public/login.html", { root: __dirname });
});


app.get("/getManifest", (req, res) => {
  let rover = req.query.rover;
  let url = `${baseUrl}manifests/${rover}?api_key=${apiKey}`;
  axios.get(url).then((response) => {
    //console.log("Received response manifest:", response.data.photo_manifest.photos);
    res.json(response.data.photo_manifest.photos);
  }).catch(error => {
    console.log(error.message);
    let errorCode = parseInt(error.status);
    res.status(errorCode).json({"error":error.message});
  });
  console.log(`Sending request to: ${baseUrl}manifests/${rover}`);
});

app.get("/", (req, res) => {
  console.log("Sending login.html");
  res.sendFile("public/login.html", { root: __dirname });
});

app.get("/getPhotos", (req, res) => {
  let rover = req.query.rover;
  let solDay = req.query.solday;
  let camera = req.query.camera || "navcam";

  //console.log(rover,solDay,apiKey)
  let url = `${baseUrl}rovers/${rover}/photos?sol=${solDay}&camera=${camera}&api_key=${apiKey}`;
  axios.get(url).then((response) => {
    //console.log("Received response:", response.data);
    res.json(response.data);
  }).catch(error => {
    console.log(error.message);
    let errorCode = parseInt(error.status);
    res.status(errorCode).json({"error":error.message});
  });
  console.log(`Sending request to: ${baseUrl}rovers/${rover}/photos?sol=${solDay}&camera=${camera}`);
});

app.post("/createAccount", async (req, res) => {

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    let result = await pool.query(
      "INSERT INTO users (username, passwords) VALUES ($1, $2) RETURNING id",
      [username, hashedPassword]
    );
    res.json({ message: "Account created successfully." });
  } catch (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: "Username already exists." });
    } else {
      console.error(error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const match = await bcrypt.compare(password, user.passwords);
    if (!match) return res.status(401).json({ error: 'Invalid username or password' });

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ message: 'Login successful.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed.' });
  }
});


app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/chat.html'));
});

server.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});


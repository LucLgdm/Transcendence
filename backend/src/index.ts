import express from 'express';

const app = express();
const port = 3001;

app.get('/', (req, res) => {
  res.send('Backend Express fonctionne.');
});

app.listen(port, () => {
  console.log(`Serveur backend lancé sur http://localhost:${port}`);
});

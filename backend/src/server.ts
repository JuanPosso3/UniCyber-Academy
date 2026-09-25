import express from 'express';

const app = express();

const PORT = 3000;

app.get('/', (_req, res) => {
  res.json({
    message: 'UniCyber backend funcionando',
  });
});

app.listen(PORT, () => {
  console.log(`UniCyber backend ejecutándose en http://localhost:${PORT}`);
});

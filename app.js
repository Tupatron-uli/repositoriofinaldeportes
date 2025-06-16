const db = require('./database');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = 8000;

// Configuraciones
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'secreto123',
  resave: false,
  saveUninitialized: false
}));

// Middleware para proteger rutas
const verificarSesion = (req, res, next) => {
  if (!req.session.user) return res.redirect('/');
  next();
};

// Rutas principales
app.get('/', (req, res) => {
  res.render('paginaprincipal', { user: req.session.user });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const { nombre, email, password, confirmar } = req.body;
  if (password !== confirmar) {
    return res.send('Las contraseñas no coinciden');
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  db.query('INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
    [nombre, email, hashedPassword],
    (err) => {
      if (err) return res.send('Error al registrar');
      res.redirect('/');
    });
});

app.post('/login', (req, res) => {
  const { nombre, password } = req.body;
  db.query('SELECT * FROM usuarios WHERE nombre = ?', [nombre], async (err, results) => {
    if (err) return res.send('Error en la consulta');
    if (results.length === 0) return res.send('Usuario no encontrado');

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (match) {
      req.session.user = user;
      res.redirect('/');
    } else {
      res.send('Contraseña incorrecta');
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.redirect('/dashboard');
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

app.get('/dashboard', verificarSesion, (req, res) => {
  res.render('dashboard');
});

app.get('/form/:deporte', verificarSesion, (req, res) => {
  const deporte = req.params.deporte;
  res.render('form', { deporte, datos: null });
});

app.post('/guardar/:deporte', (req, res) => {
  const deporte = req.params.deporte;
  const { nombre, apellido_paterno, apellido_materno, email, fecha_nacimiento, salud, domicilio, telefono, sexo } = req.body;
  db.query(
    'INSERT INTO registros (deporte, nombre, apellido_paterno, apellido_materno, email, fecha_nacimiento, salud, domicilio, telefono, sexo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [deporte, nombre, apellido_paterno, apellido_materno, email, fecha_nacimiento, salud, domicilio, telefono, sexo],
    (err) => {
      if (err) throw err;
      res.redirect('/consultar');
    });
});

app.get('/consultar', verificarSesion, (req, res) => {
  db.query('SELECT * FROM registros', (err, registros) => {
    if (err) throw err;
    res.render('crud', { registros });
  });
});

app.get('/editar/:id', verificarSesion, (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM registros WHERE id = ?', [id], (err, rows) => {
    if (err) throw err;
    const datos = rows[0];
    if (!datos) return res.send('Registro no encontrado');
    if (datos.fecha_nacimiento) {
      datos.fecha_nacimiento = datos.fecha_nacimiento.toISOString().split('T')[0];
    }
    res.render('form', { deporte: datos.deporte, datos });
  });
});

app.post('/actualizar/:id', verificarSesion, (req, res) => {
  const id = req.params.id;
  const { nombre, apellido_paterno, apellido_materno, email, fecha_nacimiento, salud, domicilio, telefono, sexo } = req.body;
  db.query(
    'UPDATE registros SET nombre=?, apellido_paterno=?, apellido_materno=?, email=?, fecha_nacimiento=?, salud=?, domicilio=?, telefono=?, sexo=? WHERE id=?',
    [nombre, apellido_paterno, apellido_materno, email, fecha_nacimiento, salud, domicilio, telefono, sexo, id],
    (err) => {
      if (err) throw err;
      res.redirect('/consultar');
    });
});

app.get('/eliminar/:id', verificarSesion, (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM registros WHERE id = ?', [id], (err) => {
    if (err) throw err;
    res.redirect('/consultar');
  });
});

app.get('/formtutor', verificarSesion, (req, res) => {
  db.query('SELECT * FROM padres', (err, results) => {
    if (err) throw err;
    res.render('formtutor', { padres: results });
  });
});

app.post('/add', (req, res) => {
  const data = req.body;
  db.query('INSERT INTO padres SET ?', data, (err) => {
    if (err) throw err;
    res.redirect('/formtutor');
  });
});

app.get('/delete/:id', (req, res) => {
  db.query('DELETE FROM padres WHERE id = ?', [req.params.id], (err) => {
    if (err) throw err;
    res.redirect('/formtutor');
  });
});

app.get('/edittutor/:id', (req, res) => {
  db.query('SELECT * FROM padres WHERE id = ?', [req.params.id], (err, results) => {
    if (err) throw err;
    res.render('edittutor', { padre: results[0] });
  });
});

app.post('/update/:id', (req, res) => {
  const data = req.body;
  db.query('UPDATE padres SET ? WHERE id = ?', [data, req.params.id], (err) => {
    if (err) throw err;
    res.redirect('/formtutor');
  });
});

app.get('/formdescuento', verificarSesion, (req, res) => {
  res.render('formdescuento');
});

app.post('/guardar', (req, res) => {
  const { gastos, ingresos, miembros } = req.body;
  const sql = 'INSERT INTO datos_familiares (gastos_mensuales, ingresos_familiares, miembros_trabajando) VALUES (?, ?, ?)';
  db.query(sql, [gastos, ingresos, miembros], (err) => {
    if (err) throw err;
    res.send('<h2>Solicitud enviada. Esperando respuesta</h2><a href="/formdescuento">Volver</a>');
  });
});

app.get('/reglas', (req, res) => {
  res.render('reglas');
});

app.get('/cierre', (req, res) => {
  res.render('cierre');
});

app.get('/usuarios', async (req, res) => {
  try {
    const [usuarios] = await db.promise().query('SELECT * FROM usuarios1');
    res.render('usuarios', { usuarios });
  } catch (error) {
    console.error('Error al obtener los usuarios:', error);
    res.status(500).send('Error del servidor');
  }
});

// TRIVIA
const preguntas = [
  { pregunta: "¿Cuántos jugadores tiene un equipo de fútbol en cancha?", opciones: ["11", "10", "12", "9"], correcta: "11" },
  { pregunta: "¿Qué país ganó el Mundial 2022?", opciones: ["Francia", "Brasil", "Argentina", "Alemania"], correcta: "Argentina" },
  { pregunta: "¿Qué jugador es conocido como 'La Pulga'?", opciones: ["Cristiano", "Messi", "Neymar", "Mbappé"], correcta: "Messi" }
];

app.get('/triviafutbol', (req, res) => {
  res.render('triviafutbol');
});

app.get('/quizfutbol', (req, res) => {
  res.render('quizfutbol', { preguntas });
});

app.post('/resultado', (req, res) => {
  let score = 0;
  preguntas.forEach((pregunta, i) => {
    if (req.body[`respuesta_${i}`] === pregunta.correcta) {
      score++;
    }
  });
  res.render('resultfutbol', { score, total: preguntas.length });
});

app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
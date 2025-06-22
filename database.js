const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: 'sql5.freesqldatabase.com',
  user: 'sql5786136',
  password: 'jE8PkYA9dE',
  database: 'sql5786136'
});

connection.connect(err => {
  if (err) throw err;
  console.log('Conectado a la base de datos');
});

module.exports = connection;
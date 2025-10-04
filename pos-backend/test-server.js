const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pos_db',
    // Let's add the port to be explicit
    port: 3306 // This is the default port for MySQL
};

async function testConnection() {
    console.log('Attempting to connect to the database...');
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ SUCCESS! Connected to the MySQL database.');
        await connection.end();
    } catch (error) {
        console.error('❌ FAILED! Could not connect to the database.');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
    }
}

testConnection();
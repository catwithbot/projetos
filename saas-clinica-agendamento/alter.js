const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'backend', 'clinic.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        return;
    }
    
    // Add CPF column safely
    db.run("ALTER TABLE patients ADD COLUMN cpf TEXT", (err) => {
        if (err) {
            if (err.message.includes('duplicate column')) {
                console.log('Column cpf already exists.');
            } else {
                console.error('Error altering table:', err.message);
            }
        } else {
            console.log('Successfully added cpf column to patients table.');
        }
    });

    // Make sure we have a few columns
});

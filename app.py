from flask import Flask  # Using Flask (the framework)
import sqlite3  # Using SQLite3 (the database)
import os

app = Flask(__name__)

# This will initialize a small database, providing a link for "The Vault Keeper" Proof of Concept
def init_db():
    conn = sqlite3.connect('vault.db')
    cursor = conn.cursor()
    cursor.execute('CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, message TEXT)')
    cursor.execute('INSERT INTO logs (message) VALUES ("PoC Database Initialized")')
    conn.commit()
    conn.close()

@app.route('/')
def home():
    return """
    <h1>The Vault Keeper </h1>
    <p>Status: <strong>Online</strong></p>
    <p>Database: <strong>Connected</strong></p>
    <p>This is the main page for The Vault Keeper Project!</p>
    """

if __name__ == '__main__':
    init_db()
    print("Database ready. Starting server...")
    app.run(debug=True)
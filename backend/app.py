from flask import Flask, request, render_template_string
import sqlite3
import os
from datetime import datetime

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = 'vault_storage'
DATABASE = 'vault.db'

# Make sure the storage folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # Table for general logs (for Norman's Activity Log feature)
    cursor.execute('CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, message TEXT, timestamp DATETIME)')

    # Table for file metadata (to help Sarah stay organized)
    cursor.execute('''CREATE TABLE IF NOT EXISTS files 
                      (id INTEGER PRIMARY KEY, filename TEXT, upload_date DATETIME, size INTEGER)''')
    
    cursor.execute('INSERT INTO logs (message, timestamp) VALUES (?, ?)', 
                   ("Vault Keeper Backend Initialized", datetime.now()))
    conn.commit()
    conn.close()

@app.route('/')
def home():

    # Get logs to display on the home page for a quick status check
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT message, timestamp FROM logs ORDER BY id DESC LIMIT 5')
    recent_logs = cursor.fetchall()
    conn.close()

    log_html = "".join([f"<li>[{log[1]}] {log[0]}</li>" for log in recent_logs])

    return f"""
    <h1>The Vault Keeper</h1>
    <p>Status: <strong>Online</strong></p>
    <p>Storage Location: <code>{os.path.abspath(UPLOAD_FOLDER)}</code></p>
    <hr>
    <h3>Recent Activity Log:</h3>
    <ul>{log_html}</ul>
    <hr>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="file">
      <input type="submit" value="Upload to Vault">
    </form>
    """

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return "No file part", 400
    
    file = request.files['file']
    if file.filename == '':
        return "No selected file", 400

    if file:
        filename = file.filename
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        
        # Log the activity in the SQLite database
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('INSERT INTO files (filename, upload_date, size) VALUES (?, ?, ?)', 
                       (filename, datetime.now(), os.path.getsize(file_path)))
        cursor.execute('INSERT INTO logs (message, timestamp) VALUES (?, ?)', 
                       (f"File Uploaded: {filename}", datetime.now()))
        conn.commit()
        conn.close()
        
        return f"File '{filename}' successfully saved to the Vault! <a href='/'>Go Back</a>"

if __name__ == '__main__':
    init_db()
    print(f"Database ready. Files will be stored in: {UPLOAD_FOLDER}")
    app.run(debug=True)
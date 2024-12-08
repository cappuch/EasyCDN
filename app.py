from flask import Flask, render_template, request, send_file, jsonify
import os
from werkzeug.utils import secure_filename
from datetime import datetime
import hashlib
import json
import config

app = Flask(__name__)
app.config.from_object(config)

CHECKSUM_FILE = 'checksums.json'

def load_checksums():
    if os.path.exists(CHECKSUM_FILE):
        with open(CHECKSUM_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_checksums(checksums):
    with open(CHECKSUM_FILE, 'w') as f:
        json.dump(checksums, f)

def generate_file_hash(file_content):
    return hashlib.md5(file_content).hexdigest()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    files = []
    upload_path = app.config['UPLOAD_FOLDER']
    
    for filename in os.listdir(upload_path):
        file_path = os.path.join(upload_path, filename)
        if os.path.isfile(file_path):
            file_stats = os.stat(file_path)
            files.append({
                'name': filename,
                'size': file_stats.st_size,
                'created': datetime.fromtimestamp(file_stats.st_ctime),
                'url': f'/cdn/{filename}'
            })
    
    return render_template('dashboard.html', files=files)

@app.route('/check-duplicate/<checksum>')
def check_duplicate(checksum):
    checksums = load_checksums()
    if checksum in checksums:
        return jsonify({
            'exists': True,
            'url': checksums[checksum]['url']
        })
    return jsonify({'exists': False})

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    checksum = request.form.get('checksum')
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and checksum:
        filename = secure_filename(file.filename)
        extension = os.path.splitext(filename)[1]
        new_filename = f"{checksum}{extension}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], new_filename)

        checksums = load_checksums()
        if checksum in checksums:
            return jsonify({
                'message': 'File already exists',
                'url': checksums[checksum]['url']
            })

        file.save(file_path)
        
        file_url = f'/cdn/{new_filename}'
        checksums[checksum] = {
            'filename': new_filename,
            'url': file_url,
            'timestamp': datetime.now().isoformat()
        }
        save_checksums(checksums)
        
        return jsonify({
            'message': 'File uploaded successfully',
            'url': file_url
        })

@app.route('/cdn/<filename>')
def serve_file(filename):
    try:
        return send_file(
            os.path.join(app.config['UPLOAD_FOLDER'], filename),
            as_attachment=False
        )
    except Exception as e:
        return jsonify({'error': 'File not found'}), 404

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)
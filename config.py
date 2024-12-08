import os

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'js', 'css'} # this doesnt even fucking work

MAX_CONTENT_LENGTH = 500 * 1024 * 1024
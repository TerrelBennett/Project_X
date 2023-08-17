from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_security import Security, SQLAlchemyUserDatastore, UserMixin, RoleMixin
import openai
import os
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv


load_dotenv()
openai.api_key = os.environ.get("OPENAI_API_KEY")
api_key_activated = False

app = Flask(__name__)


CORS(app, supports_credentials=True, origins=['http://127.0.0.1:5500'])
app.config["SECRET_KEY"] = os.urandom(24)
app.config["SESSION_PERMANENT"] = True
app.config["SESSION_TYPE"] = "filesystem"
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("SQLALCHEMY_DATABASE_URI")
db = SQLAlchemy(app)

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    active = db.Column(db.Boolean(), default=True)
    fs_uniquifier = db.Column(db.String(64), unique=True)
    roles = db.relationship('Role', secondary='user_roles',
                            backref=db.backref('users', lazy='dynamic'))

user_roles = db.Table(
    'user_roles',
    db.Column('user_id', db.Integer(), db.ForeignKey('user.id')),
    db.Column('role_id', db.Integer(), db.ForeignKey('role.id'))
)

class Role(db.Model, RoleMixin):
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(80), unique=True)

class TaughtResponse(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_message = db.Column(db.Text, nullable=False)
    chatbot_response = db.Column(db.Text, nullable=False)

class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    feedback_text = db.Column(db.Text, nullable=False)

user_datastore = SQLAlchemyUserDatastore(db, User, Role)
security = Security(app, user_datastore)


@app.route('/get_response', methods=['POST'])
def get_response():
    user_message = request.json.get('message', '')
    received_csrf_token = request.json.get('csrf_token')  # Retrieve CSRF token from the JSON data
    print("Received user message:", user_message)

    # Validate the CSRF token
    if received_csrf_token != session.get('csrf_token'):
        return jsonify({'error': 'Invalid CSRF token'}), 400
    
    global api_key_activated

    if not api_key_activated:
        try:
            # Query the database for a taught response
            taught_response = TaughtResponse.query.filter_by(user_message=user_message).first()

            if taught_response:
                chatbot_response = taught_response.chatbot_response
                print("Retrieved taught response from database:", chatbot_response)
                return jsonify({'response': chatbot_response})

            return jsonify({'response': 'I do not know the answer to that. Can you teach me?'})
        except Exception as e:
            print("Database query error:", str(e))
            return jsonify({'error': "An error occurred while retrieving the response."})
    
    else:
        # Use OpenAI to generate a response
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": user_message}
            ]
        )
        chatbot_response = response.choices[0].message['content']

        return jsonify({'response': chatbot_response})
    
@app.route('/toggle_api', methods=['POST'])
def toggle_api():
    global api_key_activated
    
    try:
        # Toggle the API activation status
        api_key_activated = not api_key_activated
        print("API key activation status:", api_key_activated)
        return jsonify({'activated': api_key_activated})
    except Exception as e:
        print("API toggle error:", str(e))
        return jsonify({'error': "An error occurred while toggling the API activation status."})

@app.route('/teach', methods=['POST']) 
def teach():
    user_message = request.json.get('message', '')
    chatbot_response = request.json.get('response', '')

    try:
        if user_message and chatbot_response:
            taught_response = TaughtResponse(user_message=user_message, chatbot_response=chatbot_response)
            db.session.add(taught_response)
            db.session.commit()

            print("Teaching successful:", user_message, "->", chatbot_response)
            return jsonify({'message': "Thanks for teaching me!"})
        else:
            raise ValueError("Invalid data provided.")
    except Exception as e:
        print("Teaching error:", str(e))
        return jsonify({'error': "An error occurred while teaching the chatbot."})

@app.route('/submit_feedback', methods=['POST'])
def submit_feedback():
    feedback_text = request.json.get('feedback', '')

    if feedback_text:
        store_feedback(feedback_text)  # Store the feedback in the database
        return jsonify({'message': "Thank you for your feedback!"})
    else:
        return jsonify({'message': "No feedback provided."})

def store_feedback(feedback_text):
    feedback_entry = Feedback(feedback_text=feedback_text)
    db.session.add(feedback_entry)
    db.session.commit()


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True) 
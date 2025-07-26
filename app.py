from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import logging
import traceback

app = Flask(__name__)
CORS(app)

# Set up detailed logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@app.route("/ask", methods=["POST"])
def ask():
    try:
        # Log incoming request
        logger.info("=== NEW REQUEST ===")
        logger.info(f"Request headers: {dict(request.headers)}")
        logger.info(f"Request data: {request.get_data()}")
        
        # Parse JSON data
        data = request.get_json()
        logger.info(f"Parsed JSON: {data}")
        
        if not data:
            logger.error("No JSON data received")
            return jsonify({"response": "No JSON data received"}), 400
        
        prompt = data.get("prompt", "")
        logger.info(f"Extracted prompt: '{prompt}'")
        
        if not prompt:
            logger.error("No prompt provided")
            return jsonify({"response": "No prompt provided"}), 400
        
        # Test Ollama connection first
        logger.info("Testing Ollama connection...")
        try:
            test_response = requests.get("http://localhost:11434/api/tags", timeout=5)
            logger.info(f"Ollama connection test: {test_response.status_code}")
            if test_response.ok:
                models = test_response.json().get("models", [])
                logger.info(f"Available models: {[m['name'] for m in models]}")
            else:
                logger.error(f"Ollama not responding: {test_response.status_code}")
                return jsonify({"response": "Ollama server not responding. Make sure it's running with 'ollama serve'"}), 500
        except Exception as e:
            logger.error(f"Cannot connect to Ollama: {e}")
            return jsonify({"response": f"Cannot connect to Ollama: {str(e)}. Make sure it's running with 'ollama serve'"}), 500
        
        # Send request to Ollama
        logger.info("Sending request to Ollama...")
        ollama_payload = {
            "model": "gemma3",  # Change this if you have a different model
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "max_tokens": 500
            }
        }
        logger.info(f"Ollama payload: {ollama_payload}")
        
        response = requests.post(
            "http://localhost:11434/api/generate",
            json=ollama_payload,
            timeout=30
        )
        
        logger.info(f"Ollama response status: {response.status_code}")
        logger.info(f"Ollama response headers: {dict(response.headers)}")
        
        if not response.ok:
            logger.error(f"Ollama HTTP error: {response.status_code} - {response.text}")
            return jsonify({"response": f"Ollama error: {response.status_code} - {response.text}"}), 500
        
        ollama_response = response.json()
        logger.info(f"Ollama full response: {ollama_response}")
        
        final_response = ollama_response.get("response", "No response from Ollama")
        logger.info(f"Final response: '{final_response[:100]}...'")
        
        return jsonify({"response": final_response})

    except requests.exceptions.ConnectionError as e:
        error_msg = f"Cannot connect to Ollama: {str(e)}"
        logger.error(error_msg)
        return jsonify({"response": error_msg}), 500
        
    except requests.exceptions.Timeout as e:
        error_msg = f"Ollama request timed out: {str(e)}"
        logger.error(error_msg)
        return jsonify({"response": error_msg}), 500
        
    except requests.exceptions.HTTPError as e:
        error_msg = f"Ollama HTTP error: {str(e)}"
        logger.error(error_msg)
        return jsonify({"response": error_msg}), 500
        
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(f"FULL ERROR: {traceback.format_exc()}")
        return jsonify({"response": error_msg}), 500

@app.route("/health", methods=["GET"])
def health():
    """Check if both Flask and Ollama are running"""
    try:
        logger.info("Health check requested")
        
        # Test Ollama connection
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        
        if response.ok:
            data = response.json()
            models = data.get("models", [])
            logger.info(f"Health check successful. Models: {[m['name'] for m in models]}")
            
            return jsonify({
                "flask": "✅ Running",
                "ollama": "✅ Connected",
                "models": [m['name'] for m in models],
                "message": "All systems operational"
            })
        else:
            logger.error(f"Ollama health check failed: {response.status_code}")
            return jsonify({
                "flask": "✅ Running",
                "ollama": f"❌ Error {response.status_code}",
                "models": [],
                "message": "Ollama not responding properly"
            })
            
    except requests.exceptions.ConnectionError:
        logger.error("Ollama connection refused")
        return jsonify({
            "flask": "✅ Running", 
            "ollama": "❌ Connection refused",
            "models": [],
            "message": "Ollama not running. Start with 'ollama serve'"
        })
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({
            "flask": "✅ Running", 
            "ollama": f"❌ Error: {str(e)}",
            "models": [],
            "message": "Health check failed"
        })

@app.route("/test", methods=["GET"])
def test():
    """Simple test endpoint"""
    return jsonify({"message": "Flask is working!", "status": "OK"})

if __name__ == "__main__":
    print("🚀 Starting Flask server with debug mode...")
    print("📡 Endpoints available:")
    print("   - POST /ask - Main chat endpoint")
    print("   - GET /health - System health check")
    print("   - GET /test - Simple test")
    print("🤖 Make sure Ollama is running: ollama serve")
    print("📝 Check console for detailed logs")
    app.run(debug=True, port=5000, host='0.0.0.0')
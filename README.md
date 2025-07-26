# Jarvis Voice Assistant (Offline AI with LLM + Voice Control)

A fully offline voice assistant inspired by Jarvis, built with Flask, Ollama, and in-browser speech interfaces. This assistant can listen to voice commands, process queries using a locally running LLM, and speak back intelligent responses — all without relying on cloud services.

## Overview

Jarvis is a lightweight, privacy-first AI voice assistant that combines modern LLM capabilities with browser-based speech input/output. It's ideal for hobby projects, personal automation, and offline experimentation with conversational AI.

## Features

- Local LLM Integration  
  Uses models like LLaMA2, Gemma, or Mistral via Ollama. Runs entirely on your local machine — no internet required once set up.

- Voice-Activated  
  Listens to voice prompts using Web Speech API (STT). Responds out loud using browser-native text-to-speech (TTS).

- Fast and Minimal  
  Real-time interaction loop with near-instant replies. No front-end frameworks or external JS libraries.

- Simple UI  
  Clean HTML + CSS interface. Single-button experience: click to talk, listen to the reply.

- REST API Backend  
  Python Flask server handles prompt routing. Easily extendable to add memory, tools, or actions.

## Use Cases

- Offline Personal Assistant  
  Ask questions, get summaries, or run commands locally.

- LLM Sandbox  
  Rapidly test local models with voice inputs.

- Edge AI Projects  
  Build low-cost assistants on local devices (e.g., Raspberry Pi + microphone).

- Education and Demos  
  Great for showcasing LLMs, voice recognition, and prompt design together.

## Project Components

| File              | Description                              |
|-------------------|------------------------------------------|
| `app.py`          | Flask backend with Ollama integration    |
| `index.html`      | Voice assistant interface (frontend)     |
| `script.js`       | Speech-to-text, API calls, text-to-speech|
| `style.css`       | Minimal styling                          |
| `requirements.txt`| Python dependencies                      |

## Notes

- Works best on Chrome (due to Web Speech API support).
- You can change the model name in `app.py` to use a different Ollama model.
- 100% offline once the model is downloaded and running.


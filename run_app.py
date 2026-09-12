"""
Launcher for Q-Hospitality Full-Stack Research Platform.
Runs the FastAPI server and opens the browser interface.
"""
import sys
import os
import socket
import webbrowser
import threading
import time
import uvicorn

def find_available_port(start_port=8000, max_tries=10):
    for port in range(start_port, start_port + max_tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', port))
                return port
            except OSError:
                continue
    return start_port

def open_browser(port):
    time.sleep(1.5)
    webbrowser.open(f"http://127.0.0.1:{port}")

if __name__ == "__main__":
    port = find_available_port(8000)

    print("=" * 70)
    print("  Q-HOSPITALITY: QUANTUM MACHINE LEARNING & STATISTICAL ANALYTICS")
    print("  Zero Database Architecture | FastAPI & PennyLane Engine")
    print("=" * 70)
    print(f"Server starting at: http://127.0.0.1:{port}")
    print("Opening browser automatically...")
    print("Press Ctrl+C to terminate.")
    print("=" * 70)

    # Launch browser in a background thread
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()

    # Run FastAPI app with reload support
    uvicorn.run("backend.main:app", host="127.0.0.1", port=port, log_level="info", reload=True)

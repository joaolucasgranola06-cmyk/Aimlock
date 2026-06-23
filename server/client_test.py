import json
import socket

HOST = "127.0.0.1"
PORT = 8080

messages = [
    {"action": "ping", "payload": {"message": "hello"}},
    {"action": "status", "payload": {"device": "demo"}},
    {"action": "tap", "payload": {"x": 540, "y": 960}},
]

for payload in messages:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.connect((HOST, PORT))
        s.sendall(json.dumps(payload).encode("utf-8"))
        response = s.recv(4096)
        print(f"Sent: {payload}")
        print(f"Received: {response.decode('utf-8')}")

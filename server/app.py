import json
import socket
import threading
from datetime import datetime
from typing import Dict, Any

HOST = "0.0.0.0"
PORT = 8080


def format_response(action: str, status: str, payload: Dict[str, Any] | None = None) -> str:
    return json.dumps(
        {
            "action": action,
            "status": status,
            "payload": payload or {},
            "timestamp": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        },
        ensure_ascii=False,
    )


class ClientHandler(threading.Thread):
    def __init__(self, conn: socket.socket, addr):
        super().__init__(daemon=True)
        self.conn = conn
        self.addr = addr

    def run(self):
        print(f"Conectado: {self.addr}")
        try:
            while True:
                raw = self.conn.recv(4096)
                if not raw:
                    break

                message = raw.decode("utf-8", errors="ignore").strip()
                if not message:
                    continue

                try:
                    data = json.loads(message)
                except json.JSONDecodeError:
                    response = format_response("error", "invalid_json")
                    self.conn.sendall(response.encode("utf-8"))
                    continue

                action = data.get("action", "ping")
                payload = data.get("payload", {})

                if action == "ping":
                    response = format_response(action, "ok", {"message": "pong"})
                elif action == "echo":
                    response = format_response(action, "ok", {"echo": payload})
                elif action == "status":
                    response = format_response(
                        action,
                        "ok",
                        {"server": "ready", "received": payload},
                    )
                elif action == "tap":
                    response = format_response(
                        action,
                        "ok",
                        {
                            "message": "command received",
                            "coordinates": payload,
                        },
                    )
                else:
                    response = format_response(action, "ok", {"received": data})

                self.conn.sendall(response.encode("utf-8"))
        except Exception as exc:
            print(f"Erro com {self.addr}: {exc}")
        finally:
            self.conn.close()
            print(f"Desconectado: {self.addr}")


def main() -> None:
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((HOST, PORT))
    server.listen(5)
    print(f"Servidor ouvindo em {HOST}:{PORT}")

    try:
        while True:
            conn, addr = server.accept()
            ClientHandler(conn, addr).start()
    except KeyboardInterrupt:
        print("Servidor encerrado.")
    finally:
        server.close()


if __name__ == "__main__":
    main()

import java.io.IOException;
import java.io.OutputStream;
import java.net.Socket;

public class NetworkClientExample {
    private static final String HOST = "127.0.0.1";
    private static final int PORT = 8080;

    public static void sendMessage(String message) {
        new Thread(() -> {
            try (Socket socket = new Socket(HOST, PORT);
                 OutputStream out = socket.getOutputStream()) {
                out.write(message.getBytes("UTF-8"));
                out.flush();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }).start();
    }
}

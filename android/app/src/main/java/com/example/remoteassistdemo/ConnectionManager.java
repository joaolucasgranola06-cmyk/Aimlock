package com.example.remoteassistdemo;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.widget.TextView;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.Socket;

public class ConnectionManager {
    public static void connect(Context context, String host, int port, TextView statusText) {
        new Thread(() -> {
            try (Socket socket = new Socket(host, port)) {
                OutputStream output = socket.getOutputStream();
                BufferedReader input = new BufferedReader(new InputStreamReader(socket.getInputStream()));

                JSONObject payload = new JSONObject();
                payload.put("action", "status");
                payload.put("payload", new JSONObject().put("device", "android_demo"));

                output.write(payload.toString().getBytes());
                output.flush();

                String response = input.readLine();
                String finalResponse = response != null ? response : "Sem resposta";

                new Handler(Looper.getMainLooper()).post(() -> {
                    statusText.setText(finalResponse);
                });
            } catch (Exception e) {
                new Handler(Looper.getMainLooper()).post(() -> {
                    statusText.setText("Erro: " + e.getMessage());
                });
            }
        }).start();
    }
}
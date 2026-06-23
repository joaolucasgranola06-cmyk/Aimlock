package com.example.remoteassistdemo;

import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private EditText hostInput;
    private EditText portInput;
    private TextView statusText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        hostInput = findViewById(R.id.hostInput);
        portInput = findViewById(R.id.portInput);
        statusText = findViewById(R.id.statusText);

        Button connectButton = findViewById(R.id.connectButton);
        connectButton.setOnClickListener(v -> {
            String host = hostInput.getText().toString().trim();
            String portText = portInput.getText().toString().trim();
            if (host.isEmpty() || portText.isEmpty()) {
                statusText.setText("Preencha host e porta");
                return;
            }

            int port = Integer.parseInt(portText);
            statusText.setText("Conectando em " + host + ":" + port);
            ConnectionManager.connect(this, host, port, statusText);
        });
    }
}
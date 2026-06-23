import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;

public class AccessibilityServiceExample extends AccessibilityService {
    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Exemplo base: monitorar eventos de acessibilidade.
    }

    @Override
    public void onInterrupt() {
        // Tratamento de interrupção do serviço.
    }
}

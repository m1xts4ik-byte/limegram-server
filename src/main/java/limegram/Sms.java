package limegram;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.concurrent.*;

/**
 * Отправка SMS. Если заданы TWILIO_SID, TWILIO_TOKEN и TWILIO_FROM — уходит реальное SMS через Twilio.
 * Иначе код только печатается в консоль сервера.
 */
final class Sms {
    private final ExecutorService ex = Executors.newVirtualThreadPerTaskExecutor();
    private final String sid = Core.env("TWILIO_SID", ""), token = Core.env("TWILIO_TOKEN", ""), from = Core.env("TWILIO_FROM", "");
    private final HttpClient http = HttpClient.newHttpClient();

    boolean realGateway() { return !sid.isEmpty() && !token.isEmpty() && !from.isEmpty(); }

    void send(String to, String text) {
        System.out.println("[SMS -> " + to + "] " + text);
        if (!realGateway()) return;
        ex.submit(() -> {
            try {
                String form = "To=" + enc(to) + "&From=" + enc(from) + "&Body=" + enc(text);
                String auth = Base64.getEncoder().encodeToString((sid + ":" + token).getBytes(StandardCharsets.UTF_8));
                HttpRequest rq = HttpRequest.newBuilder(URI.create("https://api.twilio.com/2010-04-01/Accounts/" + sid + "/Messages.json"))
                        .header("Authorization", "Basic " + auth)
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(form)).build();
                HttpResponse<String> r = http.send(rq, HttpResponse.BodyHandlers.ofString());
                if (r.statusCode() >= 300) System.err.println("Twilio error " + r.statusCode() + ": " + r.body());
            } catch (Exception e) {
                System.err.println("SMS не отправлено: " + e);
            }
        });
    }

    private static String enc(String s) { return URLEncoder.encode(s, StandardCharsets.UTF_8); }
}

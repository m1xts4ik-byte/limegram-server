package limegram;

import java.util.*;
import java.util.concurrent.*;

/** Realtime-хаб: SSE-подключения клиентов. */
final class Hub {
    static final class Client {
        final BlockingQueue<String> q = new LinkedBlockingQueue<>();
        volatile boolean closed;
        boolean first;
    }

    private final Map<String, Set<Client>> clients = new HashMap<>();

    synchronized Client connect(String uid) {
        Set<Client> s = clients.computeIfAbsent(uid, k -> new HashSet<>());
        Client c = new Client();
        c.first = s.isEmpty();
        s.add(c);
        return c;
    }

    /** @return true, если это было последнее подключение пользователя */
    synchronized boolean disconnect(String uid, Client c) {
        Set<Client> s = clients.get(uid);
        if (s == null) return false;
        s.remove(c);
        if (s.isEmpty()) { clients.remove(uid); return true; }
        return false;
    }

    synchronized boolean isOnline(String uid) { return clients.containsKey(uid); }

    synchronized int onlineCount() { return clients.size(); }

    void push(String uid, String event, Object data) {
        List<Client> cs;
        synchronized (this) {
            Set<Client> s = clients.get(uid);
            if (s == null) return;
            cs = new ArrayList<>(s);
        }
        String frame = "event: " + event + "\ndata: " + Json.str(data) + "\n\n";
        for (Client c : cs) c.q.offer(frame);
    }

    synchronized void kick(String uid) {
        Set<Client> s = clients.get(uid);
        if (s == null) return;
        for (Client c : s) { c.closed = true; c.q.offer(""); }
    }
}

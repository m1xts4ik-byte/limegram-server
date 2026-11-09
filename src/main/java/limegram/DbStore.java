package limegram;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.Properties;

/** Внешнее хранилище (Postgres, например Neon). Включается переменной окружения DATABASE_URL.
 *  Нужно для хостингов с временным диском (Render): там файл базы стирается при перезапуске.
 *  Использует только java.sql, драйвер postgresql.jar подключается на этапе запуска (classpath). */
final class DbStore {
    private final String jdbc;
    private final Properties props = new Properties();

    private DbStore(String jdbc, Properties props) { this.jdbc = jdbc; this.props.putAll(props); }

    static DbStore fromEnv() {
        String url = Core.env("DATABASE_URL", "").trim();
        if (url.isEmpty()) return null;
        try {
            DbStore s = parse(url);
            s.init();
            System.out.println("Внешняя база подключена: " + s.jdbc);
            return s;
        } catch (Exception e) {
            System.err.println("ВНИМАНИЕ: не удалось подключить DATABASE_URL (" + e + "). Работаем только с файлом.");
            return null;
        }
    }

    /** postgresql://user:pass@host[:port]/db?sslmode=require  ->  jdbc:postgresql://host:port/db?sslmode=require */
    static DbStore parse(String url) throws Exception {
        URI u = new URI(url.replaceFirst("^postgres://", "postgresql://"));
        String[] ui = (u.getRawUserInfo() == null ? ":" : u.getRawUserInfo()).split(":", 2);
        Properties p = new Properties();
        p.setProperty("user", URLDecoder.decode(ui[0], StandardCharsets.UTF_8));
        p.setProperty("password", ui.length > 1 ? URLDecoder.decode(ui[1], StandardCharsets.UTF_8) : "");
        p.setProperty("loginTimeout", "15");
        p.setProperty("socketTimeout", "60");
        StringBuilder q = new StringBuilder();
        boolean ssl = false;
        if (u.getRawQuery() != null) for (String kv : u.getRawQuery().split("&")) {
            if (kv.isEmpty() || kv.startsWith("channel_binding")) continue;   // драйвер не знает этот параметр
            if (kv.startsWith("sslmode")) ssl = true;
            q.append(q.length() == 0 ? "?" : "&").append(kv);
        }
        if (!ssl) q.append(q.length() == 0 ? "?" : "&").append("sslmode=require");
        String jdbc = "jdbc:postgresql://" + u.getHost() + ":" + (u.getPort() > 0 ? u.getPort() : 5432) + u.getPath() + q;
        return new DbStore(jdbc, p);
    }

    private Connection open() throws SQLException { return DriverManager.getConnection(jdbc, props); }

    private void init() throws SQLException {
        try (Connection c = open(); Statement st = c.createStatement()) {
            st.execute("CREATE TABLE IF NOT EXISTS lg_store (k TEXT PRIMARY KEY, v TEXT NOT NULL, ts TIMESTAMPTZ NOT NULL DEFAULT now())");
        }
    }

    /** Возвращает сохранённый JSON или null, если там пусто. */
    String read() throws SQLException {
        try (Connection c = open(); PreparedStatement ps = c.prepareStatement("SELECT v FROM lg_store WHERE k = 'main'");
             ResultSet rs = ps.executeQuery()) {
            return rs.next() ? rs.getString(1) : null;
        }
    }

    void write(String json) throws SQLException {
        try (Connection c = open(); PreparedStatement ps = c.prepareStatement(
                "INSERT INTO lg_store (k, v, ts) VALUES ('main', ?, now()) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, ts = now()")) {
            ps.setString(1, json);
            ps.executeUpdate();
        }
    }
}

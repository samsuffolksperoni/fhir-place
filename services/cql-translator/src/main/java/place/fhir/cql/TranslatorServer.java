package place.fhir.cql;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.cqframework.cql.cql2elm.CqlCompilerException;
import org.cqframework.cql.cql2elm.CqlTranslator;
import org.cqframework.cql.cql2elm.LibraryManager;
import org.cqframework.cql.cql2elm.ModelManager;
import org.cqframework.cql.elm.serializing.jackson.ElmJsonLibraryReader;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;

/**
 * Minimal HTTP server exposing POST /translate to compile CQL to ELM JSON.
 *
 * Request:  { "cql": "library Foo version '1' ..." }
 * Response: ELM library JSON, or { "errors": [{ "line", "col", "message", "severity" }] }
 *
 * CORS is wide-open for localhost-style dev. Tighten before any non-dev hosting.
 */
public final class TranslatorServer {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  public static void main(String[] args) throws IOException {
    int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8081"));
    HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
    server.createContext("/translate", TranslatorServer::handleTranslate);
    server.createContext("/health", TranslatorServer::handleHealth);
    server.setExecutor(Executors.newFixedThreadPool(4));
    server.start();
    System.out.println("cql-translator listening on :" + port);
  }

  private static void handleHealth(HttpExchange ex) throws IOException {
    sendJson(ex, 200, Map.of("status", "ok"));
  }

  private static void handleTranslate(HttpExchange ex) throws IOException {
    if ("OPTIONS".equalsIgnoreCase(ex.getRequestMethod())) {
      preflight(ex);
      return;
    }
    if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) {
      sendJson(ex, 405, Map.of("error", "method not allowed"));
      return;
    }
    String body;
    try (InputStream in = ex.getRequestBody()) {
      body = new String(in.readAllBytes(), StandardCharsets.UTF_8);
    }
    String cql;
    try {
      Map<?, ?> parsed = MAPPER.readValue(body, Map.class);
      Object raw = parsed.get("cql");
      if (!(raw instanceof String s) || s.isBlank()) {
        sendJson(ex, 400, Map.of("error", "missing 'cql' string"));
        return;
      }
      cql = s;
    } catch (IOException e) {
      sendJson(ex, 400, Map.of("error", "invalid JSON: " + e.getMessage()));
      return;
    }

    ModelManager modelManager = new ModelManager();
    LibraryManager libraryManager = new LibraryManager(modelManager);
    libraryManager
        .getLibrarySourceLoader()
        .registerProvider(new InMemoryLibrarySourceProvider(cql));

    CqlTranslator translator;
    try {
      translator = CqlTranslator.fromText(cql, libraryManager);
    } catch (Exception e) {
      sendJson(ex, 400, Map.of("errors", List.of(toError(e))));
      return;
    }

    List<Map<String, Object>> errors = new ArrayList<>();
    for (CqlCompilerException err : translator.getErrors()) {
      errors.add(toError(err));
    }
    if (!errors.isEmpty()) {
      sendJson(ex, 400, Map.of("errors", errors));
      return;
    }

    String elmJson = translator.toJson();
    // Round-trip through the official Jackson reader so syntactically-valid
    // JSON the client can't actually parse never escapes — the response is
    // always something the cql-execution npm package will accept.
    try {
      new ElmJsonLibraryReader().read(elmJson);
    } catch (IOException e) {
      sendJson(ex, 500, Map.of("errors", List.of(Map.of(
          "message", "translator produced unparseable ELM: " + e.getMessage(),
          "severity", "Error"))));
      return;
    }
    sendRaw(ex, 200, "application/json", elmJson.getBytes(StandardCharsets.UTF_8));
  }

  private static Map<String, Object> toError(CqlCompilerException err) {
    Map<String, Object> out = new HashMap<>();
    out.put("message", err.getMessage());
    out.put("severity", err.getSeverity() == null ? "Error" : err.getSeverity().name());
    if (err.getLocator() != null) {
      out.put("line", err.getLocator().getStartLine());
      out.put("col", err.getLocator().getStartChar());
    }
    return out;
  }

  private static Map<String, Object> toError(Throwable t) {
    return Map.of("message", t.getMessage() == null ? t.toString() : t.getMessage(),
        "severity", "Error");
  }

  private static void preflight(HttpExchange ex) throws IOException {
    addCors(ex);
    ex.sendResponseHeaders(204, -1);
    ex.close();
  }

  private static void addCors(HttpExchange ex) {
    ex.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
    ex.getResponseHeaders().add("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    ex.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
  }

  private static void sendJson(HttpExchange ex, int status, Object body) throws IOException {
    byte[] payload = MAPPER.writeValueAsBytes(body);
    sendRaw(ex, status, "application/json", payload);
  }

  private static void sendRaw(HttpExchange ex, int status, String contentType, byte[] payload)
      throws IOException {
    addCors(ex);
    ex.getResponseHeaders().set("Content-Type", contentType);
    ex.sendResponseHeaders(status, payload.length);
    try (OutputStream out = ex.getResponseBody()) {
      out.write(payload);
    }
  }
}

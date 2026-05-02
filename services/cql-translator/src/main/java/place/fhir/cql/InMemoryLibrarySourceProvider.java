package place.fhir.cql;

import org.cqframework.cql.cql2elm.LibrarySourceProvider;
import org.hl7.elm.r1.VersionedIdentifier;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Phase 1 ships single-library translation only — the request body carries
 * exactly one CQL source. This stub satisfies the LibraryManager API so a
 * stray `include` reference returns null instead of NPE-ing the translator.
 * Multi-library compilation arrives with Phase 2's library store.
 */
final class InMemoryLibrarySourceProvider implements LibrarySourceProvider {

  private final String singleSource;

  InMemoryLibrarySourceProvider(String singleSource) {
    this.singleSource = singleSource;
  }

  @Override
  public InputStream getLibrarySource(VersionedIdentifier id) {
    return new ByteArrayInputStream(singleSource.getBytes(StandardCharsets.UTF_8));
  }
}

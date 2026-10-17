package ma.ensam.fame.security;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.Ed25519Verifier;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.OctetKeyPair;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.AuthChallenge;
import ma.ensam.fame.repository.AuthChallengeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.text.ParseException;
import java.time.Instant;
import java.util.Date;

/**
 * Verifies signed SchoolApp identity assertions emitted by the Cloudflare
 * Worker. Only the configured issuer, audience and key are trusted; the
 * assertion must be bound to a server-issued challenge and a single-use nonce.
 */
@Component
public class SchoolAppAssertionVerifier {

    private final JWSVerifier verifier;
    private final String issuer;
    private final String audience;
    private final AuthChallengeRepository challengeRepository;

    public SchoolAppAssertionVerifier(
            @Value("${fame.worker.public-key}") String publicKeyB64,
            @Value("${fame.worker.issuer}") String issuer,
            @Value("${fame.worker.audience}") String audience,
            AuthChallengeRepository challengeRepository) {
        this.issuer = issuer;
        this.audience = audience;
        this.challengeRepository = challengeRepository;
        this.verifier = buildVerifier(publicKeyB64);
    }

    private static JWSVerifier buildVerifier(String publicKeyB64) {
        if (publicKeyB64 == null || publicKeyB64.isBlank()) {
            throw new IllegalStateException("fame.worker.public-key is not configured");
        }
        try {
            OctetKeyPair jwk = new OctetKeyPair.Builder(Curve.Ed25519,
                    com.nimbusds.jose.util.Base64URL.encode(java.util.Base64.getUrlDecoder().decode(publicKeyB64))).build();
            return new Ed25519Verifier(jwk);
        } catch (Exception e) {
            throw new IllegalStateException("Invalid Ed25519 worker public key", e);
        }
    }

    public record Assertion(
            String studentCode,
            String email,
            String fullName,
            String filiere,
            String niveau,
            String challenge,
            String nonce
    ) {}

    @Transactional
    public Assertion verify(String rawAssertion) {
        SignedJWT jwt;
        try {
            jwt = SignedJWT.parse(rawAssertion);
        } catch (ParseException e) {
            throw ApiException.unauthorized("ASSERTION_INVALID", "Malformed identity assertion");
        }

        try {
            if (!jwt.verify(verifier)) {
                throw ApiException.unauthorized("ASSERTION_SIGNATURE", "Identity assertion signature invalid");
            }
        } catch (JOSEException e) {
            throw ApiException.unauthorized("ASSERTION_SIGNATURE", "Identity assertion could not be verified");
        }

        JWTClaimsSet claims;
        try {
            claims = jwt.getJWTClaimsSet();
        } catch (ParseException e) {
            throw ApiException.unauthorized("ASSERTION_INVALID", "Malformed identity assertion claims");
        }

        Instant now = Instant.now();

        if (!issuer.equals(claims.getIssuer())) {
            throw ApiException.unauthorized("ASSERTION_ISSUER", "Untrusted assertion issuer");
        }
        if (claims.getAudience() == null || !claims.getAudience().contains(audience)) {
            throw ApiException.unauthorized("ASSERTION_AUDIENCE", "Untrusted assertion audience");
        }
        Date exp = claims.getExpirationTime();
        if (exp == null || now.isAfter(exp.toInstant())) {
            throw ApiException.unauthorized("ASSERTION_EXPIRED", "Identity assertion expired");
        }
        Date nbf = claims.getNotBeforeTime();
        if (nbf != null && now.isBefore(nbf.toInstant())) {
            throw ApiException.unauthorized("ASSERTION_NOT_YET_VALID", "Identity assertion not yet valid");
        }

        String studentCode = claims.getSubject();
        String challenge = str(claims, "challenge");
        String nonce = str(claims, "nonce");

        if (studentCode == null || studentCode.isBlank()) {
            throw ApiException.unauthorized("ASSERTION_SUBJECT", "Identity assertion missing subject");
        }
        if (challenge == null || challenge.isBlank() || nonce == null || nonce.isBlank()) {
            throw ApiException.unauthorized("ASSERTION_CHALLENGE", "Identity assertion missing challenge binding");
        }

        AuthChallenge stored = challengeRepository.findByChallenge(challenge)
                .orElseThrow(() -> ApiException.unauthorized("ASSERTION_CHALLENGE", "Unknown challenge"));

        if (stored.isExpired(now)) {
            throw ApiException.unauthorized("ASSERTION_CHALLENGE", "Challenge expired");
        }
        if (stored.isConsumed()) {
            throw ApiException.unauthorized("ASSERTION_REPLAY", "Challenge already consumed");
        }
        if (!stored.getNonce().equals(nonce)) {
            throw ApiException.unauthorized("ASSERTION_CHALLENGE", "Challenge nonce mismatch");
        }

        stored.setConsumedAt(now);
        challengeRepository.saveAndFlush(stored);

        return new Assertion(
                normalizeCode(studentCode),
                str(claims, "email"),
                str(claims, "name"),
                str(claims, "filiere"),
                str(claims, "niveau"),
                challenge,
                nonce);
    }

    private static String str(JWTClaimsSet claims, String name) {
        Object value = claims.getClaim(name);
        return value == null ? null : value.toString();
    }

    public static String normalizeCode(String code) {
        if (code == null) return null;
        return code.trim().toUpperCase();
    }
}

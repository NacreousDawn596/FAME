package ma.ensam.fame.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.Ed25519Signer;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.OctetKeyPair;
import com.nimbusds.jose.jwk.gen.OctetKeyPairGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.AuthChallenge;
import ma.ensam.fame.repository.AuthChallengeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Date;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SchoolAppAssertionVerifierTest {

    private OctetKeyPair keyPair;
    private SchoolAppAssertionVerifier verifier;
    private AuthChallengeRepository challengeRepository;

    private static final String ISSUER = "https://fame-auth.example.workers.dev";
    private static final String AUDIENCE = "fame-api";

    @BeforeEach
    void setUp() throws Exception {
        keyPair = new OctetKeyPairGenerator(Curve.Ed25519).generate();
        challengeRepository = mock(AuthChallengeRepository.class);
        String publicKeyB64 = keyPair.getX().toString();
        verifier = new SchoolAppAssertionVerifier(publicKeyB64, ISSUER, AUDIENCE, challengeRepository);
    }

    private AuthChallenge validChallenge() {
        AuthChallenge c = new AuthChallenge();
        c.setChallenge("challenge-123");
        c.setNonce("nonce-456");
        c.setCreatedAt(Instant.now());
        c.setExpiresAt(Instant.now().plusSeconds(60));
        return c;
    }

    private String sign(String challenge, String nonce) throws Exception {
        Ed25519Signer signer = new Ed25519Signer(keyPair);
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(ISSUER)
                .audience(AUDIENCE)
                .subject("CNE12345")
                .claim("email", "student@ensam-umi.ac.ma")
                .claim("name", "Ali Benali")
                .claim("challenge", challenge)
                .claim("nonce", nonce)
                .issueTime(new Date())
                .expirationTime(new Date(Instant.now().plusSeconds(30).toEpochMilli()))
                .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.EdDSA), claims);
        jwt.sign(signer);
        return jwt.serialize();
    }

    @Test
    void verifiesValidAssertionAndConsumesChallenge() throws Exception {
        when(challengeRepository.findByChallenge("challenge-123")).thenReturn(Optional.of(validChallenge()));

        SchoolAppAssertionVerifier.Assertion result =
                verifier.verify(sign("challenge-123", "nonce-456"));

        assertEquals("CNE12345", result.studentCode());
        assertEquals("student@ensam-umi.ac.ma", result.email());
        verify(challengeRepository).saveAndFlush(any());
    }

    @Test
    void rejectsTamperedSignature() throws Exception {
        when(challengeRepository.findByChallenge("challenge-123")).thenReturn(Optional.of(validChallenge()));
        String valid = sign("challenge-123", "nonce-456");
        String tampered = valid.substring(0, valid.length() - 4) + "AAAA";

        assertThrows(ApiException.class, () -> verifier.verify(tampered));
    }

    @Test
    void rejectsConsumedChallenge() throws Exception {
        AuthChallenge consumed = validChallenge();
        consumed.setConsumedAt(Instant.now());
        when(challengeRepository.findByChallenge("challenge-123")).thenReturn(Optional.of(consumed));

        assertThrows(ApiException.class, () -> verifier.verify(sign("challenge-123", "nonce-456")));
    }

    @Test
    void rejectsWrongNonce() throws Exception {
        when(challengeRepository.findByChallenge("challenge-123")).thenReturn(Optional.of(validChallenge()));
        assertThrows(ApiException.class, () -> verifier.verify(sign("challenge-123", "wrong-nonce")));
    }

    @Test
    void rejectsUnknownChallenge() throws Exception {
        when(challengeRepository.findByChallenge("challenge-123")).thenReturn(Optional.empty());
        assertThrows(ApiException.class, () -> verifier.verify(sign("challenge-123", "nonce-456")));
    }
}

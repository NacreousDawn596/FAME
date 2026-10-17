package ma.ensam.fame.service;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.Ed25519Signer;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.OctetKeyPair;
import com.nimbusds.jose.jwk.gen.OctetKeyPairGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.config.SuperAdminProperties;
import ma.ensam.fame.domain.AppUser;
import ma.ensam.fame.domain.AuthChallenge;
import ma.ensam.fame.domain.Role;
import ma.ensam.fame.repository.AppUserRepository;
import ma.ensam.fame.repository.AuthChallengeRepository;
import ma.ensam.fame.security.FameUserPrincipal;
import ma.ensam.fame.security.SchoolAppAssertionVerifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SuperAdminServiceTest {

    private static final String ISSUER = "https://fame-auth.example.workers.dev";
    private static final String AUDIENCE = "fame-api";

    private OctetKeyPair keyPair;
    private AuthChallengeRepository challengeRepository;
    private AppUserRepository userRepository;
    private SuperAdminService service;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);

    @BeforeEach
    void setUp() throws Exception {
        keyPair = new OctetKeyPairGenerator(Curve.Ed25519).generate();
        challengeRepository = mock(AuthChallengeRepository.class);
        userRepository = mock(AppUserRepository.class);
        SchoolAppAssertionVerifier verifier = new SchoolAppAssertionVerifier(
                keyPair.getX().toString(), ISSUER, AUDIENCE, challengeRepository);
        RateLimiter rateLimiter = mock(RateLimiter.class);
        service = new SuperAdminService(
                new SuperAdminProperties("SUPERADMIN@ensam-umi.ac.ma"),
                verifier, userRepository, passwordEncoder, rateLimiter);
    }

    @Test
    void normalizeEmailTrimsAndLowercases() {
        assertEquals("a@b.c", SuperAdminService.normalizeEmail("  A@B.C "));
        assertNull(SuperAdminService.normalizeEmail(null));
    }

    private String sign(String email, String challenge, String nonce) throws Exception {
        AuthChallenge c = new AuthChallenge();
        c.setChallenge(challenge);
        c.setNonce(nonce);
        c.setCreatedAt(Instant.now());
        c.setExpiresAt(Instant.now().plusSeconds(60));
        when(challengeRepository.findByChallenge(challenge)).thenReturn(Optional.of(c));

        Ed25519Signer signer = new Ed25519Signer(keyPair);
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(ISSUER).audience(AUDIENCE).subject("CNE1")
                .claim("email", email).claim("name", "Super Admin")
                .claim("challenge", challenge).claim("nonce", nonce)
                .issueTime(new Date())
                .expirationTime(new Date(Instant.now().plusSeconds(30).toEpochMilli()))
                .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.EdDSA), claims);
        jwt.sign(signer);
        return jwt.serialize();
    }

    @Test
    void grantsSuperadminWhenVerifiedEmailMatches() throws Exception {
        when(userRepository.findByUsername("superadmin@ensam-umi.ac.ma")).thenReturn(Optional.empty());
        when(userRepository.save(any(AppUser.class))).thenAnswer(i -> i.getArgument(0));

        FameUserPrincipal principal = service.authenticate(
                sign("SUPERADMIN@ensam-umi.ac.ma", "ch1", "n1"));

        assertEquals(Role.SUPERADMIN, principal.role());
        ArgumentCaptor<AppUser> captor = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository).save(captor.capture());
        assertEquals(Role.SUPERADMIN, captor.getValue().getRole());
        assertEquals("superadmin@ensam-umi.ac.ma", captor.getValue().getUsername());
    }

    @Test
    void rejectsWhenEmailDoesNotMatch() throws Exception {
        assertThrows(ApiException.class, () ->
                service.authenticate(sign("someone.else@ensam-umi.ac.ma", "ch2", "n2")));
        verify(userRepository, never()).save(any());
    }

    @Test
    void rejectsWhenAdminEmailNotConfigured() {
        SuperAdminService unconfigured = new SuperAdminService(
                new SuperAdminProperties(""), mock(SchoolAppAssertionVerifier.class),
                userRepository, passwordEncoder, mock(RateLimiter.class));
        assertFalse(unconfigured.isConfigured());
        assertThrows(ApiException.class, () -> unconfigured.authenticate("whatever"));
    }
}

package com.example.backend.controller;

import java.util.Map;
import com.example.backend.model.RefreshToken;
import com.example.backend.model.Role;
import com.example.backend.model.User;
import com.example.backend.repository.RefreshTokenRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.RefreshTokenService;
import com.example.backend.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private final UserRepository repo;
    private final RefreshTokenRepository refreshRepo;
    private final RefreshTokenService refreshService;
    private final JwtUtil jwt;
    private final PasswordEncoder encoder;

    @PostMapping("/register")
    public ResponseEntity<User> register(@RequestBody User user) {
        user.setPassword(encoder.encode(user.getPassword()));
        user.setRole(Role.USER);
        return ResponseEntity.ok(repo.save(user));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestBody User user) {

        System.out.println("Login called");

        User db = repo.findByUsername(user.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        System.out.println("User found: " + db.getUsername());

        boolean match = encoder.matches(user.getPassword(), db.getPassword());
        System.out.println("Password match: " + match);

        if (!match) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = jwt.generateToken(db.getUsername());
        System.out.println("Token generated");

        return ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refresh(@RequestParam String token) {
        RefreshToken rt = refreshRepo.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));
        if (!refreshService.isValid(rt)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Expired refresh token");
        }
        String newAccess = jwt.generateToken(rt.getUser().getUsername());
        return ResponseEntity.ok(Map.of("accessToken", newAccess));
    }
}
package com.example.backend.service;

import com.example.backend.model.RefreshToken;
import com.example.backend.model.User;
import com.example.backend.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository repo;

    @Transactional
    public RefreshToken create(User user) {
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setExpiryDate(System.currentTimeMillis() + 7L * 24 * 60 * 60 * 1000);
        return repo.save(refreshToken);
    }

    public boolean isValid(RefreshToken token) {
        return token.getExpiryDate() > System.currentTimeMillis();
    }
}

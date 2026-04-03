package com.example.backend.service;

import com.example.backend.model.Job;
import com.example.backend.repository.JobRepository;
import com.example.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.Objects;
import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor
@Service
public class JobService {

    private final JobRepository repo;
    private final UserRepository userRepo;

    public List<Job> getJobs(Long userId) {
        return repo.findByUserId(userId);
    }

    public List<Job> getJobsByUsername(String username) {
        Long userId = Long.valueOf(
            userRepo.findByUsername(Objects.requireNonNull(username, "username must not be null"))
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username))
                .getId()
        );
        return repo.findByUserId(userId);
    }

    public Optional<Job> getJobById(Long id) {
        return repo.findById(Objects.requireNonNull(id, "id must not be null"));
    }

    public Job save(Job job) {
        Job application = Objects.requireNonNull(job, "job must not be null");
        return repo.save(application);
    }

    public Job saveWithUser(Job job, String username) {
        var user = userRepo.findByUsername(Objects.requireNonNull(username, "username must not be null"))
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
        Job application = Objects.requireNonNull(job, "job must not be null");
        application.setUser(user);
        return repo.save(application);
    }

    public void delete(Long id) {
        repo.deleteById(Objects.requireNonNull(id, "id must not be null"));
    }
}
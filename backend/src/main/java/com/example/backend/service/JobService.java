package com.example.backend.service;

import com.example.backend.model.Job;
import com.example.backend.model.User;
import com.example.backend.repository.JobRepository;
import com.example.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RequiredArgsConstructor
@Service
public class JobService {

    private final JobRepository repo;
    private final UserRepository userRepo;

    public List<Job> getJobsByUsername(String username) {
        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Long userId = user.getId();
        return userId != null ? repo.findByUserId(userId) : List.of();
    }

    public Job saveWithUser(Job job, String username) {
        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (job != null && user != null) {
            job.setUser(user);
            return repo.save(job);
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid job or user");
    }

    public Job getJobById(Long id) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job ID is required");
        }
        return repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
    }

    public Job getJobByIdAndUser(Long id, String username) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job ID is required");
        }
        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Job job = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        
        Long jobUserId = job.getUser() != null ? job.getUser().getId() : null;
        Long userId = user.getId();
        
        if (!Objects.equals(jobUserId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized");
        }
        return job;
    }

    public Job update(Job job) {
        if (job == null || job.getId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid job");
        }
        return repo.save(job);
    }

    public void delete(Long id) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job ID is required");
        }
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found");
        }
        repo.deleteById(id);
    }

    public void deleteByIdAndUser(Long id, String username) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job ID is required");
        }
        getJobByIdAndUser(id, username);
        repo.deleteById(id);
    }

    public List<Job> getJobsByUserIdAndStatus(Long userId, String status) {
        if (userId == null || status == null || status.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User ID and status are required");
        }
        return repo.findByUserIdAndStatus(userId, status);
    }

    public List<Job> getJobsByUserIdAndCompany(Long userId, String company) {
        if (userId == null || company == null || company.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User ID and company are required");
        }
        return repo.findByUserIdAndCompanyIgnoreCase(userId, company);
    }

    public List<Job> getJobsByUserIdStatusAndCompany(Long userId, String status, String company) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User ID is required");
        }
        if ((status == null || status.isEmpty()) && (company == null || company.isEmpty())) {
            return repo.findByUserId(userId);
        }
        if (status != null && !status.isEmpty() && (company == null || company.isEmpty())) {
            return repo.findByUserIdAndStatus(userId, status);
        }
        if ((status == null || status.isEmpty()) && company != null && !company.isEmpty()) {
            return repo.findByUserIdAndCompanyIgnoreCase(userId, company);
        }
        return repo.findByUserIdAndStatusAndCompanyIgnoreCase(userId, status, company);
    }

    public Map<String, Long> getStats(String username) {
        User user = userRepo.findByUsername(username).orElseThrow();
        Long userId = user.getId();

        long total = repo.countByUserId(userId);
        long applied = repo.countByUserIdAndStatus(userId, "Applied");
        long rejected = repo.countByUserIdAndStatus(userId, "Rejected");
        long selected = repo.countByUserIdAndStatus(userId, "Selected");

        Map<String, Long> stats = new HashMap<>();
        stats.put("total", total);
        stats.put("applied", applied);
        stats.put("rejected", rejected);
        stats.put("selected", selected);

        return stats;
    }
}
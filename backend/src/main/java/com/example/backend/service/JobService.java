package com.example.backend.service;

import com.example.backend.model.Job;
import com.example.backend.model.Role;
import com.example.backend.model.User;
import com.example.backend.repository.JobRepository;
import com.example.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RequiredArgsConstructor
@Service
@Transactional
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

        if (job == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid job");
        }

        job.setUser(user);
        return repo.save(job);
    }

    public Job getJobById(Long id) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job id is required");
        }
        return repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
    }

    public Job getJobByIdAndUser(Long id, String username) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job id is required");
        }

        Job job = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));

        if (isAdmin(username)) {
            return job;
        }

        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Long jobUserId = job.getUser() != null ? job.getUser().getId() : null;
        if (!Objects.equals(jobUserId, user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job id is required");
        }
        repo.deleteById(id);
    }

    public void deleteByIdAndUser(Long id, String username) {
        Job job = getJobByIdAndUser(id, username);
        repo.delete(job);
    }

    public List<Job> getJobsByUserIdAndStatus(Long userId, String status) {
        return repo.findByUserIdAndStatus(userId, status);
    }

    public List<Job> getJobsByUserIdAndCompany(Long userId, String company) {
        return repo.findByUserIdAndCompanyIgnoreCase(userId, company);
    }

    public List<Job> getJobsByUserIdStatusAndCompany(Long userId, String status, String company) {
        return repo.findByUserIdAndStatusAndCompanyIgnoreCase(userId, status, company);
    }

    public Map<String, Long> getStats(String username) {
        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Long userId = user.getId();
        Map<String, Long> stats = new HashMap<>();
        stats.put("total", repo.countByUserId(userId));
        stats.put("applied", repo.countByUserIdAndStatus(userId, "Applied"));
        stats.put("interview", repo.countByUserIdAndStatus(userId, "HR Interview"));
        stats.put("offers", repo.countByUserIdAndStatus(userId, "Offer"));
        stats.put("rejected", repo.countByUserIdAndStatus(userId, "Rejected"));
        return stats;
    }

    public List<Job> getAllApplicationsForAdmin() {
        return repo.findByUserIsNotNull();  // Returns only user-applied jobs
    }

    public Job createForAdmin(Job job, String username) {
        if (job == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid job");
        }
        return repo.save(job);
    }

    public Job updateForAdmin(Long id, Job payload, String username) {
        Job existing = getJobById(id);
        existing.setCompany(payload.getCompany());
        existing.setRole(payload.getRole());
        existing.setStatus(payload.getStatus());
        existing.setAppliedDate(payload.getAppliedDate());
        existing.setLocation(payload.getLocation());
        existing.setNotes(payload.getNotes());
        return repo.save(existing);
    }

    public void deleteForAdmin(Long id) {
        delete(id);
    }

    public Map<String, Object> getAdminStats() {
        long postedJobs = repo.countPostedJobsForAdmin(); // admin-posted jobs
        long userApplications = repo.countUserApplications(); // user applications
        long distinctUsers = repo.countDistinctUsersWithApplications(); // users with apps
        long distinctCompanies = repo.countDistinctPostedCompanies();
        long usersWithOffers = repo.countDistinctUsersWithOffers();
        
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalJobs", postedJobs);         // rename to match frontend
        stats.put("usersApplied", distinctUsers);
        stats.put("totalCompanies", distinctCompanies); // rename to match frontend
        stats.put("usersWithOffers", usersWithOffers);
        
        return stats;
    }

    private boolean isAdmin(String username) {
        return userRepo.findByUsername(username)
                .map(user -> user.getRole() == Role.ADMIN)
                .orElse(false);
    }

    public List<Job> getPublicJobs() {
        LocalDateTime now = LocalDateTime.now();
        return repo.findPublicJobs()
                .stream()
                .filter(job -> isPublicJobActive(job, now))
                .toList();
    }

    public Job applyToPublicJob(Long jobId, String username) {
        Job source = getJobById(jobId);

        // Only public/admin posted jobs can be applied.
        if (!isPublicOrAdminPosted(source)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Public job not found");
        }

        // Enforce availability window: posted day + next day, until 12 AM after next day.
        if (!isPublicJobActive(source, LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.GONE, "This job is inactive");
        }

        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        boolean alreadyApplied = repo.existsByUserIdAndCompanyIgnoreCaseAndRoleIgnoreCase(
                user.getId(),
                source.getCompany(),
                source.getRole()
        );
        if (alreadyApplied) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already applied to this job");
        }

        Job applied = new Job();
        applied.setCompany(source.getCompany());
        applied.setRole(source.getRole());
        applied.setStatus("Applied");
        applied.setAppliedDate(LocalDate.now());
        applied.setLocation(source.getLocation());
        applied.setNotes(source.getNotes());
        applied.setUser(user);

        return repo.save(applied);
    }

    private boolean isPublicOrAdminPosted(Job job) {
        if (job.getUser() == null) {
            return true;
        }
        User owner = job.getUser();
        if (owner.getRole() == Role.ADMIN) {
            return true;
        }
        String ownerName = owner.getUsername() == null ? "" : owner.getUsername().trim().toLowerCase();
        return "admin".equals(ownerName);
    }

    private boolean isPublicJobActive(Job job, LocalDateTime now) {
        if (job.getCreatedAt() == null) return false;
        // Job is active from createdAt until the end of the next day (23:59:59)
        LocalDate postedDate = job.getCreatedAt().toLocalDate();
        LocalDateTime expiresAt = postedDate.plusDays(1).atTime(23, 59, 59);
        return !now.isAfter(expiresAt);
    }
}
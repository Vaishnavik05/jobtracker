package com.example.backend.service;

import com.example.backend.model.Job;
import com.example.backend.model.Role;
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
import java.time.LocalDate;

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
            job.setId(null);
            job.setUser(user);
            job.setStatus("Online Test"); // force default on create
            return repo.save(job);
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid job or user");
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
        Long userId = user.getId();

        if (!Objects.equals(jobUserId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to access this job");
        }

        return job;
    }

    public Job update(Job job) {
        if (job == null || job.getId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job id is required");
        }
        return repo.save(job);
    }

    public void delete(Long id) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job id is required");
        }
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found");
        }
        repo.deleteById(id);
    }

    public void deleteByIdAndUser(Long id, String username) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job id is required");
        }
        getJobByIdAndUser(id, username);
        repo.deleteById(id);
    }

    public List<Job> getJobsByUserIdAndStatus(Long userId, String status) {
        if (userId == null) {
            return List.of();
        }
        return repo.findByUserIdAndStatus(userId, status);
    }

    public List<Job> getJobsByUserIdAndCompany(Long userId, String company) {
        if (userId == null) {
            return List.of();
        }
        return repo.findByUserIdAndCompanyIgnoreCase(userId, company);
    }

    public List<Job> getJobsByUserIdStatusAndCompany(Long userId, String status, String company) {
        if (userId == null) {
            return List.of();
        }
        return repo.findByUserIdAndStatusAndCompanyIgnoreCase(userId, status, company);
    }

    public Map<String, Long> getStats(String username) {
        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Long userId = user.getId();
        if (userId == null) return Map.of();

        Map<String, Long> stats = new HashMap<>();
        stats.put("total", repo.countByUserId(userId));
        stats.put("onlineTest", repo.countByUserIdAndStatus(userId, "Online Test"));
        stats.put("groupDiscussion", repo.countByUserIdAndStatus(userId, "Group Discussion"));
        stats.put("technicalInterview", repo.countByUserIdAndStatus(userId, "Technical Interview"));
        stats.put("hrInterview", repo.countByUserIdAndStatus(userId, "HR Interview"));
        return stats;
    }

    public List<Job> getAllApplicationsForAdmin() {
        return repo.findByUserIsNotNull();
    }

    public Job createForAdmin(Job job, String username) {
        if (job == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid job payload");
        }

        if (username == null || username.trim().isEmpty()) {
            String company = job.getCompany() == null ? "" : job.getCompany().trim();
            String role = job.getRole() == null ? "" : job.getRole().trim();
            String location = job.getLocation() == null ? "" : job.getLocation().trim();

            if (repo.existsPublicDuplicate(company, role, location)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Duplicate public job already exists");
            }

            if (job.getAppliedDate() == null) {
                // For public jobs, appliedDate acts as posted date
                job.setAppliedDate(java.time.LocalDate.now());
            }
            job.setUser(null);
            return repo.save(job);
        }

        User user = userRepo.findByUsername(username.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        job.setUser(user);
        return repo.save(job);
    }

    public Job updateForAdmin(Long id, Job payload, String username) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job id is required");
        }
        if (payload == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid job payload");
        }

        Job existing = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));

        existing.setCompany(payload.getCompany() != null ? payload.getCompany() : existing.getCompany());
        existing.setRole(payload.getRole() != null ? payload.getRole() : existing.getRole());
        existing.setStatus(payload.getStatus() != null ? payload.getStatus() : existing.getStatus());
        existing.setAppliedDate(payload.getAppliedDate() != null ? payload.getAppliedDate() : existing.getAppliedDate());
        existing.setLocation(payload.getLocation() != null ? payload.getLocation() : existing.getLocation());
        existing.setNotes(payload.getNotes() != null ? payload.getNotes() : existing.getNotes());

        // IMPORTANT: keep existing user relation (do NOT force null)
        return repo.save(existing);
    }

    public void deleteForAdmin(Long id) {
        delete(id);
    }

    public Map<String, Object> getAdminStats() {
        Map<String, Object> stats = new HashMap<>();

        stats.put("totalJobs", repo.countDistinctJobPostings());
        stats.put("usersApplied", repo.countDistinctUsersWithApplications());
        stats.put("totalCompanies", repo.countDistinctCompanies());
        stats.put("usersWithOffers", repo.countDistinctUsersWithOffers());

        Map<String, Long> byStatus = new HashMap<>();
        for (Object[] row : repo.countByStatusGrouped()) {
            String status = row[0] == null ? "Unknown" : row[0].toString();
            Long count = ((Number) row[1]).longValue();
            byStatus.put(status, count);
        }
        stats.put("byStatus", byStatus);

        return stats;
    }

    private boolean isAdmin(String username) {
        return userRepo.findByUsername(username)
                .map(u -> u.getRole() != null && "ADMIN".equals(u.getRole().name()))
                .orElse(false);
    }

    public List<Job> getPublicJobs() {
        return repo.findPublicJobs(Role.ADMIN);
    }

    public Job applyToPublicJob(Long jobId, String username) {
        if (jobId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job id is required");
        }

        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Job publicJob = repo.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));

        boolean isPublic = publicJob.getUser() == null
                || publicJob.getUser().getRole() == Role.ADMIN;

        if (!isPublic) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This is not a public job");
        }

        boolean alreadyApplied = repo.existsByUserIdAndCompanyIgnoreCaseAndRoleIgnoreCase(
                user.getId(),
                publicJob.getCompany(),
                publicJob.getRole()
        );

        if (alreadyApplied) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already applied for this job");
        }

        Job applied = new Job();
        applied.setCompany(publicJob.getCompany());
        applied.setRole(publicJob.getRole());
        applied.setStatus("Online Test");
        applied.setAppliedDate(java.time.LocalDate.now());
        applied.setLocation(publicJob.getLocation());
        applied.setNotes(publicJob.getNotes());
        applied.setUser(user);

        return repo.save(applied);
    }

    public List<Job> getPublicJobs(String username) {
        return getPublicJobs();
    }
}
package com.example.backend.controller;

import com.example.backend.model.Job;
import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class JobController {

    private final JobService jobService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<Job>> getAllApplications(
            Authentication auth,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String company) {

        String username = auth.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        List<Job> jobs;
        boolean hasStatus = status != null && !status.isBlank();
        boolean hasCompany = company != null && !company.isBlank();

        if (hasStatus && hasCompany) {
            jobs = jobService.getJobsByUserIdStatusAndCompany(user.getId(), status, company);
        } else if (hasStatus) {
            jobs = jobService.getJobsByUserIdAndStatus(user.getId(), status);
        } else if (hasCompany) {
            jobs = jobService.getJobsByUserIdAndCompany(user.getId(), company);
        } else {
            jobs = jobService.getJobsByUsername(username);
        }

        return ResponseEntity.ok(jobs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Job> getApplicationById(@PathVariable Long id, Authentication auth) {
        Job job = jobService.getJobByIdAndUser(id, auth.getName());
        return ResponseEntity.ok(job);
    }

    @PostMapping
    public ResponseEntity<Job> createApplication(Authentication auth, @RequestBody Job job) {
        String username = auth.getName();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(jobService.saveWithUser(job, username));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Job> updateApplication(@PathVariable Long id, @RequestBody Job jobDetails, Authentication auth) {
        Job existingJob = jobService.getJobByIdAndUser(id, auth.getName());
        existingJob.setCompany(jobDetails.getCompany());
        existingJob.setRole(jobDetails.getRole());
        existingJob.setStatus(jobDetails.getStatus());
        existingJob.setAppliedDate(jobDetails.getAppliedDate());
        existingJob.setLocation(jobDetails.getLocation());
        existingJob.setNotes(jobDetails.getNotes());
        Job updatedJob = jobService.update(existingJob);
        return ResponseEntity.ok(updatedJob);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteApplication(@PathVariable Long id, Authentication auth) {
        jobService.deleteByIdAndUser(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats(Authentication auth) {
        String username = auth.getName();
        return ResponseEntity.ok(jobService.getStats(username));
    }

    @GetMapping("/stats/by-stage")
    public ResponseEntity<Map<String, Long>> getJobCountsByStage(Authentication auth) {
        String username = auth.getName();
        return ResponseEntity.ok(jobService.getJobCountsByStatusForUser(username));
    }

    @GetMapping("/public-jobs")
    public ResponseEntity<List<Job>> getPublicJobs() {
        return ResponseEntity.ok(jobService.getPublicJobs());
    }

    @PostMapping("/apply/{id}")
    public ResponseEntity<Job> applyToPublicJob(@PathVariable Long id, Authentication auth) {
        Job created = jobService.applyToPublicJob(id, auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
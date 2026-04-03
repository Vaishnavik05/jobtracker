package com.example.backend.controller;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RequestParam;
import com.example.backend.model.Job;
import com.example.backend.model.User;
import com.example.backend.service.JobService;
import com.example.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

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
        if (status != null && !status.isEmpty() && company != null && !company.isEmpty()) {
            jobs = jobService.getJobsByUserIdStatusAndCompany(user.getId(), status, company);
        } else if (status != null && !status.isEmpty()) {
            jobs = jobService.getJobsByUserIdAndStatus(user.getId(), status);
        } else if (company != null && !company.isEmpty()) {
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
        existingJob.setNotes(jobDetails.getNotes());
        Job updatedJob = jobService.update(existingJob);
        return ResponseEntity.ok(updatedJob);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteApplication(@PathVariable Long id, Authentication auth) {
        jobService.deleteByIdAndUser(id, auth.getName());
        return ResponseEntity.noContent().build();
    }
}
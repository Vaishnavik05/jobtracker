package com.example.backend.controller;

import com.example.backend.model.Job;
import com.example.backend.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class JobController {

    private final JobService jobService;

    @GetMapping
    public ResponseEntity<List<Job>> getAllApplications(Authentication auth) {
        String username = auth.getName();
        List<Job> applications = jobService.getJobsByUsername(username);
        return ResponseEntity.ok(applications);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Job> getApplicationById(@PathVariable Long id) {
        Optional<Job> job = jobService.getJobById(id);
        return job.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Job> createApplication(Authentication auth, @RequestBody Job job) {
        String username = auth.getName();
        Job savedJob = jobService.saveWithUser(job, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedJob);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Job> updateApplication(@PathVariable Long id, @RequestBody Job jobDetails) {
        Optional<Job> job = jobService.getJobById(id);
        if (job.isPresent()) {
            Job existingJob = job.get();
            existingJob.setCompany(jobDetails.getCompany());
            existingJob.setRole(jobDetails.getRole());
            existingJob.setStatus(jobDetails.getStatus());
            existingJob.setAppliedDate(jobDetails.getAppliedDate());
            existingJob.setNotes(jobDetails.getNotes());
            Job updatedJob = jobService.save(existingJob);
            return ResponseEntity.ok(updatedJob);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteApplication(@PathVariable Long id) {
        jobService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
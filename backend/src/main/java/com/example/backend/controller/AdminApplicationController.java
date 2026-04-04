package com.example.backend.controller;

import com.example.backend.model.Job;
import com.example.backend.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/applications")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AdminApplicationController {

    private final JobService jobService;

    record AdminApplicationRequest(
            String username,
            String company,
            String role,
            String status,
            String appliedDate,
            String notes
    ) {}

    record AdminApplicationResponse(
            Long id,
            String username,
            String company,
            String role,
            String status,
            LocalDate appliedDate,
            String notes
    ) {}

    private LocalDate parseDateFlexible(String value) {
        if (value == null || value.isBlank()) return null;

        try {
            return LocalDate.parse(value); // yyyy-MM-dd
        } catch (Exception ignored) {
        }

        try {
            return LocalDate.parse(value, DateTimeFormatter.ofPattern("dd-MM-yyyy"));
        } catch (Exception ignored) {
        }

        return null; // never fail save because of date format
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    @GetMapping
    public ResponseEntity<List<AdminApplicationResponse>> all() {
        List<AdminApplicationResponse> result = jobService.getAllApplicationsForAdmin()
                .stream()
                .map(job -> new AdminApplicationResponse(
                        job.getId(),
                        job.getUser() != null ? job.getUser().getUsername() : "",
                        job.getCompany(),
                        job.getRole(),
                        job.getStatus(),
                        job.getAppliedDate(),
                        job.getNotes()
                ))
                .toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats() {
        return ResponseEntity.ok(jobService.getAdminStats());
    }

    @PostMapping
    public ResponseEntity<AdminApplicationResponse> create(@RequestBody AdminApplicationRequest request) {
        String company = safe(request.company());
        String role = safe(request.role());
        String status = safe(request.status());

        if (company.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company is required");
        }
        if (role.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role is required");
        }
        if (status.isEmpty()) {
            status = "Online Test";
        }

        Job job = new Job();
        job.setCompany(company);
        job.setRole(role);
        job.setStatus(status);
        job.setAppliedDate(parseDateFlexible(request.appliedDate()));
        job.setNotes(request.notes());

        // always public job for user-side visibility
        Job saved = jobService.createForAdmin(job, "");

        return ResponseEntity.ok(new AdminApplicationResponse(
                saved.getId(),
                "",
                saved.getCompany(),
                saved.getRole(),
                saved.getStatus(),
                saved.getAppliedDate(),
                saved.getNotes()
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdminApplicationResponse> update(
            @PathVariable Long id,
            @RequestBody AdminApplicationRequest request
    ) {
        String company = safe(request.company());
        String role = safe(request.role());
        String status = safe(request.status());

        if (company.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company is required");
        }
        if (role.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role is required");
        }
        if (status.isEmpty()) {
            status = "Online Test";
        }

        Job payload = new Job();
        payload.setCompany(company);
        payload.setRole(role);
        payload.setStatus(status);
        payload.setAppliedDate(parseDateFlexible(request.appliedDate()));
        payload.setNotes(request.notes());

        Job updated = jobService.updateForAdmin(id, payload, "");

        return ResponseEntity.ok(new AdminApplicationResponse(
                updated.getId(),
                updated.getUser() != null ? updated.getUser().getUsername() : "",
                updated.getCompany(),
                updated.getRole(),
                updated.getStatus(),
                updated.getAppliedDate(),
                updated.getNotes()
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        jobService.deleteForAdmin(id);
        return ResponseEntity.noContent().build();
    }
}

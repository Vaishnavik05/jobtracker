package com.example.backend.controller;

import com.example.backend.model.Job;
import com.example.backend.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/applications")
@RequiredArgsConstructor
// @CrossOrigin(origins = {
//     "http://localhost:5173",
//     "https://jobtracker-xv7i.vercel.app"
// })
public class AdminApplicationController {

    private final JobService jobService;

    record AdminApplicationRequest(
            String username,
            String company,
            String role,
            String status,
            String appliedDate,
            String location,
            String notes
    ) {}

    record AdminApplicationResponse(
            Long id,
            String username,
            String company,
            String role,
            String status,
            LocalDate appliedDate,
            String location,
            String notes
    ) {}

    private LocalDate parseDateFlexible(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return LocalDate.parse(value);
        } catch (Exception ignored) {
        }

        try {
            return LocalDate.parse(value, DateTimeFormatter.ofPattern("dd-MM-yyyy"));
        } catch (Exception ignored) {
        }

        return null;
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
                        job.getLocation(),
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
        String location = safe(request.location());

        if (company.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company is required");
        }
        if (role.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role is required");
        }

        Job job = new Job();
        job.setCompany(company);
        job.setRole(role);
        job.setStatus(safe(request.status()).isEmpty() ? "Online Test" : safe(request.status()));
        job.setAppliedDate(parseDateFlexible(request.appliedDate()));
        job.setLocation(location);
        job.setNotes(request.notes());

        Job saved = jobService.createForAdmin(job, safe(request.username()));

        AdminApplicationResponse response = new AdminApplicationResponse(
                saved.getId(),
                saved.getUser() != null ? saved.getUser().getUsername() : "",
                saved.getCompany(),
                saved.getRole(),
                saved.getStatus(),
                saved.getAppliedDate(),
                saved.getLocation(),
                saved.getNotes()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdminApplicationResponse> update(
            @PathVariable Long id,
            @RequestBody AdminApplicationRequest request
    ) {
        Job payload = new Job();
        payload.setCompany(safe(request.company()));
        payload.setRole(safe(request.role()));
        payload.setStatus(safe(request.status()));
        payload.setAppliedDate(parseDateFlexible(request.appliedDate()));
        payload.setLocation(safe(request.location()));
        payload.setNotes(request.notes());

        Job updated = jobService.updateForAdmin(id, payload, safe(request.username()));

        AdminApplicationResponse response = new AdminApplicationResponse(
                updated.getId(),
                updated.getUser() != null ? updated.getUser().getUsername() : "",
                updated.getCompany(),
                updated.getRole(),
                updated.getStatus(),
                updated.getAppliedDate(),
                updated.getLocation(),
                updated.getNotes()
        );

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        jobService.deleteForAdmin(id);
        return ResponseEntity.noContent().build();
    }
}
